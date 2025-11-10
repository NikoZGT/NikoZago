import { PaperTradingBot } from './paper-trading-bot';

/**
 * Script para rodar Paper Trading Bot
 *
 * Modo demo - Trades simulados com preços REAIS do mercado
 */
async function main() {
  try {
    console.log('🚀 Iniciando Paper Trading Bot...\n');
    console.log('ℹ️  Este é um modo DEMO - nenhum trade real será executado');
    console.log('ℹ️  Conectando em APIs reais para pegar preços do mercado');
    console.log('ℹ️  Pressione Ctrl+C para parar\n');

    // Capital inicial (simulado)
    const initialCapital = 10;

    const bot = new PaperTradingBot(initialCapital);
    await bot.start();
  } catch (error) {
    console.error('❌ Erro ao iniciar bot:', error);
    process.exit(1);
  }
}

// Executar
main();
