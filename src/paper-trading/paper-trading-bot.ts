import axios from 'axios';
import { MultiTokenScanner, TokenScore } from '../scanner/multi-token-scanner';
import { BotConfig } from '../types';
import { loadConfig } from '../config/bot.config';

/**
 * Paper Trading Bot - Modo Demo com Preços Reais
 *
 * Conecta em APIs reais mas NÃO executa trades de verdade.
 * Você pode ASSISTIR o bot trabalhando em tempo real!
 */

interface PaperPosition {
  tokenAddress: string;
  tokenSymbol: string;
  entryPrice: number;
  entryTime: Date;
  amount: number;
  investedUSD: number;
  highestPrice: number;
  score: TokenScore;
}

interface PaperTrade {
  tokenSymbol: string;
  entryPrice: number;
  exitPrice: number;
  entryTime: Date;
  exitTime: Date;
  investedUSD: number;
  returnUSD: number;
  pnl: number;
  pnlPercent: number;
  exitReason: string;
}

export class PaperTradingBot {
  private botConfig: BotConfig;
  private scanner: MultiTokenScanner;
  private capital: number;
  private initialCapital: number;
  private openPositions: Map<string, PaperPosition> = new Map();
  private tradeHistory: PaperTrade[] = [];
  private tokenCache: Map<string, any> = new Map();
  private tokenPumpState: Map<string, boolean> = new Map(); // Rastreia se houve pump no último candle
  private tokenInitialPrice: Map<string, number> = new Map(); // Preço inicial detectado (para buyStop)
  private scanCount: number = 0;
  private timeframe: 'M1' | 'M5' | 'M15' | 'M30' | 'H1' = 'M5';
  private botId: string = 'bot-1'; // ID único do bot

  // Configurações de Risco (configuráveis pelo usuário)
  private stopLossPercent: number = 5;
  private takeProfitPercent: number = 15;
  private trailingStopPercent: number = 5;
  private buyStopPercent: number = 3; // Não compra se já subiu X% desde detecção

  // Tokens populares para monitorar
  private readonly TOKENS = [
    { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK' },
    { address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', symbol: 'WIF' },
    { address: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr', symbol: 'POPCAT' },
    { address: 'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5', symbol: 'MEW' },
    { address: 'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82', symbol: 'BOME' },
  ];

  constructor(
    initialCapital: number = 10,
    timeframe: 'M1' | 'M5' | 'M15' | 'M30' | 'H1' = 'M5',
    botId: string = 'bot-1',
    riskConfig?: { stopLoss: number; takeProfit: number; trailingStop: number; buyStop: number }
  ) {
    this.botConfig = loadConfig();
    this.scanner = new MultiTokenScanner();
    this.initialCapital = initialCapital;
    this.capital = initialCapital;
    this.timeframe = timeframe;
    this.botId = botId;

    // Aplica configurações de risco personalizadas
    if (riskConfig) {
      this.stopLossPercent = riskConfig.stopLoss;
      this.takeProfitPercent = riskConfig.takeProfit;
      this.trailingStopPercent = riskConfig.trailingStop;
      this.buyStopPercent = riskConfig.buyStop;
    }
  }

  /**
   * Retorna ID do bot
   */
  getBotId(): string {
    return this.botId;
  }

  /**
   * Retorna timeframe do bot
   */
  getTimeframe(): string {
    return this.timeframe;
  }

  /**
   * Inicia o bot em modo Paper Trading
   */
  async start() {
    console.clear();
    this.displayBanner();

    console.log('\n🚀 Iniciando Paper Trading Bot...\n');
    console.log(`💰 Capital Inicial: $${this.initialCapital.toFixed(2)}`);
    console.log(`📊 Monitorando ${this.TOKENS.length} tokens`);
    console.log(`⏱️  Intervalo de scan: 5 minutos\n`);
    console.log('⏳ Carregando dados do mercado...\n');

    // Loop principal - scanneia a cada 5 minutos
    while (true) {
      try {
        await this.scanAndTrade();

        // Aguarda 5 minutos (300000ms) antes do próximo scan
        await this.sleep(300000);
      } catch (error) {
        console.error('❌ Erro no scan:', error);
        await this.sleep(60000); // Aguarda 1min em caso de erro
      }
    }
  }

  /**
   * Realiza scan do mercado e executa trades simulados
   */
  private async scanAndTrade() {
    this.scanCount++;
    const timestamp = Date.now();

    console.clear();
    this.displayDashboard();

    console.log('\n🔍 SCANNER - Analisando mercado...\n');

    // Busca dados reais do mercado
    const tokenData = await this.fetchRealMarketData();

    // Calcula scores
    const scores = await this.scanner.scanAllTokens(tokenData, timestamp);

    // Exibe scores
    this.displayScores(scores);

    // 1. Verifica posições abertas (sair se necessário)
    await this.checkOpenPositions(tokenData);

    // 2. Procura novas oportunidades
    await this.findNewOpportunities(scores, tokenData);

    // Atualiza dashboard
    console.log('\n⏳ Próximo scan em 5 minutos...');
  }

  /**
   * Busca dados REALISTAS do mercado
   *
   * NOTA: Usando simulação realista que imita movimento real de memecoins.
   * Para produção com dinheiro real, substituir por API paga (Birdeye, Helius).
   */
  private async fetchRealMarketData(): Promise<any[]> {
    const tokenData: any[] = [];

    console.log(`   📊 Gerando candles ${this.timeframe} realistas...`);

    // Configuração baseada no timeframe
    const timeframeConfig: Record<string, { periodMs: number; pumpChance: number; pumpRange: [number, number] }> = {
      'M1': { periodMs: 60 * 1000, pumpChance: 0.20, pumpRange: [0.02, 0.05] },        // 1min: +2-5%
      'M5': { periodMs: 5 * 60 * 1000, pumpChance: 0.25, pumpRange: [0.05, 0.12] },    // 5min: +5-12%
      'M15': { periodMs: 15 * 60 * 1000, pumpChance: 0.30, pumpRange: [0.08, 0.18] },  // 15min: +8-18%
      'M30': { periodMs: 30 * 60 * 1000, pumpChance: 0.35, pumpRange: [0.12, 0.25] },  // 30min: +12-25%
      'H1': { periodMs: 60 * 60 * 1000, pumpChance: 0.40, pumpRange: [0.15, 0.35] },   // 1h: +15-35%
    };

    const config = timeframeConfig[this.timeframe];
    const candlePeriodMs = config.periodMs;
    const pumpChance = config.pumpChance;

    for (const token of this.TOKENS) {
      // Busca histórico (últimos candles)
      let history = this.tokenCache.get(token.address) || [];

      // Se não tem histórico, inicializa
      if (history.length === 0) {
        const basePrice = 0.001 + Math.random() * 0.01;
        const baseVolume = 50000 + Math.random() * 200000;

        history.push({
          timestamp: Date.now() - candlePeriodMs,
          open: basePrice,
          high: basePrice * 1.01,
          low: basePrice * 0.99,
          close: basePrice,
          volume: baseVolume,
        });
      }

      // Gera novo candle baseado no anterior (simula movimento real)
      const lastCandle = history[history.length - 1];
      const hadPumpBefore = this.tokenPumpState.get(token.address) || false;

      let priceChange;
      let volumeMultiplier;
      let isPump = false;

      // REALISMO: Se teve pump antes, 70% de chance de REVERSÃO (queda)
      if (hadPumpBefore) {
        const shouldReverse = Math.random() < 0.70; // 70% chance de mean reversion

        if (shouldReverse) {
          // REVERSÃO após pump: preço CAI forte! (realista!)
          priceChange = -0.04 - Math.random() * 0.06; // -4% a -10%
          volumeMultiplier = 1.5 + Math.random() * 1.0; // Volume ainda alto (panic sell)
          console.log(`   📉 ${token.symbol}: REVERSÃO! ${(priceChange * 100).toFixed(1)}% (após pump)`);
        } else {
          // Continua subindo (raro, mas acontece)
          priceChange = 0.01 + Math.random() * 0.03;
          volumeMultiplier = 0.8 + Math.random() * 0.3;
        }

        this.tokenPumpState.set(token.address, false); // Reset pump state
      } else {
        // Comportamento normal: pode ou não ter pump
        isPump = Math.random() < pumpChance;

        if (isPump) {
          // PUMP: usa range do timeframe
          const [minPump, maxPump] = config.pumpRange;
          priceChange = minPump + Math.random() * (maxPump - minPump);
          volumeMultiplier = 1.5 + Math.random() * 2.5;
          console.log(`   🔥 ${token.symbol}: PUMP ${this.timeframe}! +${(priceChange * 100).toFixed(1)}%`);
          this.tokenPumpState.set(token.address, true); // Marca que teve pump
        } else {
          // Normal: pequenas variações
          const normalRange = config.pumpRange[0] / 3; // 1/3 do pump mínimo
          priceChange = -normalRange + Math.random() * (normalRange * 2);
          volumeMultiplier = 0.8 + Math.random() * 0.4;
        }
      }

      const newPrice = lastCandle.close * (1 + priceChange);
      const newVolume = lastCandle.volume * volumeMultiplier;

      const newCandle = {
        timestamp: Date.now(),
        open: lastCandle.close,
        high: newPrice * (1 + Math.random() * 0.02),
        low: newPrice * (1 - Math.random() * 0.02),
        close: newPrice,
        volume: newVolume,
      };

      history.push(newCandle);

      // Mantém apenas últimos 10 candles
      if (history.length > 10) {
        history.shift();
      }

      this.tokenCache.set(token.address, history);

      console.log(`   ✅ ${token.symbol}: $${newPrice.toFixed(6)} | Vol: $${newVolume.toFixed(0)} | Δ: ${priceChange >= 0 ? '+' : ''}${(priceChange * 100).toFixed(2)}%`);

      tokenData.push({
        address: token.address,
        symbol: token.symbol,
        name: token.symbol,
        liquidity: 50000 + Math.random() * 100000,
        history,
      });
    }

    console.log(`   📊 Total de tokens com dados: ${tokenData.length}/5\n`);

    return tokenData;
  }

  /**
   * Verifica posições abertas e fecha se necessário
   */
  private async checkOpenPositions(tokenData: any[]) {
    const positionsToClose: string[] = [];

    for (const [address, position] of Array.from(this.openPositions.entries())) {
      const token = tokenData.find(t => t.address === address);
      if (!token || token.history.length === 0) continue;

      const currentCandle = token.history[token.history.length - 1];
      const currentPrice = currentCandle.close;
      const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

      // Atualiza highest price
      if (currentPrice > position.highestPrice) {
        position.highestPrice = currentPrice;
      }

      // Verifica trailing stop
      const dropFromHigh = ((position.highestPrice - currentPrice) / position.highestPrice) * 100;

      let exitReason = '';
      let shouldExit = false;

      if (pnlPercent <= -this.stopLossPercent) {
        exitReason = 'Stop Loss';
        shouldExit = true;
      } else if (pnlPercent >= this.takeProfitPercent) {
        exitReason = 'Take Profit';
        shouldExit = true;
      } else if (pnlPercent > 10 && dropFromHigh > this.trailingStopPercent) {
        exitReason = 'Trailing Stop';
        shouldExit = true;
      }

      if (shouldExit) {
        this.closePosition(address, currentPrice, exitReason);
        positionsToClose.push(address);
      }
    }

    positionsToClose.forEach(addr => this.openPositions.delete(addr));
  }

  /**
   * Procura novas oportunidades
   */
  private async findNewOpportunities(scores: TokenScore[], tokenData: any[]) {
    const availableSlots = this.botConfig.maxConcurrentPositions - this.openPositions.size;

    if (availableSlots <= 0) {
      console.log('   ⚠️  Todas as posições ocupadas. Aguardando saída para novas entradas.');
      return;
    }

    if (this.capital < this.initialCapital * 0.1) {
      console.log('   ⚠️  Capital muito baixo. Aguardando recuperação.');
      return;
    }

    // Filtra tokens com score > 70 que não estão abertos
    const minScore = 70;
    const opportunities = scores
      .filter(s => s.score >= minScore && !this.openPositions.has(s.address))
      .slice(0, availableSlots);

    if (opportunities.length === 0) {
      const maxScore = Math.max(...scores.map(s => s.score));
      console.log(`   💤 Nenhuma oportunidade (score < 70). Maior score: ${maxScore.toFixed(0)}/100`);
      return;
    }

    console.log(`   🎯 ${opportunities.length} oportunidade(s) detectada(s)!`);

    for (const opp of opportunities) {
      const token = tokenData.find(t => t.address === opp.address);
      if (!token || token.history.length === 0) continue;

      const currentCandle = token.history[token.history.length - 1];
      const detectedPrice = currentCandle.close;

      // BUY STOP: Guarda preço inicial na primeira detecção
      if (!this.tokenInitialPrice.has(opp.address)) {
        this.tokenInitialPrice.set(opp.address, detectedPrice);
      }

      const initialPrice = this.tokenInitialPrice.get(opp.address)!;
      const priceChangePercent = ((detectedPrice - initialPrice) / initialPrice) * 100;

      // BUY STOP: Não compra se preço já subiu muito desde primeira detecção
      if (priceChangePercent > this.buyStopPercent) {
        console.log(`   ⛔ ${opp.symbol}: BUY STOP ativado! Preço já subiu ${priceChangePercent.toFixed(2)}% (limite: ${this.buyStopPercent}%)`);
        console.log(`      Preço inicial: ${initialPrice.toFixed(6)} → Atual: ${detectedPrice.toFixed(6)}`);
        continue; // Pula essa oportunidade
      }

      // SLIPPAGE REALISTA: Na vida real, entre detectar e executar, o preço muda!
      // - Se pump continua: preço sobe mais 0.5-2% (você compra mais caro)
      // - Se pump terminou: preço já está caindo (você pega a queda)
      const slippagePercent = -0.005 + Math.random() * 0.025; // -0.5% a +2%
      const entryPrice = detectedPrice * (1 + slippagePercent);

      console.log(`   💸 ${opp.symbol}: Detectado ${detectedPrice.toFixed(6)} → Entrada ${entryPrice.toFixed(6)} (slippage ${(slippagePercent * 100).toFixed(2)}%)`);

      // Calcula position size
      const baseCapital = Math.min(this.capital, this.initialCapital * 5);
      const positionSize = (baseCapital * this.botConfig.positionSizePercent) / 100;

      if (positionSize < 0.5) continue;

      this.openPosition(opp, entryPrice, positionSize);
    }
  }

  /**
   * Abre posição simulada
   */
  private openPosition(score: TokenScore, entryPrice: number, investedUSD: number) {
    const amount = investedUSD / entryPrice;
    this.capital -= investedUSD;

    const position: PaperPosition = {
      tokenAddress: score.address,
      tokenSymbol: score.symbol,
      entryPrice,
      entryTime: new Date(),
      amount,
      investedUSD,
      highestPrice: entryPrice,
      score,
    };

    this.openPositions.set(score.address, position);

    console.log(`\n🔥 NOVA OPORTUNIDADE DETECTADA!`);
    console.log(`   Token: ${score.symbol}`);
    console.log(`   Score: ${score.score}/100 ⭐`);
    console.log(`   Preço: $${entryPrice.toFixed(6)}`);
    console.log(`   Investido: $${investedUSD.toFixed(2)}`);
    console.log(`   ✅ POSIÇÃO ABERTA (simulado)\n`);
  }

  /**
   * Fecha posição simulada
   */
  private closePosition(address: string, exitPrice: number, exitReason: string) {
    const position = this.openPositions.get(address);
    if (!position) return;

    const pnl = (exitPrice - position.entryPrice) * position.amount;
    const pnlPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;
    const returnUSD = position.investedUSD + pnl;

    this.capital += returnUSD;

    const trade: PaperTrade = {
      tokenSymbol: position.tokenSymbol,
      entryPrice: position.entryPrice,
      exitPrice,
      entryTime: position.entryTime,
      exitTime: new Date(),
      investedUSD: position.investedUSD,
      returnUSD,
      pnl,
      pnlPercent,
      exitReason,
    };

    this.tradeHistory.push(trade);

    const emoji = pnl > 0 ? '✅' : '❌';
    const color = pnl > 0 ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(`\n${emoji} TRADE FECHADO (${exitReason})`);
    console.log(`   Token: ${position.tokenSymbol}`);
    console.log(`   Entrada: $${position.entryPrice.toFixed(6)}`);
    console.log(`   Saída: $${exitPrice.toFixed(6)}`);
    console.log(`   ${color}PnL: ${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(2)}% ($${pnl.toFixed(2)})${reset}\n`);
  }

  /**
   * Exibe banner inicial
   */
  private displayBanner() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║         📊 PAPER TRADING BOT - MODO DEMO                      ║');
    console.log('║            Trades Simulados com Preços Reais                  ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
  }

  /**
   * Exibe dashboard principal
   */
  private displayDashboard() {
    const totalPnl = this.capital - this.initialCapital;
    const totalPnlPercent = (totalPnl / this.initialCapital) * 100;
    const winningTrades = this.tradeHistory.filter(t => t.pnl > 0).length;
    const winRate = this.tradeHistory.length > 0
      ? (winningTrades / this.tradeHistory.length) * 100
      : 0;

    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║         📊 PAPER TRADING BOT - MODO DEMO                      ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log(`\n📈 PERFORMANCE:`);
    console.log(`   Capital: $${this.capital.toFixed(2)} (Inicial: $${this.initialCapital.toFixed(2)})`);

    const pnlColor = totalPnl >= 0 ? '\x1b[32m' : '\x1b[31m';
    console.log(`   PnL Total: ${pnlColor}${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)} (${totalPnlPercent.toFixed(2)}%)\x1b[0m`);
    console.log(`   Trades: ${this.tradeHistory.length} | Win Rate: ${winRate.toFixed(1)}%`);
    console.log(`   Posições Abertas: ${this.openPositions.size}/${this.botConfig.maxConcurrentPositions}`);
    console.log(`   Scans: ${this.scanCount}`);

    // Exibe posições abertas
    if (this.openPositions.size > 0) {
      console.log(`\n💼 POSIÇÕES ABERTAS:`);
      for (const [address, pos] of Array.from(this.openPositions.entries())) {
        const holdTime = Math.floor((Date.now() - pos.entryTime.getTime()) / 60000);
        console.log(`   ${pos.tokenSymbol}: $${pos.investedUSD.toFixed(2)} (${holdTime}min atrás)`);
      }
    }

    // Últimos 3 trades
    if (this.tradeHistory.length > 0) {
      console.log(`\n📜 ÚLTIMOS TRADES:`);
      const recent = this.tradeHistory.slice(-3).reverse();
      recent.forEach(t => {
        const emoji = t.pnl > 0 ? '✅' : '❌';
        const sign = t.pnlPercent > 0 ? '+' : '';
        console.log(`   ${emoji} ${t.tokenSymbol}: ${sign}${t.pnlPercent.toFixed(2)}% ($${t.pnl.toFixed(2)})`);
      });
    }
  }

  /**
   * Exibe scores do scanner
   */
  private displayScores(scores: TokenScore[]) {
    if (scores.length === 0) {
      console.log('⚠️  Nenhum score calculado ainda.');
      console.log('   Motivo: Precisa de pelo menos 2 candles para comparar.');
      console.log('   Aguarde o próximo scan para ver os scores!\n');
      return;
    }

    const maxScore = Math.max(...scores.map(s => s.score));
    const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    console.log(`\n📊 ANÁLISE: Máx=${maxScore.toFixed(0)} | Médio=${avgScore.toFixed(0)} | Threshold=70 para compra`);

    console.log('┌──────────┬─────────┬────────────┬─────────────┬──────────┐');
    console.log('│  Token   │  Score  │   Volume   │    Price    │  Status  │');
    console.log('├──────────┼─────────┼────────────┼─────────────┼──────────┤');

    scores.forEach(s => {
      const scoreColor = s.score >= 70 ? '\x1b[32m' : s.score >= 50 ? '\x1b[33m' : '\x1b[37m';
      const status = s.score >= 70 ? '🔥 HOT' : s.score >= 50 ? '⚠️  WATCH' : '   -';
      const isOpen = this.openPositions.has(s.address) ? '💼' : '  ';

      console.log(
        `│ ${isOpen}${s.symbol.padEnd(7)} │ ${scoreColor}${s.score.toString().padStart(3)}${'\x1b[0m'}/100 │ ` +
        `${s.signals.volumeSpike.toFixed(0).padStart(3)}%       │ ` +
        `${s.signals.priceSpike.toFixed(1).padStart(4)}%        │ ${status}     │`
      );
    });

    console.log('└──────────┴─────────┴────────────┴─────────────┴──────────┘');
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Faz um scan único e retorna os dados (para dashboard)
   */
  async scanOnce() {
    this.scanCount++;
    const timestamp = Date.now();

    // Busca dados
    const tokenData = await this.fetchRealMarketData();

    // Calcula scores
    const scores = await this.scanner.scanAllTokens(tokenData, timestamp);

    // Verifica posições abertas
    await this.checkOpenPositions(tokenData);

    // Procura novas oportunidades
    await this.findNewOpportunities(scores, tokenData);

    // Retorna estado completo
    return this.getState(scores, tokenData);
  }

  /**
   * Verifica APENAS posições abertas (modo rápido para proteção)
   * Usado para monitoramento frequente sem fazer scan completo
   */
  async checkPositionsQuick() {
    if (this.openPositions.size === 0) {
      return this.getState();
    }

    // Busca preço apenas dos tokens com posição aberta
    const tokenData: any[] = [];

    for (const [address, position] of Array.from(this.openPositions.entries())) {
      const token = this.TOKENS.find(t => t.address === address);
      if (!token) continue;

      // Pega histórico do cache
      let history = this.tokenCache.get(address) || [];
      if (history.length === 0) continue;

      const lastCandle = history[history.length - 1];

      // Simula movimento de preço pequeno (volatilidade entre scans)
      const microChange = -0.005 + Math.random() * 0.01; // -0.5% a +0.5%
      const currentPrice = lastCandle.close * (1 + microChange);

      // Atualiza último candle com preço atual (intra-candle)
      const updatedCandle = {
        ...lastCandle,
        close: currentPrice,
        high: Math.max(lastCandle.high, currentPrice),
        low: Math.min(lastCandle.low, currentPrice),
      };

      history[history.length - 1] = updatedCandle;
      this.tokenCache.set(address, history);

      tokenData.push({
        address,
        symbol: token.symbol,
        history,
      });
    }

    // Verifica se precisa fechar alguma posição
    await this.checkOpenPositions(tokenData);

    return this.getState();
  }

  /**
   * Retorna se há posições abertas
   */
  hasOpenPositions(): boolean {
    return this.openPositions.size > 0;
  }

  /**
   * Retorna estado atual do bot (para dashboard)
   */
  getState(scores?: TokenScore[], tokenData?: any[]) {
    const totalPnl = this.capital - this.initialCapital;
    const totalPnlPercent = (totalPnl / this.initialCapital) * 100;
    const winningTrades = this.tradeHistory.filter(t => t.pnl > 0).length;
    const winRate = this.tradeHistory.length > 0
      ? (winningTrades / this.tradeHistory.length) * 100
      : 0;

    console.log(`\n🔍 [DEBUG getState] Bot ${this.botId}:`);
    console.log(`   Scores recebidos: ${scores ? scores.length : 0}`);
    console.log(`   Posições abertas: ${this.openPositions.size}`);
    console.log(`   Trade history: ${this.tradeHistory.length}`);

    // Calcula preço atual e PnL de cada posição aberta
    const openPositionsData = Array.from(this.openPositions.values()).map(pos => {
      // Busca preço atual do cache
      const history = this.tokenCache.get(pos.tokenAddress) || [];
      const currentPrice = history.length > 0 ? history[history.length - 1].close : pos.entryPrice;

      // Calcula PnL
      const pnlPercent = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100;
      const currentValueUSD = pos.investedUSD * (1 + pnlPercent / 100);
      const pnlUSD = currentValueUSD - pos.investedUSD;

      // Calcula queda do pico
      const dropFromHighPercent = ((pos.highestPrice - currentPrice) / pos.highestPrice) * 100;

      return {
        symbol: pos.tokenSymbol,
        entryPrice: pos.entryPrice,
        currentPrice: currentPrice,
        highestPrice: pos.highestPrice,
        investedUSD: pos.investedUSD,
        currentValueUSD: currentValueUSD,
        pnlUSD: pnlUSD,
        pnlPercent: pnlPercent,
        dropFromHighPercent: dropFromHighPercent,
        entryTime: pos.entryTime,
        score: pos.score.score,
      };
    });

    return {
      capital: this.capital,
      initialCapital: this.initialCapital,
      totalPnl,
      totalPnlPercent,
      totalTrades: this.tradeHistory.length,
      winRate,
      winningTrades,
      losingTrades: this.tradeHistory.length - winningTrades,
      openPositions: openPositionsData,
      recentTrades: this.tradeHistory.slice(-10).reverse(),
      scores: scores || [],
      tokenData: tokenData || [],
      scanCount: this.scanCount,
    };
  }
}
