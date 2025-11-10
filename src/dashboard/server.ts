import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as path from 'path';
import { PaperTradingBot } from '../paper-trading/paper-trading-bot';

/**
 * Dashboard Server - WebSocket + Web Interface
 */
interface BotInstance {
  id: string;
  bot: PaperTradingBot;
  timeframe: 'M1' | 'M5' | 'M15' | 'M30' | 'H1';
  checkInterval: number;
  isRunning: boolean;
}

export class DashboardServer {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer;
  private bots: Map<string, BotInstance> = new Map();
  private clients: Set<WebSocket> = new Set();
  private defaultCheckInterval: number = 15000; // 15 segundos padrão

  constructor(port: number = 3000) {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    this.setupRoutes();
    this.setupWebSocket();

    this.server.listen(port, () => {
      console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
      console.log(`║          📊 DASHBOARD INICIADO                                 ║`);
      console.log(`╚════════════════════════════════════════════════════════════════╝`);
      console.log(`\n🌐 Abra no navegador: http://localhost:${port}`);
      console.log(`\n✨ Dashboard pronto para uso!\n`);
    });
  }

  private setupRoutes() {
    // Serve arquivos estáticos
    this.app.use(express.static(path.join(__dirname, 'public')));

    // Rota principal
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // API status
    this.app.get('/api/status', (req, res) => {
      res.json({
        bots: Array.from(this.bots.values()).map(b => ({
          id: b.id,
          timeframe: b.timeframe,
          checkInterval: b.checkInterval,
          isRunning: b.isRunning,
        })),
        clients: this.clients.size,
      });
    });
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('🔌 Cliente conectado ao dashboard');
      this.clients.add(ws);

      // Envia status inicial
      ws.send(JSON.stringify({
        type: 'status',
        data: { bots: Array.from(this.bots.values()).map(b => ({ id: b.id, timeframe: b.timeframe, isRunning: b.isRunning })) },
      }));

      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message.toString());

          if (data.type === 'start') {
            const botId = data.botId || `bot-${this.bots.size + 1}`;
            const timeframe = data.timeframe || 'M5';
            const checkInterval = data.checkInterval || 15000;
            await this.startBot(botId, timeframe, checkInterval);
          } else if (data.type === 'stop') {
            const botId = data.botId || 'bot-1';
            await this.stopBot(botId);
          } else if (data.type === 'stopAll') {
            await this.stopAllBots();
          }
        } catch (error) {
          console.error('Erro ao processar mensagem:', error);
        }
      });

      ws.on('close', () => {
        console.log('🔌 Cliente desconectado');
        this.clients.delete(ws);
      });
    });
  }

  private async startBot(botId: string, timeframe: 'M1' | 'M5' | 'M15' | 'M30' | 'H1' = 'M5', checkInterval: number = 15000) {
    if (this.bots.has(botId)) {
      this.broadcast({ type: 'error', message: `Bot ${botId} já está rodando` });
      return;
    }

    const timeframeNames: Record<string, string> = {
      'M1': '1 minuto',
      'M5': '5 minutos',
      'M15': '15 minutos',
      'M30': '30 minutos',
      'H1': '1 hora',
    };

    console.log(`🚀 Iniciando ${botId} com candles ${timeframe}...`);
    console.log(`⏱️  Check: a cada ${checkInterval / 1000}s`);
    console.log(`📊 Timeframe: ${timeframeNames[timeframe]}`);

    const bot = new PaperTradingBot(10, timeframe, botId);
    const botInstance: BotInstance = {
      id: botId,
      bot,
      timeframe,
      checkInterval,
      isRunning: true,
    };

    this.bots.set(botId, botInstance);
    this.broadcast({ type: 'status', data: { bots: Array.from(this.bots.values()).map(b => ({ id: b.id, timeframe: b.timeframe, isRunning: b.isRunning })) } });

    // Inicia loops para este bot
    this.runBotLoops(botId);
  }

  /**
   * Inicia loops para um bot específico
   */
  private async runBotLoops(botId: string) {
    const botInstance = this.bots.get(botId);
    if (!botInstance) return;

    // Loop principal + Quick check
    this.runMainScanLoop(botId);
    this.runQuickCheckLoop(botId);
  }

  /**
   * Loop principal: Scan completo
   */
  private async runMainScanLoop(botId: string) {
    const botInstance = this.bots.get(botId);
    if (!botInstance) return;

    while (botInstance.isRunning && this.bots.has(botId)) {
      try {
        const data = await botInstance.bot.scanOnce();

        console.log(`\n🔍 [DEBUG Server] Scan ${botId} concluído:`);
        console.log(`   Scores: ${data.scores?.length || 0}`);
        console.log(`   Open Positions: ${data.openPositions?.length || 0}`);
        console.log(`   Recent Trades: ${data.recentTrades?.length || 0}`);
        console.log(`   Capital: ${data.capital}`);

        // Envia dados para todos os clientes
        this.broadcast({
          type: 'update',
          data: { ...data, botId },
        });

        console.log(`   ✅ Broadcast enviado para ${this.clients.size} cliente(s)`);

        // Aguarda conforme intervalo configurado
        await this.sleep(botInstance.checkInterval);
      } catch (error: any) {
        console.error(`Erro no scan do ${botId}:`, error);
        this.broadcast({
          type: 'error',
          message: `${botId}: ${error.message}`,
        });
      }
    }
  }

  /**
   * Loop rápido: Verifica posições abertas a cada 2 segundos
   */
  private async runQuickCheckLoop(botId: string) {
    const botInstance = this.bots.get(botId);
    if (!botInstance) return;

    while (botInstance.isRunning && this.bots.has(botId)) {
      try {
        // Só verifica se tiver posições abertas
        if (botInstance.bot.hasOpenPositions()) {
          const data = await botInstance.bot.checkPositionsQuick();

          console.log(`\n⚡ [DEBUG Server] Quick check ${botId}:`);
          console.log(`   Open Positions: ${data.openPositions?.length || 0}`);
          console.log(`   Recent Trades: ${data.recentTrades?.length || 0}`);

          // Envia dados atualizados
          this.broadcast({
            type: 'quick_update',
            data: { ...data, botId },
          });

          console.log(`   ✅ Quick update enviado para ${this.clients.size} cliente(s)`);
        }

        // Aguarda 2 segundos antes do próximo check
        await this.sleep(2000);
      } catch (error: any) {
        console.error(`Erro no check rápido do ${botId}:`, error);
      }
    }
  }

  private stopBot(botId: string) {
    const botInstance = this.bots.get(botId);
    if (!botInstance) {
      this.broadcast({ type: 'error', message: `Bot ${botId} não encontrado` });
      return;
    }

    console.log(`🛑 Parando ${botId}...`);
    botInstance.isRunning = false;
    this.bots.delete(botId);
    this.broadcast({ type: 'status', data: { bots: Array.from(this.bots.values()).map(b => ({ id: b.id, timeframe: b.timeframe, isRunning: b.isRunning })) } });
  }

  private async stopAllBots() {
    console.log('🛑 Parando todos os bots...');
    for (const [botId, botInstance] of this.bots.entries()) {
      botInstance.isRunning = false;
    }
    this.bots.clear();
    this.broadcast({ type: 'status', data: { bots: [] } });
  }

  private broadcast(data: any) {
    const message = JSON.stringify(data);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
