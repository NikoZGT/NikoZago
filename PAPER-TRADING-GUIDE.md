# 📺 Paper Trading Guide - Modo Demo

## 🎯 O que é Paper Trading?

Paper Trading é um **modo de demonstração** onde você pode **ASSISTIR** o bot funcionando em tempo real, como se fosse uma conta demo:

```
╔════════════════════════════════════════════════════════════╗
║  📊 PAPER TRADING                                         ║
║                                                            ║
║  ✅ Conecta em APIs REAIS (DexScreener)                   ║
║  ✅ Pega preços e volume REAIS do mercado                 ║
║  ✅ Scanner multi-token funciona AO VIVO                  ║
║  ✅ Simula execução de trades                             ║
║  ✅ Dashboard atualiza a cada 5 minutos                   ║
║  ✅ Você VÊ exatamente o que aconteceria                  ║
║                                                            ║
║  ❌ NÃO gasta dinheiro real                               ║
║  ❌ NÃO executa transações na blockchain                  ║
╚════════════════════════════════════════════════════════════╝
```

---

## 🚀 Como Usar

### 1. Rodar Paper Trading

```bash
npm run paper
```

### 2. O que você vai ver

```
╔════════════════════════════════════════════════════════════════╗
║         📊 PAPER TRADING BOT - MODO DEMO                      ║
╚════════════════════════════════════════════════════════════════╝

📈 PERFORMANCE:
   Capital: $10.00 (Inicial: $10.00)
   PnL Total: +$0.00 (0.00%)
   Trades: 0 | Win Rate: 0.0%
   Posições Abertas: 0/3
   Scans: 1

🔍 SCANNER - Analisando mercado...

┌──────────┬─────────┬────────────┬─────────────┬──────────┐
│  Token   │  Score  │   Volume   │    Price    │  Status  │
├──────────┼─────────┼────────────┼─────────────┼──────────┤
│   BONK   │  45/100 │  82%       │  2.3%       │    -     │
│   WIF    │  88/100 │ 185%       │  7.5%       │ 🔥 HOT   │
│  POPCAT  │  52/100 │ 115%       │  4.1%       │ ⚠️  WATCH │
│   MEW    │  35/100 │  65%       │  1.2%       │    -     │
│   BOME   │  72/100 │ 152%       │  6.8%       │ 🔥 HOT   │
└──────────┴─────────┴────────────┴─────────────┴──────────┘

🔥 NOVA OPORTUNIDADE DETECTADA!
   Token: WIF
   Score: 88/100 ⭐
   Preço: $0.245631
   Investido: $2.50
   ✅ POSIÇÃO ABERTA (simulado)

⏳ Próximo scan em 5 minutos...
```

---

## 📊 Dashboard Explicado

### Seção PERFORMANCE

```
📈 PERFORMANCE:
   Capital: $10.00          ← Seu capital atual (simulado)
   PnL Total: +$2.35 (23.5%) ← Lucro/Prejuízo total
   Trades: 5 | Win Rate: 80%  ← Estatísticas
   Posições Abertas: 1/3      ← Quantas posições está segurando
   Scans: 12                  ← Quantos scans já fez
```

### Seção SCANNER

```
┌──────────┬─────────┬────────────┬─────────────┬──────────┐
│  Token   │  Score  │   Volume   │    Price    │  Status  │
├──────────┼─────────┼────────────┼─────────────┼──────────┤
│ 💼 WIF   │  88/100 │ 185%       │  7.5%       │ 🔥 HOT   │
└──────────┴─────────┴────────────┴─────────────┴──────────┘

💼 = Posição aberta neste token
Score = 0-100 (70+ = ótima oportunidade)
Volume = Spike de volume em %
Price = Mudança de preço em %
Status:
  🔥 HOT = Score > 70 (bot vai comprar)
  ⚠️  WATCH = Score 50-69 (monitorando)
  - = Score < 50 (sem interesse)
```

### Seção POSIÇÕES ABERTAS

```
💼 POSIÇÕES ABERTAS:
   WIF: $2.50 (5min atrás)
   POPCAT: $2.50 (12min atrás)
```

### Seção ÚLTIMOS TRADES

```
📜 ÚLTIMOS TRADES:
   ✅ WIF: +38.5% ($0.96)
   ✅ POPCAT: +22.3% ($0.56)
   ❌ BONK: -5.2% ($-0.13)
```

---

## 🎬 Como Funciona

### Ciclo de 5 minutos:

```
1. Bot acorda
2. Conecta na API DexScreener
3. Pega preços REAIS dos 5 tokens
4. Calcula score para cada token
5. Se score > 70: ABRE posição (simulado)
6. Se posição aberta atingir TP/SL: FECHA posição
7. Atualiza dashboard
8. Dorme 5 minutos
9. Repete
```

### Quando o bot compra?

```
Score > 70 significa:
  ✅ Volume spike > 150%
  ✅ Preço subindo > 6%
  ✅ Momentum forte
  ✅ Liquidez boa
  → BOT COMPRA (simulado)!
```

### Quando o bot vende?

```
1. Take Profit: +35% de lucro
   → BOT VENDE e embolsa lucro!

2. Stop Loss: -8% de prejuízo
   → BOT VENDE para limitar perda

3. Trailing Stop: Após +10%, se cair 10%
   → BOT VENDE para proteger lucro
```

---

## 📋 Exemplo de Sessão

```bash
$ npm run paper

╔════════════════════════════════════════════════════════════════╗
║         📊 PAPER TRADING BOT - MODO DEMO                      ║
╚════════════════════════════════════════════════════════════════╝

🚀 Iniciando Paper Trading Bot...

💰 Capital Inicial: $10.00
📊 Monitorando 5 tokens
⏱️  Intervalo de scan: 5 minutos

⏳ Carregando dados do mercado...

[Scan #1 - 14:00]
🔍 SCANNER - Analisando mercado...
   - Todos scores baixos, aguardando...

⏳ Próximo scan em 5 minutos...

[Scan #2 - 14:05]
🔍 SCANNER - Analisando mercado...

🔥 NOVA OPORTUNIDADE DETECTADA!
   Token: WIF
   Score: 88/100 ⭐
   Preço: $0.245631
   Investido: $2.50
   ✅ POSIÇÃO ABERTA (simulado)

⏳ Próximo scan em 5 minutos...

[Scan #3 - 14:10]
🔍 SCANNER - Analisando mercado...
   WIF está em +12%, aguardando...

⏳ Próximo scan em 5 minutos...

[Scan #4 - 14:15]
🔍 SCANNER - Analisando mercado...

✅ TRADE FECHADO (Take Profit)
   Token: WIF
   Entrada: $0.245631
   Saída: $0.332102
   PnL: +35.2% ($0.88)

📈 PERFORMANCE:
   Capital: $10.88
   PnL Total: +$0.88 (8.8%)
   Trades: 1 | Win Rate: 100.0%

⏳ Próximo scan em 5 minutos...
```

---

## ⚙️ Configurações

Você pode ajustar os parâmetros no arquivo `.env`:

```env
# Capital inicial (simulado)
INITIAL_CAPITAL=10

# Position size por trade
POSITION_SIZE_PERCENT=25

# Stop loss
STOP_LOSS_PERCENT=8

# Take profit
TAKE_PROFIT_PERCENT=35

# Trailing stop
TRAILING_STOP_PERCENT=10

# Máximo de posições simultâneas
MAX_CONCURRENT_POSITIONS=3
```

---

## 🛑 Como Parar

Pressione **Ctrl+C** para parar o bot:

```
^C
Bot interrompido pelo usuário.
```

---

## ❓ FAQ

### P: O bot gasta dinheiro real?
**R:** NÃO! Paper Trading é 100% simulado.

### P: Os preços são reais?
**R:** SIM! Conecta na API DexScreener e pega preços reais.

### P: Posso perder dinheiro?
**R:** NÃO! É apenas simulação, zero risco financeiro.

### P: Quanto tempo devo deixar rodando?
**R:** Recomendo 2-3 dias para ter dados suficientes.

### P: O que fazer se o bot não detecta oportunidades?
**R:** É normal! Memecoin não pumpa toda hora. Aguarde alguns scans.

### P: E se todos os scores ficarem baixos?
**R:** Normal também. O bot é SELETIVO e só entra em oportunidades REALMENTE boas (score > 70).

---

## 📊 Validação

Após 2-3 dias de Paper Trading, analise:

```
✅ INDICADORES POSITIVOS:
   - Win Rate > 40%
   - PnL Total > 0%
   - Profit Factor > 2.0
   - Max Drawdown < 15%

❌ INDICADORES RUINS:
   - Win Rate < 30%
   - PnL Total negativo
   - Muitas perdas seguidas
   - Drawdown > 20%
```

Se indicadores positivos → Considere testar com $10 reais
Se indicadores ruins → Ajuste parâmetros e teste mais

---

## 🚀 Próximos Passos

Após Paper Trading mostrar resultados bons:

1. **Solana Devnet** - Teste transações (fake)
2. **Mainnet $10** - Teste com dinheiro real pequeno
3. **Escalar** - Se lucro, aumente capital gradualmente

---

## 🎯 Conclusão

Paper Trading é a maneira **MAIS SEGURA** de validar o bot:

✅ Zero risco financeiro
✅ Dados reais do mercado
✅ Você VÊ o bot trabalhando
✅ Valida lógica do scanner
✅ Testa estratégia em tempo real

**Recomendação:** Rode por 2-3 dias antes de usar dinheiro real!

---

**Data:** 10/11/2025
**Status:** ✅ Pronto para uso
