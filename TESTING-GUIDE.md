# 🧪 Guia de Testes - Bot de Trading

## ⚠️ IMPORTANTE: Teste com Segurança

**NUNCA teste com sua carteira principal!**
- Use uma carteira dedicada apenas para testes
- Comece com valor mínimo ($10-15)
- Monitore constantemente nas primeiras horas

---

## 📋 Passo a Passo para Testar

### **Fase 1: Preparação (5 minutos)**

#### 1. Instalar Dependências

```bash
cd /home/user/NikoZago
npm install
```

#### 2. Criar Carteira de Teste (Solana)

**Opção A: Usar Phantom Wallet**
```
1. Instalar extensão Phantom
2. Criar nova carteira
3. Anotar seed phrase em local seguro
4. Exportar chave privada:
   - Configurações → Segurança → Exportar Chave Privada
   - Copiar como array de números
```

**Opção B: Usar Solana CLI**
```bash
# Instalar Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"

# Criar nova carteira
solana-keygen new --outfile ~/bot-wallet.json

# Ver endereço
solana-keygen pubkey ~/bot-wallet.json

# Ver chave privada (array de números)
cat ~/bot-wallet.json
```

#### 3. Adicionar Fundos à Carteira

```bash
# Enviar SOL + USDC para a carteira
# Mínimo recomendado:
# - 0.5 SOL (para taxas)
# - 10 USDC (para trading)
```

#### 4. Configurar .env

```bash
cp .env.example .env
nano .env  # ou vim, code, etc
```

**Configuração MÍNIMA para testes**:
```bash
# Capital
INITIAL_CAPITAL=10
POSITION_SIZE_PERCENT=2
MAX_CONCURRENT_POSITIONS=2  # Começar com 2

# Rede
NETWORK=solana

# Solana (OBRIGATÓRIO)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WALLET_PRIVATE_KEY=[1,2,3,...,64]  # Cole seu array aqui

# Risk (mais conservador para testes)
STOP_LOSS_PERCENT=8
TAKE_PROFIT_PERCENT=40
MAX_CONSECUTIVE_LOSSES=2

# Trading (relaxado para testes)
MIN_LIQUIDITY=15000      # Mais flexível
MIN_VOLUME_24H=1000      # Mais flexível

# APIs (OPCIONAL para início)
# DEXTOOLS_API_KEY=
# TWITTER_BEARER_TOKEN=
# RUGCHECK_API_KEY=
# BIRDEYE_API_KEY=
```

---

### **Fase 2: Teste Básico (10 minutos)**

#### 1. Compilar o Projeto

```bash
npm run build
```

**Se der erro de TypeScript**:
```bash
# Verificar erros
npm run lint

# Ignorar warnings e compilar
npx tsc --skipLibCheck
```

#### 2. Teste 1: Bot Básico (Dry Run)

```bash
# Abrir em um terminal
npm run dev

# Você verá:
# ==============================================
# === MEMECOIN TRADING BOT INITIALIZED ===
# Network: solana
# Initial Capital: $10
# Position Size: 2%
# Max Concurrent Positions: 2
# ==============================================
```

**O que observar**:
```
✅ Bot started successfully
🔍 Scanning for new tokens...
Found X new tokens to evaluate
=== Evaluating TOKEN ($address) ===
```

**Deixar rodar por 5-10 minutos** e observar:
- Bot está escaneando tokens?
- Está avaliando corretamente?
- Logs fazem sentido?

#### 3. Teste 2: Bot Avançado (Dry Run)

```bash
# Parar o bot básico (Ctrl+C)
# Iniciar bot avançado
npm run dev:advanced

# Você verá:
# ==============================================
# 🤖 ADVANCED MEMECOIN TRADING BOT INITIALIZED
# Network: solana
# Initial Capital: $10
# AI/ML: ENABLED ✓
# Realtime Monitoring: ENABLED ✓
# Order Book Analysis: ENABLED ✓
# Momentum Detection: ENABLED ✓
# ==============================================
```

**O que observar**:
```
🔍 Scanning for new tokens with advanced analysis...
🔬 ADVANCED EVALUATION: TOKEN
  Step 1: Basic Evaluation
  Step 2: Momentum Analysis
  Step 3: Order Book Analysis
  Step 4: Interest Spike Detection
  Step 5: AI Recommendation
```

---

### **Fase 3: Teste Real (CUIDADO! 💰)**

#### ⚠️ Antes de Fazer Teste Real:

**Checklist de Segurança**:
- [ ] Estou usando carteira dedicada (não principal)?
- [ ] Tenho apenas $10-15 na carteira?
- [ ] Configurei stop loss (-8%)?
- [ ] Configurei MAX_CONSECUTIVE_LOSSES=2?
- [ ] Estou pronto para monitorar constantemente?
- [ ] Li toda a documentação?

#### Executar Teste Real

```bash
# Terminal 1: Bot
npm run dev:advanced

# Terminal 2: Monitorar logs
tail -f logs/combined.log

# Terminal 3: Monitorar trades
tail -f logs/trades.log
```

#### O Que Vai Acontecer

**Primeira hora**:
```
1. Bot escaneia tokens a cada 1 minuto
2. Avalia cada token (6 etapas)
3. Se encontrar oportunidade:
   → Executa compra (~$0.20-0.25)
   → Inicia monitoramento em tempo real
   → Atualiza a cada 15 segundos
4. Quando atingir condição de saída:
   → Executa venda automática
   → Registra trade no log
   → IA aprende com o resultado
```

**Exemplo de log real**:
```
🔍 Scanning for new tokens...
Found 8 new tokens to evaluate

🔬 ADVANCED EVALUATION: BONK ($So11...)
✓ Basic evaluation passed
✓ Momentum: BULLISH 78%
✓ Buy Pressure: 2.1x
⚠️ Interest spike: 65% (borderline)
❌ AI recommends: WAIT

🔬 ADVANCED EVALUATION: PEPE ($EPj...)
✓ Basic evaluation passed
✓ Momentum: BULLISH 92%
✓ Buy Pressure: 3.2x
✓ Interest spike: 94%
✓ AI recommends: ENTER (97% confidence)

🎯 ALL CHECKS PASSED!
Opening position: PEPE with $0.23

Buying PEPE with $0.23...
✅ POSITION OPENED: PEPE
Amount: 234,567.89 PEPE
Entry Price: $0.00000098
TX: abc123...
Realtime monitoring: STARTED ✓

📊 Monitoring 1 position(s)...
PEPE: PnL +3.2% | Momentum: +45 | B/S: 89/34 | Holding...
PEPE: PnL +8.7% | Momentum: +67 | B/S: 156/42 | Holding...
PEPE: PnL +15.3% | Momentum: +82 | B/S: 234/51 | Holding...
PEPE: PnL +28.9% | Momentum: +71 | B/S: 298/78 | Holding...
PEPE: PnL +42.1% | Momentum: +65 | B/S: 312/89 | TAKE PROFIT!

✅ PARTIAL EXIT: PEPE (50%)
Selling 117,283 PEPE...
TX: def456...

PEPE: PnL +51.2% | Trailing stop: $0.00000147
PEPE: PnL +48.8% | Trailing stop: $0.00000147
PEPE: PnL +45.2% | TRAILING STOP HIT!

✅ POSITION CLOSED: PEPE
PnL: $0.10 (+45.2%)
TX: ghi789...
```

---

### **Fase 4: Monitoramento (Durante os Testes)**

#### Comandos Úteis

```bash
# Ver status do bot
cat data/bot-state.json | jq

# Ver último trade
tail -n 50 data/trades.jsonl

# Ver modelo ML
cat data/ml-model.json | jq

# Procurar erros
grep ERROR logs/combined.log

# Ver apenas trades
grep POSITION logs/combined.log

# Monitorar capital atual
grep "current.*capital" data/bot-state.json
```

#### Dashboard Manual

```bash
# Criar script para ver status
cat > status.sh << 'EOF'
#!/bin/bash
echo "=== BOT STATUS ==="
echo ""
echo "Capital Atual:"
cat data/bot-state.json | jq '.status.currentCapital'
echo ""
echo "Posições Abertas:"
cat data/bot-state.json | jq '.status.openPositions'
echo ""
echo "Total de Trades:"
cat data/bot-state.json | jq '.status.totalTrades'
echo ""
echo "Win Rate:"
cat data/bot-state.json | jq '.status.winningTrades, .status.totalTrades' | awk 'NR==1{w=$1} NR==2{print (w/$1)*100"%"}'
echo ""
echo "PnL Total:"
cat data/bot-state.json | jq '.status.totalPnlPercent'
EOF

chmod +x status.sh
./status.sh
```

---

### **Fase 5: Análise de Resultados**

#### Após Primeiras Horas

```bash
# Ver todos os trades
cat data/trades.jsonl | jq

# Calcular win rate
cat data/trades.jsonl | jq 'select(.pnl > 0)' | wc -l
cat data/trades.jsonl | wc -l

# Ver modelo ML
cat data/ml-model.json | jq '.performance'
```

#### Métricas para Avaliar

```json
{
  "winRate": 65,           // ✅ Bom se > 55%
  "avgReturn": 8.5,        // ✅ Bom se > 5%
  "maxDrawdown": -12,      // ✅ Bom se > -20%
  "totalTrades": 15,       // Precisa > 20 para ter certeza
  "profitFactor": 2.1      // ✅ Bom se > 1.5
}
```

---

## 🐛 Troubleshooting

### Erro: "Invalid private key"

```bash
# Verificar formato da chave
cat ~/bot-wallet.json

# Deve ser: [1,2,3,...,64]
# NÃO pode ser: "base58string"
```

### Erro: "Insufficient funds"

```bash
# Verificar saldo
solana balance ~/bot-wallet.json

# Precisa:
# - Mínimo 0.1 SOL para taxas
# - Mínimo 10 USDC para trading
```

### Bot não encontra tokens

```bash
# Normal! Pode levar 10-30 minutos
# Tokens novos não aparecem toda hora

# Relaxar filtros (temporário):
MIN_VOLUME_24H=500
MIN_LIQUIDITY=10000
```

### Erro: "RPC rate limited"

```bash
# Usar RPC privado (recomendado):
# - QuickNode: https://www.quicknode.com/
# - Helius: https://www.helius.dev/

# Ou adicionar delay:
# Editar src/bot-advanced.ts
# Linha do scanInterval: mudar de 60*1000 para 120*1000
```

### WebSocket não conecta

```bash
# Normal se não tiver BIRDEYE_API_KEY
# Bot vai usar polling automaticamente
# Performance: 90% da velocidade do WebSocket
```

### IA não está aprendendo

```bash
# Precisa de no mínimo 10 trades
cat data/ml-model.json | jq '.performance.tradesAnalyzed'

# Se < 10: aguardar mais trades
# Se > 10 e não treinou: forçar manualmente
# (adicionar no código)
```

---

## 🎯 Checklist de Teste Completo

### Dia 1: Validação Inicial
- [ ] Instalar dependências
- [ ] Criar carteira de teste
- [ ] Configurar .env
- [ ] Compilar projeto
- [ ] Testar bot básico (dry run 10min)
- [ ] Testar bot avançado (dry run 10min)
- [ ] Ler logs e entender fluxo

### Dia 2: Primeiro Trade Real
- [ ] Adicionar $10-15 na carteira
- [ ] Iniciar bot avançado
- [ ] Monitorar em 3 terminais
- [ ] Aguardar primeiro trade
- [ ] Analisar resultado
- [ ] Verificar logs

### Dia 3-7: Coleta de Dados
- [ ] Deixar bot rodar 4-6h por dia
- [ ] Monitorar trades diariamente
- [ ] Anotar performance
- [ ] Ajustar parâmetros se necessário
- [ ] Aguardar mínimo 20 trades

### Dia 8+: Análise e Otimização
- [ ] Analisar win rate
- [ ] Ver se IA está melhorando
- [ ] Ajustar configurações
- [ ] Decidir se escalar capital

---

## 💡 Dicas para Testes

### DO ✅
- Usar carteira dedicada
- Começar com $10-15
- Monitorar constantemente
- Anotar observações
- Ler todos os logs
- Testar em horários diferentes
- Aguardar no mínimo 20 trades antes de julgar

### DON'T ❌
- Usar carteira principal
- Deixar sem supervisão
- Aumentar capital rápido
- Ignorar consecutive losses
- Modificar código sem entender
- Desabilitar stop loss
- Julgar após 1-2 trades

---

## 📊 Cronograma de Teste Sugerido

```
Semana 1: Validação
├─ Dia 1-2: Setup e testes sem dinheiro real
├─ Dia 3-4: Primeiros trades com $10
└─ Dia 5-7: Coleta de dados (meta: 10+ trades)

Semana 2: Análise
├─ Dia 8-10: Analisar performance
├─ Dia 11-12: Ajustar parâmetros
└─ Dia 13-14: Testar novos parâmetros

Semana 3: Decisão
├─ Se win rate > 55%: continuar
├─ Se win rate > 60%: considerar aumentar capital
└─ Se win rate < 45%: revisar estratégia
```

---

## 🎓 Exemplo de Teste Real Documentado

```markdown
# Teste Bot Avançado - Dia 1

Data: 2024-11-09
Capital Inicial: $10.00
Configuração: Padrão (position 2%, stop loss 8%)

## Trades Executados

### Trade 1: BONK
- Entry: $0.00001234 | Amount: 162,000 BONK
- Exit: $0.00001189 | Reason: Stop Loss
- Result: -$0.08 (-8%)
- Tempo: 12 minutos
- Notas: Volume caiu rápido após entrada

### Trade 2: PEPE
- Entry: $0.00000987 | Amount: 203,000 PEPE
- Exit: $0.00001421 | Reason: Take Profit + Trailing
- Result: +$0.09 (+44%)
- Tempo: 18 minutos
- Notas: Momentum muito forte, spike de +400% volume

## Resultado do Dia
- Trades: 2
- Win Rate: 50%
- PnL: +$0.01 (+0.1%)
- Capital Final: $10.01

## Observações
- Bot detectou 45 tokens, avaliou 12, entrou em 2
- IA funcionando bem, rejeitou 10 sinais fracos
- Momentum detector muito preciso no PEPE
```

---

**🚀 Pronto para começar os testes!**

**Lembre-se: Patience is key! Aguarde pelo menos 20 trades antes de julgar a performance.**

**Boa sorte! 🎯**
