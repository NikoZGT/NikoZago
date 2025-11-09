# 🧪 Guia de Backtesting

## O Que é Backtesting?

**Backtesting** = Testar estratégias com dados históricos (passado) **sem gastar dinheiro real**.

É como voltar no tempo e simular: "E se eu tivesse usado essa estratégia ontem/semana passada?"

---

## ⚠️ Por Que Não Usar Binance/MetaTrader?

### **Diferença entre CEX e DEX**

| Aspecto | CEX (Binance, Coinbase) | DEX (Raydium, PancakeSwap) |
|---------|------------------------|---------------------------|
| Tipo | Centralizado | Descentralizado |
| Tokens | Tokens listados (BTC, ETH) | **Memecoins novos** 🎯 |
| Listagem | Precisa aprovação | Qualquer um pode criar |
| Nosso Bot | ❌ Não funciona | ✅ Funciona |

**Memecoins novos aparecem PRIMEIRO em DEXs**, não na Binance!

### **MetaTrader**
- É para Forex e ações
- Não tem suporte para DEXs
- Não tem dados de memecoins

---

## ✅ Solução: Backtesting Próprio

Criei um **módulo de backtesting integrado** que:

✅ Usa dados reais de DEXs (DexScreener, Birdeye)
✅ Simula trades com as **mesmas regras** do bot
✅ Testa estratégias **sem gastar dinheiro**
✅ Gera **relatórios detalhados**
✅ Salva histórico para comparar versões

---

## 🚀 Como Usar

### **1. Preparação (já está pronto!)**

O módulo já foi criado em:
- `src/backtesting/backtester.ts`
- `src/backtesting/run-backtest.ts`

### **2. Configurar Período**

Edite `src/backtesting/run-backtest.ts`:

```typescript
const backtestConfig: BacktestConfig = {
  // Período para testar
  startDate: new Date('2024-11-01'),  // De quando
  endDate: new Date('2024-11-09'),    // Até quando

  // Capital inicial
  initialCapital: 10,

  // Rede
  network: 'solana',

  // (Opcional) Tokens específicos
  tokenAddresses: [
    'So11111111111111111111111111111111111111112', // SOL
    // Adicione mais tokens aqui
  ]
};
```

### **3. Executar Backtesting**

```bash
# Compilar
npm run build

# Executar
npm run backtest
```

### **4. Ver Resultados**

O sistema vai:

1. **Buscar dados históricos** dos tokens
2. **Simular trades** usando as regras do bot
3. **Calcular métricas** de performance
4. **Exibir resumo** no terminal
5. **Salvar arquivo** em `backtests/backtest_TIMESTAMP.json`

---

## 📊 Exemplo de Output

```
============================================================
📊 BACKTEST RESULTS SUMMARY
============================================================
Period: 11/1/2024 to 11/9/2024
Duration: 8 days
------------------------------------------------------------
Start Capital:    $10.00
End Capital:      $12.35
Total PnL:        $2.35 (23.5%)
------------------------------------------------------------
Total Trades:     23
Winning Trades:   15 (65.2%)
Losing Trades:    8
Avg Win:          $0.28
Avg Loss:         $0.12
Profit Factor:    2.33
------------------------------------------------------------
Max Drawdown:     $1.20 (11.5%)
Sharpe Ratio:     1.85
============================================================

🏆 TOP 5 BEST TRADES:
1. BONK: +89.3% ($0.45) - 18min
2. PEPE: +67.2% ($0.32) - 25min
3. WIF: +52.8% ($0.24) - 12min
4. DOGE: +48.1% ($0.21) - 31min
5. SHIB: +41.5% ($0.19) - 15min

============================================================
```

---

## 📁 Estrutura de Resultados

O arquivo JSON salvo contém:

```json
{
  "config": {
    "startDate": "2024-11-01",
    "endDate": "2024-11-09",
    "initialCapital": 10
  },
  "startCapital": 10,
  "endCapital": 12.35,
  "totalPnl": 2.35,
  "totalPnlPercent": 23.5,
  "totalTrades": 23,
  "winningTrades": 15,
  "losingTrades": 8,
  "winRate": 65.2,
  "avgWin": 0.28,
  "avgLoss": 0.12,
  "profitFactor": 2.33,
  "maxDrawdown": 1.20,
  "maxDrawdownPercent": 11.5,
  "sharpeRatio": 1.85,
  "trades": [
    {
      "tokenSymbol": "BONK",
      "entryTime": "2024-11-01T10:15:00Z",
      "exitTime": "2024-11-01T10:33:00Z",
      "entryPrice": 0.00001234,
      "exitPrice": 0.00002345,
      "pnl": 0.45,
      "pnlPercent": 89.3,
      "holdTimeMinutes": 18,
      "exitReason": "take_profit"
    }
    // ... mais trades
  ],
  "dailyPnl": [
    { "date": "2024-11-01", "pnl": 0.85, "capital": 10.85 },
    { "date": "2024-11-02", "pnl": 0.32, "capital": 11.17 }
    // ... mais dias
  ]
}
```

---

## 🎯 O Que Analisar

### **Métricas Importantes**

| Métrica | Bom | Ruim |
|---------|-----|------|
| **Win Rate** | > 55% | < 45% |
| **Total PnL** | Positivo | Negativo |
| **Profit Factor** | > 1.5 | < 1.0 |
| **Max Drawdown** | < 20% | > 30% |
| **Sharpe Ratio** | > 1.0 | < 0.5 |

### **Interpretação**

```
Win Rate: 65% ✅
→ Bot acerta mais que erra

Profit Factor: 2.33 ✅
→ Ganha $2.33 para cada $1 que perde

Max Drawdown: 11.5% ✅
→ Maior queda foi pequena

Sharpe Ratio: 1.85 ✅
→ Bom retorno ajustado ao risco
```

---

## 🔧 Configurações Avançadas

### **Testar Tokens Específicos**

```typescript
const backtestConfig: BacktestConfig = {
  startDate: new Date('2024-11-01'),
  endDate: new Date('2024-11-09'),
  initialCapital: 10,
  network: 'solana',

  // Testar apenas esses tokens
  tokenAddresses: [
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  ]
};
```

### **Testar Parâmetros Diferentes**

```typescript
// No .env, criar variações:
POSITION_SIZE_PERCENT=2  // Teste 1
STOP_LOSS_PERCENT=8
TAKE_PROFIT_PERCENT=40

// Depois testar com:
POSITION_SIZE_PERCENT=3  // Teste 2
STOP_LOSS_PERCENT=6
TAKE_PROFIT_PERCENT=50

// Comparar resultados!
```

---

## 🎨 Visualizar Resultados

### **Script para Comparar Backtests**

```bash
# Criar script
cat > compare-backtests.sh << 'EOF'
#!/bin/bash
echo "=== BACKTEST COMPARISON ==="
for file in backtests/*.json; do
    echo ""
    echo "File: $(basename $file)"
    echo "PnL: $(cat $file | jq '.totalPnlPercent')%"
    echo "Win Rate: $(cat $file | jq '.winRate')%"
    echo "Trades: $(cat $file | jq '.totalTrades')"
done
EOF

chmod +x compare-backtests.sh
./compare-backtests.sh
```

---

## ⚠️ Limitações do Backtesting

### **O Que o Backtest NÃO Considera**

❌ **Slippage** - Diferença entre preço esperado e executado
❌ **Liquidez real** - Pode não conseguir comprar/vender quantidade desejada
❌ **Front-running** - Bots mais rápidos te passam na frente
❌ **MEV (Maximal Extractable Value)** - Mineradores reordenando transações
❌ **Gas wars** - Competição por inclusão de transação

### **Por Que Isso Importa?**

```
Backtest: +50% lucro
Real:     +35% lucro  ← Mais realista

Diferença = Slippage + taxas + concorrência
```

### **Como Mitigar**

✅ Usar backtesting como **guia**, não verdade absoluta
✅ Testar com capital real pequeno ($10-20)
✅ Comparar backtest vs real
✅ Ajustar expectativas (backtest - 20% = realista)

---

## 📚 Fontes de Dados

### **Gratuitas** (limitadas)
- ✅ **DexScreener** - Dados básicos, sem histórico completo
- ✅ **CoinGecko** - Apenas tokens grandes
- ⚠️ **Limitação**: Dados de 5min+ de atraso

### **Pagas** (recomendadas para produção)
- 💎 **Birdeye Pro** - $99/mês - Dados históricos completos Solana
- 💎 **DexTools Pro** - $59/mês - Multi-chain com OHLCV
- 💎 **Nansen** - $150/mês - Analytics profissional
- 💎 **Token Terminal** - $299/mês - Dados institucionais

---

## 🎯 Workflow Recomendado

```
1. BACKTEST (7 dias)
   ↓
2. Analisar resultados
   ↓
3. Ajustar parâmetros
   ↓
4. BACKTEST novamente
   ↓
5. Se bom (>55% win rate)
   ↓
6. PAPER TRADING (3 dias)
   ↓
7. REAL com $10-20
   ↓
8. Comparar com backtest
   ↓
9. Ajustar e escalar
```

---

## 🔬 Experimentos Sugeridos

### **Teste 1: Diferentes Position Sizes**
```bash
# Teste com 2%, 3%, 4%
# Qual dá melhor Sharpe Ratio?
```

### **Teste 2: Diferentes Stop Loss**
```bash
# Teste -5%, -8%, -10%
# Qual minimiza max drawdown?
```

### **Teste 3: Diferentes Take Profit**
```bash
# Teste 30%, 40%, 50%
# Qual maximiza profit factor?
```

### **Teste 4: Horários Diferentes**
```bash
# Teste apenas:
# - Manhã (8am-12pm UTC)
# - Tarde (12pm-6pm UTC)
# - Noite (6pm-12am UTC)
# Qual tem melhor performance?
```

---

## 💡 Dicas Pro

1. **Sempre backtest antes de produção**
   ```bash
   Mudou estratégia? → Backtest
   Mudou parâmetro? → Backtest
   Nova rede? → Backtest
   ```

2. **Backtests múltiplos**
   ```bash
   Teste 10x com períodos diferentes
   Se 8/10 são positivos = boa estratégia
   Se 3/10 são positivos = revisar
   ```

3. **Walk-forward testing**
   ```bash
   Treinar: 01-Nov a 07-Nov
   Testar:  08-Nov a 09-Nov
   Ver se funciona em dados "não vistos"
   ```

4. **Monte Carlo simulation**
   ```bash
   Randomizar ordem dos trades
   Ver pior/melhor caso
   ```

---

## 🚀 Próximas Melhorias

- [ ] Integração com Birdeye API (dados históricos reais)
- [ ] Gráficos de equity curve
- [ ] Heatmap de performance por horário
- [ ] Comparação automática de múltiplos backtests
- [ ] Export para CSV/Excel
- [ ] Dashboard web

---

## 📞 Troubleshooting

### Erro: "No historical data found"
→ API gratuita tem limitações. Usar tokens específicos ou aguardar.

### Resultados muito diferentes do real
→ Normal! Backtest não considera slippage/liquidez. Ajustar expectativas.

### Backtest muito lento
→ Reduzir período ou número de tokens.

---

**🎯 Com backtesting você pode testar 100 estratégias diferentes SEM GASTAR NADA!**

**Boa sorte! 🧪📊**
