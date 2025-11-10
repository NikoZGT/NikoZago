import { MultiTokenBacktester } from './backtester-multi-token';
import { BacktestConfig } from './backtester';
import { loadConfig } from '../config/bot.config';

/**
 * Script para executar backtest MULTI-TOKEN
 */
async function main() {
  try {
    console.log('🧪 Starting MULTI-TOKEN Backtesting System\n');

    // Carregar configuração do bot
    const botConfig = loadConfig();

    // Configurar período de backtest
    const backtestConfig: BacktestConfig = {
      startDate: new Date('2025-11-03T00:00:00Z'),
      endDate: new Date('2025-11-10T23:59:59Z'),
      initialCapital: 10,
      network: 'solana',
    };

    console.log('📋 Multi-Token Backtest Configuration:');
    console.log(`  Period: ${backtestConfig.startDate.toLocaleDateString()} to ${backtestConfig.endDate.toLocaleDateString()}`);
    console.log(`  Initial Capital: $${backtestConfig.initialCapital}`);
    console.log(`  Network: ${backtestConfig.network}`);
    console.log(`  Position Size: ${botConfig.positionSizePercent}%`);
    console.log(`  Max Concurrent Positions: ${botConfig.maxConcurrentPositions}`);
    console.log(`  Stop Loss: ${botConfig.stopLossPercent}%`);
    console.log(`  Take Profit: ${botConfig.takeProfitPercent}%\n`);

    // Criar e executar backtester multi-token
    const backtester = new MultiTokenBacktester(backtestConfig, botConfig);
    const results = await backtester.run();

    console.log('✅ Multi-Token Backtesting completed!');
    console.log(`📁 Results saved in backtests/ directory`);

    // Retornar código baseado em performance
    if (results.totalPnlPercent > 0) {
      process.exit(0); // Sucesso
    } else {
      process.exit(1); // Perda
    }
  } catch (error) {
    console.error('❌ Backtesting failed:', error);
    process.exit(1);
  }
}

// Executar
main();
