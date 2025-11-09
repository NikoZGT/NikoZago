import { loadConfig, validateConfig } from './config/bot.config';
import { ContractAnalyzer } from './services/contract-analyzer';
import { MarketSignalsAnalyzer } from './services/market-signals';
import { DexIntegrator } from './services/dex-integrator';
import { RiskManager } from './services/risk-manager';
import { EntryStrategy } from './strategies/entry';
import { ExitStrategy } from './strategies/exit';
import { Position, Token } from './types';
import { logger, logError } from './utils/logger';
import * as cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';

export class MemecoinTradingBot {
  private config = loadConfig();
  private riskManager: RiskManager;
  private entryStrategy: EntryStrategy;
  private exitStrategy: ExitStrategy;
  private dexIntegrator: DexIntegrator;

  private scanInterval: NodeJS.Timeout | null = null;
  private monitorInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Validate configuration
    const errors = validateConfig(this.config);
    if (errors.length > 0) {
      logger.error('Configuration errors:', errors);
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }

    // Initialize services
    this.riskManager = new RiskManager(this.config);
    this.entryStrategy = new EntryStrategy();
    this.exitStrategy = new ExitStrategy();
    this.dexIntegrator = new DexIntegrator(
      this.config.network,
      this.config.rpcUrl,
      this.config.walletPrivateKey
    );

    logger.info('=== MEMECOIN TRADING BOT INITIALIZED ===');
    logger.info(`Network: ${this.config.network}`);
    logger.info(`Initial Capital: $${this.config.initialCapital}`);
    logger.info(`Position Size: ${this.config.positionSizePercent}%`);
    logger.info(`Max Concurrent Positions: ${this.config.maxConcurrentPositions}`);
  }

  /**
   * Start the bot
   */
  async start(): Promise<void> {
    try {
      logger.info('Starting bot...');

      // Start risk manager
      this.riskManager.startBot();

      // Start scanning for new tokens every 2 minutes
      this.scanInterval = setInterval(() => {
        this.scanAndEvaluateTokens().catch((error) => {
          logError(error, 'scanAndEvaluateTokens');
        });
      }, 2 * 60 * 1000); // 2 minutes

      // Start monitoring open positions every 30 seconds
      this.monitorInterval = setInterval(() => {
        this.monitorPositions().catch((error) => {
          logError(error, 'monitorPositions');
        });
      }, 30 * 1000); // 30 seconds

      // Schedule performance summary every hour
      cron.schedule('0 * * * *', () => {
        this.riskManager.getPerformanceSummary();
      });

      // Initial scan
      await this.scanAndEvaluateTokens();

      logger.info('Bot started successfully');
      logger.info('Press Ctrl+C to stop');
    } catch (error) {
      logError(error, 'start');
      throw error;
    }
  }

  /**
   * Stop the bot
   */
  stop(): void {
    logger.info('Stopping bot...');

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    this.riskManager.stopBot();
    logger.info('Bot stopped');
  }

  /**
   * Scan for new tokens and evaluate entry
   */
  private async scanAndEvaluateTokens(): Promise<void> {
    try {
      // Check if we can open new positions
      const canOpen = this.riskManager.canOpenPosition();
      if (!canOpen.allowed) {
        logger.info(`Cannot open new position: ${canOpen.reason}`);
        return;
      }

      logger.info('Scanning for new tokens...');

      // Find new tokens
      const newTokens = await this.entryStrategy.scanForNewTokens(this.config);

      if (newTokens.length === 0) {
        logger.info('No new tokens found');
        return;
      }

      logger.info(`Found ${newTokens.length} new tokens to evaluate`);

      // Evaluate each token
      for (const token of newTokens) {
        // Check again if we can still open positions
        const canOpenNow = this.riskManager.canOpenPosition();
        if (!canOpenNow.allowed) {
          logger.info(`Stopping evaluation: ${canOpenNow.reason}`);
          break;
        }

        await this.evaluateAndEnter(token);
      }
    } catch (error) {
      logError(error, 'scanAndEvaluateTokens');
    }
  }

  /**
   * Evaluate token and enter if criteria met
   */
  private async evaluateAndEnter(token: Token): Promise<void> {
    try {
      logger.info(`\n=== Evaluating ${token.symbol} (${token.address}) ===`);

      // Evaluate entry
      const evaluation = await this.entryStrategy.evaluateEntry(token, this.config);

      if (!evaluation.shouldEnter) {
        logger.info(`Entry rejected for ${token.symbol}:`, evaluation.reasons);
        return;
      }

      logger.info(`Entry approved for ${token.symbol}!`);

      // Add anti-frontrun delay
      await this.entryStrategy.addEntryDelay(5);

      // Calculate position size
      const positionSizeUSD = this.entryStrategy.calculatePositionSize(this.config);

      logger.info(`Opening position: ${token.symbol} with $${positionSizeUSD.toFixed(2)}`);

      // Execute buy order
      const buyResult = await this.dexIntegrator.buy(token, positionSizeUSD);

      if (!buyResult.success) {
        logger.error(`Failed to buy ${token.symbol}: ${buyResult.error}`);
        return;
      }

      // Create position
      const position: Position = {
        id: uuidv4(),
        token,
        entryPrice: evaluation.signal!.metrics.price,
        currentPrice: evaluation.signal!.metrics.price,
        amount: buyResult.amountOut || 0,
        investedUSD: positionSizeUSD,
        currentValueUSD: positionSizeUSD,
        pnl: 0,
        pnlPercent: 0,
        entryTime: new Date(),
        signals: evaluation.signal!,
      };

      // Add position to risk manager
      this.riskManager.addPosition(position);

      logger.info(`✅ Position opened: ${token.symbol} (${position.id})`);
      logger.info(`Amount: ${position.amount.toFixed(6)} ${token.symbol}`);
      logger.info(`Entry Price: $${position.entryPrice.toFixed(8)}`);
      logger.info(`TX: ${buyResult.txHash}`);
    } catch (error) {
      logError(error, `evaluateAndEnter: ${token.symbol}`);
    }
  }

  /**
   * Monitor open positions and execute exits
   */
  private async monitorPositions(): Promise<void> {
    try {
      const positions = this.riskManager.getOpenPositions();

      if (positions.length === 0) {
        return;
      }

      logger.info(`\n=== Monitoring ${positions.length} open position(s) ===`);

      for (const position of positions) {
        await this.evaluateAndExit(position);
      }
    } catch (error) {
      logError(error, 'monitorPositions');
    }
  }

  /**
   * Evaluate position and exit if criteria met
   */
  private async evaluateAndExit(position: Position): Promise<void> {
    try {
      // Evaluate exit
      const exitDecision = await this.exitStrategy.evaluateExit(position, this.config);

      // Log position status
      logger.info(
        `${position.token.symbol}: PnL ${position.pnlPercent.toFixed(2)}% | ${exitDecision.message}`
      );

      if (!exitDecision.shouldExit) {
        return;
      }

      logger.info(`Exit signal for ${position.token.symbol}: ${exitDecision.message}`);

      // Calculate amount to sell
      const amountToSell = this.exitStrategy.calculateSellAmount(
        position,
        exitDecision.percentToSell
      );

      // Execute sell order
      const sellResult = await this.dexIntegrator.sell(position.token, amountToSell);

      if (!sellResult.success) {
        logger.error(`Failed to sell ${position.token.symbol}: ${sellResult.error}`);
        return;
      }

      const exitPrice = position.currentPrice;

      // Check if full or partial exit
      if (exitDecision.percentToSell === 100) {
        // Full exit - close position
        this.riskManager.closePosition(position.id, exitPrice, exitDecision.reason!);

        logger.info(`✅ Position closed: ${position.token.symbol} (${position.id})`);
        logger.info(`Exit Reason: ${exitDecision.reason}`);
        logger.info(`Exit Price: $${exitPrice.toFixed(8)}`);
        logger.info(`PnL: $${position.pnl.toFixed(4)} (${position.pnlPercent.toFixed(2)}%)`);
        logger.info(`TX: ${sellResult.txHash}`);
      } else {
        // Partial exit - update position
        const updatedPosition = this.exitStrategy.updatePositionAfterSell(
          position,
          amountToSell,
          exitPrice
        );

        this.riskManager.updatePosition(position.id, updatedPosition);

        logger.info(`✅ Partial exit: ${position.token.symbol} (${exitDecision.percentToSell}%)`);
        logger.info(`Remaining: ${updatedPosition.amount.toFixed(6)} ${position.token.symbol}`);
        logger.info(`TX: ${sellResult.txHash}`);
      }
    } catch (error) {
      logError(error, `evaluateAndExit: ${position.token.symbol}`);
    }
  }

  /**
   * Get bot status
   */
  getStatus(): void {
    this.riskManager.getPerformanceSummary();
  }
}

// Main execution
async function main() {
  try {
    const bot = new MemecoinTradingBot();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      logger.info('\nReceived SIGINT, shutting down gracefully...');
      bot.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('\nReceived SIGTERM, shutting down gracefully...');
      bot.stop();
      process.exit(0);
    });

    // Start the bot
    await bot.start();
  } catch (error) {
    logError(error, 'main');
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  main();
}

export default MemecoinTradingBot;
