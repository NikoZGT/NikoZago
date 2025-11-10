import { Backtester, BacktestResults } from './backtester';
import { BotConfig } from '../types';
import { loadConfig } from '../config/bot.config';
import * as fs from 'fs';
import * as path from 'path';

interface WalkForwardPeriod {
  name: string;
  trainStart: Date;
  trainEnd: Date;
  testStart: Date;
  testEnd: Date;
}

interface PeriodResults {
  period: string;
  trainMetrics: any;
  testMetrics: any;
  bestConfig: any;
  overfit: boolean;
  degradation: number; // % de queda de performance do treino para teste
}

/**
 * Walk-Forward Testing
 *
 * Testa se a estratégia funciona em períodos DIFERENTES
 * ou se só "decorou" o passado (overfitting)
 */
async function walkForwardTest() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║        🧪 WALK-FORWARD TESTING - Anti-Overfitting            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Define períodos de treino/teste
  const periods: WalkForwardPeriod[] = [
    {
      name: 'Período 1',
      trainStart: new Date('2025-11-03T00:00:00Z'),
      trainEnd: new Date('2025-11-05T23:59:59Z'),   // 3 dias treino
      testStart: new Date('2025-11-06T00:00:00Z'),
      testEnd: new Date('2025-11-07T23:59:59Z'),     // 2 dias teste
    },
    {
      name: 'Período 2',
      trainStart: new Date('2025-11-04T00:00:00Z'),
      trainEnd: new Date('2025-11-06T23:59:59Z'),   // 3 dias treino
      testStart: new Date('2025-11-07T00:00:00Z'),
      testEnd: new Date('2025-11-08T23:59:59Z'),     // 2 dias teste
    },
    {
      name: 'Período 3',
      trainStart: new Date('2025-11-05T00:00:00Z'),
      trainEnd: new Date('2025-11-07T23:59:59Z'),   // 3 dias treino
      testStart: new Date('2025-11-08T00:00:00Z'),
      testEnd: new Date('2025-11-09T23:59:59Z'),     // 2 dias teste
    },
    {
      name: 'Período 4',
      trainStart: new Date('2025-11-06T00:00:00Z'),
      trainEnd: new Date('2025-11-08T23:59:59Z'),   // 3 dias treino
      testStart: new Date('2025-11-09T00:00:00Z'),
      testEnd: new Date('2025-11-10T23:59:59Z'),     // 2 dias teste
    },
  ];

  console.log('📋 Períodos de teste:\n');
  periods.forEach(p => {
    console.log(`${p.name}:`);
    console.log(`  Treino: ${p.trainStart.toISOString().split('T')[0]} → ${p.trainEnd.toISOString().split('T')[0]}`);
    console.log(`  Teste:  ${p.testStart.toISOString().split('T')[0]} → ${p.testEnd.toISOString().split('T')[0]}\n`);
  });

  const results: PeriodResults[] = [];

  // Para cada período
  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🔄 ${period.name} - TREINO`);
    console.log(`${'='.repeat(70)}\n`);

    // 1. OTIMIZA no período de TREINO
    const bestConfig = await optimizeForPeriod(period.trainStart, period.trainEnd);

    console.log(`\n✅ Melhor config encontrada no treino:`);
    console.log(JSON.stringify(bestConfig, null, 2));

    // 2. TESTA no período de TREINO (in-sample)
    console.log(`\n📊 Testando no período de TREINO (in-sample)...`);
    const trainMetrics = await testWithConfig(bestConfig, period.trainStart, period.trainEnd);

    console.log(`\n🎯 Resultados no TREINO:`);
    console.log(`  PnL: ${trainMetrics.totalPnlPercent.toFixed(2)}%`);
    console.log(`  Win Rate: ${trainMetrics.winRate.toFixed(2)}%`);
    console.log(`  Profit Factor: ${trainMetrics.profitFactor.toFixed(2)}`);
    console.log(`  Max Drawdown: ${trainMetrics.maxDrawdownPercent.toFixed(2)}%`);
    console.log(`  Trades: ${trainMetrics.totalTrades}`);

    // 3. TESTA no período de TESTE (out-of-sample)
    console.log(`\n\n${'='.repeat(70)}`);
    console.log(`🧪 ${period.name} - TESTE (OUT-OF-SAMPLE)`);
    console.log(`${'='.repeat(70)}\n`);

    const testMetrics = await testWithConfig(bestConfig, period.testStart, period.testEnd);

    console.log(`\n📈 Resultados no TESTE (dados que o modelo NUNCA viu):`);
    console.log(`  PnL: ${testMetrics.totalPnlPercent.toFixed(2)}%`);
    console.log(`  Win Rate: ${testMetrics.winRate.toFixed(2)}%`);
    console.log(`  Profit Factor: ${testMetrics.profitFactor.toFixed(2)}`);
    console.log(`  Max Drawdown: ${testMetrics.maxDrawdownPercent.toFixed(2)}%`);
    console.log(`  Trades: ${testMetrics.totalTrades}`);

    // 4. CALCULA DEGRADAÇÃO (overfitting detection)
    const degradation = calculateDegradation(trainMetrics, testMetrics);
    const overfit = degradation > 50; // Se performance cai > 50%, é overfitting

    console.log(`\n⚠️  ANÁLISE DE OVERFITTING:`);
    console.log(`  Degradação: ${degradation.toFixed(2)}%`);
    console.log(`  Status: ${overfit ? '❌ OVERFITTING DETECTADO' : '✅ ESTRATÉGIA ROBUSTA'}`);

    results.push({
      period: period.name,
      trainMetrics,
      testMetrics,
      bestConfig,
      overfit,
      degradation,
    });
  }

  // 5. RELATÓRIO FINAL
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                 📊 RELATÓRIO WALK-FORWARD                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('┌─────────────┬──────────┬──────────┬────────────┬──────────────┐');
  console.log('│   Período   │   Treino │   Teste  │ Degradação │    Status    │');
  console.log('│             │   PnL %  │  PnL %   │     %      │              │');
  console.log('├─────────────┼──────────┼──────────┼────────────┼──────────────┤');

  results.forEach(r => {
    const trainPnl = r.trainMetrics.totalPnlPercent.toFixed(1).padStart(7);
    const testPnl = r.testMetrics.totalPnlPercent.toFixed(1).padStart(7);
    const deg = r.degradation.toFixed(1).padStart(9);
    const status = r.overfit ? '❌ Overfit  ' : '✅ Robusto  ';
    console.log(`│ ${r.period.padEnd(11)} │ ${trainPnl} │ ${testPnl} │ ${deg} │ ${status} │`);
  });

  console.log('└─────────────┴──────────┴──────────┴────────────┴──────────────┘\n');

  // Estatísticas agregadas
  const avgDegradation = results.reduce((sum, r) => sum + r.degradation, 0) / results.length;
  const overfitCount = results.filter(r => r.overfit).length;
  const avgTestPnl = results.reduce((sum, r) => sum + r.testMetrics.totalPnlPercent, 0) / results.length;
  const avgTestWinRate = results.reduce((sum, r) => sum + r.testMetrics.winRate, 0) / results.length;

  console.log('📈 ESTATÍSTICAS GERAIS:\n');
  console.log(`  Degradação Média: ${avgDegradation.toFixed(2)}%`);
  console.log(`  Períodos com Overfitting: ${overfitCount}/${results.length}`);
  console.log(`  PnL Médio (Teste): ${avgTestPnl.toFixed(2)}%`);
  console.log(`  Win Rate Médio (Teste): ${avgTestWinRate.toFixed(2)}%`);

  // RECOMENDAÇÃO FINAL
  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    🎯 RECOMENDAÇÃO FINAL                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  if (avgDegradation < 30 && overfitCount === 0) {
    console.log('✅ ESTRATÉGIA VALIDADA - Altamente Confiável');
    console.log('   - Performance consistente entre períodos');
    console.log('   - Sem sinais de overfitting');
    console.log('   - RECOMENDADO para produção');
  } else if (avgDegradation < 50 && overfitCount <= 1) {
    console.log('⚠️  ESTRATÉGIA MODERADA - Usar com Cautela');
    console.log('   - Alguma degradação entre treino/teste');
    console.log('   - Possível overfitting leve');
    console.log('   - RECOMENDADO começar com capital reduzido');
  } else {
    console.log('❌ ESTRATÉGIA NÃO VALIDADA - Alto Risco de Overfitting');
    console.log('   - Performance inconsistente');
    console.log('   - Overfitting detectado');
    console.log('   - NÃO RECOMENDADO para produção');
    console.log('   - Sugestão: Re-otimizar com parâmetros mais conservadores');
  }

  console.log('\n');

  // Salva resultados
  const outputPath = path.join(__dirname, '../../backtests/walk-forward-results.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    periods: results,
    summary: {
      avgDegradation,
      overfitCount,
      avgTestPnl,
      avgTestWinRate,
    },
  }, null, 2));

  console.log(`💾 Resultados salvos em: ${outputPath}\n`);
}

/**
 * Otimiza estratégia para um período específico
 */
async function optimizeForPeriod(startDate: Date, endDate: Date): Promise<any> {
  console.log('🔍 Otimizando estratégia...');

  // Grid search reduzido (mais rápido para walk-forward)
  const positionSizes = [15, 20, 25];
  const stopLosses = [6, 8, 10];
  const takeProfits = [30, 40, 50];
  const trailingStops = [10, 12, 15];

  const entryThresholds = [
    { name: 'VERY_SELECTIVE', volumeSpike: 180, priceSpike: 8 },
    { name: 'SELECTIVE', volumeSpike: 150, priceSpike: 6 },
    { name: 'MODERATE', volumeSpike: 120, priceSpike: 5 },
  ];

  let bestScore = -Infinity;
  let bestConfig: any = null;
  let testCount = 0;

  const totalTests = positionSizes.length * stopLosses.length * takeProfits.length *
                     trailingStops.length * entryThresholds.length;

  for (const posSize of positionSizes) {
    for (const sl of stopLosses) {
      for (const tp of takeProfits) {
        for (const ts of trailingStops) {
          for (const threshold of entryThresholds) {
            testCount++;

            const config = {
              positionSizePercent: posSize,
              stopLossPercent: sl,
              takeProfitPercent: tp,
              trailingStopPercent: ts,
              entryThresholds: {
                volumeSpike: threshold.volumeSpike,
                priceSpike: threshold.priceSpike,
              },
            };

            const metrics = await testWithConfig(config, startDate, endDate);

            // Score (prioriza consistência)
            const score =
              (metrics.profitFactor * 20) +
              (metrics.winRate * 0.3) +
              (metrics.totalPnlPercent / 50) +
              ((10 - metrics.maxDrawdownPercent) * 1) +
              (metrics.sharpeRatio * 1);

            if (score > bestScore) {
              bestScore = score;
              bestConfig = { ...config, score, metrics };
            }

            if (testCount % 20 === 0) {
              process.stdout.write(`\r⏳ Testando ${testCount}/${totalTests}... `);
            }
          }
        }
      }
    }
  }

  console.log(`\r✅ Otimização completa! (${testCount} testes)          `);
  return bestConfig;
}

/**
 * Testa uma configuração em um período específico
 */
async function testWithConfig(config: any, startDate: Date, endDate: Date): Promise<any> {
  // Configura thresholds globais
  (global as any).currentStrategyThresholds = {
    volumeSpike: config.entryThresholds.volumeSpike,
    priceSpike: config.entryThresholds.priceSpike,
    volumeExplosive: config.entryThresholds.volumeSpike + 30,
    momentumVolume: config.entryThresholds.volumeSpike - 30,
    momentumPrice: config.entryThresholds.priceSpike + 2,
    pricePump: config.entryThresholds.priceSpike * 2,
  };

  const baseConfig = loadConfig();
  const botConfig: BotConfig = {
    ...baseConfig,
    positionSizePercent: config.positionSizePercent,
    stopLossPercent: config.stopLossPercent,
    takeProfitPercent: config.takeProfitPercent,
    trailingStopPercent: config.trailingStopPercent,
    maxConcurrentPositions: 3,
  };

  const backtester = new Backtester({
    startDate,
    endDate,
    initialCapital: 10,
    network: 'solana',
  }, botConfig);

  const results = await backtester.run();

  return results;
}

/**
 * Calcula degradação de performance entre treino e teste
 */
function calculateDegradation(trainMetrics: any, testMetrics: any): number {
  // Combina múltiplas métricas
  const trainScore = (trainMetrics.profitFactor * 2) + (trainMetrics.winRate / 10);
  const testScore = (testMetrics.profitFactor * 2) + (testMetrics.winRate / 10);

  const degradation = ((trainScore - testScore) / trainScore) * 100;
  return Math.max(0, degradation); // Não pode ser negativo (se teste é MELHOR que treino)
}

// Run
walkForwardTest().catch(console.error);
