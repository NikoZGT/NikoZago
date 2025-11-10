import { BotConfig, Network } from '../types';
import * as dotenv from 'dotenv';

dotenv.config();

export function loadConfig(): BotConfig {
  const network = (process.env.NETWORK || 'solana') as Network;

  let rpcUrl = '';
  let walletPrivateKey = '';

  switch (network) {
    case 'solana':
      rpcUrl = process.env.SOLANA_RPC_URL || '';
      walletPrivateKey = process.env.SOLANA_WALLET_PRIVATE_KEY || '';
      break;
    case 'bsc':
      rpcUrl = process.env.BSC_RPC_URL || '';
      walletPrivateKey = process.env.BSC_WALLET_PRIVATE_KEY || '';
      break;
    case 'base':
      rpcUrl = process.env.BASE_RPC_URL || '';
      walletPrivateKey = process.env.BASE_WALLET_PRIVATE_KEY || '';
      break;
  }

  return {
    // Capital Management
    initialCapital: parseFloat(process.env.INITIAL_CAPITAL || '10'),
    currentCapital: parseFloat(process.env.INITIAL_CAPITAL || '10'),
    positionSizePercent: parseFloat(process.env.POSITION_SIZE_PERCENT || '15'),
    maxConcurrentPositions: parseInt(process.env.MAX_CONCURRENT_POSITIONS || '2'),
    weeklyGrowthTarget: parseFloat(process.env.WEEKLY_GROWTH_TARGET || '3.5'),

    // Network
    network,
    rpcUrl,
    walletPrivateKey,

    // Risk Management
    stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENT || '9'),
    takeProfitPercent: parseFloat(process.env.TAKE_PROFIT_PERCENT || '60'),
    trailingStopPercent: parseFloat(process.env.TRAILING_STOP_PERCENT || '12'),
    maxConsecutiveLosses: parseInt(process.env.MAX_CONSECUTIVE_LOSSES || '2'),

    // Trading Parameters
    minLiquidity: parseFloat(process.env.MIN_LIQUIDITY || '25000'),
    maxTxFeePercent: parseFloat(process.env.MAX_TX_FEE_PERCENT || '2'),
    minVolume24h: parseFloat(process.env.MIN_VOLUME_24H || '2000'),
    minVolume12h: parseFloat(process.env.MIN_VOLUME_12H || '1000'),
    volumeDropThreshold: parseFloat(process.env.VOLUME_DROP_THRESHOLD || '25'),

    // Security Filters
    minLpLockedPercent: parseFloat(process.env.MIN_LP_LOCKED_PERCENT || '80'),
    maxTopHoldersPercent: parseFloat(process.env.MAX_TOP_HOLDERS_PERCENT || '35'),
    maxContractTax: parseFloat(process.env.MAX_CONTRACT_TAX || '10'),
  };
}

export function validateConfig(config: BotConfig): string[] {
  const errors: string[] = [];

  if (config.initialCapital <= 0) {
    errors.push('Initial capital must be greater than 0');
  }

  if (config.positionSizePercent <= 0 || config.positionSizePercent > 25) {
    errors.push('Position size percent must be between 0 and 25');
  }

  if (!config.rpcUrl) {
    errors.push(`RPC URL not configured for network: ${config.network}`);
  }

  if (!config.walletPrivateKey) {
    errors.push(`Wallet private key not configured for network: ${config.network}`);
  }

  if (config.stopLossPercent <= 0 || config.stopLossPercent > 50) {
    errors.push('Stop loss percent must be between 0 and 50');
  }

  if (config.takeProfitPercent <= 0) {
    errors.push('Take profit percent must be greater than 0');
  }

  return errors;
}
