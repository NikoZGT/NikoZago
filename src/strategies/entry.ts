import { TradeSignal, BotConfig, Token } from '../types';
import { ContractAnalyzer } from '../services/contract-analyzer';
import { MarketSignalsAnalyzer } from '../services/market-signals';
import { logger, logError } from '../utils/logger';

export class EntryStrategy {
  private contractAnalyzer: ContractAnalyzer;
  private signalsAnalyzer: MarketSignalsAnalyzer;

  constructor() {
    this.contractAnalyzer = new ContractAnalyzer();
    this.signalsAnalyzer = new MarketSignalsAnalyzer();
  }

  /**
   * Evaluate if token is a good entry candidate
   */
  async evaluateEntry(token: Token, config: BotConfig): Promise<{
    shouldEnter: boolean;
    signal?: TradeSignal;
    reasons: string[];
  }> {
    try {
      logger.info(`Evaluating entry for ${token.symbol} (${token.address})`);

      const reasons: string[] = [];

      // Step 1: Generate market signal
      logger.info('Step 1: Generating market signal...');
      const signal = await this.signalsAnalyzer.generateSignal(token);

      // Step 2: Validate signal requirements
      logger.info('Step 2: Validating signal requirements...');
      const signalValidation = this.signalsAnalyzer.validateSignal(signal, {
        minVolume24h: config.minVolume24h,
        minVolume12h: config.minVolume12h,
        minLiquidity: config.minLiquidity,
      });

      if (!signalValidation.passed) {
        reasons.push(...signalValidation.reasons);
        logger.info(`Signal validation failed for ${token.symbol}`, reasons);
        return { shouldEnter: false, reasons };
      }

      // Step 3: Analyze contract security
      logger.info('Step 3: Analyzing contract security...');
      const security = await this.contractAnalyzer.analyzeContract(token);
      signal.security = security;

      // Step 4: Validate security requirements
      logger.info('Step 4: Validating security requirements...');
      const securityValidation = this.contractAnalyzer.validateSecurity(security, {
        minLpLockedPercent: config.minLpLockedPercent,
        maxTopHoldersPercent: config.maxTopHoldersPercent,
        maxContractTax: config.maxContractTax,
      });

      if (!securityValidation.passed) {
        reasons.push(...securityValidation.reasons);
        logger.info(`Security validation failed for ${token.symbol}`, reasons);
        return { shouldEnter: false, reasons };
      }

      // Step 5: Check signal score
      logger.info('Step 5: Checking signal score...');
      if (signal.score < 50) {
        reasons.push(`Signal score ${signal.score} < 50 (minimum required)`);
        logger.info(`Signal score too low for ${token.symbol}: ${signal.score}`);
        return { shouldEnter: false, reasons };
      }

      // All checks passed
      logger.info(`Entry approved for ${token.symbol} with score: ${signal.score}`);
      return { shouldEnter: true, signal, reasons: ['All checks passed'] };
    } catch (error) {
      logError(error, `evaluateEntry: ${token.address}`);
      return {
        shouldEnter: false,
        reasons: [`Error evaluating entry: ${error}`],
      };
    }
  }

  /**
   * Calculate position size based on capital and config
   */
  calculatePositionSize(config: BotConfig): number {
    const positionSize = (config.currentCapital * config.positionSizePercent) / 100;
    const maxPositionSize = 0.3; // Hard cap at $0.30

    return Math.min(positionSize, maxPositionSize);
  }

  /**
   * Add anti-frontrun delay
   */
  async addEntryDelay(delaySeconds: number = 5): Promise<void> {
    logger.info(`Adding anti-frontrun delay: ${delaySeconds}s`);
    await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
  }

  /**
   * Find new tokens to analyze
   */
  async scanForNewTokens(config: BotConfig): Promise<Token[]> {
    try {
      logger.info('Scanning for new tokens...');

      // This will depend on the network
      if (config.network === 'solana') {
        return this.scanSolanaTokens();
      } else if (config.network === 'bsc') {
        return this.scanBSCTokens();
      } else if (config.network === 'base') {
        return this.scanBaseTokens();
      }

      return [];
    } catch (error) {
      logError(error, 'scanForNewTokens');
      return [];
    }
  }

  /**
   * Scan for new Solana tokens
   */
  private async scanSolanaTokens(): Promise<Token[]> {
    try {
      // Use DexScreener or Birdeye to find new tokens
      const response = await fetch(
        'https://api.dexscreener.com/latest/dex/search?q=solana',
        {
          headers: { 'Accept': 'application/json' },
        }
      );

      const data = await response.json();
      const pairs = data?.pairs || [];

      // Filter for new tokens (< 24h old) with volume
      const tokens: Token[] = pairs
        .filter((pair: any) => {
          const age = this.calculateAge(pair.pairCreatedAt);
          const volume = parseFloat(pair.volume?.h24 || '0');
          return age < 24 && volume >= 2000;
        })
        .slice(0, 10) // Limit to 10 tokens
        .map((pair: any) => ({
          address: pair.baseToken.address,
          symbol: pair.baseToken.symbol,
          name: pair.baseToken.name,
          network: 'solana' as const,
          decimals: 9,
        }));

      logger.info(`Found ${tokens.length} new Solana tokens`);
      return tokens;
    } catch (error) {
      logError(error, 'scanSolanaTokens');
      return [];
    }
  }

  /**
   * Scan for new BSC tokens
   */
  private async scanBSCTokens(): Promise<Token[]> {
    try {
      const response = await fetch(
        'https://api.dexscreener.com/latest/dex/search?q=bsc',
        {
          headers: { 'Accept': 'application/json' },
        }
      );

      const data = await response.json();
      const pairs = data?.pairs || [];

      const tokens: Token[] = pairs
        .filter((pair: any) => {
          const age = this.calculateAge(pair.pairCreatedAt);
          const volume = parseFloat(pair.volume?.h24 || '0');
          return age < 24 && volume >= 2000 && pair.chainId === 'bsc';
        })
        .slice(0, 10)
        .map((pair: any) => ({
          address: pair.baseToken.address,
          symbol: pair.baseToken.symbol,
          name: pair.baseToken.name,
          network: 'bsc' as const,
          decimals: 18,
        }));

      logger.info(`Found ${tokens.length} new BSC tokens`);
      return tokens;
    } catch (error) {
      logError(error, 'scanBSCTokens');
      return [];
    }
  }

  /**
   * Scan for new Base tokens
   */
  private async scanBaseTokens(): Promise<Token[]> {
    try {
      const response = await fetch(
        'https://api.dexscreener.com/latest/dex/search?q=base',
        {
          headers: { 'Accept': 'application/json' },
        }
      );

      const data = await response.json();
      const pairs = data?.pairs || [];

      const tokens: Token[] = pairs
        .filter((pair: any) => {
          const age = this.calculateAge(pair.pairCreatedAt);
          const volume = parseFloat(pair.volume?.h24 || '0');
          return age < 24 && volume >= 2000 && pair.chainId === 'base';
        })
        .slice(0, 10)
        .map((pair: any) => ({
          address: pair.baseToken.address,
          symbol: pair.baseToken.symbol,
          name: pair.baseToken.name,
          network: 'base' as const,
          decimals: 18,
        }));

      logger.info(`Found ${tokens.length} new Base tokens`);
      return tokens;
    } catch (error) {
      logError(error, 'scanBaseTokens');
      return [];
    }
  }

  /**
   * Calculate token age in hours
   */
  private calculateAge(createdAt: number): number {
    if (!createdAt) return 999;
    const now = Date.now();
    const ageMs = now - createdAt * 1000;
    return ageMs / (1000 * 60 * 60);
  }
}
