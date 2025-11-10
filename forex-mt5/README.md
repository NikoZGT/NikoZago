# 🚀 MT5 + Python Trading Bot com ML Adaptativo

Sistema completo de trading que conecta MetaTrader 5 com Python usando ZeroMQ para análise em tempo real e execução automática.

## 📋 O que é ZeroMQ?

**ZeroMQ** é uma biblioteca de mensageria ultra-rápida que permite comunicação entre processos.

**Analogia simples:** É tipo WhatsApp entre MT5 e Python
- MT5 envia: "Preço EUR/USD = 1.0850"
- Python responde: "COMPRA 0.1 lotes"
- Latência: < 1ms

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    MetaTrader 5                             │
│                                                             │
│  ┌─────────────────────────────────────────────┐          │
│  │  Expert Advisor (MQL5)                      │          │
│  │  - Lê dados OHLCV do gráfico                │          │
│  │  - Envia via ZeroMQ para Python             │          │
│  │  - Recebe sinais (BUY/SELL/CLOSE)           │          │
│  │  - Executa ordens automaticamente            │          │
│  └─────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                         ↕ ZeroMQ Socket
┌─────────────────────────────────────────────────────────────┐
│                    Python Bot                               │
│                                                             │
│  ┌─────────────────────────────────────────────┐          │
│  │  Trading Strategy                           │          │
│  │  - Recebe dados via ZeroMQ                  │          │
│  │  - Calcula score (momentum/volume)          │          │
│  │  - Aplica ML adaptativo                     │          │
│  │  - Anti-late entry filters                  │          │
│  │  - Retorna sinal de trade                   │          │
│  └─────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Setup (10 minutos)

### 1. Instalar ZeroMQ no MT5

**Download:**
```
https://github.com/dingmaotu/mql-zmq/releases
```

**Instalação:**
1. Baixe `mql-zmq-windows.zip`
2. Extraia os arquivos
3. Copie as DLLs para: `C:\Program Files\MetaTrader 5\MQL5\Libraries\`
   - `libzmq.dll`
   - `libsodium.dll`

### 2. Instalar Python dependencies

```bash
cd forex-mt5/python
pip install -r requirements.txt
```

**Dependências:**
- `pyzmq` - Comunicação com MT5
- `numpy` - Cálculos numéricos
- `pandas` - Análise de dados
- `scikit-learn` - Machine Learning

### 3. Configurar MT5

**Habilitar DLLs:**
1. MT5 → Ferramentas → Opções
2. Expert Advisors
3. ✅ Permitir importação de DLLs
4. ✅ Permitir trading automático

### 4. Instalar Expert Advisor

1. Copie `forex-mt5/ea/PythonBridge_EA.mq5` para:
   `C:\Users\[SEU_USER]\AppData\Roaming\MetaQuotes\Terminal\[HASH]\MQL5\Experts\`

2. Compile no MetaEditor (F7)

3. Arraste para o gráfico EUR/USD M5

## ▶️ Como Usar

### Passo 1: Inicie o Python Bot

```bash
cd forex-mt5/python
python forex_bot.py
```

Você verá:
```
🚀 Forex ML Bot iniciado!
📡 Aguardando conexão do MT5...
✅ MT5 conectado! Pronto para tradear.
```

### Passo 2: Inicie o EA no MT5

1. Abra gráfico EUR/USD M5
2. Arraste o EA `PythonBridge_EA` para o gráfico
3. Configure parâmetros:
   - Stop Loss: 50 pips
   - Take Profit: 100 pips
   - Lot Size: 0.01 (micro lote)
4. ✅ Ative "Permitir trading automático"

### Passo 3: Observe!

**No Python você verá:**
```
📊 EUR/USD | Score: 75/100 | Momentum: +0.8% | Volume: 1.5x
✅ Pump saudável! Idade: 8.2s | Velocidade: 4.2%
🎯 SINAL: BUY | Confiança: 82%
```

**No MT5 você verá:**
- Ordem executada automaticamente
- Stop Loss e Take Profit definidos
- Log no Expert Journal

## 🎮 Parâmetros Configuráveis

### No EA (MT5):
- `StopLoss` - Stop loss em pips (padrão: 50)
- `TakeProfit` - Take profit em pips (padrão: 100)
- `LotSize` - Tamanho da posição (padrão: 0.01)
- `MaxTrades` - Máximo de trades simultâneos (padrão: 1)

### No Python (`forex_bot.py`):
```python
config = {
    'min_score': 70,          # Score mínimo para trade
    'stop_loss_pct': 0.5,     # 0.5% SL
    'take_profit_pct': 1.0,   # 1.0% TP
    'max_pump_age_sec': 30,   # Pump deve ter < 30s
    'max_rate_change': 0.03,  # 3% max por candle
}
```

## 🤖 Machine Learning Adaptativo

O bot aprende com seus próprios trades:

**Como funciona:**
1. Após cada trade, analisa resultado (lucro/prejuízo)
2. Ajusta thresholds automaticamente:
   - Se perdendo: aumenta score mínimo (mais seletivo)
   - Se ganhando: mantém ou relaxa score (mais trades)
3. Atualiza a cada 10 trades

**Exemplo:**
```
📈 ML Update: Win rate = 35% (ruim)
🔧 Ajustando: min_score 70 → 75 (mais seletivo)
```

## 📊 Estratégia Adaptada

### Memecoins vs Forex

| Aspecto | Memecoins | Forex (Adaptado) |
|---------|-----------|------------------|
| Pump Detection | Volume spike + 5-15% | Momentum + 1-3% |
| Timeframe | M1-M15 | M5-M15 |
| Volatilidade | Extrema (10-50%) | Moderada (0.5-2%) |
| Liquidez | Baixa | Altíssima |

### Sinais de Compra (Forex):

✅ **Momentum Positivo** (preço subindo consistente)
✅ **Volume acima da média** (1.5x+)
✅ **Rate of change saudável** (< 3% por candle)
✅ **Pump novo** (< 30 segundos)
✅ **Score ≥ 70**

## 🔍 Monitoramento

### Logs Python
```bash
tail -f forex-mt5/python/logs/bot.log
```

### Performance no MT5
- Strategy Tester → Visual Mode
- Veja trades em tempo real
- Analise drawdown, win rate, profit factor

## ⚠️ Avisos Importantes

1. **Teste em DEMO primeiro!** Não use dinheiro real sem testar
2. **ZeroMQ requer DLLs habilitadas** (risco de segurança baixo mas existe)
3. **Latência:** ZeroMQ < 1ms, mas depende do PC
4. **Broker:** Alguns brokers limitam EAs, verifique TOS

## 🐛 Troubleshooting

**"ZeroMQ não conecta":**
- Verifique se Python está rodando ANTES do EA
- Porta 5555 livre? (firewall pode bloquear)
- DLLs instaladas corretamente?

**"EA não executa trades":**
- AutoTrading habilitado? (botão no MT5)
- DLL import permitido?
- Conta demo ou real? (real precisa permissão)

**"Erro de DLL":**
- Copie DLLs para pasta Libraries do MT5
- Restart do MT5 após copiar
- MT5 64-bit = precisa DLLs 64-bit

## 📈 Próximos Passos

1. ✅ Teste em demo por 1 semana
2. 📊 Analise performance (win rate, profit factor)
3. 🔧 Ajuste parâmetros conforme resultados
4. 🚀 Quando confiante → conta real com micro lotes

## 📞 Suporte

Se tiver problemas, verifique:
- MT5 Expert Journal (Ctrl+T)
- Python logs (`forex-mt5/python/logs/`)
- ZeroMQ connection status

---

**Criado com ❤️ para trading algorítmico inteligente**
