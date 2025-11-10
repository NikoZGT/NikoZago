import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as path from 'path';
import { PaperTradingBot } from '../paper-trading/paper-trading-bot';

/**
 * Dashboard Server - WebSocket + Web Interface
 */
export class DashboardServer {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer;
  private bot: PaperTradingBot | null = null;
  private clients: Set<WebSocket> = new Set();
  private isRunning: boolean = false;

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
        isRunning: this.isRunning,
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
        data: { isRunning: this.isRunning },
      }));

      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message.toString());

          if (data.type === 'start') {
            await this.startBot();
          } else if (data.type === 'stop') {
            await this.stopBot();
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

  private async startBot() {
    if (this.isRunning) {
      this.broadcast({ type: 'error', message: 'Bot já está rodando' });
      return;
    }

    console.log('🚀 Iniciando bot...');
    this.isRunning = true;
    this.broadcast({ type: 'status', data: { isRunning: true } });

    this.bot = new PaperTradingBot(10);

    // Inicia bot em modo não-bloqueante
    this.runBotLoop();
  }

  private async runBotLoop() {
    while (this.isRunning && this.bot) {
      try {
        const data = await this.bot.scanOnce();

        // Envia dados para todos os clientes
        this.broadcast({
          type: 'update',
          data,
        });

        // Aguarda 5 minutos
        await this.sleep(300000);
      } catch (error: any) {
        console.error('Erro no loop do bot:', error);
        this.broadcast({
          type: 'error',
          message: error.message,
        });
      }
    }
  }

  private stopBot() {
    if (!this.isRunning) {
      this.broadcast({ type: 'error', message: 'Bot não está rodando' });
      return;
    }

    console.log('🛑 Parando bot...');
    this.isRunning = false;
    this.bot = null;
    this.broadcast({ type: 'status', data: { isRunning: false } });
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
