import { MultiTokenBacktester } from './backtester-multi-token';
import { BacktestResults } from './backtester';
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
  degradation: number;
}

/**
 * Walk-Forward Testing para MULTI-TOKEN
 */
async function walkForwardMultiToken() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║   🧪 WALK-FORWARD TESTING - MULTI-TOKEN (Anti-Overfitting)   ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const periods: WalkForwardPeriod[] = [
    {
      name: 'Período 1',
      trainStart: new Date('2025-11-03T00:00:00Z'),
      trainEnd: new Date('2025-11-05T23:59:59Z'),
      testStart: new Date('2025-11-06T00:00:00Z'),
      testEnd: new Date('2025-11-07T23:59:59Z'),
    },
    {
      name: 'Período 2',
      trainStart: new Date('2025-11-04T00:00:00Z'),
      trainEnd: new Date('2025-11-06T23:59:59Z'),
      testStart: new Date('2025-11-07T00:00:00Z'),
      testEnd: new Date('2025-11-08T23:59:59Z'),
    },
    {
      name: 'Período 3',
      trainStart: new Date('2025-11-05T00:00:00Z'),
      trainEnd: new Date('2025-11-07T23:59:59Z'),
      testStart: new Date('2025-11-08T00:00:00Z'),
      testEnd: new Date('2025-11-09T23:59:59Z'),
    },
    {
      name: 'Período 4',
      trainStart: new Date('2025-11-06T00:00:00Z'),
      trainEnd: new Date('2025-11-08T23:59:59Z'),
      testStart: new Date('2025-11-09T00:00:00Z'),
      testEnd: new Date('2025-11-10T23:59:59Z'),
    },
  ];

  console.log('📋 Períodos de teste:\n');
  periods.forEach(p => {
    console.log(`${p.name}:`);
    console.log(`  Treino: ${p.trainStart.toISOString().split('T')[0]} → ${p.trainEnd.toISOString().split('T')[0]}`);
    console.log(`  Teste:  ${p.testStart.toISOString().split('T')[0]} → ${p.testEnd.toISOString().split('T')[0]}\n`);
  });

  const results: PeriodResults[] = [];

  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🔄 ${period.name} - TREINO (Multi-Token)`);
    console.log(`${'='.repeat(70)}\n`);

    // Testar no período de TREINO
    const trainMetrics = await testMultiToken(period.trainStart, period.trainEnd);

    console.log(`\n🎯 Resultados no TREINO:`);
    console.log(`  PnL: ${trainMetrics.totalPnlPercent.toFixed(2)}%`);
    console.log(`  Win Rate: ${trainMetrics.winRate.toFixed(2)}%`);
    console.log(`  Profit Factor: ${trainMetrics.profitFactor.toFixed(2)}`);
    console.log(`  Max Drawdown: ${trainMetrics.maxDrawdownPercent.toFixed(2)}%`);
    console.log(`  Trades: ${trainMetrics.totalTrades}`);

    // Testar no período de TESTE (out-of-sample)
    console.log(`\n\n${'='.repeat(70)}`);
    console.log(`🧪 ${period.name} - TESTE (OUT-OF-SAMPLE)`);
    console.log(`${'='.repeat(70)}\n`);

    const testMetrics = await testMultiToken(period.testStart, period.testEnd);

    console.log(`\n📈 Resultados no TESTE:`);
    console.log(`  PnL: ${testMetrics.totalPnlPercent.toFixed(2)}%`);
    console.log(`  Win Rate: ${testMetrics.winRate.toFixed(2)}%`);
    console.log(`  Profit Factor: ${testMetrics.profitFactor.toFixed(2)}`);
    console.log(`  Max Drawdown: ${testMetrics.maxDrawdownPercent.toFixed(2)}%`);
    console.log(`  Trades: ${testMetrics.totalTrades}`);

    // Calcula degradação
    const degradation = calculateDegradation(trainMetrics, testMetrics);
    const overfit = degradation > 50;

    console.log(`\n⚠️  ANÁLISE DE OVERFITTING:`);
    console.log(`  Degradação: ${degradation.toFixed(2)}%`);
    console.log(`  Status: ${overfit ? '❌ OVERFITTING DETECTADO' : '✅ ESTRATÉGIA ROBUSTA'}`);

    results.push({
      period: period.name,
      trainMetrics,
      testMetrics,
      bestConfig: null,
      overfit,
      degradation,
    });
  }

  // RELATÓRIO FINAL
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           📊 RELATÓRIO WALK-FORWARD (MULTI-TOKEN)             ║');
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
  const avgTestTrades = results.reduce((sum, r) => sum + r.testMetrics.totalTrades, 0) / results.length;

  console.log('📈 ESTATÍSTICAS GERAIS (MULTI-TOKEN):\n');
  console.log(`  Degradação Média: ${avgDegradation.toFixed(2)}%`);
  console.log(`  Períodos com Overfitting: ${overfitCount}/${results.length}`);
  console.log(`  PnL Médio (Teste): ${avgTestPnl.toFixed(2)}%`);
  console.log(`  Win Rate Médio (Teste): ${avgTestWinRate.toFixed(2)}%`);
  console.log(`  Trades Médio (Teste): ${avgTestTrades.toFixed(0)}`);

  // RECOMENDAÇÃO FINAL
  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║              🎯 RECOMENDAÇÃO FINAL (MULTI-TOKEN)               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  if (avgDegradation < 30 && overfitCount === 0) {
    console.log('✅ ESTRATÉGIA MULTI-TOKEN VALIDADA - Altamente Confiável');
    console.log('   - Performance consistente entre períodos');
    console.log('   - Sem sinais de overfitting');
    console.log('   - Scanner funciona bem em dados nunca vistos');
    console.log('   - RECOMENDADO para produção');
  } else if (avgDegradation < 50 && overfitCount <= 1) {
    console.log('⚠️  ESTRATÉGIA MULTI-TOKEN MODERADA - Usar com Cautela');
    console.log('   - Alguma degradação entre treino/teste');
    console.log('   - Possível overfitting leve');
    console.log('   - RECOMENDADO começar com capital reduzido');
  } else {
    console.log('❌ ESTRATÉGIA MULTI-TOKEN NÃO VALIDADA - Alto Risco');
    console.log('   - Performance inconsistente');
    console.log('   - Overfitting detectado');
    console.log('   - NÃO RECOMENDADO para produção');
  }

  console.log('\n');

  // Salva resultados
  const outputPath = path.join(__dirname, '../../backtests/walk-forward-multi-results.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    periods: results,
    summary: {
      avgDegradation,
      overfitCount,
      avgTestPnl,
      avgTestWinRate,
      avgTestTrades,
    },
  }, null, 2));

  console.log(`💾 Resultados salvos em: ${outputPath}\n`);
}

async function testMultiToken(startDate: Date, endDate: Date): Promise<any> {
  const baseConfig = loadConfig();
  const botConfig: BotConfig = {
    ...baseConfig,
    positionSizePercent: 20,
    stopLossPercent: 8,
    takeProfitPercent: 40,
    trailingStopPercent: 12,
    maxConcurrentPositions: 3,
  };

  const backtester = new MultiTokenBacktester({
    startDate,
    endDate,
    initialCapital: 10,
    network: 'solana',
  }, botConfig);

  const results = await backtester.run();
  return results;
}

function calculateDegradation(trainMetrics: any, testMetrics: any): number {
  const trainScore = (trainMetrics.profitFactor * 2) + (trainMetrics.winRate / 10);
  const testScore = (testMetrics.profitFactor * 2) + (testMetrics.winRate / 10);

  const degradation = ((trainScore - testScore) / trainScore) * 100;
  return Math.max(0, degradation);
}

// Run
walkForwardMultiToken().catch(console.error);
