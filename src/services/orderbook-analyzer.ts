import { Token } from '../types';
import { logger, logError } from '../utils/logger';
import axios from 'axios';

export interface OrderBookLevel {
  price: number;
  size: number;
  totalValue: number;
}

export interface OrderBookData {
  bids: OrderBookLevel[]; // Ordens de compra
  asks: OrderBookLevel[]; // Ordens de venda
  spread: number;
  spreadPercent: number;
  bidDepth: number; // Total em USD nas compras
  askDepth: number; // Total em USD nas vendas
  buyPressure: number; // Bid depth / Ask depth (>1 = mais compradores)
  wallDetection: {
    hasBuyWall: boolean;
    hasSellWall: boolean;
    buyWallPrice?: number;
    sellWallPrice?: number;
  };
}

export interface BuySellPressure {
  buyVolume: number;
  sellVolume: number;
  ratio: number; // buy/sell (>1 = mais compradores)
  netFlow: number; // buy - sell
  trend: 'bullish' | 'bearish' | 'neutral';
}

export class OrderBookAnalyzer {
  private cache: Map<string, { data: OrderBookData; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5000; // 5 segundos

  /**
   * Analisa o order book de um token
   */
  async analyzeOrderBook(token: Token): Promise<OrderBookData> {
    try {
      // Check cache
      const cached = this.cache.get(token.address);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }

      logger.info(`Analyzing order book for ${token.symbol}`);

      if (token.network === 'solana') {
        const data = await this.analyzeSolanaOrderBook(token);
        this.cache.set(token.address, { data, timestamp: Date.now() });
        return data;
      } else {
        const data = await this.analyzeEVMOrderBook(token);
        this.cache.set(token.address, { data, timestamp: Date.now() });
        return data;
      }
    } catch (error) {
      logError(error, `analyzeOrderBook: ${token.symbol}`);
      throw error;
    }
  }

  /**
   * Analisa order book Solana (via Serum/Raydium)
   */
  private async analyzeSolanaOrderBook(token: Token): Promise<OrderBookData> {
    try {
      // Use Birdeye API para order book
      const response = await axios.get(
        `https://public-api.birdeye.so/defi/orderbook`,
        {
          params: {
            address: token.address,
          },
          headers: {
            'X-API-KEY': process.env.BIRDEYE_API_KEY || '',
          },
          timeout: 5000,
        }
      );

      const orderbook = response.data?.data;
      if (!orderbook) {
        throw new Error('No orderbook data');
      }

      return this.processOrderBookData(orderbook.bids || [], orderbook.asks || []);
    } catch (error) {
      // Fallback: estimar do DexScreener
      return this.estimateOrderBookFromDexScreener(token);
    }
  }

  /**
   * Analisa order book EVM
   */
  private async analyzeEVMOrderBook(token: Token): Promise<OrderBookData> {
    try {
      // Para EVM, podemos usar dados de DEXs como Uniswap
      return this.estimateOrderBookFromDexScreener(token);
    } catch (error) {
      logError(error, `analyzeEVMOrderBook: ${token.symbol}`);
      throw error;
    }
  }

  /**
   * Estima order book a partir de dados do DexScreener
   */
  private async estimateOrderBookFromDexScreener(token: Token): Promise<OrderBookData> {
    try {
      const response = await axios.get(
        `https://api.dexscreener.com/latest/dex/tokens/${token.address}`,
        { timeout: 5000 }
      );

      const pair = response.data?.pairs?.[0];
      if (!pair) {
        throw new Error('No pair data');
      }

      const price = parseFloat(pair.priceUsd || '0');
      const liquidity = parseFloat(pair.liquidity?.usd || '0');

      // Estimar ordem book baseado na liquidez
      // Distribuir liquidez em níveis de preço (±2% do preço atual)
      const bids: OrderBookLevel[] = [];
      const asks: OrderBookLevel[] = [];

      const levels = 10;
      const priceStep = 0.002; // 0.2% por nível

      for (let i = 0; i < levels; i++) {
        const bidPrice = price * (1 - priceStep * (i + 1));
        const askPrice = price * (1 + priceStep * (i + 1));

        const bidSize = (liquidity / 2 / levels) / bidPrice;
        const askSize = (liquidity / 2 / levels) / askPrice;

        bids.push({
          price: bidPrice,
          size: bidSize,
          totalValue: bidSize * bidPrice,
        });

        asks.push({
          price: askPrice,
          size: askSize,
          totalValue: askSize * askPrice,
        });
      }

      return this.processOrderBookData(bids, asks);
    } catch (error) {
      logError(error, `estimateOrderBookFromDexScreener: ${token.symbol}`);
      throw error;
    }
  }

  /**
   * Processa dados do order book
   */
  private processOrderBookData(
    bids: OrderBookLevel[],
    asks: OrderBookLevel[]
  ): OrderBookData {
    // Calcular profundidade
    const bidDepth = bids.reduce((sum, bid) => sum + bid.totalValue, 0);
    const askDepth = asks.reduce((sum, ask) => sum + ask.totalValue, 0);

    // Calcular spread
    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || 0;
    const spread = bestAsk - bestBid;
    const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0;

    // Calcular buy pressure
    const buyPressure = askDepth > 0 ? bidDepth / askDepth : 0;

    // Detectar paredes (walls)
    const wallDetection = this.detectWalls(bids, asks);

    return {
      bids,
      asks,
      spread,
      spreadPercent,
      bidDepth,
      askDepth,
      buyPressure,
      wallDetection,
    };
  }

  /**
   * Detecta paredes de compra/venda
   */
  private detectWalls(
    bids: OrderBookLevel[],
    asks: OrderBookLevel[]
  ): OrderBookData['wallDetection'] {
    const avgBidSize = bids.reduce((sum, b) => sum + b.totalValue, 0) / bids.length;
    const avgAskSize = asks.reduce((sum, a) => sum + a.totalValue, 0) / asks.length;

    // Parede = ordem 3x maior que a média
    const wallThreshold = 3;

    const buyWall = bids.find((bid) => bid.totalValue > avgBidSize * wallThreshold);
    const sellWall = asks.find((ask) => ask.totalValue > avgAskSize * wallThreshold);

    return {
      hasBuyWall: !!buyWall,
      hasSellWall: !!sellWall,
      buyWallPrice: buyWall?.price,
      sellWallPrice: sellWall?.price,
    };
  }

  /**
   * Analisa pressão de compra/venda em tempo real
   */
  async analyzeBuySellPressure(token: Token): Promise<BuySellPressure> {
    try {
      const response = await axios.get(
        `https://api.dexscreener.com/latest/dex/tokens/${token.address}`,
        { timeout: 5000 }
      );

      const pair = response.data?.pairs?.[0];
      if (!pair) {
        throw new Error('No pair data');
      }

      // Buscar dados de transações recentes
      const txData = await this.getRecentTransactions(token);

      const buyVolume = txData.buys.reduce((sum, tx) => sum + tx.value, 0);
      const sellVolume = txData.sells.reduce((sum, tx) => sum + tx.value, 0);

      const ratio = sellVolume > 0 ? buyVolume / sellVolume : buyVolume > 0 ? 999 : 1;
      const netFlow = buyVolume - sellVolume;

      let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (ratio > 1.5) trend = 'bullish';
      else if (ratio < 0.67) trend = 'bearish';

      logger.info(`Buy/Sell Pressure for ${token.symbol}:`, {
        buyVolume: buyVolume.toFixed(2),
        sellVolume: sellVolume.toFixed(2),
        ratio: ratio.toFixed(2),
        trend,
      });

      return {
        buyVolume,
        sellVolume,
        ratio,
        netFlow,
        trend,
      };
    } catch (error) {
      logError(error, `analyzeBuySellPressure: ${token.symbol}`);
      return {
        buyVolume: 0,
        sellVolume: 0,
        ratio: 1,
        netFlow: 0,
        trend: 'neutral',
      };
    }
  }

  /**
   * Busca transações recentes
   */
  private async getRecentTransactions(
    token: Token
  ): Promise<{ buys: Array<{ value: number }>; sells: Array<{ value: number }> }> {
    try {
      // Usar API apropriada baseada na rede
      if (token.network === 'solana') {
        // Birdeye ou Solscan
        const response = await axios.get(
          `https://public-api.birdeye.so/defi/txs/token`,
          {
            params: {
              address: token.address,
              offset: 0,
              limit: 100,
            },
            headers: {
              'X-API-KEY': process.env.BIRDEYE_API_KEY || '',
            },
            timeout: 5000,
          }
        );

        const txs = response.data?.data?.items || [];

        const buys = txs
          .filter((tx: any) => tx.side === 'buy')
          .map((tx: any) => ({ value: parseFloat(tx.value || '0') }));

        const sells = txs
          .filter((tx: any) => tx.side === 'sell')
          .map((tx: any) => ({ value: parseFloat(tx.value || '0') }));

        return { buys, sells };
      } else {
        // Para EVM, usar estimativa baseada em volume
        const response = await axios.get(
          `https://api.dexscreener.com/latest/dex/tokens/${token.address}`,
          { timeout: 5000 }
        );

        const pair = response.data?.pairs?.[0];
        const volume5m = parseFloat(pair?.volume?.m5 || '0');

        // Estimar 60% compras / 40% vendas se preço subindo
        const priceChange = parseFloat(pair?.priceChange?.m5 || '0');
        const buyRatio = priceChange > 0 ? 0.6 : 0.4;

        return {
          buys: [{ value: volume5m * buyRatio }],
          sells: [{ value: volume5m * (1 - buyRatio) }],
        };
      }
    } catch (error) {
      logError(error, `getRecentTransactions: ${token.symbol}`);
      return { buys: [], sells: [] };
    }
  }

  /**
   * Detecta spike de interesse (mudança súbita)
   */
  async detectInterestSpike(token: Token): Promise<{
    hasSpike: boolean;
    buyersIncrease: number;
    volumeIncrease: number;
    confidence: number;
  }> {
    try {
      const response = await axios.get(
        `https://api.dexscreener.com/latest/dex/tokens/${token.address}`,
        { timeout: 5000 }
      );

      const pair = response.data?.pairs?.[0];
      if (!pair) {
        return { hasSpike: false, buyersIncrease: 0, volumeIncrease: 0, confidence: 0 };
      }

      // Comparar volume 5min vs 1h
      const volume5m = parseFloat(pair.volume?.m5 || '0');
      const volume1h = parseFloat(pair.volume?.h1 || '0');
      const avgVolume1h = volume1h / 12; // Média de 5min na última hora

      const volumeIncrease = avgVolume1h > 0 ? ((volume5m - avgVolume1h) / avgVolume1h) * 100 : 0;

      // Comparar número de transações
      const txns5m = parseInt(pair.txns?.m5?.buys || '0') + parseInt(pair.txns?.m5?.sells || '0');
      const txns1h = parseInt(pair.txns?.h1?.buys || '0') + parseInt(pair.txns?.h1?.sells || '0');
      const avgTxns1h = txns1h / 12;

      const buyersIncrease = avgTxns1h > 0 ? ((txns5m - avgTxns1h) / avgTxns1h) * 100 : 0;

      // Detectar spike: volume +200% E buyers +150%
      const hasSpike = volumeIncrease > 200 && buyersIncrease > 150;

      // Calcular confiança (0-100)
      const confidence = Math.min(
        100,
        (volumeIncrease / 10 + buyersIncrease / 5) / 2
      );

      if (hasSpike) {
        logger.warn(`🚀 SPIKE DETECTED for ${token.symbol}!`, {
          volumeIncrease: `${volumeIncrease.toFixed(0)}%`,
          buyersIncrease: `${buyersIncrease.toFixed(0)}%`,
          confidence: `${confidence.toFixed(0)}%`,
        });
      }

      return {
        hasSpike,
        buyersIncrease,
        volumeIncrease,
        confidence,
      };
    } catch (error) {
      logError(error, `detectInterestSpike: ${token.symbol}`);
      return { hasSpike: false, buyersIncrease: 0, volumeIncrease: 0, confidence: 0 };
    }
  }
}
