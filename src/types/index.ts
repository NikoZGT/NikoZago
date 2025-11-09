export type Network = 'solana' | 'bsc' | 'base';

export interface BotConfig {
  // Capital Management
  initialCapital: number;
  currentCapital: number;
  positionSizePercent: number;
  maxConcurrentPositions: number;
  weeklyGrowthTarget: number;

  // Network
  network: Network;
  rpcUrl: string;
  walletPrivateKey: string;

  // Risk Management
  stopLossPercent: number;
  takeProfitPercent: number;
  trailingStopPercent: number;
  maxConsecutiveLosses: number;

  // Trading Parameters
  minLiquidity: number;
  maxTxFeePercent: number;
  minVolume24h: number;
  minVolume12h: number;
  volumeDropThreshold: number;

  // Security Filters
  minLpLockedPercent: number;
  maxTopHoldersPercent: number;
  maxContractTax: number;
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  network: Network;
  decimals: number;
}

export interface TokenMetrics {
  price: number;
  volume24h: number;
  volume12h: number;
  volumeChange15min: number;
  liquidity: number;
  marketCap: number;
  holders: number;
  age: number; // in hours
}

export interface ContractSecurity {
  lpLocked: boolean;
  lpLockedPercent: number;
  hasMintFunction: boolean;
  hasBlacklist: boolean;
  buyTax: number;
  sellTax: number;
  topHoldersPercent: number;
  isHoneypot: boolean;
  canSell: boolean;
}

export interface SocialSignals {
  twitterMentions: number;
  twitterMentionsChange: number;
  telegramMembers?: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface TradeSignal {
  token: Token;
  metrics: TokenMetrics;
  security: ContractSecurity;
  social: SocialSignals;
  score: number;
  timestamp: Date;
}

export interface Position {
  id: string;
  token: Token;
  entryPrice: number;
  currentPrice: number;
  amount: number;
  investedUSD: number;
  currentValueUSD: number;
  pnl: number;
  pnlPercent: number;
  entryTime: Date;
  trailingStopPrice?: number;
  signals: TradeSignal;
}

export interface Trade {
  id: string;
  token: Token;
  type: 'buy' | 'sell';
  price: number;
  amount: number;
  valueUSD: number;
  txHash: string;
  timestamp: Date;
  positionId?: string;
}

export interface TradeLog {
  positionId: string;
  token: Token;
  entryPrice: number;
  exitPrice: number;
  amount: number;
  investedUSD: number;
  returnUSD: number;
  pnl: number;
  pnlPercent: number;
  entryTime: Date;
  exitTime: Date;
  holdTime: number; // in minutes
  exitReason: 'stop_loss' | 'take_profit' | 'trailing_stop' | 'volume_drop' | 'manual';
  signals: TradeSignal;
  fees: number;
}

export interface BotStatus {
  isRunning: boolean;
  isPaused: boolean;
  currentCapital: number;
  openPositions: number;
  consecutiveLosses: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnl: number;
  totalPnlPercent: number;
  startTime: Date;
  lastTradeTime?: Date;
}

export interface RiskMetrics {
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
}
