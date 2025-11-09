import { Position, BotConfig } from '../types';
import { MarketSignalsAnalyzer } from '../services/market-signals';
import { logger, logError } from '../utils/logger';

export type ExitReason = 'stop_loss' | 'take_profit' | 'trailing_stop' | 'volume_drop' | 'manual';

export interface ExitDecision {
  shouldExit: boolean;
  reason?: ExitReason;
  percentToSell: number; // 0-100
  message: string;
}

export class ExitStrategy {
  private signalsAnalyzer: MarketSignalsAnalyzer;

  constructor() {
    this.signalsAnalyzer = new MarketSignalsAnalyzer();
  }

  /**
   * Evaluate if position should be exited
   */
  async evaluateExit(position: Position, config: BotConfig): Promise<ExitDecision> {
    try {
      logger.info(`Evaluating exit for ${position.token.symbol} (${position.id})`);

      // Update current price and PnL
      const updatedPosition = await this.updatePosition(position);

      // Check stop loss
      const stopLossCheck = this.checkStopLoss(updatedPosition, config);
      if (stopLossCheck.shouldExit) {
        return stopLossCheck;
      }

      // Check take profit (partial)
      const takeProfitCheck = this.checkTakeProfit(updatedPosition, config);
      if (takeProfitCheck.shouldExit) {
        return takeProfitCheck;
      }

      // Check trailing stop
      const trailingStopCheck = this.checkTrailingStop(updatedPosition, config);
      if (trailingStopCheck.shouldExit) {
        return trailingStopCheck;
      }

      // Check volume drop
      const volumeDropCheck = await this.checkVolumeDrop(updatedPosition, config);
      if (volumeDropCheck.shouldExit) {
        return volumeDropCheck;
      }

      // No exit condition met
      return {
        shouldExit: false,
        percentToSell: 0,
        message: 'No exit conditions met',
      };
    } catch (error) {
      logError(error, `evaluateExit: ${position.id}`);
      return {
        shouldExit: false,
        percentToSell: 0,
        message: `Error evaluating exit: ${error}`,
      };
    }
  }

  /**
   * Update position with current price
   */
  private async updatePosition(position: Position): Promise<Position> {
    try {
      const metrics = await this.signalsAnalyzer.getTokenMetrics(position.token);

      const updatedPosition: Position = {
        ...position,
        currentPrice: metrics.price,
        currentValueUSD: position.amount * metrics.price,
        pnl: position.amount * metrics.price - position.investedUSD,
        pnlPercent:
          ((position.amount * metrics.price - position.investedUSD) / position.investedUSD) * 100,
      };

      return updatedPosition;
    } catch (error) {
      logError(error, `updatePosition: ${position.id}`);
      return position;
    }
  }

  /**
   * Check stop loss condition
   */
  private checkStopLoss(position: Position, config: BotConfig): ExitDecision {
    if (position.pnlPercent <= -config.stopLossPercent) {
      logger.warn(
        `Stop loss triggered for ${position.token.symbol}: ${position.pnlPercent.toFixed(2)}%`
      );
      return {
        shouldExit: true,
        reason: 'stop_loss',
        percentToSell: 100,
        message: `Stop loss triggered at ${position.pnlPercent.toFixed(2)}%`,
      };
    }

    return { shouldExit: false, percentToSell: 0, message: 'Stop loss not triggered' };
  }

  /**
   * Check take profit condition (partial exit)
   */
  private checkTakeProfit(position: Position, config: BotConfig): ExitDecision {
    if (position.pnlPercent >= config.takeProfitPercent) {
      logger.info(
        `Take profit triggered for ${position.token.symbol}: ${position.pnlPercent.toFixed(2)}%`
      );
      return {
        shouldExit: true,
        reason: 'take_profit',
        percentToSell: 50, // Sell half
        message: `Take profit triggered at ${position.pnlPercent.toFixed(2)}% - selling 50%`,
      };
    }

    return { shouldExit: false, percentToSell: 0, message: 'Take profit not triggered' };
  }

  /**
   * Check trailing stop condition
   */
  private checkTrailingStop(position: Position, config: BotConfig): ExitDecision {
    // Only apply trailing stop if we've already taken partial profit
    if (position.pnlPercent < config.takeProfitPercent) {
      return { shouldExit: false, percentToSell: 0, message: 'Not yet in trailing stop zone' };
    }

    // Calculate trailing stop price if not set
    if (!position.trailingStopPrice) {
      position.trailingStopPrice =
        position.currentPrice * (1 - config.trailingStopPercent / 100);
      logger.info(
        `Trailing stop set for ${position.token.symbol}: $${position.trailingStopPrice.toFixed(6)}`
      );
      return { shouldExit: false, percentToSell: 0, message: 'Trailing stop set' };
    }

    // Update trailing stop if price went higher
    const newTrailingStop = position.currentPrice * (1 - config.trailingStopPercent / 100);
    if (newTrailingStop > position.trailingStopPrice) {
      position.trailingStopPrice = newTrailingStop;
      logger.info(
        `Trailing stop updated for ${position.token.symbol}: $${position.trailingStopPrice.toFixed(6)}`
      );
    }

    // Check if trailing stop hit
    if (position.currentPrice <= position.trailingStopPrice) {
      logger.info(
        `Trailing stop triggered for ${position.token.symbol}: $${position.currentPrice.toFixed(6)} <= $${position.trailingStopPrice.toFixed(6)}`
      );
      return {
        shouldExit: true,
        reason: 'trailing_stop',
        percentToSell: 100, // Sell remaining position
        message: `Trailing stop triggered - selling remaining position`,
      };
    }

    return { shouldExit: false, percentToSell: 0, message: 'Trailing stop not triggered' };
  }

  /**
   * Check volume drop condition
   */
  private async checkVolumeDrop(position: Position, config: BotConfig): Promise<ExitDecision> {
    try {
      const hasVolumeDrop = await this.signalsAnalyzer.checkVolumeDrop(
        position.token,
        config.volumeDropThreshold
      );

      if (hasVolumeDrop) {
        logger.warn(`Volume drop detected for ${position.token.symbol}`);
        return {
          shouldExit: true,
          reason: 'volume_drop',
          percentToSell: 100,
          message: `Volume dropped more than ${config.volumeDropThreshold}% - emergency exit`,
        };
      }

      return { shouldExit: false, percentToSell: 0, message: 'No volume drop detected' };
    } catch (error) {
      logError(error, `checkVolumeDrop: ${position.id}`);
      return { shouldExit: false, percentToSell: 0, message: 'Error checking volume drop' };
    }
  }

  /**
   * Calculate amount to sell based on percentage
   */
  calculateSellAmount(position: Position, percentToSell: number): number {
    return (position.amount * percentToSell) / 100;
  }

  /**
   * Update position after partial sell
   */
  updatePositionAfterSell(position: Position, amountSold: number, salePrice: number): Position {
    const remainingAmount = position.amount - amountSold;
    const saleValue = amountSold * salePrice;

    // If position fully sold, mark as closed
    if (remainingAmount <= 0) {
      return {
        ...position,
        amount: 0,
        currentValueUSD: 0,
        pnl: saleValue - position.investedUSD,
        pnlPercent: ((saleValue - position.investedUSD) / position.investedUSD) * 100,
      };
    }

    // Update position for partial sell
    // Adjust invested USD proportionally
    const investedRatio = remainingAmount / position.amount;
    const newInvestedUSD = position.investedUSD * investedRatio;

    return {
      ...position,
      amount: remainingAmount,
      investedUSD: newInvestedUSD,
      currentValueUSD: remainingAmount * position.currentPrice,
      pnl: remainingAmount * position.currentPrice - newInvestedUSD,
      pnlPercent:
        ((remainingAmount * position.currentPrice - newInvestedUSD) / newInvestedUSD) * 100,
      trailingStopPrice: position.trailingStopPrice, // Keep trailing stop
    };
  }
}
