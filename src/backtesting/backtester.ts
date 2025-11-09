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

      // Usar DexScreener para dados históricos
      const response = await axios.get(
        `https://api.dexscreener.com/latest/dex/tokens/${address}`,
        { timeout: 10000 }
      );

      const pair = response.data?.pairs?.[0];
      if (!pair) return null;

      // Buscar dados OHLCV (Open, High, Low, Close, Volume)
      // Nota: DexScreener free não tem histórico completo
      // Para produção, usar APIs pagas (Birdeye, DexTools Pro)

      return {
        address,
        symbol: pair.baseToken.symbol,
        name: pair.baseToken.name,
        pairAddress: pair.pairAddress,
        priceUsd: parseFloat(pair.priceUsd || '0'),
        volume24h: parseFloat(pair.volume?.h24 || '0'),
        liquidity: parseFloat(pair.liquidity?.usd || '0'),
        // Simular dados históricos (em produção, usar API real)
        history: this.generateSimulatedHistory(pair),
      };
    } catch (error) {
      logError(error, `fetchTokenHistory: ${address}`);
      return null;
    }
  }

  /**
   * Gera histórico simulado (para demonstração)
   * Em produção, usar APIs com dados reais (Birdeye, DexTools)
   */
  private generateSimulatedHistory(pair: any): any[] {
    const history: any[] = [];
    const basePrice = parseFloat(pair.priceUsd || '0');
    const startTime = this.config.startDate.getTime();
    const endTime = this.config.endDate.getTime();
    const interval = 5 * 60 * 1000; // 5 minutos

    let currentPrice = basePrice;

    for (let time = startTime; time <= endTime; time += interval) {
      // Simular movimento de preço (random walk)
      const change = (Math.random() - 0.5) * 0.1; // ±5%
      currentPrice = currentPrice * (1 + change);

      const volume = Math.random() * parseFloat(pair.volume?.h24 || '1000');

      history.push({
        timestamp: time,
        open: currentPrice,
        high: currentPrice * 1.02,
        low: currentPrice * 0.98,
        close: currentPrice,
        volume,
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
   * Simula trading com dados históricos
   */
  private async simulateTrading(historicalData: any[]): Promise<BacktestTrade[]> {
    const trades: BacktestTrade[] = [];
    let currentCapital = this.config.initialCapital;
    let openPositions: Map<string, any> = new Map();

    logger.info('Simulating trading...');

    // Para cada token
    for (const token of historicalData) {
      // Para cada ponto no histórico
      for (let i = 0; i < token.history.length; i++) {
        const candle = token.history[i];
        const time = new Date(candle.timestamp);

        // Verificar sinais de entrada
        const entrySignal = this.evaluateEntrySignal(token, candle, i);

        if (entrySignal.shouldEnter && openPositions.size < this.botConfig.maxConcurrentPositions) {
          // Abrir posição
          const positionSize = (currentCapital * this.botConfig.positionSizePercent) / 100;
          const amount = positionSize / candle.close;

          openPositions.set(token.address, {
            tokenSymbol: token.symbol,
            tokenAddress: token.address,
            entryTime: time,
            entryPrice: candle.close,
            amount,
            investedUSD: positionSize,
            entryIndex: i,
            signals: entrySignal,
          });

          currentCapital -= positionSize;
        }

        // Verificar posições abertas para saída
        openPositions.forEach((position, address) => {
          const exitSignal = this.evaluateExitSignal(position, candle, time);

          if (exitSignal.shouldExit) {
            // Fechar posição
            const returnUSD = position.amount * candle.close;
            const pnl = returnUSD - position.investedUSD;
            const pnlPercent = (pnl / position.investedUSD) * 100;
            const holdTimeMinutes = (time.getTime() - position.entryTime.getTime()) / (1000 * 60);

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
            openPositions.delete(address);
          }
        });
      }
    }

    // Fechar posições abertas ao final
    openPositions.forEach((position, address) => {
      const token = historicalData.find(t => t.address === address);
      if (token) {
        const lastCandle = token.history[token.history.length - 1];
        const returnUSD = position.amount * lastCandle.close;
        const pnl = returnUSD - position.investedUSD;

        trades.push({
          tokenSymbol: position.tokenSymbol,
          tokenAddress: position.tokenAddress,
          entryTime: position.entryTime,
          exitTime: new Date(lastCandle.timestamp),
          entryPrice: position.entryPrice,
          exitPrice: lastCandle.close,
          amount: position.amount,
          investedUSD: position.investedUSD,
          returnUSD,
          pnl,
          pnlPercent: (pnl / position.investedUSD) * 100,
          holdTimeMinutes: (lastCandle.timestamp - position.entryTime.getTime()) / (1000 * 60),
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
    // Implementar lógica de entrada similar ao bot real
    // Usar critérios mais realistas e flexíveis

    const volumeIncrease = index > 0 ?
      ((candle.volume - token.history[index - 1].volume) / token.history[index - 1].volume) * 100 : 0;

    const priceIncrease = index > 0 ?
      ((candle.close - token.history[index - 1].close) / token.history[index - 1].close) * 100 : 0;

    // Critérios mais realistas para entrada:
    // 1. Volume alto + preço subindo moderadamente
    // 2. Volume muito alto sozinho (indica interesse forte)
    // 3. Preço subindo forte + volume moderado
    // 4. Sinais moderados mas ambos presentes
    const shouldEnter =
      (volumeIncrease > 100 && priceIncrease > 2) ||  // Volume dobrou + preço subindo
      (volumeIncrease > 150) ||                        // Volume muito alto
      (volumeIncrease > 50 && priceIncrease > 5) ||   // Volume +50% + preço forte
      (volumeIncrease > 30 && priceIncrease > 3);     // Ambos moderados

    // Score baseado na força dos sinais
    let score = 30;
    if (shouldEnter) {
      score = Math.min(95, 50 + (volumeIncrease / 5) + (priceIncrease * 3));
    }

    return {
      shouldEnter,
      volumeIncrease,
      priceIncrease,
      score,
    };
  }

  /**
   * Avalia sinal de saída
   */
  private evaluateExitSignal(position: any, candle: any, time: Date): any {
    const currentPrice = candle.close;
    const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

    // Stop loss
    if (pnlPercent <= -this.botConfig.stopLossPercent) {
      return { shouldExit: true, reason: 'stop_loss' };
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
