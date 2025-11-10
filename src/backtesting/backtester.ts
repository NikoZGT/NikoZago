import { BotConfig } from '../types';
import { logger, logError } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

export interface BacktestConfig {
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  network: 'solana' | 'bsc' | 'base';
  tokenAddresses?: string[]; // Tokens específicos ou deixar vazio para scan
}

export interface BacktestTrade {
  tokenSymbol: string;
  tokenAddress: string;
  entryTime: Date;
  exitTime: Date;
  entryPrice: number;
  exitPrice: number;
  amount: number;
  investedUSD: number;
  returnUSD: number;
  pnl: number;
  pnlPercent: number;
  holdTimeMinutes: number;
  exitReason: string;
  signals: any;
}

export interface BacktestResults {
  config: BacktestConfig;
  startCapital: number;
  endCapital: number;
  totalPnl: number;
  totalPnlPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  trades: BacktestTrade[];
  dailyPnl: { date: string; pnl: number; capital: number }[];
}

export class Backtester {
  private config: BacktestConfig;
  private botConfig: BotConfig;

  constructor(config: BacktestConfig, botConfig: BotConfig) {
    this.config = config;
    this.botConfig = botConfig;
  }

  /**
   * Executa backtesting completo
   */
  async run(): Promise<BacktestResults> {
    try {
      logger.info('🔄 Starting backtesting...');
      logger.info(`Period: ${this.config.startDate.toISOString()} to ${this.config.endDate.toISOString()}`);
      logger.info(`Initial Capital: $${this.config.initialCapital}`);

      // 1. Buscar dados históricos
      const historicalData = await this.fetchHistoricalData();
      logger.info(`Found ${historicalData.length} tokens with historical data`);

      // 2. Simular trading
      const trades = await this.simulateTrading(historicalData);
      logger.info(`Simulated ${trades.length} trades`);

      // 3. Calcular métricas
      const results = this.calculateMetrics(trades);

      // 4. Salvar resultados
      await this.saveResults(results);

      // 5. Exibir resumo
      this.displaySummary(results);

      return results;
    } catch (error) {
      logError(error, 'Backtester.run');
      throw error;
    }
  }

  /**
   * Busca dados históricos de tokens
   */
  private async fetchHistoricalData(): Promise<any[]> {
    try {
      const tokens: any[] = [];

      // Se tokens específicos foram fornecidos
      if (this.config.tokenAddresses && this.config.tokenAddresses.length > 0) {
        for (const address of this.config.tokenAddresses) {
          const data = await this.fetchTokenHistory(address);
          if (data) tokens.push(data);
        }
      } else {
        // Buscar tokens populares do período
        const popularTokens = await this.fetchPopularTokens();
        for (const token of popularTokens) {
          const data = await this.fetchTokenHistory(token.address);
          if (data) tokens.push(data);
        }
      }

      return tokens;
    } catch (error) {
      logError(error, 'fetchHistoricalData');
      return [];
    }
  }

  /**
   * Busca histórico de um token específico
   */
  private async fetchTokenHistory(address: string): Promise<any | null> {
    try {
      logger.info(`Fetching history for ${address}...`);

      // Para backtest, usar dados simulados baseados nos memecoins populares
      // Em produção, substituir por chamadas reais à API (Birdeye, DexTools Pro)
      const mockPair = {
        baseToken: {
          address,
          symbol: this.getTokenSymbol(address),
          name: this.getTokenName(address),
        },
        priceUsd: Math.random() * 0.001 + 0.00001, // Preço aleatório típico de memecoin
        volume: {
          h24: Math.random() * 5000000 + 500000, // Volume 24h entre $500k-$5.5M
        },
        liquidity: {
          usd: Math.random() * 2000000 + 200000, // Liquidez entre $200k-$2.2M
        },
      };

      return {
        address,
        symbol: mockPair.baseToken.symbol,
        name: mockPair.baseToken.name,
        pairAddress: address,
        priceUsd: mockPair.priceUsd,
        volume24h: mockPair.volume.h24,
        liquidity: mockPair.liquidity.usd,
        // Simular dados históricos
        history: this.generateSimulatedHistory(mockPair),
      };
    } catch (error) {
      logError(error, `fetchTokenHistory: ${address}`);
      return null;
    }
  }

  /**
   * Retorna símbolo do token para memecoins conhecidos
   */
  private getTokenSymbol(address: string): string {
    const symbols: Record<string, string> = {
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
      'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82': 'BOME',
      '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr': 'POPCAT',
      'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 'WIF',
      'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5': 'MEW',
    };
    return symbols[address] || 'MEME';
  }

  /**
   * Retorna nome do token para memecoins conhecidos
   */
  private getTokenName(address: string): string {
    const names: Record<string, string> = {
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'Bonk',
      'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82': 'Book of Meme',
      '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr': 'Popcat',
      'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 'dogwifhat',
      'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5': 'cat in a dogs world',
    };
    return names[address] || 'Memecoin';
  }

  /**
   * Gera histórico simulado REALISTA de memecoin
   * Inclui pumps, dumps e períodos de consolidação
   * Em produção, usar APIs com dados reais (Birdeye, DexTools)
   */
  private generateSimulatedHistory(pair: any): any[] {
    const history: any[] = [];
    const basePrice = parseFloat(pair.priceUsd || '0');
    const startTime = this.config.startDate.getTime();
    const endTime = this.config.endDate.getTime();
    const interval = 5 * 60 * 1000; // 5 minutos
    const baseVolume = parseFloat(pair.volume?.h24 || '1000');

    let currentPrice = basePrice;
    let currentVolume = baseVolume;
    let pumpPhase = false;
    let pumpDuration = 0;

    for (let time = startTime; time <= endTime; time += interval) {
      // 1.5% de chance de iniciar um pump a cada candle (realista)
      if (!pumpPhase && Math.random() < 0.015) {
        pumpPhase = true;
        pumpDuration = Math.floor(Math.random() * 10) + 8; // 8-18 candles de pump
      }

      let priceChange = 0;
      let volumeMultiplier = 1;

      if (pumpPhase && pumpDuration > 0) {
        // PUMP: Alta de 1.5-5% por candle (realista)
        priceChange = (Math.random() * 0.035) + 0.015; // +1.5% a +5%
        volumeMultiplier = 1.5 + (Math.random() * 2.5); // 1.5x a 4x volume
        pumpDuration--;

        if (pumpDuration === 0) {
          pumpPhase = false;
        }
      } else {
        // Normal: movimento lateral com volatilidade
        const rand = Math.random();
        if (rand < 0.15) {
          // 15% chance de correção
          priceChange = -(Math.random() * 0.05); // -0% a -5%
          volumeMultiplier = 0.8 + Math.random();
        } else {
          // Movimento normal lateral
          priceChange = (Math.random() - 0.5) * 0.05; // ±2.5%
          volumeMultiplier = 0.5 + (Math.random() * 1.5); // 0.5x a 2x
        }
      }

      currentPrice = currentPrice * (1 + priceChange);
      currentVolume = baseVolume * volumeMultiplier;

      history.push({
        timestamp: time,
        open: currentPrice,
        high: currentPrice * (1 + Math.abs(priceChange) * 0.5),
        low: currentPrice * (1 - Math.abs(priceChange) * 0.3),
        close: currentPrice,
        volume: currentVolume,
      });
    }

    return history;
  }

  /**
   * Busca tokens populares do período
   */
  private async fetchPopularTokens(): Promise<any[]> {
    try {
      logger.info('Fetching popular tokens...');

      // Memecoins populares Solana (atualizado 2024)
      const popularMemecoins = [
        'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
        'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82',  // BOME
        '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr', // POPCAT
        'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', // WIF (dogwifhat)
        'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5',  // MEW (cat)
      ];

      logger.info(`Using ${popularMemecoins.length} popular memecoins for backtest`);
      return popularMemecoins.map(address => ({ address }));
    } catch (error) {
      logError(error, 'fetchPopularTokens');
      return [];
    }
  }

  /**
   * Simula trading com dados históricos (CANDLE POR CANDLE)
   */
  private async simulateTrading(historicalData: any[]): Promise<BacktestTrade[]> {
    const trades: BacktestTrade[] = [];
    let currentCapital = this.config.initialCapital;
    let openPositions: Map<string, any> = new Map();
    let consecutiveLosses = 0;
    let circuitBreakerActive = false;

    logger.info('Simulating trading...');

    // Obter todos os timestamps únicos
    const allTimestamps = new Set<number>();
    historicalData.forEach(token => {
      token.history.forEach((candle: any) => allTimestamps.add(candle.timestamp));
    });
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    // Processar CANDLE POR CANDLE em ordem cronológica
    for (const timestamp of sortedTimestamps) {
      const time = new Date(timestamp);

      // Para cada token neste timestamp
      for (const token of historicalData) {
        const candleIndex = token.history.findIndex((c: any) => c.timestamp === timestamp);
        if (candleIndex === -1) continue;

        const candle = token.history[candleIndex];

        // Primeiro: Verificar saídas de posições abertas DESTE token
        if (openPositions.has(token.address)) {
          const position = openPositions.get(token.address);
          const exitSignal = this.evaluateExitSignal(position, candle, time);

          if (exitSignal.shouldExit) {
            // Fechar posição
            const returnUSD = position.amount * candle.close;
            const pnl = returnUSD - position.investedUSD;
            const pnlPercent = (pnl / position.investedUSD) * 100;
            const holdTimeMinutes = Math.abs((time.getTime() - position.entryTime.getTime()) / (1000 * 60));

            trades.push({
              tokenSymbol: position.tokenSymbol,
              tokenAddress: position.tokenAddress,
              entryTime: position.entryTime,
              exitTime: time,
              entryPrice: position.entryPrice,
              exitPrice: candle.close,
              amount: position.amount,
              investedUSD: position.investedUSD,
              returnUSD,
              pnl,
              pnlPercent,
              holdTimeMinutes,
              exitReason: exitSignal.reason,
              signals: position.signals,
            });

            currentCapital += returnUSD;
            openPositions.delete(token.address);

            // Rastrear perdas consecutivas para circuit breaker
            if (pnl < 0) {
              consecutiveLosses++;
            } else {
              consecutiveLosses = 0;
              circuitBreakerActive = false; // Reset circuit breaker em win
            }
          }
        }

        // Segundo: Verificar sinais de entrada para novos trades
        if (!openPositions.has(token.address)) {
          const entrySignal = this.evaluateEntrySignal(token, candle, candleIndex);

          // Circuit breaker
          if (consecutiveLosses >= this.botConfig.maxConsecutiveLosses) {
            circuitBreakerActive = true;
          }

          if (entrySignal.shouldEnter &&
              openPositions.size < this.botConfig.maxConcurrentPositions &&
              !circuitBreakerActive &&
              currentCapital > 0) {
            // Abrir posição - usar capital inicial para evitar compound exponencial
            const baseCapital = Math.min(currentCapital, this.config.initialCapital * 5); // Limita a 5x capital inicial
            const positionSize = (baseCapital * this.botConfig.positionSizePercent) / 100;

            // Garantir que não investe mais do que tem
            const actualPositionSize = Math.min(positionSize, currentCapital * 0.9);
            const amount = actualPositionSize / candle.close;

            openPositions.set(token.address, {
              tokenSymbol: token.symbol,
              tokenAddress: token.address,
              entryTime: time,
              entryPrice: candle.close,
              amount,
              investedUSD: actualPositionSize,
              candleIndex,
              signals: entrySignal,
            });

            currentCapital -= actualPositionSize;
          }
        }
      }
    }

    // Fechar posições abertas ao final
    openPositions.forEach((position, address) => {
      const token = historicalData.find(t => t.address === address);
      if (token) {
        const lastCandle = token.history[token.history.length - 1];
        const returnUSD = position.amount * lastCandle.close;
        const pnl = returnUSD - position.investedUSD;
        const exitTime = new Date(lastCandle.timestamp);
        const holdTimeMinutes = Math.abs((exitTime.getTime() - position.entryTime.getTime()) / (1000 * 60));

        trades.push({
          tokenSymbol: position.tokenSymbol,
          tokenAddress: position.tokenAddress,
          entryTime: position.entryTime,
          exitTime,
          entryPrice: position.entryPrice,
          exitPrice: lastCandle.close,
          amount: position.amount,
          investedUSD: position.investedUSD,
          returnUSD,
          pnl,
          pnlPercent: (pnl / position.investedUSD) * 100,
          holdTimeMinutes,
          exitReason: 'end_of_period',
          signals: position.signals,
        });
      }
    });

    return trades;
  }

  /**
   * Avalia sinal de entrada (simplificado)
   */
  private evaluateEntrySignal(token: any, candle: any, index: number): any {
    // Trading agressivo M5 - Detecta interesse forte de compra rapidamente
    // Alvo: 30-50 trades em 7 dias (modo scalper memecoin)

    const volumeIncrease = index > 0 ?
      ((candle.volume - token.history[index - 1].volume) / token.history[index - 1].volume) * 100 : 0;

    const priceIncrease = index > 0 ?
      ((candle.close - token.history[index - 1].close) / token.history[index - 1].close) * 100 : 0;

    // Filtro de liquidez mínima relaxado
    if (token.liquidity < this.botConfig.minLiquidity) {
      return { shouldEnter: false, volumeIncrease, priceIncrease, score: 0 };
    }

    // Verificar momentum positivo (preço subindo)
    let momentumPositive = true;
    if (index >= 1) {
      momentumPositive = candle.close > token.history[index - 1].close;
    }

    // DETECTA INTERESSE FORTE DE COMPRA - Seletivo mas ativo:
    // "Do nada tem MUITO interesse de compra? Compra!"
    const shouldEnter = (
      // Spike de volume + preço subindo
      (volumeIncrease > 80 && priceIncrease > 2.5) ||

      // Preço pump forte com volume
      (priceIncrease > 6 && volumeIncrease > 40) ||

      // Volume explosivo
      (volumeIncrease > 120) ||

      // Pump bom com momentum
      (momentumPositive && volumeIncrease > 70 && priceIncrease > 4) ||

      // Preço pump muito forte
      (priceIncrease > 10)
    );

    // Score baseado na força dos sinais
    let score = 30;
    if (shouldEnter) {
      score = Math.min(95, 50 + (volumeIncrease / 2) + (priceIncrease * 4));
    }

    return {
      shouldEnter,
      volumeIncrease,
      priceIncrease,
      score,
      momentumPositive,
    };
  }

  /**
   * Avalia sinal de saída
   */
  private evaluateExitSignal(position: any, candle: any, time: Date): any {
    const currentPrice = candle.close;
    const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

    // Atualizar highestPrice para trailing stop
    if (!position.highestPrice || currentPrice > position.highestPrice) {
      position.highestPrice = currentPrice;
    }

    // Stop loss fixo
    if (pnlPercent <= -this.botConfig.stopLossPercent) {
      return { shouldExit: true, reason: 'stop_loss' };
    }

    // Trailing stop - Ativa após ganho de 10% (agressivo para memecoin)
    if (pnlPercent > 10) {
      const dropFromHigh = ((position.highestPrice - currentPrice) / position.highestPrice) * 100;
      if (dropFromHigh > this.botConfig.trailingStopPercent) {
        return { shouldExit: true, reason: 'trailing_stop' };
      }
    }

    // Take profit
    if (pnlPercent >= this.botConfig.takeProfitPercent) {
      return { shouldExit: true, reason: 'take_profit' };
    }

    // Max hold time (2 horas)
    const holdTime = (time.getTime() - position.entryTime.getTime()) / (1000 * 60);
    if (holdTime > 120) {
      return { shouldExit: true, reason: 'max_hold_time' };
    }

    return { shouldExit: false };
  }

  /**
   * Calcula métricas de performance
   */
  private calculateMetrics(trades: BacktestTrade[]): BacktestResults {
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl <= 0);

    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const endCapital = this.config.initialCapital + totalPnl;
    const totalPnlPercent = (totalPnl / this.config.initialCapital) * 100;

    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

    const avgWin = winningTrades.length > 0 ?
      winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;

    const avgLoss = losingTrades.length > 0 ?
      Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length) : 0;

    const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;

    // Calcular max drawdown
    let peak = this.config.initialCapital;
    let maxDrawdown = 0;
    let currentCapital = this.config.initialCapital;

    for (const trade of trades) {
      currentCapital += trade.pnl;
      if (currentCapital > peak) {
        peak = currentCapital;
      }
      const drawdown = peak - currentCapital;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    const maxDrawdownPercent = (maxDrawdown / peak) * 100;

    // Calcular Sharpe Ratio
    const returns = trades.map(t => t.pnlPercent);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length || 0;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    ) || 1;
    const sharpeRatio = (avgReturn / stdDev) * Math.sqrt(252);

    // PnL diário
    const dailyPnl = this.calculateDailyPnl(trades);

    return {
      config: this.config,
      startCapital: this.config.initialCapital,
      endCapital,
      totalPnl,
      totalPnlPercent,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      maxDrawdown,
      maxDrawdownPercent,
      sharpeRatio,
      trades,
      dailyPnl,
    };
  }

  /**
   * Calcula PnL diário
   */
  private calculateDailyPnl(trades: BacktestTrade[]): any[] {
    const dailyMap = new Map<string, { pnl: number; capital: number }>();
    let currentCapital = this.config.initialCapital;

    for (const trade of trades) {
      const dateKey = trade.exitTime.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { pnl: 0, capital: currentCapital };
      existing.pnl += trade.pnl;
      currentCapital += trade.pnl;
      existing.capital = currentCapital;
      dailyMap.set(dateKey, existing);
    }

    return Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Salva resultados em arquivo
   */
  private async saveResults(results: BacktestResults): Promise<void> {
    try {
      const dir = path.join(process.cwd(), 'backtests');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const filename = `backtest_${Date.now()}.json`;
      const filepath = path.join(dir, filename);

      fs.writeFileSync(filepath, JSON.stringify(results, null, 2), 'utf-8');
      logger.info(`Results saved to: ${filepath}`);
    } catch (error) {
      logError(error, 'saveResults');
    }
  }

  /**
   * Exibe resumo dos resultados
   */
  private displaySummary(results: BacktestResults): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 BACKTEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Period: ${this.config.startDate.toLocaleDateString()} to ${this.config.endDate.toLocaleDateString()}`);
    console.log(`Duration: ${Math.round((this.config.endDate.getTime() - this.config.startDate.getTime()) / (1000 * 60 * 60 * 24))} days`);
    console.log('-'.repeat(60));
    console.log(`Start Capital:    $${results.startCapital.toFixed(2)}`);
    console.log(`End Capital:      $${results.endCapital.toFixed(2)}`);
    console.log(`Total PnL:        $${results.totalPnl.toFixed(2)} (${results.totalPnlPercent.toFixed(2)}%)`);
    console.log('-'.repeat(60));
    console.log(`Total Trades:     ${results.totalTrades}`);
    console.log(`Winning Trades:   ${results.winningTrades} (${results.winRate.toFixed(1)}%)`);
    console.log(`Losing Trades:    ${results.losingTrades}`);
    console.log(`Avg Win:          $${results.avgWin.toFixed(2)}`);
    console.log(`Avg Loss:         $${results.avgLoss.toFixed(2)}`);
    console.log(`Profit Factor:    ${results.profitFactor.toFixed(2)}`);
    console.log('-'.repeat(60));
    console.log(`Max Drawdown:     $${results.maxDrawdown.toFixed(2)} (${results.maxDrawdownPercent.toFixed(2)}%)`);
    console.log(`Sharpe Ratio:     ${results.sharpeRatio.toFixed(2)}`);
    console.log('='.repeat(60) + '\n');

    // Top 5 best trades
    console.log('🏆 TOP 5 BEST TRADES:');
    const bestTrades = [...results.trades]
      .sort((a, b) => b.pnlPercent - a.pnlPercent)
      .slice(0, 5);

    bestTrades.forEach((trade, i) => {
      console.log(`${i + 1}. ${trade.tokenSymbol}: +${trade.pnlPercent.toFixed(2)}% ($${trade.pnl.toFixed(2)}) - ${Math.round(trade.holdTimeMinutes)}min`);
    });

    console.log('\n' + '='.repeat(60) + '\n');
  }
}
