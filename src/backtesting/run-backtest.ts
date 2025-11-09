import { Backtester, BacktestConfig } from './backtester';
import { loadConfig } from '../config/bot.config';
import { logger } from '../utils/logger';

/**
 * Script para executar backtesting
 */
async function main() {
  try {
    console.log('🧪 Starting Backtesting System\n');

    // Carregar configuração do bot
    const botConfig = loadConfig();

    // Configurar período de backtest
    const backtestConfig: BacktestConfig = {
      // Testar últimos 7 dias
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      initialCapital: 10,
      network: 'solana',
      // Deixar vazio para buscar tokens populares automaticamente
      // Ou especificar tokens:
      // tokenAddresses: [
      //   'So11111111111111111111111111111111111111112',
      // ]
    };

    console.log('📋 Backtest Configuration:');
    console.log(`  Period: ${backtestConfig.startDate.toLocaleDateString()} to ${backtestConfig.endDate.toLocaleDateString()}`);
    console.log(`  Initial Capital: $${backtestConfig.initialCapital}`);
    console.log(`  Network: ${backtestConfig.network}`);
    console.log(`  Position Size: ${botConfig.positionSizePercent}%`);
    console.log(`  Stop Loss: ${botConfig.stopLossPercent}%`);
    console.log(`  Take Profit: ${botConfig.takeProfitPercent}%\n`);

    // Criar e executar backtester
    const backtester = new Backtester(backtestConfig, botConfig);
    const results = await backtester.run();

    console.log('✅ Backtesting completed!');
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
