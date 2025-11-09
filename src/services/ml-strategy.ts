import { TradeLog, BotConfig, TradeSignal } from '../types';
import { logger, logError } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export interface StrategyParameters {
  // Thresholds adaptativos
  minSignalScore: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  trailingStopPercent: number;

  // Pesos para scoring
  volumeWeight: number;
  socialWeight: number;
  liquidityWeight: number;
  momentumWeight: number;

  // Timeouts
  maxHoldTimeMinutes: number;
  minHoldTimeMinutes: number;
}

export interface MLModel {
  parameters: StrategyParameters;
  performance: {
    winRate: number;
    avgReturn: number;
    sharpeRatio: number;
    tradesAnalyzed: number;
  };
  lastUpdate: Date;
  generation: number;
}

export class MLStrategyOptimizer {
  private model: MLModel;
  private trainingData: TradeLog[] = [];
  private readonly MODEL_FILE = path.join(process.cwd(), 'data', 'ml-model.json');
  private readonly MIN_TRADES_FOR_TRAINING = 10;

  constructor(initialConfig: BotConfig) {
    // Carregar modelo existente ou criar novo
    this.model = this.loadModel() || this.createInitialModel(initialConfig);
  }

  /**
   * Cria modelo inicial baseado na configuração
   */
  private createInitialModel(config: BotConfig): MLModel {
    return {
      parameters: {
        minSignalScore: 50,
        stopLossPercent: config.stopLossPercent,
        takeProfitPercent: config.takeProfitPercent,
        trailingStopPercent: config.trailingStopPercent,
        volumeWeight: 0.3,
        socialWeight: 0.2,
        liquidityWeight: 0.3,
        momentumWeight: 0.2,
        maxHoldTimeMinutes: 120, // 2 horas
        minHoldTimeMinutes: 5,
      },
      performance: {
        winRate: 0,
        avgReturn: 0,
        sharpeRatio: 0,
        tradesAnalyzed: 0,
      },
      lastUpdate: new Date(),
      generation: 0,
    };
  }

  /**
   * Adiciona trade para treinamento
   */
  addTradeData(trade: TradeLog): void {
    this.trainingData.push(trade);

    // Auto-treinar a cada 10 trades
    if (this.trainingData.length >= this.MIN_TRADES_FOR_TRAINING &&
        this.trainingData.length % 10 === 0) {
      this.trainModel();
    }
  }

  /**
   * Treina o modelo com dados históricos
   */
  trainModel(): void {
    try {
      if (this.trainingData.length < this.MIN_TRADES_FOR_TRAINING) {
        logger.info('Not enough trades for training');
        return;
      }

      logger.info(`🤖 Training ML model with ${this.trainingData.length} trades...`);

      // Separar trades vencedores e perdedores
      const winningTrades = this.trainingData.filter(t => t.pnl > 0);
      const losingTrades = this.trainingData.filter(t => t.pnl <= 0);

      const winRate = (winningTrades.length / this.trainingData.length) * 100;
      const avgReturn = this.trainingData.reduce((sum, t) => sum + t.pnlPercent, 0) / this.trainingData.length;

      logger.info(`Current performance: ${winRate.toFixed(1)}% win rate, ${avgReturn.toFixed(2)}% avg return`);

      // Analisar padrões dos trades vencedores
      const newParams = this.optimizeParameters(winningTrades, losingTrades);

      // Atualizar modelo
      this.model.parameters = newParams;
      this.model.performance = {
        winRate,
        avgReturn,
        sharpeRatio: this.calculateSharpeRatio(this.trainingData),
        tradesAnalyzed: this.trainingData.length,
      };
      this.model.lastUpdate = new Date();
      this.model.generation++;

      this.saveModel();

      logger.info(`✅ Model trained! Generation ${this.model.generation}`, {
        winRate: `${winRate.toFixed(1)}%`,
        avgReturn: `${avgReturn.toFixed(2)}%`,
        sharpeRatio: this.model.performance.sharpeRatio.toFixed(2),
      });
    } catch (error) {
      logError(error, 'trainModel');
    }
  }

  /**
   * Otimiza parâmetros baseado em análise de trades
   */
  private optimizeParameters(
    winningTrades: TradeLog[],
    losingTrades: TradeLog[]
  ): StrategyParameters {
    const current = this.model.parameters;

    // Analisar características dos trades vencedores
    const winStats = this.analyzeTradeCharacteristics(winningTrades);
    const loseStats = this.analyzeTradeCharacteristics(losingTrades);

    // Ajustar thresholds baseado em performance
    let minSignalScore = current.minSignalScore;
    let stopLossPercent = current.stopLossPercent;
    let takeProfitPercent = current.takeProfitPercent;
    let trailingStopPercent = current.trailingStopPercent;

    // Se win rate > 60%, ser mais agressivo
    const winRate = (winningTrades.length / (winningTrades.length + losingTrades.length)) * 100;

    if (winRate > 60) {
      // Aumentar take profit, diminuir stop loss
      takeProfitPercent = Math.min(60, takeProfitPercent + 2);
      stopLossPercent = Math.max(5, stopLossPercent - 0.5);
      minSignalScore = Math.max(40, minSignalScore - 2);
      logger.info('📈 Adjusting to be more aggressive (good win rate)');
    } else if (winRate < 40) {
      // Ser mais conservador
      takeProfitPercent = Math.max(30, takeProfitPercent - 2);
      stopLossPercent = Math.min(12, stopLossPercent + 0.5);
      minSignalScore = Math.min(70, minSignalScore + 2);
      logger.info('🛡️ Adjusting to be more conservative (low win rate)');
    }

    // Ajustar pesos baseado em quais sinais funcionaram melhor
    const volumeWeight = this.calculateFeatureWeight(winStats.avgVolumeChange, loseStats.avgVolumeChange);
    const socialWeight = this.calculateFeatureWeight(winStats.avgSocialSignals, loseStats.avgSocialSignals);
    const liquidityWeight = this.calculateFeatureWeight(winStats.avgLiquidity, loseStats.avgLiquidity);
    const momentumWeight = this.calculateFeatureWeight(winStats.avgMomentum, loseStats.avgMomentum);

    // Normalizar pesos para somar 1.0
    const totalWeight = volumeWeight + socialWeight + liquidityWeight + momentumWeight;

    // Ajustar hold time baseado em análise
    const maxHoldTimeMinutes = Math.round(winStats.avgHoldTime * 1.2); // 20% a mais que média vencedora
    const minHoldTimeMinutes = 3; // Mínimo absoluto

    return {
      minSignalScore,
      stopLossPercent,
      takeProfitPercent,
      trailingStopPercent,
      volumeWeight: volumeWeight / totalWeight,
      socialWeight: socialWeight / totalWeight,
      liquidityWeight: liquidityWeight / totalWeight,
      momentumWeight: momentumWeight / totalWeight,
      maxHoldTimeMinutes,
      minHoldTimeMinutes,
    };
  }

  /**
   * Analisa características de um conjunto de trades
   */
  private analyzeTradeCharacteristics(trades: TradeLog[]): {
    avgVolumeChange: number;
    avgSocialSignals: number;
    avgLiquidity: number;
    avgMomentum: number;
    avgHoldTime: number;
  } {
    if (trades.length === 0) {
      return {
        avgVolumeChange: 0,
        avgSocialSignals: 0,
        avgLiquidity: 0,
        avgMomentum: 0,
        avgHoldTime: 60,
      };
    }

    const stats = {
      avgVolumeChange: 0,
      avgSocialSignals: 0,
      avgLiquidity: 0,
      avgMomentum: 0,
      avgHoldTime: 0,
    };

    for (const trade of trades) {
      stats.avgVolumeChange += trade.signals.metrics.volumeChange15min;
      stats.avgSocialSignals += trade.signals.social.twitterMentionsChange;
      stats.avgLiquidity += trade.signals.metrics.liquidity;
      stats.avgHoldTime += trade.holdTime;
      // Momentum seria calculado se tivéssemos o dado
    }

    stats.avgVolumeChange /= trades.length;
    stats.avgSocialSignals /= trades.length;
    stats.avgLiquidity /= trades.length;
    stats.avgHoldTime /= trades.length;
    stats.avgMomentum = 0; // Placeholder

    return stats;
  }

  /**
   * Calcula peso de uma feature baseado em sua efetividade
   */
  private calculateFeatureWeight(winValue: number, loseValue: number): number {
    // Se feature tem valor muito maior em wins vs losses, dar mais peso
    if (loseValue === 0) return winValue > 0 ? 1 : 0.25;
    const ratio = Math.abs(winValue / loseValue);
    return Math.min(1, ratio * 0.25); // Normalizar
  }

  /**
   * Calcula Sharpe Ratio
   */
  private calculateSharpeRatio(trades: TradeLog[]): number {
    if (trades.length < 2) return 0;

    const returns = trades.map(t => t.pnlPercent);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );

    return stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized
  }

  /**
   * Calcula score dinâmico usando pesos otimizados
   */
  calculateDynamicScore(signal: TradeSignal): number {
    const params = this.model.parameters;
    let score = 0;

    // Volume (com peso ajustado)
    if (signal.metrics.volume24h >= 2000) {
      score += 10 * params.volumeWeight * 100;
    }
    if (signal.metrics.volumeChange15min >= 200) {
      score += 30 * params.volumeWeight * 100;
    }

    // Social (com peso ajustado)
    if (signal.social.twitterMentionsChange >= 300) {
      score += 20 * params.socialWeight * 100;
    }
    if (signal.social.sentiment === 'positive') {
      score += 10 * params.socialWeight * 100;
    }

    // Liquidez (com peso ajustado)
    if (signal.metrics.liquidity >= 25000) {
      score += 10 * params.liquidityWeight * 100;
    }
    if (signal.metrics.liquidity >= 50000) {
      score += 10 * params.liquidityWeight * 100;
    }

    // Market cap
    if (signal.metrics.marketCap > 0 && signal.metrics.marketCap < 1000000) {
      score += 10 * params.momentumWeight * 100;
    }

    return Math.min(100, score);
  }

  /**
   * Obtém parâmetros otimizados atuais
   */
  getOptimizedParameters(): StrategyParameters {
    return { ...this.model.parameters };
  }

  /**
   * Obtém performance do modelo
   */
  getModelPerformance(): MLModel['performance'] {
    return { ...this.model.performance };
  }

  /**
   * Salva modelo em disco
   */
  private saveModel(): void {
    try {
      const dataDir = path.dirname(this.MODEL_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      fs.writeFileSync(this.MODEL_FILE, JSON.stringify(this.model, null, 2), 'utf-8');
      logger.info('ML model saved to disk');
    } catch (error) {
      logError(error, 'saveModel');
    }
  }

  /**
   * Carrega modelo do disco
   */
  private loadModel(): MLModel | null {
    try {
      if (!fs.existsSync(this.MODEL_FILE)) {
        return null;
      }

      const data = fs.readFileSync(this.MODEL_FILE, 'utf-8');
      const model = JSON.parse(data);

      model.lastUpdate = new Date(model.lastUpdate);

      logger.info(`Loaded ML model (Generation ${model.generation})`);
      return model;
    } catch (error) {
      logError(error, 'loadModel');
      return null;
    }
  }

  /**
   * Recomenda ação baseada em análise de padrões
   */
  recommendAction(
    signal: TradeSignal,
    realtimeMetrics?: { momentum: number; interestScore: number }
  ): {
    action: 'enter' | 'wait' | 'skip';
    confidence: number;
    reasoning: string[];
  } {
    const score = this.calculateDynamicScore(signal);
    const params = this.model.parameters;
    const reasoning: string[] = [];

    // Adicionar análise de tempo real se disponível
    let adjustedScore = score;
    if (realtimeMetrics) {
      if (realtimeMetrics.momentum > 50) {
        adjustedScore += 10;
        reasoning.push(`Strong positive momentum (+${realtimeMetrics.momentum.toFixed(0)}%)`);
      }
      if (realtimeMetrics.interestScore > 70) {
        adjustedScore += 10;
        reasoning.push(`High interest score (${realtimeMetrics.interestScore.toFixed(0)})`);
      }
    }

    // Decisão baseada em score ajustado
    if (adjustedScore >= params.minSignalScore + 20) {
      return {
        action: 'enter',
        confidence: Math.min(100, adjustedScore),
        reasoning: ['Score exceeds threshold significantly', ...reasoning],
      };
    } else if (adjustedScore >= params.minSignalScore) {
      return {
        action: 'wait',
        confidence: adjustedScore,
        reasoning: ['Score meets minimum but wait for better signals', ...reasoning],
      };
    } else {
      return {
        action: 'skip',
        confidence: adjustedScore,
        reasoning: [`Score ${adjustedScore.toFixed(0)} below minimum ${params.minSignalScore}`, ...reasoning],
      };
    }
  }

  /**
   * Reseta modelo para padrões
   */
  resetModel(config: BotConfig): void {
    this.model = this.createInitialModel(config);
    this.trainingData = [];
    this.saveModel();
    logger.info('ML model reset to defaults');
  }
}
