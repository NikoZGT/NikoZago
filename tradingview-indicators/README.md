# 🚀 Memecoin Pump Detector - TradingView Indicator

Indicador Pine Script que detecta pumps de memecoins usando a mesma lógica do bot de trading automatizado.

## 📊 O que o Indicador Faz

✅ **Detecta Pumps** (volume spike + price spike + momentum)
✅ **Calcula Score 0-100** (baseado em volume, preço, momentum)
✅ **Anti-Late Entry Filters** (bloqueia entradas tardias)
✅ **Sinais Visuais** (setas BUY/SELL no gráfico)
✅ **Painel em Tempo Real** (métricas ao vivo)
✅ **Alertas Configuráveis** (notificações no app/email)

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
   - Pesquise: `BONKUSDT`, `WIFUSDT`, `SHIBUSDT`, etc
   - Timeframe recomendado: **M5** ou **M15**

2. **Configure o indicador:**
   - Clique na engrenagem ⚙️ ao lado do nome
   - Ajuste "Score Mínimo" conforme sua agressividade:
     - `60-65` = Mais sinais (maior risco)
     - `70-75` = Balanceado (recomendado)
     - `80-85` = Poucos sinais (menor risco)

3. **Interprete os sinais:**
   - 🚀 **Seta Verde (BUY)** = Pump detectado, entrada segura
   - ⏱️ **Warning Laranja** = Pump muito velho (> 6 candles)
   - 📊 **Warning Vermelho** = Pump muito rápido (reversão iminente)
   - ⛔ **Warning Roxo** = Buy Stop (preço já subiu demais)

## 📊 Painel de Métricas

O painel no canto superior direito mostra:

| Métrica | Descrição | Bom / Ruim |
|---------|-----------|------------|
| ⭐ **Score** | 0-100 | Verde: ≥80<br>Amarelo: 70-80<br>Vermelho: <70 |
| 📊 **Volume** | Volume vs média | Verde: ≥1.5x<br>Amarelo: 1.2-1.5x<br>Vermelho: <1.2x |
| 💹 **Price Δ** | Variação 5 candles | Verde: positivo<br>Vermelho: negativo |
| 🎯 **Momentum** | EMA 9 vs EMA 21 | Verde: positivo<br>Vermelho: negativo |
| ⚡ **RoC** | Rate of Change | Verde: <8%<br>Vermelho: >8% (muito rápido!) |
| ⏱️ **Pump Age** | Idade do pump | Verde: ≤6 candles<br>Vermelho: >6 (velho!) |
| ⛔ **Buy Stop** | Subida desde detecção | Verde: <1.5%<br>Vermelho: >1.5% (tarde!) |
| 🎯 **Signal** | Sinal atual | BUY 🚀 / HOLD / SELL 📉 |

## ⚙️ Configurações

### Score Settings

```
⭐ Score Mínimo: 70 (padrão)
   - 50-60: Ultra agressivo (muitos sinais falsos)
   - 65-75: Balanceado ✅
   - 80-90: Conservador (poucos sinais)

Volume Weight: 30 (0-50)
Price Weight: 40 (0-50)
Momentum Weight: 30 (0-50)
```

### Anti-Late Entry Filters

```
⏱️ Max Pump Age: 6 candles (padrão)
   - M5: 6 candles = 30 min
   - M15: 6 candles = 90 min
   - Ajuste conforme timeframe

📊 Max Rate of Change: 8% (padrão)
   - Memecoins: 5-10%
   - Altcoins: 3-5%
   - Pumps >8% revertem rápido

⛔ Buy Stop: 1.5% (padrão)
   - Mais agressivo: 1.0%
   - Mais conservador: 2.5%
```

### Visual Settings

```
✅ Show BUY Signals: ON
❌ Show SELL Signals: OFF (habilite para shorts)
🏷️ Show Labels: ON (warnings de late entry)
📊 Show Stats Table: ON (painel de métricas)
```

### Alerts

```
🔔 Enable Alerts: ON
```

## 🔔 Criar Alertas

Para receber notificações quando aparecer sinal de BUY:

1. Clique nos **3 pontinhos** ao lado do indicador
2. Selecione "Add Alert"
3. Configure:
   - **Condition:** `Memecoin Pump Detector ML`
   - **Trigger:** `Once Per Bar Close`
   - **Expiration:** Escolha tempo (ou nunca)
   - **Actions:** ✅ Notification, ✅ Email, ✅ Webhook
4. Clique "Create"

**Agora você recebe alerta no celular/email quando aparecer pump!** 🔥

## 🎯 Exemplos de Uso

### Exemplo 1: Pump Saudável ✅

```
📊 Gráfico mostra:
- Score: 85/100 (verde)
- Volume: 2.3x (verde)
- Price Δ: +6.5% (verde)
- Momentum: +2.1% (verde)
- RoC: 5.2% (verde - não muito rápido)
- Pump Age: 3 bars (verde - novo)
- Buy Stop: 0.8% (verde - não subiu muito)
- Signal: BUY 🚀

🚀 Seta verde aparece no gráfico!

✅ ENTRADA SEGURA!
```

### Exemplo 2: Pump Muito Velho ⚠️

```
📊 Gráfico mostra:
- Score: 78/100 (amarelo)
- Volume: 1.8x (verde)
- Pump Age: 9 bars (vermelho - muito velho!)
- Signal: HOLD

⏱️ Warning laranja: "TOO OLD - 9 bars"

❌ NÃO ENTRE! Pump já passou, reversão iminente.
```

### Exemplo 3: Pump Muito Rápido ⚠️

```
📊 Gráfico mostra:
- Score: 92/100 (verde)
- RoC: 12.5% (vermelho - explosivo!)
- Signal: HOLD

📊 Warning vermelho: "TOO FAST - 12.5%"

❌ NÃO ENTRE! Pump explosivo, vai reverter rápido.
```

## 🧠 Lógica do Score

### Como o Score é Calculado (0-100)

```
1. Volume Score (0-30 pontos)
   - Volume 1.5x média = 30 pontos
   - Volume 1.0x média = 0 pontos
   - Escala linear

2. Price Score (0-40 pontos)
   - +10% em 5 candles = 40 pontos
   - +5% em 5 candles = 20 pontos
   - Escala linear

3. Momentum Score (0-30 pontos)
   - EMA 9 vs EMA 21
   - 3% acima = 30 pontos
   - 0% = 0 pontos
   - Escala linear

TOTAL: Volume + Price + Momentum = Score (0-100)
```

## 🎨 Cores e Significados

**Background (fundo do gráfico):**
- 🟢 **Verde claro** = Score ≥ 80 (pump muito forte)
- 🟡 **Amarelo claro** = Score 70-80 (pump moderado)
- 🔴 **Vermelho claro** = Score < 70 (sem pump)

**Labels (etiquetas):**
- 🚀 **Verde** = BUY Signal (entrada segura)
- 📉 **Vermelho** = SELL Signal (short)
- 🟠 **Laranja** = Too Old Warning
- 🔴 **Vermelho escuro** = Too Fast Warning
- 🟣 **Roxo** = Buy Stop Warning

## 📱 Melhores Práticas

### ✅ Faça

1. **Use em memecoins voláteis** (BONK, WIF, SHIB, etc)
2. **Timeframe M5 ou M15** para memecoins
3. **Aguarde sinal BUY 🚀** sem warnings
4. **Configure alertas** para não perder oportunidades
5. **Combine com análise técnica** (suporte/resistência)

### ❌ Evite

1. **Não entre em pumps velhos** (warning ⏱️)
2. **Não entre em pumps rápidos** (warning 📊)
3. **Não ignore Buy Stop** (warning ⛔)
4. **Não use em Bitcoin/Ethereum** (lógica diferente)
5. **Não entre sem confirmar volume** (vermelho no painel)

## 🔄 Diferença vs Bot Automatizado

| Aspecto | TradingView Indicator | Bot Automatizado |
|---------|----------------------|------------------|
| **Função** | Análise visual | Executa trades |
| **Uso** | Manual (você decide) | Automático |
| **Plataforma** | TradingView | MT5/Python |
| **Custo** | Grátis | Precisa broker |
| **Risco** | Zero (só visualiza) | Real (dinheiro) |
| **Vantagem** | Sem risco, aprenda | Trades 24/7 |

**Recomendação:** Use o indicador para **aprender** antes de usar o bot com dinheiro real!

## 🐛 Troubleshooting

### "Indicador não aparece no gráfico"
✅ Certifique-se que clicou em "Add to Chart"
✅ Verifique se não há erros no Pine Editor
✅ Recarregue a página

### "Muitos sinais falsos"
✅ Aumente "Score Mínimo" para 75-80
✅ Reduza "Max Rate of Change" para 6%
✅ Use timeframe maior (M15 ao invés de M5)

### "Poucos sinais"
✅ Reduza "Score Mínimo" para 65-70
✅ Aumente "Max Pump Age" para 8-10 candles
✅ Use timeframe menor (M5 ao invés de M15)

### "Alertas não funcionam"
✅ Verifique se "Enable Alerts" está ON
✅ Certifique-se que criou o alerta (botão 3 pontinhos)
✅ Verifique configurações de notificação do TradingView

## 📚 Recursos Extras

### Backtest Manual

Para testar performance histórica:
1. Abra gráfico histórico (scroll para trás)
2. Observe onde apareceram setas 🚀
3. Veja se o preço subiu depois
4. Anote win rate e ajuste parâmetros

### Customizações Avançadas

**Alterar cores:**
Linha 150-160 do código: `color.new(color.green, 0)`

**Adicionar EMAs ao gráfico:**
Linha 269-270: Descomente (remova `//`)

**Mudar posição do painel:**
Linha 147: `position.top_right` → `position.top_left`

## 🎓 Próximos Passos

1. **Teste em demo** (TradingView Paper Trading)
2. **Ajuste parâmetros** conforme resultados
3. **Combine com outras análises** (RSI, MACD, etc)
4. **Quando confiante** → use bot automatizado

---

**Criado para facilitar análise de memecoins no TradingView! 📊🚀**

**Bons trades! 💰**
