import WebSocket from 'ws';
import { Token, Network } from '../types';
import { logger, logError } from '../utils/logger';
import { EventEmitter } from 'events';

export interface RealtimeTransaction {
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  valueUSD: number;
  timestamp: Date;
  txHash: string;
}

export interface RealtimeMetrics {
  buys: number;
  sells: number;
  buyVolume: number;
  sellVolume: number;
  avgBuySize: number;
  avgSellSize: number;
  priceChange: number;
  momentum: number; // -100 to +100
}

export class RealtimeMonitor extends EventEmitter {
  private connections: Map<string, WebSocket> = new Map();
  private metrics: Map<string, RealtimeMetrics> = new Map();
  private transactions: Map<string, RealtimeTransaction[]> = new Map();
  private readonly MAX_TX_HISTORY = 100;

  constructor() {
    super();
  }

  /**
   * Inicia monitoramento em tempo real de um token
   */
  async startMonitoring(token: Token): Promise<void> {
    try {
      logger.info(`Starting realtime monitoring for ${token.symbol}`);

      if (token.network === 'solana') {
        await this.monitorSolanaToken(token);
      } else {
        await this.monitorEVMToken(token);
      }

      // Inicializar métricas
      this.metrics.set(token.address, {
        buys: 0,
        sells: 0,
        buyVolume: 0,
        sellVolume: 0,
        avgBuySize: 0,
        avgSellSize: 0,
        priceChange: 0,
        momentum: 0,
      });

      this.transactions.set(token.address, []);
    } catch (error) {
      logError(error, `startMonitoring: ${token.symbol}`);
    }
  }

  /**
   * Para monitoramento de um token
   */
  stopMonitoring(token: Token): void {
    const ws = this.connections.get(token.address);
    if (ws) {
      ws.close();
      this.connections.delete(token.address);
      logger.info(`Stopped monitoring ${token.symbol}`);
    }
  }

  /**
   * Monitora token Solana via WebSocket
   */
  private async monitorSolanaToken(token: Token): Promise<void> {
    try {
      // Usar Birdeye WebSocket ou alternativa
      const ws = new WebSocket('wss://public-api.birdeye.so/socket');

      ws.on('open', () => {
        logger.info(`WebSocket connected for ${token.symbol}`);

        // Subscribe to token updates
        ws.send(
          JSON.stringify({
            type: 'subscribe',
            data: {
              address: token.address,
              chainId: 'solana',
            },
          })
        );
      });

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleSolanaMessage(token, message);
        } catch (error) {
          logError(error, 'WebSocket message parsing');
        }
      });

      ws.on('error', (error) => {
        logError(error, `WebSocket error for ${token.symbol}`);
      });

      ws.on('close', () => {
        logger.warn(`WebSocket closed for ${token.symbol}`);
        // Tentar reconectar após 5 segundos
        setTimeout(() => {
          if (this.connections.has(token.address)) {
            this.monitorSolanaToken(token);
          }
        }, 5000);
      });

      this.connections.set(token.address, ws);
    } catch (error) {
      logError(error, `monitorSolanaToken: ${token.symbol}`);
    }
  }

  /**
   * Monitora token EVM via polling (WebSocket não disponível para todos)
   */
  private async monitorEVMToken(token: Token): Promise<void> {
    try {
      // Para EVM, usar polling a cada 5 segundos
      const interval = setInterval(async () => {
        if (!this.connections.has(token.address)) {
          clearInterval(interval);
          return;
        }

        await this.pollEVMTransactions(token);
      }, 5000);

      // Armazenar referência do interval como "conexão"
      this.connections.set(token.address, interval as any);
    } catch (error) {
      logError(error, `monitorEVMToken: ${token.symbol}`);
    }
  }

  /**
   * Faz polling de transações EVM
   */
  private async pollEVMTransactions(token: Token): Promise<void> {
    try {
      // Implementar polling de transações via DexScreener ou similar
      // Por simplicidade, vou usar simulação
      logger.debug(`Polling transactions for ${token.symbol}`);
    } catch (error) {
      logError(error, `pollEVMTransactions: ${token.symbol}`);
    }
  }

  /**
   * Processa mensagem do WebSocket Solana
   */
  private handleSolanaMessage(token: Token, message: any): void {
    try {
      if (message.type === 'transaction') {
        const tx: RealtimeTransaction = {
          type: message.data.side,
          amount: parseFloat(message.data.amount || '0'),
          price: parseFloat(message.data.price || '0'),
          valueUSD: parseFloat(message.data.value || '0'),
          timestamp: new Date(message.data.timestamp),
          txHash: message.data.txHash,
        };

        this.addTransaction(token.address, tx);
        this.updateMetrics(token.address);

        // Emitir evento
        this.emit('transaction', { token, transaction: tx });
      }
    } catch (error) {
      logError(error, 'handleSolanaMessage');
    }
  }

  /**
   * Adiciona transação ao histórico
   */
  private addTransaction(tokenAddress: string, tx: RealtimeTransaction): void {
    const txs = this.transactions.get(tokenAddress) || [];
    txs.unshift(tx); // Adicionar no início

    // Manter apenas as últimas N transações
    if (txs.length > this.MAX_TX_HISTORY) {
      txs.pop();
    }

    this.transactions.set(tokenAddress, txs);
  }

  /**
   * Atualiza métricas em tempo real
   */
  private updateMetrics(tokenAddress: string): void {
    const txs = this.transactions.get(tokenAddress) || [];
    if (txs.length === 0) return;

    const buys = txs.filter((tx) => tx.type === 'buy');
    const sells = txs.filter((tx) => tx.type === 'sell');

    const buyVolume = buys.reduce((sum, tx) => sum + tx.valueUSD, 0);
    const sellVolume = sells.reduce((sum, tx) => sum + tx.valueUSD, 0);

    const avgBuySize = buys.length > 0 ? buyVolume / buys.length : 0;
    const avgSellSize = sells.length > 0 ? sellVolume / sells.length : 0;

    // Calcular momentum (-100 a +100)
    const totalVolume = buyVolume + sellVolume;
    const momentum = totalVolume > 0 ? ((buyVolume - sellVolume) / totalVolume) * 100 : 0;

    // Calcular mudança de preço
    const firstPrice = txs[txs.length - 1]?.price || 0;
    const lastPrice = txs[0]?.price || 0;
    const priceChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

    const metrics: RealtimeMetrics = {
      buys: buys.length,
      sells: sells.length,
      buyVolume,
      sellVolume,
      avgBuySize,
      avgSellSize,
      priceChange,
      momentum,
    };

    this.metrics.set(tokenAddress, metrics);

    // Emitir evento de atualização de métricas
    this.emit('metrics-update', { tokenAddress, metrics });
  }

  /**
   * Obtém métricas atuais de um token
   */
  getMetrics(tokenAddress: string): RealtimeMetrics | undefined {
    return this.metrics.get(tokenAddress);
  }

  /**
   * Obtém transações recentes
   */
  getRecentTransactions(tokenAddress: string, limit: number = 20): RealtimeTransaction[] {
    const txs = this.transactions.get(tokenAddress) || [];
    return txs.slice(0, limit);
  }

  /**
   * Detecta mudança súbita de momentum
   */
  detectMomentumShift(tokenAddress: string): {
    shifted: boolean;
    direction: 'up' | 'down' | 'neutral';
    strength: number;
  } {
    const metrics = this.metrics.get(tokenAddress);
    if (!metrics) {
      return { shifted: false, direction: 'neutral', strength: 0 };
    }

    const { momentum, buys, sells } = metrics;

    // Detectar shift se momentum > 50 ou < -50
    const shifted = Math.abs(momentum) > 50;
    const direction = momentum > 50 ? 'up' : momentum < -50 ? 'down' : 'neutral';
    const strength = Math.abs(momentum);

    if (shifted) {
      logger.warn(`⚡ Momentum shift detected: ${direction.toUpperCase()} (${strength.toFixed(0)}%)`);
    }

    return { shifted, direction, strength };
  }

  /**
   * Calcula score de interesse em tempo real
   */
  calculateInterestScore(tokenAddress: string): number {
    const metrics = this.metrics.get(tokenAddress);
    if (!metrics) return 0;

    let score = 0;

    // Mais compras que vendas (+30 pontos)
    if (metrics.buys > metrics.sells) {
      const ratio = metrics.sells > 0 ? metrics.buys / metrics.sells : metrics.buys;
      score += Math.min(30, ratio * 10);
    }

    // Volume de compras > volume de vendas (+30 pontos)
    if (metrics.buyVolume > metrics.sellVolume) {
      const ratio = metrics.sellVolume > 0 ? metrics.buyVolume / metrics.sellVolume : 2;
      score += Math.min(30, ratio * 15);
    }

    // Tamanho médio de compra > venda (+20 pontos)
    if (metrics.avgBuySize > metrics.avgSellSize) {
      score += 20;
    }

    // Momentum positivo (+20 pontos)
    if (metrics.momentum > 0) {
      score += Math.min(20, metrics.momentum / 5);
    }

    return Math.min(100, score);
  }

  /**
   * Para todos os monitoramentos
   */
  stopAll(): void {
    this.connections.forEach((ws, address) => {
      if (ws instanceof WebSocket) {
        ws.close();
      } else {
        clearInterval(ws as any);
      }
    });
    this.connections.clear();
    logger.info('Stopped all realtime monitoring');
  }
}
