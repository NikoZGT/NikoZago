import { DashboardServer } from './server';

/**
 * Script para iniciar o Dashboard Web
 */
async function main() {
  try {
    console.log('🚀 Iniciando Dashboard Server...\n');

    const server = new DashboardServer(3000);

    // Mantém o processo rodando
    process.on('SIGINT', () => {
      console.log('\n\n👋 Dashboard encerrado\n');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Erro ao iniciar dashboard:', error);
    process.exit(1);
  }
}

main();
