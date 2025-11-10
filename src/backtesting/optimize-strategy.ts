import { Backtester, BacktestConfig } from './backtester';
import { loadConfig } from '../config/bot.config';
import { BotConfig } from '../types';

/**
 * OTIMIZADOR DE ESTRATÉGIA - Testa centenas de combinações
 * para encontrar a configuração PERFEITA
 */

interface OptimizationResult {
  config: any;
  results: any;
  score: number; // Score combinado: lucro + segurança + consistência
}

async function optimizeStrategy(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔬 OTIMIZADOR DE ESTRATÉGIA MOMENTUM');
  console.log('   Testando centenas de combinações...');
  console.log('═══════════════════════════════════════════════════════\n');

  const allResults: OptimizationResult[] = [];

  // Grid Search - Testar todas as combinações
  const positionSizes = [15, 20, 25, 30];
  const stopLosses = [6, 8, 10, 12];
  const takeProfits = [25, 30, 35, 40, 50];
  const trailingStops = [8, 10, 12, 15];

  // Thresholds de entrada (volumeSpike / priceSpike)
  const entryThresholds = [
    { name: 'VERY_SELECTIVE', volumeSpike: 180, priceSpike: 8 },
    { name: 'SELECTIVE', volumeSpike: 150, priceSpike: 6 },
    { name: 'MODERATE', volumeSpike: 120, priceSpike: 5 },
    { name: 'AGGRESSIVE', volumeSpike: 100, priceSpike: 4 },
  ];

  let testCount = 0;
  const totalTests = positionSizes.length * stopLosses.length * takeProfits.length *
                     trailingStops.length * entryThresholds.length;

  console.log(`Total de testes a rodar: ${totalTests}\n`);

  // Testar todas as combinações
  for (const posSize of positionSizes) {
    for (const sl of stopLosses) {
      for (const tp of takeProfits) {
        for (const ts of trailingStops) {
          for (const threshold of entryThresholds) {
            testCount++;

            // Skip combinações inválidas
            if (tp <= sl) continue; // TP deve ser maior que SL
            if (ts >= tp) continue; // Trailing stop deve ser menor que TP

            process.stdout.write(`\r⏳ Testando ${testCount}/${totalTests}... `);

            try {
              const baseConfig = loadConfig();
              const customConfig: BotConfig = {
                ...baseConfig,
                positionSizePercent: posSize,
                stopLossPercent: sl,
                takeProfitPercent: tp,
                trailingStopPercent: ts,
                maxConcurrentPositions: 3,
              };

              const backtestConfig: BacktestConfig = {
                startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                endDate: new Date(),
                initialCapital: 10,
                network: 'solana',
              };

              // Configurar thresholds
              (global as any).currentStrategyThresholds = {
                volumeSpike: threshold.volumeSpike,
                priceSpike: threshold.priceSpike,
                volumeExplosive: threshold.volumeSpike + 30,
                momentumVolume: threshold.volumeSpike - 30,
                momentumPrice: threshold.priceSpike + 2,
                pricePump: threshold.priceSpike * 3,
              };

              const backtester = new Backtester(backtestConfig, customConfig);
              const results = await backtester.run();

              // Calcular score (quanto maior melhor)
              // Prioriza: Profit Factor, Win Rate, e Baixo Drawdown
              const score =
                (results.profitFactor * 30) +  // 30% peso
                (results.winRate * 0.5) +      // 50% peso (normalizado)
                (results.totalPnlPercent / 100) + // PnL normalizado
                ((10 - results.maxDrawdownPercent) * 2) + // Penaliza drawdown
                (results.sharpeRatio * 2);     // Bônus por Sharpe alto

              allResults.push({
                config: {
                  positionSize: posSize,
                  stopLoss: sl,
                  takeProfit: tp,
                  trailingStop: ts,
                  threshold: threshold.name,
                  thresholds: {
                    volumeSpike: threshold.volumeSpike,
                    priceSpike: threshold.priceSpike,
                  },
                },
                results,
                score,
              });
            } catch (error) {
              // Ignorar erros silenciosamente
            }
          }
        }
      }
    }
  }

  console.log('\n\n✅ Testes completos!\n');

  // Ordenar por score
  allResults.sort((a, b) => b.score - a.score);

  // Top 10 melhores
  console.log('═══════════════════════════════════════════════════════');
  console.log('🏆 TOP 10 MELHORES CONFIGURAÇÕES');
  console.log('═══════════════════════════════════════════════════════\n');

  allResults.slice(0, 10).forEach((result, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}. `;
    console.log(`${medal} Score: ${result.score.toFixed(2)}`);
    console.log(`   PnL: +${result.results.totalPnlPercent.toFixed(1)}% | Win Rate: ${result.results.winRate.toFixed(1)}% | PF: ${result.results.profitFactor.toFixed(2)} | DD: ${result.results.maxDrawdownPercent.toFixed(2)}%`);
    console.log(`   Config: PosSize=${result.config.positionSize}% SL=${result.config.stopLoss}% TP=${result.config.takeProfit}% TS=${result.config.trailingStop}%`);
    console.log(`   Entry: ${result.config.threshold} (Vol+${result.config.thresholds.volumeSpike}% Price+${result.config.thresholds.priceSpike}%)`);
    console.log(`   Trades: ${result.results.totalTrades} | Sharpe: ${result.results.sharpeRatio.toFixed(2)}\n`);
  });

  // Melhor configuração
  const best = allResults[0];
  console.log('═══════════════════════════════════════════════════════');
  console.log('🏆 CONFIGURAÇÃO PERFEITA ENCONTRADA!');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`Position Size:    ${best.config.positionSize}%`);
  console.log(`Stop Loss:        ${best.config.stopLoss}%`);
  console.log(`Take Profit:      ${best.config.takeProfit}%`);
  console.log(`Trailing Stop:    ${best.config.trailingStop}%`);
  console.log(`Entry Threshold:  ${best.config.threshold}`);
  console.log(`  Volume Spike:   +${best.config.thresholds.volumeSpike}%`);
  console.log(`  Price Spike:    +${best.config.thresholds.priceSpike}%\n`);

  console.log('📊 Resultados:');
  console.log(`  Capital Final:  $${best.results.endCapital.toFixed(2)}`);
  console.log(`  Total PnL:      +${best.results.totalPnlPercent.toFixed(1)}%`);
  console.log(`  Win Rate:       ${best.results.winRate.toFixed(1)}%`);
  console.log(`  Profit Factor:  ${best.results.profitFactor.toFixed(2)}`);
  console.log(`  Max Drawdown:   ${best.results.maxDrawdownPercent.toFixed(2)}%`);
  console.log(`  Sharpe Ratio:   ${best.results.sharpeRatio.toFixed(2)}`);
  console.log(`  Total Trades:   ${best.results.totalTrades}`);
  console.log(`  Avg Win:        $${best.results.avgWin.toFixed(2)}`);
  console.log(`  Avg Loss:       $${best.results.avgLoss.toFixed(2)}\n`);

  console.log('💡 Para aplicar esta configuração:');
  console.log('   Edite src/config/bot.config.ts com os valores acima\n');

  // Salvar configuração otimizada
  const optimizedConfig = {
    positionSizePercent: best.config.positionSize,
    stopLossPercent: best.config.stopLoss,
    takeProfitPercent: best.config.takeProfit,
    trailingStopPercent: best.config.trailingStop,
    entryThresholds: best.config.thresholds,
    results: {
      pnl: best.results.totalPnlPercent,
      winRate: best.results.winRate,
      profitFactor: best.results.profitFactor,
      maxDrawdown: best.results.maxDrawdownPercent,
      sharpeRatio: best.results.sharpeRatio,
      trades: best.results.totalTrades,
    },
  };

  const fs = require('fs');
  fs.writeFileSync(
    './backtests/optimized-config.json',
    JSON.stringify(optimizedConfig, null, 2)
  );

  console.log('💾 Configuração salva em: backtests/optimized-config.json\n');
  console.log('═══════════════════════════════════════════════════════\n');
}

optimizeStrategy();
