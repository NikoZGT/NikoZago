import {
  BotConfig,
  Position,
  Trade,
  TradeLog,
  BotStatus,
  RiskMetrics,
  Token,
} from '../types';
import { logger, logError, logPerformance } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export class RiskManager {
  private config: BotConfig;
  private positions: Map<string, Position>;
  private trades: Trade[];
  private tradeLogs: TradeLog[];
  private status: BotStatus;

  constructor(config: BotConfig) {
    this.config = config;
    this.positions = new Map();
    this.trades = [];
    this.tradeLogs = [];
    this.status = {
      isRunning: false,
      isPaused: false,
      currentCapital: config.initialCapital,
      openPositions: 0,
      consecutiveLosses: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalPnl: 0,
      totalPnlPercent: 0,
      startTime: new Date(),
    };

    this.loadState();
  }

  /**
   * Check if bot can open new position
   */
  canOpenPosition(): { allowed: boolean; reason?: string } {
    if (this.status.isPaused) {
      return { allowed: false, reason: 'Bot is paused' };
    }

    if (!this.status.isRunning) {
      return { allowed: false, reason: 'Bot is not running' };
    }

    if (this.status.openPositions >= this.config.maxConcurrentPositions) {
      return {
        allowed: false,
        reason: `Maximum concurrent positions reached (${this.config.maxConcurrentPositions})`,
      };
    }

    if (this.status.consecutiveLosses >= this.config.maxConsecutiveLosses) {
      return {
        allowed: false,
        reason: `Maximum consecutive losses reached (${this.config.maxConsecutiveLosses})`,
      };
    }

    return { allowed: true };
  }

  /**
   * Add new position
   */
  addPosition(position: Position): void {
    this.positions.set(position.id, position);
    this.status.openPositions = this.positions.size;
    logger.info(`Position opened: ${position.token.symbol} (${position.id})`);
    this.saveState();
  }

  /**
   * Update existing position
   */
  updatePosition(positionId: string, updates: Partial<Position>): void {
    const position = this.positions.get(positionId);
    if (!position) {
      logger.warn(`Position not found: ${positionId}`);
      return;
    }

    const updatedPosition = { ...position, ...updates };
    this.positions.set(positionId, updatedPosition);
    this.saveState();
  }

  /**
   * Close position
   */
  closePosition(
    positionId: string,
    exitPrice: number,
    exitReason: TradeLog['exitReason']
  ): void {
    const position = this.positions.get(positionId);
    if (!position) {
      logger.warn(`Position not found: ${positionId}`);
      return;
    }

    const exitTime = new Date();
    const holdTime = (exitTime.getTime() - position.entryTime.getTime()) / (1000 * 60); // minutes

    const returnUSD = position.amount * exitPrice;
    const pnl = returnUSD - position.investedUSD;
    const pnlPercent = (pnl / position.investedUSD) * 100;

    // Create trade log
    const tradeLog: TradeLog = {
      positionId: position.id,
      token: position.token,
      entryPrice: position.entryPrice,
      exitPrice,
      amount: position.amount,
      investedUSD: position.investedUSD,
      returnUSD,
      pnl,
      pnlPercent,
      entryTime: position.entryTime,
      exitTime,
      holdTime,
      exitReason,
      signals: position.signals,
      fees: 0, // TODO: Calculate actual fees
    };

    this.tradeLogs.push(tradeLog);

    // Update bot status
    this.status.totalTrades++;
    this.status.totalPnl += pnl;
    this.status.currentCapital += pnl;
    this.config.currentCapital = this.status.currentCapital;
    this.status.totalPnlPercent =
      ((this.status.currentCapital - this.config.initialCapital) / this.config.initialCapital) *
      100;
    this.status.lastTradeTime = exitTime;

    if (pnl > 0) {
      this.status.winningTrades++;
      this.status.consecutiveLosses = 0;
    } else {
      this.status.losingTrades++;
      this.status.consecutiveLosses++;
    }

    // Remove position
    this.positions.delete(positionId);
    this.status.openPositions = this.positions.size;

    logger.info(`Position closed: ${position.token.symbol} (${position.id})`, {
      pnl: pnl.toFixed(4),
      pnlPercent: pnlPercent.toFixed(2),
      exitReason,
    });

    // Check if bot should pause due to consecutive losses
    if (this.status.consecutiveLosses >= this.config.maxConsecutiveLosses) {
      this.pauseBot(`Maximum consecutive losses reached (${this.config.maxConsecutiveLosses})`);
    }

    this.saveState();
    this.saveTradeLog(tradeLog);
  }

  /**
   * Get all open positions
   */
  getOpenPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get position by ID
   */
  getPosition(positionId: string): Position | undefined {
    return this.positions.get(positionId);
  }

  /**
   * Get bot status
   */
  getStatus(): BotStatus {
    return this.status;
  }

  /**
   * Calculate risk metrics
   */
  calculateRiskMetrics(): RiskMetrics {
    if (this.tradeLogs.length === 0) {
      return {
        maxDrawdown: 0,
        sharpeRatio: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
      };
    }

    const wins = this.tradeLogs.filter((t) => t.pnl > 0);
    const losses = this.tradeLogs.filter((t) => t.pnl < 0);

    const totalWins = wins.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));

    const winRate = (wins.length / this.tradeLogs.length) * 100;
    const avgWin = wins.length > 0 ? totalWins / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins;

    // Calculate max drawdown
    let peak = this.config.initialCapital;
    let maxDrawdown = 0;
    let currentCapital = this.config.initialCapital;

    for (const trade of this.tradeLogs) {
      currentCapital += trade.pnl;
      if (currentCapital > peak) {
        peak = currentCapital;
      }
      const drawdown = ((peak - currentCapital) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Simple Sharpe ratio calculation (annualized)
    const returns = this.tradeLogs.map((t) => t.pnlPercent);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized

    return {
      maxDrawdown,
      sharpeRatio,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
    };
  }

  /**
   * Start bot
   */
  startBot(): void {
    this.status.isRunning = true;
    this.status.isPaused = false;
    this.status.startTime = new Date();
    logger.info('Bot started');
    this.saveState();
  }

  /**
   * Stop bot
   */
  stopBot(): void {
    this.status.isRunning = false;
    logger.info('Bot stopped');
    this.saveState();
  }

  /**
   * Pause bot
   */
  pauseBot(reason: string): void {
    this.status.isPaused = true;
    logger.warn(`Bot paused: ${reason}`);
    this.saveState();
  }

  /**
   * Resume bot
   */
  resumeBot(): void {
    this.status.isPaused = false;
    this.status.consecutiveLosses = 0;
    logger.info('Bot resumed');
    this.saveState();
  }

  /**
   * Save state to disk
   */
  private saveState(): void {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const state = {
        config: this.config,
        positions: Array.from(this.positions.values()),
        status: this.status,
      };

      fs.writeFileSync(
        path.join(dataDir, 'bot-state.json'),
        JSON.stringify(state, null, 2),
        'utf-8'
      );
    } catch (error) {
      logError(error, 'saveState');
    }
  }

  /**
   * Load state from disk
   */
  private loadState(): void {
    try {
      const stateFile = path.join(process.cwd(), 'data', 'bot-state.json');
      if (!fs.existsSync(stateFile)) {
        return;
      }

      const data = fs.readFileSync(stateFile, 'utf-8');
      const state = JSON.parse(data);

      // Restore positions
      if (state.positions) {
        for (const pos of state.positions) {
          this.positions.set(pos.id, {
            ...pos,
            entryTime: new Date(pos.entryTime),
          });
        }
      }

      // Restore status
      if (state.status) {
        this.status = {
          ...state.status,
          startTime: new Date(state.status.startTime),
          lastTradeTime: state.status.lastTradeTime
            ? new Date(state.status.lastTradeTime)
            : undefined,
        };
      }

      // Update config capital
      if (state.config) {
        this.config.currentCapital = state.config.currentCapital;
      }

      logger.info('State loaded from disk');
    } catch (error) {
      logError(error, 'loadState');
    }
  }

  /**
   * Save trade log to disk
   */
  private saveTradeLog(tradeLog: TradeLog): void {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const logFile = path.join(dataDir, 'trades.jsonl');
      const logLine = JSON.stringify(tradeLog) + '\n';

      fs.appendFileSync(logFile, logLine, 'utf-8');
    } catch (error) {
      logError(error, 'saveTradeLog');
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): void {
    const metrics = this.calculateRiskMetrics();

    const summary = {
      status: this.status,
      metrics,
      positions: this.getOpenPositions().map((p) => ({
        token: p.token.symbol,
        pnl: p.pnl.toFixed(4),
        pnlPercent: p.pnlPercent.toFixed(2),
        holdTime: ((Date.now() - p.entryTime.getTime()) / (1000 * 60)).toFixed(0) + 'm',
      })),
    };

    logPerformance(summary);
    logger.info('=== BOT PERFORMANCE SUMMARY ===');
    logger.info(`Capital: $${this.status.currentCapital.toFixed(2)} (${this.status.totalPnlPercent.toFixed(2)}%)`);
    logger.info(
      `Trades: ${this.status.totalTrades} (${this.status.winningTrades}W / ${this.status.losingTrades}L)`
    );
    logger.info(`Win Rate: ${metrics.winRate.toFixed(2)}%`);
    logger.info(`Profit Factor: ${metrics.profitFactor.toFixed(2)}`);
    logger.info(`Max Drawdown: ${metrics.maxDrawdown.toFixed(2)}%`);
    logger.info(`Open Positions: ${this.status.openPositions}`);
  }
}
