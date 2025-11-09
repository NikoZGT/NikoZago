import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { ethers } from 'ethers';
import { Token, Network, Trade } from '../types';
import { logger, logError, logTrade } from '../utils/logger';

export interface SwapResult {
  success: boolean;
  txHash?: string;
  amountOut?: number;
  error?: string;
}

export class DexIntegrator {
  private network: Network;
  private connection?: Connection;
  private wallet?: Keypair | ethers.Wallet;
  private provider?: ethers.JsonRpcProvider;

  constructor(network: Network, rpcUrl: string, privateKey: string) {
    this.network = network;

    try {
      if (network === 'solana') {
        this.initializeSolana(rpcUrl, privateKey);
      } else {
        this.initializeEVM(rpcUrl, privateKey);
      }
    } catch (error) {
      logError(error, 'DexIntegrator constructor');
      throw error;
    }
  }

  /**
   * Initialize Solana connection
   */
  private initializeSolana(rpcUrl: string, privateKey: string): void {
    this.connection = new Connection(rpcUrl, 'confirmed');

    // Parse private key (base58 or array of numbers)
    try {
      const secretKey = Uint8Array.from(JSON.parse(privateKey));
      this.wallet = Keypair.fromSecretKey(secretKey);
      logger.info(`Solana wallet initialized: ${this.wallet.publicKey.toString()}`);
    } catch (error) {
      logError(error, 'initializeSolana');
      throw new Error('Invalid Solana private key format');
    }
  }

  /**
   * Initialize EVM connection
   */
  private initializeEVM(rpcUrl: string, privateKey: string): void {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    logger.info(`EVM wallet initialized: ${this.wallet.address}`);
  }

  /**
   * Execute buy order
   */
  async buy(token: Token, amountUSD: number): Promise<SwapResult> {
    try {
      logger.info(`Buying ${token.symbol} with $${amountUSD}`);

      if (this.network === 'solana') {
        return await this.buySolana(token, amountUSD);
      } else {
        return await this.buyEVM(token, amountUSD);
      }
    } catch (error) {
      logError(error, `buy: ${token.symbol}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute sell order
   */
  async sell(token: Token, amount: number): Promise<SwapResult> {
    try {
      logger.info(`Selling ${amount} ${token.symbol}`);

      if (this.network === 'solana') {
        return await this.sellSolana(token, amount);
      } else {
        return await this.sellEVM(token, amount);
      }
    } catch (error) {
      logError(error, `sell: ${token.symbol}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Buy tokens on Solana (using Jupiter)
   */
  private async buySolana(token: Token, amountUSD: number): Promise<SwapResult> {
    try {
      if (!this.connection || !this.wallet) {
        throw new Error('Solana not initialized');
      }

      // Use Jupiter API for swap
      const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
      const inputMint = USDC_MINT;
      const outputMint = token.address;
      const amount = Math.floor(amountUSD * 1_000_000); // USDC has 6 decimals

      // Get quote from Jupiter
      const quoteResponse = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`
      );

      if (!quoteResponse.ok) {
        throw new Error('Failed to get Jupiter quote');
      }

      const quoteData = await quoteResponse.json();

      // Get swap transaction
      const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: this.wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
        }),
      });

      if (!swapResponse.ok) {
        throw new Error('Failed to get swap transaction');
      }

      const { swapTransaction } = await swapResponse.json();

      // Deserialize and sign transaction
      const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
      const transaction = Transaction.from(swapTransactionBuf);
      transaction.sign(this.wallet);

      // Send transaction
      const txHash = await this.connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Wait for confirmation
      await this.connection.confirmTransaction(txHash, 'confirmed');

      const amountOut = parseInt(quoteData.outAmount) / Math.pow(10, token.decimals);

      logger.info(`Buy successful: ${amountOut} ${token.symbol} (tx: ${txHash})`);

      return {
        success: true,
        txHash,
        amountOut,
      };
    } catch (error) {
      logError(error, `buySolana: ${token.symbol}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Sell tokens on Solana (using Jupiter)
   */
  private async sellSolana(token: Token, amount: number): Promise<SwapResult> {
    try {
      if (!this.connection || !this.wallet) {
        throw new Error('Solana not initialized');
      }

      const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
      const inputMint = token.address;
      const outputMint = USDC_MINT;
      const amountLamports = Math.floor(amount * Math.pow(10, token.decimals));

      // Get quote from Jupiter
      const quoteResponse = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountLamports}&slippageBps=50`
      );

      if (!quoteResponse.ok) {
        throw new Error('Failed to get Jupiter quote');
      }

      const quoteData = await quoteResponse.json();

      // Get swap transaction
      const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: this.wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
        }),
      });

      if (!swapResponse.ok) {
        throw new Error('Failed to get swap transaction');
      }

      const { swapTransaction } = await swapResponse.json();

      // Deserialize and sign transaction
      const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
      const transaction = Transaction.from(swapTransactionBuf);
      transaction.sign(this.wallet);

      // Send transaction
      const txHash = await this.connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Wait for confirmation
      await this.connection.confirmTransaction(txHash, 'confirmed');

      const amountOut = parseInt(quoteData.outAmount) / 1_000_000; // USDC decimals

      logger.info(`Sell successful: $${amountOut} (tx: ${txHash})`);

      return {
        success: true,
        txHash,
        amountOut,
      };
    } catch (error) {
      logError(error, `sellSolana: ${token.symbol}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Buy tokens on EVM chains (BSC/Base)
   */
  private async buyEVM(token: Token, amountUSD: number): Promise<SwapResult> {
    try {
      if (!this.provider || !this.wallet) {
        throw new Error('EVM not initialized');
      }

      // Use 1inch or 0x API for best rates
      // This is a simplified example - in production use proper aggregator
      logger.warn('EVM trading not fully implemented - using placeholder');

      // Placeholder implementation
      // TODO: Integrate with 1inch, 0x, or Uniswap SDK

      return {
        success: false,
        error: 'EVM trading not fully implemented',
      };
    } catch (error) {
      logError(error, `buyEVM: ${token.symbol}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Sell tokens on EVM chains (BSC/Base)
   */
  private async sellEVM(token: Token, amount: number): Promise<SwapResult> {
    try {
      if (!this.provider || !this.wallet) {
        throw new Error('EVM not initialized');
      }

      // Use 1inch or 0x API for best rates
      logger.warn('EVM trading not fully implemented - using placeholder');

      // Placeholder implementation
      // TODO: Integrate with 1inch, 0x, or Uniswap SDK

      return {
        success: false,
        error: 'EVM trading not fully implemented',
      };
    } catch (error) {
      logError(error, `sellEVM: ${token.symbol}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Simulate sell (test if token can be sold)
   */
  async simulateSell(token: Token, amount: number): Promise<boolean> {
    try {
      logger.info(`Simulating sell for ${token.symbol}`);

      if (this.network === 'solana') {
        // Try to get a quote for selling
        const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
        const inputMint = token.address;
        const outputMint = USDC_MINT;
        const amountLamports = Math.floor(amount * Math.pow(10, token.decimals));

        const quoteResponse = await fetch(
          `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountLamports}&slippageBps=50`,
          { method: 'GET' }
        );

        if (quoteResponse.ok) {
          logger.info(`Sell simulation successful for ${token.symbol}`);
          return true;
        } else {
          logger.warn(`Sell simulation failed for ${token.symbol}`);
          return false;
        }
      } else {
        // EVM simulation
        logger.warn('EVM sell simulation not implemented');
        return true; // Assume true for now
      }
    } catch (error) {
      logError(error, `simulateSell: ${token.symbol}`);
      return false;
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<number> {
    try {
      if (this.network === 'solana' && this.connection && this.wallet) {
        const balance = await this.connection.getBalance(this.wallet.publicKey);
        return balance / 1e9; // Convert lamports to SOL
      } else if (this.provider && this.wallet) {
        const balance = await this.provider.getBalance(this.wallet.address);
        return parseFloat(ethers.formatEther(balance));
      }
      return 0;
    } catch (error) {
      logError(error, 'getBalance');
      return 0;
    }
  }
}
