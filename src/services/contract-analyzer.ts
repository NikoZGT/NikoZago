import axios from 'axios';
import { ContractSecurity, Token, Network } from '../types';
import { logger, logError } from '../utils/logger';

export class ContractAnalyzer {
  private rugCheckApiKey: string;
  private dexToolsApiKey: string;

  constructor() {
    this.rugCheckApiKey = process.env.RUGCHECK_API_KEY || '';
    this.dexToolsApiKey = process.env.DEXTOOLS_API_KEY || '';
  }

  /**
   * Analyze token contract security
   */
  async analyzeContract(token: Token): Promise<ContractSecurity> {
    try {
      logger.info(`Analyzing contract security for ${token.symbol} (${token.address})`);

      const [lpLockInfo, contractInfo, holderInfo, honeypotCheck] = await Promise.all([
        this.checkLPLock(token),
        this.checkContractFunctions(token),
        this.checkTopHolders(token),
        this.checkHoneypot(token),
      ]);

      const security: ContractSecurity = {
        lpLocked: lpLockInfo.locked,
        lpLockedPercent: lpLockInfo.percent,
        hasMintFunction: contractInfo.hasMint,
        hasBlacklist: contractInfo.hasBlacklist,
        buyTax: contractInfo.buyTax,
        sellTax: contractInfo.sellTax,
        topHoldersPercent: holderInfo.topHoldersPercent,
        isHoneypot: honeypotCheck.isHoneypot,
        canSell: honeypotCheck.canSell,
      };

      logger.info(`Contract analysis complete for ${token.symbol}`, security);
      return security;
    } catch (error) {
      logError(error, `analyzeContract: ${token.address}`);
      throw error;
    }
  }

  /**
   * Check if liquidity pool is locked
   */
  private async checkLPLock(token: Token): Promise<{ locked: boolean; percent: number }> {
    try {
      // Implementation depends on network
      if (token.network === 'solana') {
        return this.checkSolanaLPLock(token);
      } else {
        return this.checkEVMLPLock(token);
      }
    } catch (error) {
      logError(error, `checkLPLock: ${token.address}`);
      return { locked: false, percent: 0 };
    }
  }

  /**
   * Check Solana LP lock status
   */
  private async checkSolanaLPLock(token: Token): Promise<{ locked: boolean; percent: number }> {
    try {
      // Use RugCheck API for Solana
      if (!this.rugCheckApiKey) {
        logger.warn('RugCheck API key not configured');
        return { locked: false, percent: 0 };
      }

      const response = await axios.get(
        `https://api.rugcheck.xyz/v1/tokens/${token.address}/report`,
        {
          headers: { 'X-API-Key': this.rugCheckApiKey },
          timeout: 10000,
        }
      );

      const lpLocked = response.data?.liquidity?.locked || false;
      const lpPercent = response.data?.liquidity?.lockedPercent || 0;

      return { locked: lpLocked, percent: lpPercent };
    } catch (error) {
      logError(error, `checkSolanaLPLock: ${token.address}`);
      return { locked: false, percent: 0 };
    }
  }

  /**
   * Check EVM LP lock status
   */
  private async checkEVMLPLock(token: Token): Promise<{ locked: boolean; percent: number }> {
    try {
      // Use DexTools or similar API for BSC/Base
      if (!this.dexToolsApiKey) {
        logger.warn('DexTools API key not configured');
        return { locked: false, percent: 0 };
      }

      const chain = token.network === 'bsc' ? 'bsc' : 'base';
      const response = await axios.get(
        `https://api.dextools.io/v1/token/${chain}/${token.address}/locks`,
        {
          headers: { 'X-API-Key': this.dexToolsApiKey },
          timeout: 10000,
        }
      );

      const locks = response.data?.locks || [];
      const totalLocked = locks.reduce((sum: number, lock: any) => sum + lock.percent, 0);

      return { locked: totalLocked > 0, percent: totalLocked };
    } catch (error) {
      logError(error, `checkEVMLPLock: ${token.address}`);
      return { locked: false, percent: 0 };
    }
  }

  /**
   * Check for dangerous contract functions
   */
  private async checkContractFunctions(token: Token): Promise<{
    hasMint: boolean;
    hasBlacklist: boolean;
    buyTax: number;
    sellTax: number;
  }> {
    try {
      if (token.network === 'solana') {
        return this.checkSolanaContract(token);
      } else {
        return this.checkEVMContract(token);
      }
    } catch (error) {
      logError(error, `checkContractFunctions: ${token.address}`);
      return { hasMint: true, hasBlacklist: true, buyTax: 100, sellTax: 100 };
    }
  }

  /**
   * Check Solana contract
   */
  private async checkSolanaContract(token: Token): Promise<{
    hasMint: boolean;
    hasBlacklist: boolean;
    buyTax: number;
    sellTax: number;
  }> {
    try {
      if (!this.rugCheckApiKey) {
        return { hasMint: false, hasBlacklist: false, buyTax: 0, sellTax: 0 };
      }

      const response = await axios.get(
        `https://api.rugcheck.xyz/v1/tokens/${token.address}/report`,
        {
          headers: { 'X-API-Key': this.rugCheckApiKey },
          timeout: 10000,
        }
      );

      const hasMint = response.data?.risks?.mintAuthority || false;
      const hasBlacklist = response.data?.risks?.freezeAuthority || false;
      const buyTax = response.data?.taxes?.buy || 0;
      const sellTax = response.data?.taxes?.sell || 0;

      return { hasMint, hasBlacklist, buyTax, sellTax };
    } catch (error) {
      logError(error, `checkSolanaContract: ${token.address}`);
      return { hasMint: false, hasBlacklist: false, buyTax: 0, sellTax: 0 };
    }
  }

  /**
   * Check EVM contract
   */
  private async checkEVMContract(token: Token): Promise<{
    hasMint: boolean;
    hasBlacklist: boolean;
    buyTax: number;
    sellTax: number;
  }> {
    try {
      // Use GoPlus or similar API
      const chain = token.network === 'bsc' ? '56' : '8453'; // BSC: 56, Base: 8453
      const response = await axios.get(
        `https://api.gopluslabs.io/api/v1/token_security/${chain}`,
        {
          params: { contract_addresses: token.address },
          timeout: 10000,
        }
      );

      const data = response.data?.result?.[token.address.toLowerCase()];
      const hasMint = data?.is_mintable === '1';
      const hasBlacklist = data?.is_blacklisted === '1';
      const buyTax = parseFloat(data?.buy_tax || '0') * 100;
      const sellTax = parseFloat(data?.sell_tax || '0') * 100;

      return { hasMint, hasBlacklist, buyTax, sellTax };
    } catch (error) {
      logError(error, `checkEVMContract: ${token.address}`);
      return { hasMint: false, hasBlacklist: false, buyTax: 0, sellTax: 0 };
    }
  }

  /**
   * Check top holders percentage
   */
  private async checkTopHolders(token: Token): Promise<{ topHoldersPercent: number }> {
    try {
      if (token.network === 'solana') {
        return this.checkSolanaHolders(token);
      } else {
        return this.checkEVMHolders(token);
      }
    } catch (error) {
      logError(error, `checkTopHolders: ${token.address}`);
      return { topHoldersPercent: 100 };
    }
  }

  /**
   * Check Solana holders
   */
  private async checkSolanaHolders(token: Token): Promise<{ topHoldersPercent: number }> {
    try {
      if (!this.rugCheckApiKey) {
        return { topHoldersPercent: 0 };
      }

      const response = await axios.get(
        `https://api.rugcheck.xyz/v1/tokens/${token.address}/report`,
        {
          headers: { 'X-API-Key': this.rugCheckApiKey },
          timeout: 10000,
        }
      );

      const topHoldersPercent = response.data?.holders?.top10Percent || 0;
      return { topHoldersPercent };
    } catch (error) {
      logError(error, `checkSolanaHolders: ${token.address}`);
      return { topHoldersPercent: 0 };
    }
  }

  /**
   * Check EVM holders
   */
  private async checkEVMHolders(token: Token): Promise<{ topHoldersPercent: number }> {
    try {
      const chain = token.network === 'bsc' ? '56' : '8453';
      const response = await axios.get(
        `https://api.gopluslabs.io/api/v1/token_security/${chain}`,
        {
          params: { contract_addresses: token.address },
          timeout: 10000,
        }
      );

      const data = response.data?.result?.[token.address.toLowerCase()];
      const holders = data?.holders || [];
      const topHoldersPercent = holders
        .slice(0, 10)
        .reduce((sum: number, holder: any) => sum + parseFloat(holder.percent || '0'), 0);

      return { topHoldersPercent };
    } catch (error) {
      logError(error, `checkEVMHolders: ${token.address}`);
      return { topHoldersPercent: 0 };
    }
  }

  /**
   * Check if token is a honeypot
   */
  private async checkHoneypot(token: Token): Promise<{
    isHoneypot: boolean;
    canSell: boolean;
  }> {
    try {
      if (token.network === 'solana') {
        // Solana honeypot check via RugCheck
        if (!this.rugCheckApiKey) {
          return { isHoneypot: false, canSell: true };
        }

        const response = await axios.get(
          `https://api.rugcheck.xyz/v1/tokens/${token.address}/report`,
          {
            headers: { 'X-API-Key': this.rugCheckApiKey },
            timeout: 10000,
          }
        );

        const isHoneypot = response.data?.risks?.isHoneypot || false;
        const canSell = !isHoneypot;

        return { isHoneypot, canSell };
      } else {
        // EVM honeypot check via HoneyPot.is or GoPlus
        const response = await axios.get(`https://api.honeypot.is/v2/IsHoneypot`, {
          params: { address: token.address, chainID: token.network === 'bsc' ? '56' : '8453' },
          timeout: 10000,
        });

        const isHoneypot = response.data?.isHoneypot || false;
        const canSell = response.data?.simulationSuccess || false;

        return { isHoneypot, canSell };
      }
    } catch (error) {
      logError(error, `checkHoneypot: ${token.address}`);
      return { isHoneypot: false, canSell: true };
    }
  }

  /**
   * Validate token security against config thresholds
   */
  validateSecurity(
    security: ContractSecurity,
    config: {
      minLpLockedPercent: number;
      maxTopHoldersPercent: number;
      maxContractTax: number;
    }
  ): { passed: boolean; reasons: string[] } {
    const reasons: string[] = [];

    if (security.isHoneypot) {
      reasons.push('Token is a honeypot');
    }

    if (!security.canSell) {
      reasons.push('Cannot sell token (simulated sell failed)');
    }

    if (security.lpLockedPercent < config.minLpLockedPercent) {
      reasons.push(
        `LP locked ${security.lpLockedPercent}% < required ${config.minLpLockedPercent}%`
      );
    }

    if (security.hasMintFunction) {
      reasons.push('Contract has mint function');
    }

    if (security.hasBlacklist) {
      reasons.push('Contract has blacklist function');
    }

    if (security.buyTax > config.maxContractTax) {
      reasons.push(`Buy tax ${security.buyTax}% > max ${config.maxContractTax}%`);
    }

    if (security.sellTax > config.maxContractTax) {
      reasons.push(`Sell tax ${security.sellTax}% > max ${config.maxContractTax}%`);
    }

    if (security.topHoldersPercent > config.maxTopHoldersPercent) {
      reasons.push(
        `Top holders ${security.topHoldersPercent}% > max ${config.maxTopHoldersPercent}%`
      );
    }

    const passed = reasons.length === 0;
    return { passed, reasons };
  }
}
