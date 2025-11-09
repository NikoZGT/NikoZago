import axios from 'axios';
import { Token, TokenMetrics, SocialSignals, TradeSignal } from '../types';
import { logger, logError, logSignal } from '../utils/logger';

export class MarketSignalsAnalyzer {
  private dexToolsApiKey: string;
  private twitterBearerToken: string;

  constructor() {
    this.dexToolsApiKey = process.env.DEXTOOLS_API_KEY || '';
    this.twitterBearerToken = process.env.TWITTER_BEARER_TOKEN || '';
  }

  /**
   * Get token metrics from DEX
   */
  async getTokenMetrics(token: Token): Promise<TokenMetrics> {
    try {
      logger.info(`Getting token metrics for ${token.symbol} (${token.address})`);

      if (token.network === 'solana') {
        return this.getSolanaMetrics(token);
      } else {
        return this.getEVMMetrics(token);
      }
    } catch (error) {
      logError(error, `getTokenMetrics: ${token.address}`);
      throw error;
    }
  }

  /**
   * Get Solana token metrics
   */
  private async getSolanaMetrics(token: Token): Promise<TokenMetrics> {
    try {
      // Use Jupiter, Birdeye, or DexScreener API
      const response = await axios.get(
        `https://api.dexscreener.com/latest/dex/tokens/${token.address}`,
        { timeout: 10000 }
      );

      const pair = response.data?.pairs?.[0];
      if (!pair) {
        throw new Error('No trading pair found');
      }

      const metrics: TokenMetrics = {
        price: parseFloat(pair.priceUsd || '0'),
        volume24h: parseFloat(pair.volume?.h24 || '0'),
        volume12h: parseFloat(pair.volume?.h12 || '0'),
        volumeChange15min: await this.getVolumeChange(token, 15),
        liquidity: parseFloat(pair.liquidity?.usd || '0'),
        marketCap: parseFloat(pair.fdv || '0'),
        holders: pair.holders || 0,
        age: this.calculateTokenAge(pair.pairCreatedAt),
      };

      return metrics;
    } catch (error) {
      logError(error, `getSolanaMetrics: ${token.address}`);
      throw error;
    }
  }

  /**
   * Get EVM token metrics
   */
  private async getEVMMetrics(token: Token): Promise<TokenMetrics> {
    try {
      const chain = token.network === 'bsc' ? 'bsc' : 'base';

      // Use DexScreener or DexTools
      const response = await axios.get(
        `https://api.dexscreener.com/latest/dex/tokens/${token.address}`,
        { timeout: 10000 }
      );

      const pair = response.data?.pairs?.find((p: any) => p.chainId === chain);
      if (!pair) {
        throw new Error('No trading pair found for this chain');
      }

      const metrics: TokenMetrics = {
        price: parseFloat(pair.priceUsd || '0'),
        volume24h: parseFloat(pair.volume?.h24 || '0'),
        volume12h: parseFloat(pair.volume?.h12 || '0'),
        volumeChange15min: await this.getVolumeChange(token, 15),
        liquidity: parseFloat(pair.liquidity?.usd || '0'),
        marketCap: parseFloat(pair.fdv || '0'),
        holders: pair.holders || 0,
        age: this.calculateTokenAge(pair.pairCreatedAt),
      };

      return metrics;
    } catch (error) {
      logError(error, `getEVMMetrics: ${token.address}`);
      throw error;
    }
  }

  /**
   * Calculate volume change percentage
   */
  private async getVolumeChange(token: Token, minutes: number): Promise<number> {
    try {
      // Get historical volume data
      const response = await axios.get(
        `https://api.dexscreener.com/latest/dex/tokens/${token.address}`,
        { timeout: 10000 }
      );

      const pair = response.data?.pairs?.[0];
      if (!pair?.volume) {
        return 0;
      }

      // Calculate change based on available data
      const currentVolume = parseFloat(pair.volume.h1 || '0');
      const previousVolume = parseFloat(pair.volume.h24 || '0') / 24;

      if (previousVolume === 0) return 0;

      const change = ((currentVolume - previousVolume) / previousVolume) * 100;
      return change;
    } catch (error) {
      logError(error, `getVolumeChange: ${token.address}`);
      return 0;
    }
  }

  /**
   * Calculate token age in hours
   */
  private calculateTokenAge(createdAt: number): number {
    if (!createdAt) return 0;
    const now = Date.now();
    const ageMs = now - createdAt * 1000;
    return ageMs / (1000 * 60 * 60); // Convert to hours
  }

  /**
   * Get social signals for token
   */
  async getSocialSignals(token: Token): Promise<SocialSignals> {
    try {
      logger.info(`Getting social signals for ${token.symbol}`);

      const [twitterData, sentiment] = await Promise.all([
        this.getTwitterMentions(token),
        this.analyzeSentiment(token),
      ]);

      return {
        twitterMentions: twitterData.mentions,
        twitterMentionsChange: twitterData.change,
        sentiment,
      };
    } catch (error) {
      logError(error, `getSocialSignals: ${token.symbol}`);
      return {
        twitterMentions: 0,
        twitterMentionsChange: 0,
        sentiment: 'neutral',
      };
    }
  }

  /**
   * Get Twitter mentions for token
   */
  private async getTwitterMentions(
    token: Token
  ): Promise<{ mentions: number; change: number }> {
    try {
      if (!this.twitterBearerToken) {
        logger.warn('Twitter Bearer Token not configured');
        return { mentions: 0, change: 0 };
      }

      // Search for token mentions in last 24h
      const query = `${token.symbol} OR ${token.name} OR ${token.address}`;
      const response = await axios.get('https://api.twitter.com/2/tweets/counts/recent', {
        headers: { Authorization: `Bearer ${this.twitterBearerToken}` },
        params: {
          query,
          granularity: 'hour',
        },
        timeout: 10000,
      });

      const data = response.data?.data || [];
      const currentHourMentions = data[data.length - 1]?.tweet_count || 0;
      const previousHourMentions = data[data.length - 2]?.tweet_count || 0;

      const change =
        previousHourMentions > 0
          ? ((currentHourMentions - previousHourMentions) / previousHourMentions) * 100
          : 0;

      return {
        mentions: currentHourMentions,
        change,
      };
    } catch (error) {
      logError(error, `getTwitterMentions: ${token.symbol}`);
      return { mentions: 0, change: 0 };
    }
  }

  /**
   * Analyze sentiment from social data
   */
  private async analyzeSentiment(
    token: Token
  ): Promise<'positive' | 'neutral' | 'negative'> {
    try {
      // Simple sentiment analysis based on available data
      // In production, use proper sentiment analysis API
      const response = await axios.get(
        `https://api.dexscreener.com/latest/dex/tokens/${token.address}`,
        { timeout: 10000 }
      );

      const pair = response.data?.pairs?.[0];
      if (!pair) return 'neutral';

      // Check price change
      const priceChange24h = parseFloat(pair.priceChange?.h24 || '0');
      const volumeChange24h = parseFloat(pair.volumeChange?.h24 || '0');

      if (priceChange24h > 20 && volumeChange24h > 50) {
        return 'positive';
      } else if (priceChange24h < -20 || volumeChange24h < -50) {
        return 'negative';
      }

      return 'neutral';
    } catch (error) {
      logError(error, `analyzeSentiment: ${token.symbol}`);
      return 'neutral';
    }
  }

  /**
   * Generate trade signal based on all data
   */
  async generateSignal(token: Token): Promise<TradeSignal> {
    try {
      logger.info(`Generating signal for ${token.symbol}`);

      const [metrics, social] = await Promise.all([
        this.getTokenMetrics(token),
        this.getSocialSignals(token),
      ]);

      // Calculate signal score (0-100)
      let score = 0;

      // Volume signals (40 points max)
      if (metrics.volume24h >= 2000) score += 10;
      if (metrics.volumeChange15min >= 200) score += 30;

      // Social signals (30 points max)
      if (social.twitterMentionsChange >= 300) score += 20;
      if (social.sentiment === 'positive') score += 10;

      // Liquidity signals (20 points max)
      if (metrics.liquidity >= 25000) score += 10;
      if (metrics.liquidity >= 50000) score += 10;

      // Market cap signals (10 points max)
      if (metrics.marketCap > 0 && metrics.marketCap < 1000000) score += 10;

      const signal: TradeSignal = {
        token,
        metrics,
        security: {
          lpLocked: false,
          lpLockedPercent: 0,
          hasMintFunction: false,
          hasBlacklist: false,
          buyTax: 0,
          sellTax: 0,
          topHoldersPercent: 0,
          isHoneypot: false,
          canSell: true,
        },
        social,
        score,
        timestamp: new Date(),
      };

      logSignal(signal);
      return signal;
    } catch (error) {
      logError(error, `generateSignal: ${token.symbol}`);
      throw error;
    }
  }

  /**
   * Validate if signal meets minimum requirements
   */
  validateSignal(
    signal: TradeSignal,
    config: {
      minVolume24h: number;
      minVolume12h: number;
      minLiquidity: number;
    }
  ): { passed: boolean; reasons: string[] } {
    const reasons: string[] = [];

    if (signal.metrics.volume24h < config.minVolume24h) {
      reasons.push(
        `Volume 24h $${signal.metrics.volume24h} < required $${config.minVolume24h}`
      );
    }

    if (signal.metrics.volume12h < config.minVolume12h) {
      reasons.push(
        `Volume 12h $${signal.metrics.volume12h} < required $${config.minVolume12h}`
      );
    }

    if (signal.metrics.liquidity < config.minLiquidity) {
      reasons.push(
        `Liquidity $${signal.metrics.liquidity} < required $${config.minLiquidity}`
      );
    }

    // Check for at least 2 positive signals
    let positiveSignals = 0;
    if (signal.social.twitterMentionsChange >= 300) positiveSignals++;
    if (signal.metrics.volumeChange15min >= 200) positiveSignals++;

    if (positiveSignals < 2) {
      reasons.push(`Only ${positiveSignals} positive signals (need at least 2)`);
    }

    const passed = reasons.length === 0;
    return { passed, reasons };
  }

  /**
   * Monitor volume drops for open positions
   */
  async checkVolumeDrop(token: Token, thresholdPercent: number): Promise<boolean> {
    try {
      const metrics = await this.getTokenMetrics(token);

      // Get previous 5min volume
      const response = await axios.get(
        `https://api.dexscreener.com/latest/dex/tokens/${token.address}`,
        { timeout: 10000 }
      );

      const pair = response.data?.pairs?.[0];
      if (!pair) return false;

      const volume5min = parseFloat(pair.volume?.m5 || '0');
      const previousVolume5min = parseFloat(pair.volume?.m10 || '0') / 2;

      if (previousVolume5min === 0) return false;

      const volumeChange = ((volume5min - previousVolume5min) / previousVolume5min) * 100;

      if (volumeChange <= -thresholdPercent) {
        logger.warn(`Volume drop detected for ${token.symbol}: ${volumeChange.toFixed(2)}%`);
        return true;
      }

      return false;
    } catch (error) {
      logError(error, `checkVolumeDrop: ${token.address}`);
      return false;
    }
  }
}
