# 🚀 Memecoin Pump Detector ML v2 - TradingView Indicator

Indicador Pine Script v6 **inteligente e dinâmico** que analisa os últimos 50 candles em tempo real para detectar pumps e dumps de memecoins.

## 🆕 O que há de novo na v2?

✅ **Score SEMPRE 0-100** (nunca negativo!)
✅ **Análise contínua dos últimos 50 candles** em tempo real
✅ **Detecção de Tendência** (ALTA/BAIXA/LATERAL)
✅ **Força da Tendência** (0-100%)
✅ **Análise de Reversão** (detecta divergências preço/volume)
✅ **Sinais BUY e SELL inteligentes** baseados na direção do mercado
✅ **Linha de Tendência visual** no gráfico
✅ **11 métricas em tempo real** no painel

## 📊 Como Funciona

O indicador **analisa dinamicamente** os últimos 50 candles para entender:

1. **Volume** → Compara volume atual com média de 50 candles
2. **Posição do Preço** → Onde está na faixa (topo/meio/fundo) dos últimos 50 candles
3. **Tendência** → Analisa EMAs (9, 21, 50) para determinar direção
4. **Força** → Mede separação das EMAs (quanto mais separadas, mais forte a tendência)
5. **Reversão** → Detecta divergências (preço sobe + volume cai = cuidado!)

### Score Calculation (0-100 pontos)

```
Volume Score (0-30 pts):    Volume atual vs média de 50 candles
Price Score (0-35 pts):     Posição na faixa (topo/fundo) dos 50 candles
Momentum Score (0-35 pts):  Força da tendência (separação das EMAs)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: 0-100 pontos (sempre positivo!)
```

## 🔧 Como Instalar (2 minutos)

### Passo 1: Copiar Código

1. Abra o arquivo `memecoin_pump_detector.pine`
2. Copie TODO o conteúdo (Ctrl+A, Ctrl+C)

### Passo 2: Adicionar no TradingView

1. Vá em https://www.tradingview.com/
2. Abra qualquer gráfico
3. Clique em "Pine Editor" (parte inferior da tela)
4. Cole o código (Ctrl+V)
5. Clique em "Add to Chart" (topo do editor)

**Pronto!** 🎉 O indicador vai aparecer no gráfico.

## 📈 Como Usar

### Para Memecoins (Solana, BSC, etc)

1. **Adicione o par no TradingView:**
   - Pesquise: `BONKUSDT`, `WIFUSDT`, `SHIBUSDT`, `PEPEUSDT`, etc
   - Timeframe recomendado: **M5** ou **M15**

2. **Configure o indicador:**
   - Clique na engrenagem ⚙️ ao lado do nome
   - **Score Mínimo**: 60-75 (quanto maior, mais seletivo)
   - **Força Mínima de Tendência**: 40-70% (quanto maior, mais forte a tendência exigida)
   - **Análise de Candles**: 50 (recomendado)

3. **Interprete os sinais:**

   **Sinais de COMPRA (BUY):**
   - 🚀 **Seta Verde** = Pump detectado + Tendência de ALTA confirmada + Força boa
   - Aparece quando: Score alto + EMA 9 > EMA 21 > EMA 50 + Sem divergência

   **Sinais de VENDA (SELL):**
   - 📉 **Seta Vermelha** = Dump detectado + Tendência de BAIXA confirmada + Força boa
   - Aparece quando: Score alto + EMA 9 < EMA 21 < EMA 50

   **Avisos (Warnings):**
   - ⏱️ **TOO OLD** = Pump/dump muito velho (> 6 candles) - entrada tardia!
   - 📊 **TOO FAST** = Movimento muito rápido (> 8%) - possível reversão!
   - ⛔ **BUY STOP** = Preço já subiu demais (> 1.5%) - esperou demais!
   - ⚠️ **REVERSAL?** = Preço subindo mas volume caindo - cuidado com reversão!

## 📊 Painel de Estatísticas (Canto Superior Direito)

O painel mostra **11 métricas em tempo real**:

| Métrica | Descrição | Cores |
|---------|-----------|-------|
| ⭐ **Score** | Score total (0-100) | Verde (80+), Amarelo (70-79), Vermelho (<70) |
| 🎯 **Tendência** | Direção do mercado | 📈 ALTA (verde), 📉 BAIXA (vermelho), ↔️ LATERAL (cinza) |
| 💪 **Força** | Força da tendência (%) | Verde (70+), Amarelo (40-69), Vermelho (<40) |
| 📊 **Volume** | Volume vs média 50 candles | Verde (1.5x+), Amarelo (1.2-1.5x), Vermelho (<1.2x) |
| 📍 **Posição** | Posição na faixa 50 candles | Verde (topo 70%+), Amarelo (meio), Vermelho (fundo <30%) |
| ⚡ **RoC** | Rate of Change (velocidade) | Verde (normal), Vermelho (>8% - muito rápido!) |
| ⏱️ **Pump Age** | Idade do pump (candles) | Verde (≤6), Vermelho (>6 - muito velho!) |
| 📈 **Δ Pump** | Variação desde início pump | Verde (+lucro), Vermelho (-perda) |
| 🔄 **Reversão?** | Risco de reversão | ✅ NÃO (verde), ⚠️ SIM (laranja - cuidado!) |
| 🎯 **Signal** | Sinal atual | 🚀 BUY (verde), 📉 SELL (vermelho), ⏸️ HOLD (cinza) |

## 🎨 Visualização

### Background Colors (fundo do gráfico):
- 🟢 **Verde claro** = Tendência de ALTA + Score alto
- 🔴 **Vermelho claro** = Tendência de BAIXA + Score alto
- 🟡 **Amarelo claro** = Score alto mas tendência lateral
- ⚪ **Cinza** = Score baixo (mercado calmo)

### Linha de Tendência:
- **Verde** = Tendência de alta (EMAs alinhadas pra cima)
- **Vermelha** = Tendência de baixa (EMAs alinhadas pra baixo)
- **Cinza** = Lateral (sem tendência clara)

## ⚙️ Configurações Recomendadas

### 🔥 Agressivo (Mais sinais, mais risco)
```
Score Mínimo: 60
Força Mínima: 40%
Max Pump Age: 8 candles
Max RoC: 10%
Buy Stop: 2%
```

### ⚖️ Balanceado (Recomendado)
```
Score Mínimo: 70
Força Mínima: 60%
Max Pump Age: 6 candles
Max RoC: 8%
Buy Stop: 1.5%
```

### 🛡️ Conservador (Poucos sinais, menor risco)
```
Score Mínimo: 80
Força Mínima: 70%
Max Pump Age: 4 candles
Max RoC: 5%
Buy Stop: 1%
```

## 🔔 Como Configurar Alertas

1. Clique com botão direito no indicador → "Add Alert"
2. **Condição**: Escolha uma das opções:
   - `Buy Signal` = Alerta quando aparecer sinal BUY
   - `Sell Signal` = Alerta quando aparecer sinal SELL
   - `Score` = Alerta quando score cruzar valor específico
3. **Opções**: Configure como preferir
4. **Notificações**: Ative popup/email/app conforme desejado
5. Clique em "Create"

## 💡 Dicas de Uso

### ✅ Boas Práticas:

1. **Use timeframe M5 ou M15** para memecoins
2. **Espere confirmação da tendência** (linha verde ou vermelha clara)
3. **Evite sinais com avisos** (TOO OLD, TOO FAST, REVERSAL)
4. **Combine com análise manual** (suporte/resistência, notícias)
5. **Use stop loss sempre** (recomendado: -5%)
6. **Take profit gradual** (50% em +10%, 50% em +20%)

### ❌ Evite:

1. ❌ Entrar em sinais BUY quando tendência está BAIXA (vermelho)
2. ❌ Entrar em sinais SELL quando tendência está ALTA (verde)
3. ❌ Ignorar avisos de REVERSÃO (⚠️)
4. ❌ Entrar quando Pump Age > 6 candles (⏱️ TOO OLD)
5. ❌ Entrar quando RoC > 8% (📊 TOO FAST)
6. ❌ Usar timeframes muito curtos (< M1) ou muito longos (> H1)

## 🧪 Exemplos de Sinais

### ✅ Sinal BUY Perfeito:
```
Score: 85/100
Tendência: 📈 ALTA
Força: 75%
Volume: 2.5x
Posição: 80% (perto do topo)
RoC: 3.5%
Pump Age: 2 bars
Reversão?: ✅ NÃO
Signal: 🚀 BUY

→ ENTRAR! Todas as condições ideais!
```

### ⚠️ Sinal BUY Arriscado:
```
Score: 72/100
Tendência: 📈 ALTA
Força: 65%
Volume: 1.8x
Posição: 85%
RoC: 9.5%
Pump Age: 7 bars
Reversão?: ⚠️ SIM

→ EVITAR! Pump velho + muito rápido + divergência!
```

### 🔴 Sinal SELL (Short):
```
Score: 80/100
Tendência: 📉 BAIXA
Força: 70%
Volume: 2.2x
Posição: 25% (perto do fundo)
RoC: 4%
Dump Age: 3 bars
Reversão?: ✅ NÃO
Signal: 📉 SELL

→ OPORTUNIDADE DE SHORT! (se operar vendido)
```

## 🔬 Detalhes Técnicos

### Análise dos 50 Candles:

O indicador usa **janela móvel de 50 candles** para:

1. **Volume Analysis:**
   ```
   avgVolume50 = SMA(volume, 50)
   currentRatio = volume / avgVolume50
   ```

2. **Price Position:**
   ```
   highest50 = MAX(high dos últimos 50)
   lowest50 = MIN(low dos últimos 50)
   position = (close - lowest50) / (highest50 - lowest50) * 100
   ```

3. **Trend Detection:**
   ```
   isBullish = EMA9 > EMA21 AND EMA21 > EMA50
   isBearish = EMA9 < EMA21 AND EMA21 < EMA50
   ```

4. **Trend Strength:**
   ```
   sep9_21 = |EMA9 - EMA21| / EMA21 * 100
   sep21_50 = |EMA21 - EMA50| / EMA50 * 100
   strength = (sep9_21 + sep21_50) * 10
   ```

### Score Garantido 0-100:

```pinescript
volumeScore = math.min(30, math.max(0, ...))
priceScore = math.min(35, math.max(0, ...))
momentumScore = math.min(35, math.max(0, ...))
totalScore = volumeScore + priceScore + momentumScore
```

Cada componente usa `math.max(0, ...)` para nunca ser negativo!

## 🐛 Troubleshooting

### Problema: Score ficando negativo
**Solução:** Isso foi corrigido na v2! Score agora é SEMPRE 0-100.

### Problema: Muitos sinais BUY/SELL
**Solução:** Aumente "Score Mínimo" e "Força Mínima de Tendência"

### Problema: Poucos sinais ou nenhum sinal
**Solução:** Reduza "Score Mínimo" (tente 60) e "Força Mínima" (tente 40%)

### Problema: Sinais atrasados
**Solução:** Use timeframe menor (M1 ou M5) e reduza "Max Pump Age" para 4

### Problema: Muitos sinais falsos
**Solução:**
- Aumente "Força Mínima de Tendência" para 70%
- Ative "Show Labels" para ver os avisos
- Evite sinais com warnings (TOO OLD, TOO FAST, REVERSAL)

## 📚 Próximos Passos

Depois de testar o indicador:

1. **Pratique com Paper Trading** antes de usar dinheiro real
2. **Anote os resultados** (win rate, profit factor)
3. **Ajuste as configurações** baseado nos seus resultados
4. **Combine com outros indicadores** (RSI, MACD, Volume Profile)
5. **Sempre use Stop Loss e Take Profit**

## ⚠️ Disclaimer

Este indicador é para **fins educacionais**. Não é garantia de lucros. Trading de criptomoedas é arriscado. Nunca invista mais do que você pode perder. Sempre faça sua própria análise (DYOR - Do Your Own Research).

---

**Desenvolvido com ❤️ para traders de memecoins**

🚀 **Boa sorte nos trades!**
