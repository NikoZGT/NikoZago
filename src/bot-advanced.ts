import { loadConfig, validateConfig } from './config/bot.config';
import { ContractAnalyzer } from './services/contract-analyzer';
import { MarketSignalsAnalyzer } from './services/market-signals';
import { DexIntegrator } from './services/dex-integrator';
import { RiskManager } from './services/risk-manager';
import { OrderBookAnalyzer } from './services/orderbook-analyzer';
import { RealtimeMonitor } from './services/realtime-monitor';
import { MLStrategyOptimizer } from './services/ml-strategy';
import { MomentumDetector } from './services/momentum-detector';
import { EntryStrategy } from './strategies/entry';
import { ExitStrategy } from './strategies/exit';
import { Position, Token, TradeSignal } from './types';
import { logger, logError } from './utils/logger';
import * as cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';

/**
 * Bot de Trading Avançado com IA e Análise em Tempo Real
 */
export class AdvancedMemecoinTradingBot {
  private config = loadConfig();
  private riskManager: RiskManager;
  private entryStrategy: EntryStrategy;
  private exitStrategy: ExitStrategy;
  private dexIntegrator: DexIntegrator;

  // Novos módulos avançados
  private orderbookAnalyzer: OrderBookAnalyzer;
  private realtimeMonitor: RealtimeMonitor;
  private mlOptimizer: MLStrategyOptimizer;
  private momentumDetector: MomentumDetector;

  private scanInterval: NodeJS.Timeout | null = null;
  private monitorInterval: NodeJS.Timeout | null = null;
  private realtimeInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Validate configuration
    const errors = validateConfig(this.config);
    if (errors.length > 0) {
      logger.error('Configuration errors:', errors);
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }

    // Initialize core services
    this.riskManager = new RiskManager(this.config);
    this.entryStrategy = new EntryStrategy();
    this.exitStrategy = new ExitStrategy();
    this.dexIntegrator = new DexIntegrator(
      this.config.network,
      this.config.rpcUrl,
      this.config.walletPrivateKey
    );

    // Initialize advanced modules
    this.orderbookAnalyzer = new OrderBookAnalyzer();
    this.realtimeMonitor = new RealtimeMonitor();
    this.mlOptimizer = new MLStrategyOptimizer(this.config);
    this.momentumDetector = new MomentumDetector();

    // Setup event listeners
    this.setupEventListeners();

    logger.info('=== 🤖 ADVANCED MEMECOIN TRADING BOT INITIALIZED ===');
    logger.info(`Network: ${this.config.network}`);
    logger.info(`Initial Capital: $${this.config.initialCapital}`);
    logger.info(`Position Size: ${this.config.positionSizePercent}%`);
    logger.info(`Max Concurrent Positions: ${this.config.maxConcurrentPositions}`);
    logger.info(`AI/ML: ENABLED ✓`);
    logger.info(`Realtime Monitoring: ENABLED ✓`);
    logger.info(`Order Book Analysis: ENABLED ✓`);
    logger.info(`Momentum Detection: ENABLED ✓`);
  }

  /**
   * Configura event listeners para dados em tempo real
   */
  private setupEventListeners(): void {
    // Listener para novas transações
    this.realtimeMonitor.on('transaction', ({ token, transaction }) => {
      logger.debug(`New transaction for ${token.symbol}: ${transaction.type} $${transaction.valueUSD.toFixed(2)}`);
    });

    // Listener para atualização de métricas
    this.realtimeMonitor.on('metrics-update', ({ tokenAddress, metrics }) => {
      const position = this.riskManager
        .getOpenPositions()
        .find((p) => p.token.address === tokenAddress);

      if (position) {
        logger.debug(`Realtime metrics for ${position.token.symbol}:`, {
          momentum: metrics.momentum.toFixed(1),
          buys: metrics.buys,
          sells: metrics.sells,
        });

        // Detectar mudança súbita de momentum
        const momentumShift = this.realtimeMonitor.detectMomentumShift(tokenAddress);
        if (momentumShift.shifted && momentumShift.direction === 'down') {
          logger.warn(`⚠️ Negative momentum shift detected for ${position.token.symbol} - consider exit`);
        }
      }
    });
  }

  /**
   * Start the bot
   */
  async start(): Promise<void> {
    try {
      logger.info('🚀 Starting advanced bot...');

      // Start risk manager
      this.riskManager.startBot();

      // Exibir performance do modelo ML
      const mlPerf = this.mlOptimizer.getModelPerformance();
      logger.info('ML Model Performance:', {
        winRate: `${mlPerf.winRate.toFixed(1)}%`,
        avgReturn: `${mlPerf.avgReturn.toFixed(2)}%`,
        tradesAnalyzed: mlPerf.tradesAnalyzed,
      });

      // Start scanning for new tokens every 1 minute (mais frequente)
      this.scanInterval = setInterval(() => {
        this.scanAndEvaluateTokens().catch((error) => {
          logError(error, 'scanAndEvaluateTokens');
        });
      }, 60 * 1000); // 1 minuto

      // Start monitoring open positions every 15 seconds (mais frequente)
      this.monitorInterval = setInterval(() => {
        this.monitorPositions().catch((error) => {
          logError(error, 'monitorPositions');
        });
      }, 15 * 1000); // 15 segundos

      // Start realtime analysis every 5 seconds
      this.realtimeInterval = setInterval(() => {
        this.analyzeRealtimeData().catch((error) => {
          logError(error, 'analyzeRealtimeData');
        });
      }, 5 * 1000); // 5 segundos

      // Schedule performance summary every hour
      cron.schedule('0 * * * *', () => {
        this.riskManager.getPerformanceSummary();
      });

      // Schedule ML training every 6 hours
      cron.schedule('0 */6 * * *', () => {
        logger.info('🤖 Scheduled ML model training...');
        this.mlOptimizer.trainModel();
      });

      // Schedule cleanup every hour
      cron.schedule('0 * * * *', () => {
        this.momentumDetector.cleanup();
      });

      // Initial scan
      await this.scanAndEvaluateTokens();

      logger.info('✅ Advanced bot started successfully');
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
    logger.info('🛑 Stopping advanced bot...');

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    if (this.realtimeInterval) {
      clearInterval(this.realtimeInterval);
    }

    // Parar monitoramento em tempo real
    this.realtimeMonitor.stopAll();

    this.riskManager.stopBot();
    logger.info('Bot stopped');
  }

  /**
   * Scan for new tokens and evaluate entry with advanced analysis
   */
  private async scanAndEvaluateTokens(): Promise<void> {
    try {
      // Check if we can open new positions
      const canOpen = this.riskManager.canOpenPosition();
      if (!canOpen.allowed) {
        logger.debug(`Cannot open new position: ${canOpen.reason}`);
        return;
      }

      logger.info('🔍 Scanning for new tokens with advanced analysis...');

      // Find new tokens
      const newTokens = await this.entryStrategy.scanForNewTokens(this.config);

      if (newTokens.length === 0) {
        logger.debug('No new tokens found');
        return;
      }

      logger.info(`Found ${newTokens.length} new tokens to evaluate`);

      // Evaluate each token with advanced analysis
      for (const token of newTokens) {
        const canOpenNow = this.riskManager.canOpenPosition();
        if (!canOpenNow.allowed) {
          logger.info(`Stopping evaluation: ${canOpenNow.reason}`);
          break;
        }

        await this.evaluateAndEnterAdvanced(token);
      }
    } catch (error) {
      logError(error, 'scanAndEvaluateTokens');
    }
  }

  /**
   * Evaluate token with ADVANCED analysis (ML + Momentum + OrderBook + Realtime)
   */
  private async evaluateAndEnterAdvanced(token: Token): Promise<void> {
    try {
      logger.info(`\n=== 🔬 ADVANCED EVALUATION: ${token.symbol} (${token.address}) ===`);

      // Step 1: Análise básica de entrada
      const evaluation = await this.entryStrategy.evaluateEntry(token, this.config);

      if (!evaluation.shouldEnter) {
        logger.info(`❌ Basic evaluation failed for ${token.symbol}:`, evaluation.reasons);
        return;
      }

      logger.info(`✓ Basic evaluation passed for ${token.symbol}`);

      // Step 2: Análise de MOMENTUM
      logger.info('📊 Analyzing momentum...');
      const momentum = await this.momentumDetector.detectMomentum(token);

      if (momentum.direction !== 'bullish' || momentum.confidence < 60) {
        logger.info(`❌ Momentum not favorable: ${momentum.direction} (${momentum.confidence.toFixed(0)}% confidence)`);
        return;
      }

      logger.info(`✓ Momentum is ${momentum.direction} with ${momentum.confidence.toFixed(0)}% confidence`);

      // Step 3: Análise de ORDER BOOK
      logger.info('📈 Analyzing order book...');
      const orderBook = await this.orderbookAnalyzer.analyzeOrderBook(token);

      if (orderBook.buyPressure < 1.2) {
        logger.info(`❌ Insufficient buy pressure: ${orderBook.buyPressure.toFixed(2)}`);
        return;
      }

      logger.info(`✓ Buy pressure: ${orderBook.buyPressure.toFixed(2)}x`);

      // Step 4: Detectar SPIKE de interesse
      logger.info('🚀 Detecting interest spike...');
      const spike = await this.orderbookAnalyzer.detectInterestSpike(token);

      if (!spike.hasSpike && spike.confidence < 70) {
        logger.info(`❌ No significant spike detected (confidence: ${spike.confidence.toFixed(0)}%)`);
        return;
      }

      logger.info(`✓ Interest spike detected! Buyers: +${spike.buyersIncrease.toFixed(0)}%, Volume: +${spike.volumeIncrease.toFixed(0)}%`);

      // Step 5: Recomendação da IA
      logger.info('🤖 Getting AI recommendation...');
      const realtimeMetrics = {
        momentum: momentum.strength,
        interestScore: spike.confidence,
      };

      const aiRecommendation = this.mlOptimizer.recommendAction(
        evaluation.signal!,
        realtimeMetrics
      );

      if (aiRecommendation.action !== 'enter') {
        logger.info(`❌ AI recommends: ${aiRecommendation.action} (${aiRecommendation.reasoning.join(', ')})`);
        return;
      }

      logger.info(`✓ AI recommends ENTER with ${aiRecommendation.confidence.toFixed(0)}% confidence`);

      // Todas as verificações passaram! Executar entrada
      logger.info(`\n🎯 ALL CHECKS PASSED! Entering position...`);
      logger.info(`Signal Score: ${evaluation.signal!.score}`);
      logger.info(`Momentum: ${momentum.strength}% ${momentum.direction}`);
      logger.info(`Buy Pressure: ${orderBook.buyPressure.toFixed(2)}x`);
      logger.info(`Interest Spike: +${spike.volumeIncrease.toFixed(0)}% volume`);
      logger.info(`AI Confidence: ${aiRecommendation.confidence.toFixed(0)}%`);

      // Add anti-frontrun delay
      await this.entryStrategy.addEntryDelay(5);

      // Calculate position size (pode usar parâmetros ML)
      const positionSizeUSD = this.entryStrategy.calculatePositionSize(this.config);

      logger.info(`Opening position: ${token.symbol} with $${positionSizeUSD.toFixed(2)}`);

      // Execute buy order
      const buyResult = await this.dexIntegrator.buy(token, positionSizeUSD);

      if (!buyResult.success) {
        logger.error(`Failed to buy ${token.symbol}: ${buyResult.error}`);
        return;
      }

      // Create position with enhanced metadata
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

      // Start realtime monitoring for this token
      await this.realtimeMonitor.startMonitoring(token);

      logger.info(`\n✅ POSITION OPENED: ${token.symbol} (${position.id})`);
      logger.info(`Amount: ${position.amount.toFixed(6)} ${token.symbol}`);
      logger.info(`Entry Price: $${position.entryPrice.toFixed(8)}`);
      logger.info(`TX: ${buyResult.txHash}`);
      logger.info(`Realtime monitoring: STARTED ✓`);
    } catch (error) {
      logError(error, `evaluateAndEnterAdvanced: ${token.symbol}`);
    }
  }

  /**
   * Monitor open positions with advanced exit strategies
   */
  private async monitorPositions(): Promise<void> {
    try {
      const positions = this.riskManager.getOpenPositions();

      if (positions.length === 0) {
        return;
      }

      logger.debug(`\n📊 Monitoring ${positions.length} position(s)...`);

      for (const position of positions) {
        await this.evaluateAndExitAdvanced(position);
      }
    } catch (error) {
      logError(error, 'monitorPositions');
    }
  }

  /**
   * Evaluate position exit with ADVANCED analysis
   */
  private async evaluateAndExitAdvanced(position: Position): Promise<void> {
    try {
      // Get realtime metrics
      const realtimeMetrics = this.realtimeMonitor.getMetrics(position.token.address);

      // Standard exit evaluation
      const exitDecision = await this.exitStrategy.evaluateExit(position, this.config);

      // Log position status with realtime data
      const realtimeInfo = realtimeMetrics
        ? ` | Momentum: ${realtimeMetrics.momentum.toFixed(0)} | B/S: ${realtimeMetrics.buys}/${realtimeMetrics.sells}`
        : '';

      logger.debug(
        `${position.token.symbol}: PnL ${position.pnlPercent.toFixed(2)}%${realtimeInfo} | ${exitDecision.message}`
      );

      // Check for emergency exit based on realtime data
      if (realtimeMetrics) {
        const momentumShift = this.realtimeMonitor.detectMomentumShift(position.token.address);

        // Saída de emergência se momentum virar fortemente negativo
        if (
          momentumShift.shifted &&
          momentumShift.direction === 'down' &&
          momentumShift.strength > 70
        ) {
          logger.warn(`⚠️ EMERGENCY EXIT: Strong negative momentum for ${position.token.symbol}`);
          exitDecision.shouldExit = true;
          exitDecision.reason = 'volume_drop';
          exitDecision.percentToSell = 100;
        }
      }

      if (!exitDecision.shouldExit) {
        return;
      }

      logger.info(`🚪 Exit signal for ${position.token.symbol}: ${exitDecision.message}`);

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

        // Stop realtime monitoring
        this.realtimeMonitor.stopMonitoring(position.token);

        // Add to ML training data
        const tradeLog = this.getLastTradeLog(position.id);
        if (tradeLog) {
          this.mlOptimizer.addTradeData(tradeLog);
        }

        logger.info(`\n✅ POSITION CLOSED: ${position.token.symbol} (${position.id})`);
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

        logger.info(`\n✅ PARTIAL EXIT: ${position.token.symbol} (${exitDecision.percentToSell}%)`);
        logger.info(`Remaining: ${updatedPosition.amount.toFixed(6)} ${position.token.symbol}`);
        logger.info(`TX: ${sellResult.txHash}`);
      }
    } catch (error) {
      logError(error, `evaluateAndExitAdvanced: ${position.token.symbol}`);
    }
  }

  /**
   * Analyze realtime data for all monitored tokens
   */
  private async analyzeRealtimeData(): Promise<void> {
    try {
      const positions = this.riskManager.getOpenPositions();

      for (const position of positions) {
        const interestScore = this.realtimeMonitor.calculateInterestScore(
          position.token.address
        );

        if (interestScore > 80) {
          logger.info(`🔥 High interest for ${position.token.symbol}: ${interestScore.toFixed(0)}/100`);
        }
      }
    } catch (error) {
      logError(error, 'analyzeRealtimeData');
    }
  }

  /**
   * Get last trade log for a position
   */
  private getLastTradeLog(positionId: string): any {
    // Este método seria implementado no RiskManager
    // Por enquanto, retornar null
    return null;
  }

  /**
   * Get bot status
   */
  getStatus(): void {
    this.riskManager.getPerformanceSummary();

    const mlPerf = this.mlOptimizer.getModelPerformance();
    logger.info('\n=== ML MODEL STATUS ===');
    logger.info(`Win Rate: ${mlPerf.winRate.toFixed(1)}%`);
    logger.info(`Avg Return: ${mlPerf.avgReturn.toFixed(2)}%`);
    logger.info(`Sharpe Ratio: ${mlPerf.sharpeRatio.toFixed(2)}`);
    logger.info(`Trades Analyzed: ${mlPerf.tradesAnalyzed}`);
  }
}

// Main execution
async function main() {
  try {
    const bot = new AdvancedMemecoinTradingBot();

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

export default AdvancedMemecoinTradingBot;
