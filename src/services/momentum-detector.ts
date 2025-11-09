import { Token } from '../types';
import { logger, logError } from '../utils/logger';
import { OrderBookAnalyzer } from './orderbook-analyzer';
import { RealtimeMonitor } from './realtime-monitor';

export interface MomentumSignal {
  strength: number; // 0-100
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-100
  indicators: {
    volumeSpike: boolean;
    buyerInflux: boolean;
    priceAcceleration: boolean;
    orderBookImbalance: boolean;
    socialBuzz: boolean;
  };
  score: number; // Score combinado
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
}

export class MomentumDetector {
  private orderbookAnalyzer: OrderBookAnalyzer;
  private realtimeMonitor: RealtimeMonitor;
  private priceHistory: Map<string, Array<{ price: number; timestamp: number }>> = new Map();

  constructor() {
    this.orderbookAnalyzer = new OrderBookAnalyzer();
    this.realtimeMonitor = new RealtimeMonitor();
  }

  /**
   * Detecta momentum completo de um token
   */
  async detectMomentum(token: Token): Promise<MomentumSignal> {
    try {
      logger.info(`🔍 Detecting momentum for ${token.symbol}...`);

      // Executar todas as análises em paralelo
      const [
        volumeSpike,
        buyerInflux,
        priceAccel,
        orderBookData,
        interestSpike,
      ] = await Promise.all([
        this.detectVolumeSpike(token),
        this.detectBuyerInflux(token),
        this.detectPriceAcceleration(token),
        this.orderbookAnalyzer.analyzeOrderBook(token),
        this.orderbookAnalyzer.detectInterestSpike(token),
      ]);

      // Analisar order book imbalance
      const orderBookImbalance = orderBookData.buyPressure > 1.5;

      // Analisar social buzz
      const socialBuzz = interestSpike.hasSpike || interestSpike.buyersIncrease > 200;

      // Calcular direção e força
      let bullishSignals = 0;
      let bearishSignals = 0;

      if (volumeSpike.detected && volumeSpike.direction === 'up') bullishSignals++;
      if (buyerInflux.detected && buyerInflux.buyerRatio > 1.5) bullishSignals++;
      if (priceAccel.detected && priceAccel.direction === 'up') bullishSignals++;
      if (orderBookImbalance) bullishSignals++;
      if (socialBuzz) bullishSignals++;

      if (volumeSpike.detected && volumeSpike.direction === 'down') bearishSignals++;
      if (buyerInflux.detected && buyerInflux.buyerRatio < 0.67) bearishSignals++;
      if (priceAccel.detected && priceAccel.direction === 'down') bearishSignals++;

      const totalSignals = bullishSignals + bearishSignals;
      const netSignals = bullishSignals - bearishSignals;

      let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (netSignals >= 2) direction = 'bullish';
      else if (netSignals <= -2) direction = 'bearish';

      // Calcular força (0-100)
      const strength = Math.min(100, Math.abs(netSignals) * 25);

      // Calcular confiança baseada em quantos indicadores concordam
      const confidence = totalSignals > 0 ? (Math.max(bullishSignals, bearishSignals) / 5) * 100 : 0;

      // Calcular score combinado
      const score = this.calculateCombinedScore({
        volumeSpike: volumeSpike.detected,
        buyerInflux: buyerInflux.detected,
        priceAcceleration: priceAccel.detected,
        orderBookImbalance,
        socialBuzz,
      }, direction);

      // Gerar recomendação
      const recommendation = this.generateRecommendation(direction, strength, confidence);

      const momentum: MomentumSignal = {
        strength,
        direction,
        confidence,
        indicators: {
          volumeSpike: volumeSpike.detected,
          buyerInflux: buyerInflux.detected,
          priceAcceleration: priceAccel.detected,
          orderBookImbalance,
          socialBuzz,
        },
        score,
        recommendation,
      };

      logger.info(`Momentum analysis for ${token.symbol}:`, {
        direction,
        strength: `${strength}%`,
        confidence: `${confidence.toFixed(0)}%`,
        score,
        recommendation,
      });

      return momentum;
    } catch (error) {
      logError(error, `detectMomentum: ${token.symbol}`);
      return {
        strength: 0,
        direction: 'neutral',
        confidence: 0,
        indicators: {
          volumeSpike: false,
          buyerInflux: false,
          priceAcceleration: false,
          orderBookImbalance: false,
          socialBuzz: false,
        },
        score: 0,
        recommendation: 'hold',
      };
    }
  }

  /**
   * Detecta spike de volume
   */
  private async detectVolumeSpike(token: Token): Promise<{
    detected: boolean;
    direction: 'up' | 'down';
    magnitude: number;
  }> {
    try {
      const spike = await this.orderbookAnalyzer.detectInterestSpike(token);

      return {
        detected: spike.volumeIncrease > 200,
        direction: spike.volumeIncrease > 0 ? 'up' : 'down',
        magnitude: Math.abs(spike.volumeIncrease),
      };
    } catch (error) {
      return { detected: false, direction: 'up', magnitude: 0 };
    }
  }

  /**
   * Detecta influxo de compradores vs vendedores
   */
  private async detectBuyerInflux(token: Token): Promise<{
    detected: boolean;
    buyerRatio: number;
    netFlow: number;
  }> {
    try {
      const pressure = await this.orderbookAnalyzer.analyzeBuySellPressure(token);

      return {
        detected: pressure.ratio !== 1,
        buyerRatio: pressure.ratio,
        netFlow: pressure.netFlow,
      };
    } catch (error) {
      return { detected: false, buyerRatio: 1, netFlow: 0 };
    }
  }

  /**
   * Detecta aceleração de preço
   */
  private async detectPriceAcceleration(token: Token): Promise<{
    detected: boolean;
    direction: 'up' | 'down';
    acceleration: number;
  }> {
    try {
      // Buscar histórico de preços
      const history = this.priceHistory.get(token.address) || [];

      // Adicionar preço atual
      const currentPrice = await this.getCurrentPrice(token);
      const now = Date.now();

      history.push({ price: currentPrice, timestamp: now });

      // Manter apenas últimos 10 minutos
      const tenMinutesAgo = now - 10 * 60 * 1000;
      const recentHistory = history.filter(h => h.timestamp > tenMinutesAgo);

      this.priceHistory.set(token.address, recentHistory);

      if (recentHistory.length < 3) {
        return { detected: false, direction: 'up', acceleration: 0 };
      }

      // Calcular aceleração (mudança da taxa de mudança)
      const prices = recentHistory.map(h => h.price);
      const changes = [];

      for (let i = 1; i < prices.length; i++) {
        const change = ((prices[i] - prices[i - 1]) / prices[i - 1]) * 100;
        changes.push(change);
      }

      // Aceleração = mudança está aumentando?
      const recentChange = changes[changes.length - 1];
      const avgPreviousChange = changes.slice(0, -1).reduce((sum, c) => sum + c, 0) / (changes.length - 1);

      const acceleration = recentChange - avgPreviousChange;
      const detected = Math.abs(acceleration) > 5; // 5% de aceleração

      return {
        detected,
        direction: acceleration > 0 ? 'up' : 'down',
        acceleration: Math.abs(acceleration),
      };
    } catch (error) {
      return { detected: false, direction: 'up', acceleration: 0 };
    }
  }

  /**
   * Busca preço atual do token
   */
  private async getCurrentPrice(token: Token): Promise<number> {
    try {
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${token.address}`
      );
      const data = await response.json();
      return parseFloat(data?.pairs?.[0]?.priceUsd || '0');
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calcula score combinado
   */
  private calculateCombinedScore(
    indicators: MomentumSignal['indicators'],
    direction: 'bullish' | 'bearish' | 'neutral'
  ): number {
    if (direction === 'neutral') return 50;

    let score = 0;

    // Cada indicador positivo adiciona pontos
    if (indicators.volumeSpike) score += 25;
    if (indicators.buyerInflux) score += 20;
    if (indicators.priceAcceleration) score += 20;
    if (indicators.orderBookImbalance) score += 20;
    if (indicators.socialBuzz) score += 15;

    return direction === 'bullish' ? score : 100 - score;
  }

  /**
   * Gera recomendação de ação
   */
  private generateRecommendation(
    direction: 'bullish' | 'bearish' | 'neutral',
    strength: number,
    confidence: number
  ): MomentumSignal['recommendation'] {
    if (direction === 'neutral') return 'hold';

    if (direction === 'bullish') {
      if (strength >= 75 && confidence >= 80) return 'strong_buy';
      if (strength >= 50 && confidence >= 60) return 'buy';
      return 'hold';
    } else {
      if (strength >= 75 && confidence >= 80) return 'strong_sell';
      if (strength >= 50 && confidence >= 60) return 'sell';
      return 'hold';
    }
  }

  /**
   * Limpa históricos antigos
   */
  cleanup(): void {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    this.priceHistory.forEach((history, address) => {
      const recent = history.filter(h => h.timestamp > oneHourAgo);
      if (recent.length === 0) {
        this.priceHistory.delete(address);
      } else {
        this.priceHistory.set(address, recent);
      }
    });
  }
}
