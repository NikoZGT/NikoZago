import { Backtester, BacktestConfig } from './backtester';
import { loadConfig } from '../config/bot.config';
import { BotConfig } from '../types';

interface StrategyConfig {
  name: string;
  description: string;
  positionSize: number;
  stopLoss: number;
  takeProfit: number;
  trailingStop: number;
  maxPositions: number;
  entryThresholds: {
    volumeSpike: number;
    priceSpike: number;
    volumeExplosive: number;
    momentumVolume: number;
    momentumPrice: number;
    pricePump: number;
  };
}

const strategies: StrategyConfig[] = [
  {
    name: 'CONSERVATIVE',
    description: 'Poucos trades, alta certeza, seguro',
    positionSize: 10,
    stopLoss: 6,
    takeProfit: 25,
    trailingStop: 8,
    maxPositions: 2,
    entryThresholds: {
      volumeSpike: 120,
      priceSpike: 4,
      volumeExplosive: 150,
      momentumVolume: 100,
      momentumPrice: 6,
      pricePump: 12,
    },
  },
  {
    name: 'AGGRESSIVE',
    description: 'Muitos trades, aproveita tudo',
    positionSize: 20,
    stopLoss: 10,
    takeProfit: 40,
    trailingStop: 12,
    maxPositions: 4,
    entryThresholds: {
      volumeSpike: 50,
      priceSpike: 1.5,
      volumeExplosive: 80,
      momentumVolume: 40,
      momentumPrice: 2,
      pricePump: 5,
    },
  },
  {
    name: 'BALANCED',
    description: 'Meio termo entre lucro e segurança',
    positionSize: 15,
    stopLoss: 8,
    takeProfit: 30,
    trailingStop: 10,
    maxPositions: 3,
    entryThresholds: {
      volumeSpike: 80,
      priceSpike: 2.5,
      volumeExplosive: 120,
      momentumVolume: 70,
      momentumPrice: 4,
      pricePump: 10,
    },
  },
  {
    name: 'SCALPER',
    description: 'Trades rápidos, sai em lucro pequeno',
    positionSize: 12,
    stopLoss: 5,
    takeProfit: 15,
    trailingStop: 6,
    maxPositions: 5,
    entryThresholds: {
      volumeSpike: 60,
      priceSpike: 2,
      volumeExplosive: 90,
      momentumVolume: 50,
      momentumPrice: 3,
      pricePump: 7,
    },
  },
  {
    name: 'SWING',
    description: 'Trades longos, lucro alto',
    positionSize: 18,
    stopLoss: 12,
    takeProfit: 50,
    trailingStop: 15,
    maxPositions: 2,
    entryThresholds: {
      volumeSpike: 100,
      priceSpike: 5,
      volumeExplosive: 140,
      momentumVolume: 90,
      momentumPrice: 7,
      pricePump: 15,
    },
  },
  {
    name: 'MOMENTUM',
    description: 'Só entra em pumps muito fortes',
    positionSize: 25,
    stopLoss: 8,
    takeProfit: 35,
    trailingStop: 10,
    maxPositions: 3,
    entryThresholds: {
      volumeSpike: 150,
      priceSpike: 6,
      volumeExplosive: 180,
      momentumVolume: 120,
      momentumPrice: 8,
      pricePump: 18,
    },
  },
];

async function testStrategy(strategy: StrategyConfig): Promise<any> {
  console.log(`\n🧪 Testing ${strategy.name} Strategy...`);
  console.log(`   ${strategy.description}`);

  const baseConfig = loadConfig();
  const customConfig: BotConfig = {
    ...baseConfig,
    positionSizePercent: strategy.positionSize,
    stopLossPercent: strategy.stopLoss,
    takeProfitPercent: strategy.takeProfit,
    trailingStopPercent: strategy.trailingStop,
    maxConcurrentPositions: strategy.maxPositions,
  };

  const backtestConfig: BacktestConfig = {
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    initialCapital: 10,
    network: 'solana',
  };

  // Salvar thresholds temporariamente
  (global as any).currentStrategyThresholds = strategy.entryThresholds;

  const backtester = new Backtester(backtestConfig, customConfig);
  const results = await backtester.run();

  return {
    strategy: strategy.name,
    description: strategy.description,
    results,
  };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 TESTANDO TODAS AS ESTRATÉGIAS');
  console.log('═══════════════════════════════════════════════════════\n');

  const allResults = [];

  for (const strategy of strategies) {
    const result = await testStrategy(strategy);
    allResults.push(result);
    await new Promise(resolve => setTimeout(resolve, 500)); // Pequeno delay
  }

  console.log('\n\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 COMPARAÇÃO DE TODAS AS ESTRATÉGIAS');
  console.log('═══════════════════════════════════════════════════════\n');

  // Ordenar por Profit Factor
  allResults.sort((a, b) => b.results.profitFactor - a.results.profitFactor);

  console.log('┌─────────────────┬──────────┬──────────┬────────────┬──────────┬─────────┬────────┐');
  console.log('│ Strategy        │ PnL %    │ Win Rate │ Profit F.  │ Trades   │ Sharpe  │ Drwdn  │');
  console.log('├─────────────────┼──────────┼──────────┼────────────┼──────────┼─────────┼────────┤');

  allResults.forEach((result, index) => {
    const r = result.results;
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
    console.log(
      `│ ${medal} ${result.strategy.padEnd(13)} │ ${r.totalPnlPercent.toFixed(1).padStart(7)}% │ ${r.winRate.toFixed(1).padStart(7)}% │ ${r.profitFactor.toFixed(2).padStart(10)} │ ${r.totalTrades.toString().padStart(8)} │ ${r.sharpeRatio.toFixed(2).padStart(7)} │ ${r.maxDrawdownPercent.toFixed(2).padStart(5)}% │`
    );
  });
  console.log('└─────────────────┴──────────┴──────────┴────────────┴──────────┴─────────┴────────┘\n');

  // Melhor estratégia
  const best = allResults[0];
  console.log('🏆 MELHOR ESTRATÉGIA: ' + best.strategy);
  console.log('   ' + best.description);
  console.log(`   Capital: $10 → $${best.results.endCapital.toFixed(2)} (+${best.results.totalPnlPercent.toFixed(1)}%)`);
  console.log(`   Win Rate: ${best.results.winRate.toFixed(1)}%`);
  console.log(`   Profit Factor: ${best.results.profitFactor.toFixed(2)}`);
  console.log(`   Trades: ${best.results.totalTrades}`);
  console.log(`   Max Drawdown: ${best.results.maxDrawdownPercent.toFixed(2)}%`);
  console.log(`   Sharpe Ratio: ${best.results.sharpeRatio.toFixed(2)}\n`);

  // Mais segura (menor drawdown)
  const safest = [...allResults].sort((a, b) => a.results.maxDrawdownPercent - b.results.maxDrawdownPercent)[0];
  console.log('🛡️  MAIS SEGURA: ' + safest.strategy);
  console.log(`   Max Drawdown: ${safest.results.maxDrawdownPercent.toFixed(2)}%`);
  console.log(`   Win Rate: ${safest.results.winRate.toFixed(1)}%\n`);

  // Mais lucrativa (maior PnL)
  const mostProfitable = [...allResults].sort((a, b) => b.results.totalPnlPercent - a.results.totalPnlPercent)[0];
  console.log('💰 MAIS LUCRATIVA: ' + mostProfitable.strategy);
  console.log(`   Total PnL: +${mostProfitable.results.totalPnlPercent.toFixed(1)}%`);
  console.log(`   Capital Final: $${mostProfitable.results.endCapital.toFixed(2)}\n`);

  console.log('═══════════════════════════════════════════════════════\n');
}

main();
