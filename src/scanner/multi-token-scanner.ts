import { logger } from '../utils/logger';

/**
 * Multi-Token Scanner
 *
 * Monitora MÚLTIPLAS moedas simultaneamente e calcula score de oportunidade.
 * Entra automaticamente na moeda com MELHOR sinal.
 */

export interface TokenScore {
  address: string;
  symbol: string;
  score: number;
  signals: {
    volumeSpike: number;
    priceSpike: number;
    momentum: number;
    liquidity: number;
  };
  currentPrice: number;
  timestamp: Date;
}

export class MultiTokenScanner {
  private monitoredTokens: string[] = [];

  constructor(tokens?: string[]) {
    this.monitoredTokens = tokens || this.getDefaultTokens();
  }

  /**
   * Tokens padrão para monitorar (memecoins populares Solana)
   */
  private getDefaultTokens(): string[] {
    return [
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
      'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82',  // POPCAT
      '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',  // POPCAT
      'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',  // WIF
      'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5',   // MEW
    ];
  }

  /**
   * Scan todos os tokens e retorna array ordenado por score
   */
  async scanAllTokens(historicalData: any[], currentTimestamp: number): Promise<TokenScore[]> {
    const scores: TokenScore[] = [];

    for (const token of historicalData) {
      const score = this.calculateTokenScore(token, currentTimestamp);
      if (score) {
        scores.push(score);
      }
    }

    // Ordena por score (maior primeiro)
    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * Calcula score de oportunidade para um token
   *
   * Score = 0-100
   * - 90-100: EXCELENTE (pump muito forte)
   * - 70-89:  BOM (pump forte)
   * - 50-69:  MODERADO (pump médio)
   * - 30-49:  FRACO (não recomendado)
   * - 0-29:   MUITO FRACO (evitar)
   */
  private calculateTokenScore(token: any, currentTimestamp: number): TokenScore | null {
    // Encontra candle atual
    const currentIndex = token.history.findIndex((c: any) => c.timestamp === currentTimestamp);
    if (currentIndex === -1 || currentIndex === 0) return null;

    const currentCandle = token.history[currentIndex];
    const prevCandle = token.history[currentIndex - 1];

    // Calcula sinais
    const volumeChange = ((currentCandle.volume - prevCandle.volume) / prevCandle.volume) * 100;
    const priceChange = ((currentCandle.close - prevCandle.close) / prevCandle.close) * 100;

    // Momentum (média dos últimos 3 candles)
    let momentumVolume = 0;
    let momentumPrice = 0;
    if (currentIndex >= 3) {
      const last3 = token.history.slice(currentIndex - 3, currentIndex);
      const avg3Candles = last3.reduce((sum: number, c: any) => sum + c.volume, 0) / 3;
      const baselineVolume = token.history[currentIndex - 4]?.volume || avg3Candles;
      momentumVolume = ((avg3Candles - baselineVolume) / baselineVolume) * 100;

      const startPrice = last3[0].close;
      const endPrice = currentCandle.close;
      momentumPrice = ((endPrice - startPrice) / startPrice) * 100;
    }

    // Calcula scores individuais (0-100)
    const signals = {
      volumeSpike: this.normalizeScore(volumeChange, 200, 50),    // Ideal: +200%, Min: +50%
      priceSpike: this.normalizeScore(priceChange, 10, 2),        // Ideal: +10%, Min: +2%
      momentum: this.normalizeScore(momentumVolume, 150, 30),     // Ideal: +150%, Min: +30%
      liquidity: this.normalizeScore(token.liquidity, 50000, 10000), // Ideal: $50k, Min: $10k
    };

    // Score final (média ponderada)
    const score = (
      signals.volumeSpike * 0.35 +  // Volume é MAIS importante (35%)
      signals.priceSpike * 0.25 +   // Preço importante (25%)
      signals.momentum * 0.30 +     // Momentum importante (30%)
      signals.liquidity * 0.10      // Liquidez menos importante (10%)
    );

    return {
      address: token.address,
      symbol: token.symbol,
      score: Math.round(score),
      signals,
      currentPrice: currentCandle.close,
      timestamp: new Date(currentTimestamp),
    };
  }

  /**
   * Normaliza valor para score 0-100
   */
  private normalizeScore(value: number, ideal: number, minimum: number): number {
    if (value <= 0) return 0;
    if (value >= ideal) return 100;
    if (value < minimum) return 0;

    // Linear entre minimum e ideal
    return ((value - minimum) / (ideal - minimum)) * 100;
  }

  /**
   * Filtra tokens que passam no threshold mínimo
   */
  filterByThreshold(scores: TokenScore[], minScore: number): TokenScore[] {
    return scores.filter(s => s.score >= minScore);
  }

  /**
   * Retorna top N melhores oportunidades
   */
  getTopOpportunities(scores: TokenScore[], count: number = 3): TokenScore[] {
    return scores.slice(0, count);
  }

  /**
   * Verifica se token ainda é uma boa oportunidade (para manter posição)
   */
  shouldHoldPosition(token: any, currentTimestamp: number, minScore: number = 40): boolean {
    const score = this.calculateTokenScore(token, currentTimestamp);
    return score !== null && score.score >= minScore;
  }
}
