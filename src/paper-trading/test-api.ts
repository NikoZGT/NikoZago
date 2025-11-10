import axios from 'axios';

/**
 * Teste rápido da API DexScreener
 */
async function testAPI() {
  console.log('🧪 Testando API DexScreener...\n');

  const tokens = [
    { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK' },
    { address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', symbol: 'WIF' },
    { address: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr', symbol: 'POPCAT' },
  ];

  for (const token of tokens) {
    try {
      console.log(`🔍 Testando ${token.symbol}...`);

      const response = await axios.get(
        `https://api.dexscreener.com/latest/dex/tokens/${token.address}`,
        {
          timeout: 10000,
          maxRedirects: 0,
          validateStatus: (status) => status < 400,
        }
      );

      if (response.data && response.data.pairs && response.data.pairs.length > 0) {
        const pair = response.data.pairs[0];

        console.log(`✅ ${token.symbol}:`);
        console.log(`   Preço: $${parseFloat(pair.priceUsd).toFixed(6)}`);
        console.log(`   Volume 24h: $${parseFloat(pair.volume?.h24 || '0').toLocaleString()}`);
        console.log(`   Liquidez: $${parseFloat(pair.liquidity?.usd || '0').toLocaleString()}`);
        console.log(`   Variação 5m: ${pair.priceChange?.m5 || '0'}%`);
        console.log(`   Variação 1h: ${pair.priceChange?.h1 || '0'}%`);
        console.log('');
      } else {
        console.log(`❌ ${token.symbol}: Nenhum par encontrado\n`);
      }
    } catch (error: any) {
      console.log(`❌ ${token.symbol}: Erro - ${error.message}\n`);
    }
  }

  console.log('✅ Teste completo!');
}

testAPI();
