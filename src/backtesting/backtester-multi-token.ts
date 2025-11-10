import { BotConfig } from '../types';
import { logger } from '../utils/logger';
import { MultiTokenScanner, TokenScore } from '../scanner/multi-token-scanner';
import { BacktestConfig, BacktestTrade, BacktestResults } from './backtester';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

/**
 * Multi-Token Backtester
 *
 * Simula trading com MÚLTIPLOS tokens simultaneamente.
 * Scanner escolhe automaticamente os melhores tokens a cada momento.
 */
export class MultiTokenBacktester {
  private config: BacktestConfig;
  private botConfig: BotConfig;
  private scanner: MultiTokenScanner;

  constructor(config: BacktestConfig, botConfig: BotConfig) {
    this.config = config;
    this.botConfig = botConfig;
    this.scanner = new MultiTokenScanner(config.tokenAddresses);
  }

  async run(): Promise<BacktestResults> {
    logger.info('🔄 Starting MULTI-TOKEN backtesting...');
    logger.info(`Period: ${this.config.startDate.toISOString()} to ${this.config.endDate.toISOString()}`);
    logger.info(`Initial Capital: $${this.config.initialCapital}`);
    logger.info(`Max Concurrent Positions: ${this.botConfig.maxConcurrentPositions}`);

    // Fetch historical data
    const historicalData = await this.fetchHistoricalData();

    if (historicalData.length === 0) {
      throw new Error('No historical data found');
    }

    logger.info(`Found ${historicalData.length} tokens with historical data`);

    // Simulate trading with multi-token scanner
    const trades = await this.simulateMultiTokenTrading(historicalData);

    logger.info(`Simulated ${trades.length} trades`);

    // Calculate metrics
    const results = this.calculateMetrics(trades);

    // Save results
    await this.saveResults(results);

    // Display summary
    this.displaySummary(results);

    return results;
  }

  private async fetchHistoricalData(): Promise<any[]> {
    logger.info('Fetching popular tokens...');

    const popularTokens = await this.fetchPopularTokens();
    logger.info(`Using ${popularTokens.length} popular memecoins for backtest`);

    const tokenData: any[] = [];

    for (const token of popularTokens) {
      logger.info(`Fetching history for ${token.address}...`);
      const history = await this.fetchTokenHistory(token.address);

      if (history && history.length > 0) {
        tokenData.push({
          address: token.address,
          symbol: this.getTokenSymbol(token.address),
          name: this.getTokenName(token.address),
          liquidity: 50000 + Math.random() * 100000,
          history,
        });
      }
    }

    return tokenData;
  }

  private async fetchTokenHistory(address: string): Promise<any[]> {
    // Gera dados simulados (em produção, usar API real)
    const startTime = this.config.startDate.getTime();
    const endTime = this.config.endDate.getTime();
    const interval = 5 * 60 * 1000; // 5 minutos

    return this.generateSimulatedHistory(startTime, endTime, interval);
  }

  private generateSimulatedHistory(startTime: number, endTime: number, interval: number): any[] {
    const history: any[] = [];
    let price = 0.001 + Math.random() * 0.01;
    let baseVolume = 5000 + Math.random() * 10000;

    let pumpPhase = false;
    let pumpDuration = 0;

    for (let time = startTime; time <= endTime; time += interval) {
      // Iniciar pump aleatoriamente
      if (!pumpPhase && Math.random() < 0.02) { // 2% chance
        pumpPhase = true;
        pumpDuration = 3 + Math.floor(Math.random() * 8); // 3-10 candles
      }

      let volume = baseVolume;
      let priceChange = 0;

      if (pumpPhase && pumpDuration > 0) {
        // PUMP: Volume e preço sobem
        volume = baseVolume * (2 + Math.random() * 3); // 2x-5x volume
        priceChange = 0.03 + Math.random() * 0.08; // +3% a +11%
        pumpDuration--;

        if (pumpDuration === 0) {
          pumpPhase = false;
        }
      } else {
        // Normal: Pequenas variações
        const rand = Math.random();
        if (rand < 0.15) {
          priceChange = -0.02 - Math.random() * 0.03; // -2% a -5%
        } else if (rand < 0.30) {
          priceChange = 0.01 + Math.random() * 0.03; // +1% a +4%
        } else {
          priceChange = -0.01 + Math.random() * 0.02; // -1% a +1%
        }
      }

      price = price * (1 + priceChange);
      volume = volume * (0.9 + Math.random() * 0.2); // Variação de volume

      history.push({
        timestamp: time,
        open: price,
        high: price * (1 + Math.random() * 0.02),
        low: price * (1 - Math.random() * 0.02),
        close: price,
        volume,
      });
    }

    return history;
  }

  private async fetchPopularTokens(): Promise<any[]> {
    return [
      { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK' },
      { address: 'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82', symbol: 'POPCAT' },
      { address: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr', symbol: 'POPCAT' },
      { address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', symbol: 'WIF' },
      { address: 'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5', symbol: 'MEW' },
    ];
  }

  private getTokenSymbol(address: string): string {
    const map: any = {
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
      'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82': 'BOME',
      '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr': 'POPCAT',
      'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 'WIF',
      'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5': 'MEW',
    };
    return map[address] || 'UNKNOWN';
  }

  private getTokenName(address: string): string {
    const map: any = {
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'Bonk',
      'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82': 'Book of Meme',
      '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr': 'Popcat',
      'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 'dogwifhat',
      'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5': 'cat in a dogs world',
    };
    return map[address] || 'Unknown Token';
  }

  /**
   * CORE: Simula trading multi-token com scanner dinâmico
   */
  private async simulateMultiTokenTrading(historicalData: any[]): Promise<BacktestTrade[]> {
    const trades: BacktestTrade[] = [];
    let currentCapital = this.config.initialCapital;
    const openPositions: Map<string, any> = new Map();

    // Pega todos os timestamps únicos
    const allTimestamps = new Set<number>();
    historicalData.forEach(token => {
      token.history.forEach((candle: any) => allTimestamps.add(candle.timestamp));
    });
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    logger.info(`📊 Simulando trading multi-token em ${sortedTimestamps.length} candles...`);

    // Para cada timestamp (candle)
    for (const timestamp of sortedTimestamps) {
      const time = new Date(timestamp);

      // 1. SCANNER: Calcula score para TODOS os tokens
      const tokenScores = await this.scanner.scanAllTokens(historicalData, timestamp);

      // 2. VERIFICAR POSIÇÕES ABERTAS (sair se necessário)
      const positionsToClose: string[] = [];

      openPositions.forEach((position, address) => {
        const token = historicalData.find(t => t.address === address);
        if (!token) return;

        const candleIndex = token.history.findIndex((c: any) => c.timestamp === timestamp);
        if (candleIndex === -1) return;

        const currentCandle = token.history[candleIndex];
        const currentPrice = currentCandle.close;
        const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

        // Verifica se deve sair
        const shouldExit =
          pnlPercent <= -this.botConfig.stopLossPercent || // Stop loss
          pnlPercent >= this.botConfig.takeProfitPercent || // Take profit
          (pnlPercent > 10 && !this.scanner.shouldHoldPosition(token, timestamp, 50)); // Score baixo após lucro

        if (shouldExit) {
          const exitReason =
            pnlPercent <= -this.botConfig.stopLossPercent ? 'Stop Loss' :
            pnlPercent >= this.botConfig.takeProfitPercent ? 'Take Profit' :
            'Score Fraco';

          const pnl = (currentPrice - position.entryPrice) * position.amount;
          const returnUSD = position.investedUSD + pnl;

          currentCapital += returnUSD;

          trades.push({
            tokenSymbol: position.symbol,
            tokenAddress: address,
            entryTime: position.entryTime,
            exitTime: time,
            entryPrice: position.entryPrice,
            exitPrice: currentPrice,
            amount: position.amount,
            investedUSD: position.investedUSD,
            returnUSD,
            pnl,
            pnlPercent,
            holdTimeMinutes: Math.abs((time.getTime() - position.entryTime.getTime()) / (1000 * 60)),
            exitReason,
            signals: position.signals,
          });

          positionsToClose.push(address);
        }
      });

      // Remove posições fechadas
      positionsToClose.forEach(addr => openPositions.delete(addr));

      // 3. SCANNER: Procurar NOVAS oportunidades
      const availableSlots = this.botConfig.maxConcurrentPositions - openPositions.size;

      if (availableSlots > 0 && currentCapital > this.config.initialCapital * 0.1) {
        // Filtra tokens com score mínimo (70+)
        const minScore = 70;
        const goodOpportunities = this.scanner.filterByThreshold(tokenScores, minScore);

        // Pega top N oportunidades (que ainda não estão abertas)
        const newOpportunities = goodOpportunities.filter(
          score => !openPositions.has(score.address)
        ).slice(0, availableSlots);

        // Entra nas melhores oportunidades
        for (const opportunity of newOpportunities) {
          const token = historicalData.find(t => t.address === opportunity.address);
          if (!token) continue;

          const candleIndex = token.history.findIndex((c: any) => c.timestamp === timestamp);
          if (candleIndex === -1) continue;

          const currentCandle = token.history[candleIndex];

          // Calcula position size
          const baseCapital = Math.min(currentCapital, this.config.initialCapital * 5);
          const positionSize = (baseCapital * this.botConfig.positionSizePercent) / 100;

          if (positionSize < 0.5) continue;

          const entryPrice = currentCandle.close;
          const amount = positionSize / entryPrice;

          currentCapital -= positionSize;

          openPositions.set(opportunity.address, {
            symbol: opportunity.symbol,
            entryTime: time,
            entryPrice,
            amount,
            investedUSD: positionSize,
            signals: opportunity,
          });
        }
      }
    }

    // Fecha posições restantes
    openPositions.forEach((position, address) => {
      const token = historicalData.find(t => t.address === address);
      if (!token || token.history.length === 0) return;

      const lastCandle = token.history[token.history.length - 1];
      const currentPrice = lastCandle.close;
      const pnl = (currentPrice - position.entryPrice) * position.amount;
      const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

      trades.push({
        tokenSymbol: position.symbol,
        tokenAddress: address,
        entryTime: position.entryTime,
        exitTime: new Date(lastCandle.timestamp),
        entryPrice: position.entryPrice,
        exitPrice: currentPrice,
        amount: position.amount,
        investedUSD: position.investedUSD,
        returnUSD: position.investedUSD + pnl,
        pnl,
        pnlPercent,
        holdTimeMinutes: Math.abs((lastCandle.timestamp - position.entryTime.getTime()) / (1000 * 60)),
        exitReason: 'End of Period',
        signals: position.signals,
      });
    });

    return trades;
  }

  private calculateMetrics(trades: BacktestTrade[]): BacktestResults {
    const startCapital = this.config.initialCapital;
    let currentCapital = startCapital;

    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl <= 0);

    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    currentCapital = startCapital + totalPnl;

    const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));

    const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;

    // Max drawdown
    let peak = startCapital;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;

    for (const trade of trades) {
      currentCapital += trade.pnl;
      if (currentCapital > peak) {
        peak = currentCapital;
      }
      const drawdown = peak - currentCapital;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPercent = (drawdown / peak) * 100;
      }
    }

    // Sharpe Ratio (simplified)
    const returns = trades.map(t => t.pnlPercent);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    return {
      config: this.config,
      startCapital,
      endCapital: startCapital + totalPnl,
      totalPnl,
      totalPnlPercent: (totalPnl / startCapital) * 100,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: (winningTrades.length / trades.length) * 100,
      avgWin,
      avgLoss,
      profitFactor,
      maxDrawdown,
      maxDrawdownPercent,
      sharpeRatio,
      trades,
      dailyPnl: this.calculateDailyPnl(trades),
    };
  }

  private calculateDailyPnl(trades: BacktestTrade[]): any[] {
    const dailyMap = new Map<string, any>();
    let currentCapital = this.config.initialCapital;

    for (const trade of trades) {
      const dateKey = trade.exitTime.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { pnl: 0, capital: currentCapital };
      existing.pnl += trade.pnl;
      currentCapital += trade.pnl;
      existing.capital = currentCapital;
      dailyMap.set(dateKey, existing);
    }

    return Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      pnl: data.pnl,
      capital: data.capital,
    }));
  }

  private async saveResults(results: BacktestResults): Promise<void> {
    const dir = path.join(__dirname, '../../backtests');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filename = `backtest_multi_${Date.now()}.json`;
    const filepath = path.join(dir, filename);

    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
    logger.info(`Results saved to: ${filepath}`);
  }

  private displaySummary(results: BacktestResults): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MULTI-TOKEN BACKTEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Period: ${this.config.startDate.toLocaleDateString()} to ${this.config.endDate.toLocaleDateString()}`);
    console.log(`Duration: ${Math.ceil((this.config.endDate.getTime() - this.config.startDate.getTime()) / (1000 * 60 * 60 * 24))} days`);
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
    console.log('='.repeat(60));

    // Top 5 trades
    const bestTrades = results.trades
      .sort((a, b) => b.pnlPercent - a.pnlPercent)
      .slice(0, 5);

    console.log('\n🏆 TOP 5 BEST TRADES:');
    bestTrades.forEach((trade, i) => {
      console.log(
        `${i + 1}. ${trade.tokenSymbol}: +${trade.pnlPercent.toFixed(2)}% ($${trade.pnl.toFixed(2)}) - ${Math.round(trade.holdTimeMinutes)}min`
      );
    });

    console.log('\n' + '='.repeat(60) + '\n');
  }
}
