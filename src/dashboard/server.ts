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
  private timeframe: 'M1' | 'M5' = 'M5';
  private scanIntervalMs: number = 15000; // Fixo: 15 segundos
  private quickCheckIntervalMs: number = 2000; // 2 segundos para verificar posições

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
            await this.startBot(data.timeframe || 'M5');
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

  private async startBot(timeframe: 'M1' | 'M5' = 'M5') {
    if (this.isRunning) {
      this.broadcast({ type: 'error', message: 'Bot já está rodando' });
      return;
    }

    // Configura timeframe dos candles
    this.timeframe = timeframe;
    this.scanIntervalMs = 15000; // FIXO: Analisa a cada 15 segundos

    console.log(`🚀 Iniciando bot com candles ${timeframe}...`);
    console.log(`⏱️  Scan completo: a cada 15 segundos`);
    console.log(`⚡ Check de posições: a cada 2 segundos (proteção rápida)`);
    console.log(`📊 Timeframe dos candles: ${timeframe === 'M1' ? '1 minuto' : '5 minutos'}`);

    this.isRunning = true;
    this.broadcast({ type: 'status', data: { isRunning: true } });

    // Cria bot com timeframe configurado
    this.bot = new PaperTradingBot(10, timeframe);

    // Inicia bot com dois loops: scan completo + check rápido
    this.runMainScanLoop();
    this.runQuickCheckLoop();
  }

  /**
   * Loop principal: Scan completo a cada 15 segundos
   * Busca novas oportunidades e atualiza candles
   */
  private async runMainScanLoop() {
    while (this.isRunning && this.bot) {
      try {
        const data = await this.bot.scanOnce();

        // Envia dados para todos os clientes
        this.broadcast({
          type: 'update',
          data,
        });

        // Aguarda 15 segundos antes do próximo scan completo
        await this.sleep(this.scanIntervalMs);
      } catch (error: any) {
        console.error('Erro no scan completo:', error);
        this.broadcast({
          type: 'error',
          message: error.message,
        });
      }
    }
  }

  /**
   * Loop rápido: Verifica posições abertas a cada 2 segundos
   * Proteção contra quedas súbitas (trailing stop, take profit, stop loss)
   */
  private async runQuickCheckLoop() {
    while (this.isRunning && this.bot) {
      try {
        // Só verifica se tiver posições abertas
        if (this.bot.hasOpenPositions()) {
          const data = await this.bot.checkPositionsQuick();

          // Envia dados atualizados
          this.broadcast({
            type: 'quick_update',
            data,
          });
        }

        // Aguarda 2 segundos antes do próximo check
        await this.sleep(this.quickCheckIntervalMs);
      } catch (error: any) {
        console.error('Erro no check rápido:', error);
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
