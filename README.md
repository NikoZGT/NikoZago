# 🤖 Memecoin Trading Bot - AI-Powered Minute Trading

Bot de trading automatizado baseado em IA para operações de curtíssimo prazo em memecoins, com capital inicial de US$10 e foco em preservação de capital e aprendizado de padrões de mercado.

## 📋 Índice

- [Características](#características)
- [Arquitetura](#arquitetura)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [Estratégias](#estratégias)
- [Gestão de Risco](#gestão-de-risco)
- [APIs e Integrações](#apis-e-integrações)
- [Logs e Monitoramento](#logs-e-monitoramento)
- [Desenvolvimento](#desenvolvimento)

## ✨ Características

### Capital e Risco
- 💰 Capital inicial: **US$10**
- 📊 Tamanho de posição: **2-3%** do capital (≈ US$0.20-0.30)
- 🎯 Máximo **3 posições simultâneas**
- 📈 Meta de crescimento: **2-5% por semana**

### Redes Suportadas
- ⚡ **Solana** (recomendado - taxas baixas)
- 🟡 **BNB Chain (BSC)**
- 🔵 **Base**
- ❌ Ethereum (evitado até capital > US$100)

### Estratégia de Trading
- 📊 **Momentum leve** com múltiplos sinais
- 🔍 Volume mínimo: US$2.000 (24h)
- 💎 Liquidez mínima: US$25.000
- 🛡️ Múltiplos filtros de segurança anti-rug

### Gestão de Risco
- 🛑 Stop loss: **-8%**
- ✅ Take profit parcial: **+40%** (vende 50%)
- 📉 Trailing stop: **10%**
- ⚠️ Pausa após **2 perdas consecutivas**

## 🏗️ Arquitetura

```
src/
├── config/
│   └── bot.config.ts          # Configurações do bot
├── types/
│   └── index.ts               # Tipos TypeScript
├── services/
│   ├── contract-analyzer.ts   # Análise de contratos e segurança
│   ├── market-signals.ts      # Sinais de mercado (volume, social)
│   ├── dex-integrator.ts      # Integração com DEXs
│   └── risk-manager.ts        # Gerenciamento de risco e portfolio
├── strategies/
│   ├── entry.ts               # Estratégia de entrada
│   └── exit.ts                # Estratégia de saída
├── utils/
│   └── logger.ts              # Sistema de logging
└── bot.ts                     # Bot principal
```

## 📦 Instalação

### Pré-requisitos
- Node.js >= 18.0.0
- npm ou yarn

### Passos

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/memecoin-trading-bot.git
cd memecoin-trading-bot
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

4. Edite o arquivo `.env` com suas configurações (veja seção [Configuração](#configuração))

5. Compile o projeto:
```bash
npm run build
```

## ⚙️ Configuração

### Arquivo `.env`

```bash
# Configuração do Bot
INITIAL_CAPITAL=10              # Capital inicial em USD
POSITION_SIZE_PERCENT=2.5       # Tamanho da posição (2-3%)
MAX_CONCURRENT_POSITIONS=3      # Máximo de posições simultâneas
WEEKLY_GROWTH_TARGET=3.5        # Meta de crescimento semanal (%)

# Rede (solana, bsc, base)
NETWORK=solana

# Configuração Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WALLET_PRIVATE_KEY=[1,2,3,...]  # Array de números da chave privada

# Configuração BSC
BSC_RPC_URL=https://bsc-dataseed.binance.org
BSC_WALLET_PRIVATE_KEY=0x...

# Configuração Base
BASE_RPC_URL=https://mainnet.base.org
BASE_WALLET_PRIVATE_KEY=0x...

# APIs (opcional mas recomendado)
DEXTOOLS_API_KEY=your_key_here
TWITTER_BEARER_TOKEN=your_token_here
RUGCHECK_API_KEY=your_key_here

# Gestão de Risco
STOP_LOSS_PERCENT=8             # Stop loss em %
TAKE_PROFIT_PERCENT=40          # Take profit em %
TRAILING_STOP_PERCENT=10        # Trailing stop em %
MAX_CONSECUTIVE_LOSSES=2        # Máximo de perdas consecutivas

# Parâmetros de Trading
MIN_LIQUIDITY=25000             # Liquidez mínima (USD)
MAX_TX_FEE_PERCENT=2           # Taxa máxima de transação (%)
MIN_VOLUME_24H=2000            # Volume mínimo 24h (USD)
MIN_VOLUME_12H=1000            # Volume mínimo 12h (USD)
VOLUME_DROP_THRESHOLD=25       # Threshold de queda de volume (%)

# Filtros de Segurança
MIN_LP_LOCKED_PERCENT=80       # Mínimo de LP bloqueado (%)
MAX_TOP_HOLDERS_PERCENT=35     # Máximo dos top holders (%)
MAX_CONTRACT_TAX=10            # Taxa máxima do contrato (%)

# Logging
LOG_LEVEL=info
LOG_TO_FILE=true
```

### Obtenção de Chaves de API

#### DexTools
1. Acesse https://www.dextools.io/
2. Crie uma conta
3. Vá em "API" e gere uma chave

#### Twitter API
1. Acesse https://developer.twitter.com/
2. Crie um projeto
3. Gere um Bearer Token

#### RugCheck (Solana)
1. Acesse https://rugcheck.xyz/
2. Entre em contato para acesso à API

## 🚀 Uso

### Modo Desenvolvimento
```bash
npm run dev
```

### Modo Produção
```bash
npm run build
npm start
```

### Comandos Úteis
```bash
# Executar testes
npm test

# Verificar código
npm run lint

# Visualizar logs
tail -f logs/combined.log
tail -f logs/trades.log
```

## 📊 Estratégias

### Estratégia de Entrada

O bot avalia cada token através de um sistema de pontuação (0-100):

#### Sinais de Volume (40 pontos)
- ✅ Volume 24h ≥ US$2.000: **+10 pontos**
- ✅ Aumento de volume 15min ≥ 200%: **+30 pontos**

#### Sinais Sociais (30 pontos)
- ✅ Menções Twitter ↑300%: **+20 pontos**
- ✅ Sentimento positivo: **+10 pontos**

#### Sinais de Liquidez (20 pontos)
- ✅ Liquidez ≥ US$25.000: **+10 pontos**
- ✅ Liquidez ≥ US$50.000: **+10 pontos**

#### Sinais de Market Cap (10 pontos)
- ✅ Market cap < US$1M: **+10 pontos**

**Entrada aprovada**: Score ≥ 50 + todos os filtros de segurança

### Filtros de Segurança

Antes de qualquer compra, o bot verifica:

1. ✅ **LP bloqueado**: ≥ 80%
2. ✅ **Sem funções perigosas**: mint, blacklist
3. ✅ **Taxas aceitáveis**: ≤ 10% (buy/sell)
4. ✅ **Distribuição saudável**: Top 10 holders < 35%
5. ✅ **Não é honeypot**: Verificação via APIs
6. ✅ **Pode vender**: Teste de venda simulada

### Estratégia de Saída

#### Stop Loss (-8%)
Vende **100%** da posição se preço cair 8%

#### Take Profit (+40%)
Vende **50%** da posição quando lucro atinge 40%

#### Trailing Stop (10%)
Após take profit parcial, trailing stop de 10% protege lucros

#### Volume Drop (>25% em 5min)
**Saída de emergência** se volume cair drasticamente

### Anti-Frontrun
Delay de **5 segundos** entre sinal e execução

## 🛡️ Gestão de Risco

### Regras Automáticas

1. **Máximo 3 posições simultâneas**
   - Garante diversificação mínima
   - Evita overexposure

2. **Pausa após 2 perdas consecutivas**
   - Protege capital em condições adversas
   - Requer análise manual antes de retomar

3. **Tamanho de posição fixo**
   - 2-3% do capital atual
   - Hard cap de US$0.30 por trade

4. **Registro completo**
   - Todos os trades são logados
   - Métricas de performance calculadas

### Métricas Monitoradas

- 📊 **Win Rate**: % de trades lucrativos
- 💰 **Profit Factor**: Lucro total / Perda total
- 📉 **Max Drawdown**: Maior perda desde o pico
- 📈 **Sharpe Ratio**: Retorno ajustado ao risco
- ⚖️ **Avg Win/Loss**: Média de ganhos e perdas

## 🔌 APIs e Integrações

### DEX Aggregators

#### Solana
- **Jupiter**: Melhor execução de swaps
- **Raydium**: Liquidez adicional
- **Orca**: Fallback

#### BSC/Base
- **1inch**: Aggregator principal (em desenvolvimento)
- **0x**: Alternativa
- **PancakeSwap/Uniswap**: Direto

### Dados de Mercado

- **DexScreener**: Dados de preço e volume (gratuito)
- **DexTools**: Análise avançada (requer API key)
- **Birdeye**: Dados Solana (alternativa)

### Segurança

- **RugCheck**: Análise Solana
- **GoPlus**: Análise BSC/Base
- **HoneyPot.is**: Detecção de honeypots

### Social

- **Twitter API**: Menções e tendências
- **LunarCrush**: Análise de sentimento (futuro)

## 📝 Logs e Monitoramento

### Arquivos de Log

```
logs/
├── combined.log    # Todos os logs
├── error.log       # Apenas erros
└── trades.log      # Histórico de trades
```

### Formato de Trade Log

```json
{
  "positionId": "uuid",
  "token": {
    "address": "...",
    "symbol": "TOKEN",
    "name": "Token Name"
  },
  "entryPrice": 0.00001234,
  "exitPrice": 0.00001789,
  "pnl": 0.05,
  "pnlPercent": 45.2,
  "holdTime": 125,
  "exitReason": "take_profit",
  "signals": { ... }
}
```

### Dados Persistidos

```
data/
├── bot-state.json  # Estado atual do bot
└── trades.jsonl    # Histórico de trades (JSONL)
```

## 🎯 Objetivos e Roadmap

### Fase 1: Validação (30 dias)
- ✅ Bot funcional com todas as features
- 🎯 Crescer de US$10 → US$15
- 📊 Coletar dados de performance

### Fase 2: Otimização (30-60 dias)
- 🤖 Treinar modelo de ML com dados reais
- 🎯 Melhorar taxa de acerto
- 📈 Escalar para US$20+

### Fase 3: Escala (60+ dias)
- 🚀 Aumentar capital para US$50-100
- ⚡ Ativar modo sniper automático
- 📊 Posições de 5% do capital

## 🛠️ Desenvolvimento

### Estrutura de Código

```typescript
// Exemplo: Adicionar novo filtro de segurança
class ContractAnalyzer {
  async analyzeContract(token: Token): Promise<ContractSecurity> {
    // Seu código aqui
  }
}
```

### Testes

```bash
# Executar todos os testes
npm test

# Executar testes específicos
npm test -- contract-analyzer

# Cobertura de testes
npm test -- --coverage
```

### Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## ⚠️ Avisos Importantes

### Riscos

- 🚨 **Trading de criptomoedas é de alto risco**
- 💸 **Memecoins são extremamente voláteis**
- 📉 **Você pode perder todo o capital investido**
- 🤖 **Bots não garantem lucro**

### Recomendações

1. ✅ **Comece com capital que pode perder**
2. ✅ **Teste em testnet primeiro**
3. ✅ **Monitore o bot regularmente**
4. ✅ **Não deixe o bot sem supervisão por longos períodos**
5. ✅ **Mantenha suas chaves privadas seguras**
6. ✅ **Faça backup dos logs regularmente**

### Segurança

- 🔒 Nunca compartilhe suas chaves privadas
- 🔒 Use .env para variáveis sensíveis
- 🔒 Não commite .env no git
- 🔒 Use carteiras dedicadas para o bot
- 🔒 Mantenha dependências atualizadas

## 📄 Licença

MIT License - Veja [LICENSE](LICENSE) para detalhes

## 🤝 Suporte

- 📧 Email: seu-email@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/seu-usuario/repo/issues)
- 💬 Discord: [Link do servidor]

## 📚 Recursos Adicionais

- [Documentação Solana](https://docs.solana.com/)
- [Jupiter API](https://docs.jup.ag/)
- [DexScreener API](https://docs.dexscreener.com/)
- [Trading Strategies](https://www.investopedia.com/trading-strategies-4689645)

---

**⚡ Feito com 💜 para a comunidade cripto**

**🚀 Trade com responsabilidade!**
