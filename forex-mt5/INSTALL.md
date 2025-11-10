# 📦 Guia de Instalação Rápida

## 🪟 Windows Setup (10 minutos)

### 1️⃣ Baixar ZeroMQ DLLs

**Link direto:**
```
https://github.com/dingmaotu/mql-zmq/releases/download/v4.0.0/mql-zmq-4.0.0-windows.zip
```

**Ou manualmente:**
1. Vá em https://github.com/dingmaotu/mql-zmq/releases
2. Baixe `mql-zmq-xxx-windows.zip` (versão mais recente)
3. Extraia o arquivo

**Copie as DLLs:**
```
Origem (extraído):
  ├── libzmq.dll
  └── libsodium.dll

Destino:
  C:\Program Files\MetaTrader 5\MQL5\Libraries\
  (ou onde seu MT5 está instalado)
```

### 2️⃣ Instalar Python Dependencies

**No terminal (cmd ou PowerShell):**
```bash
cd C:\caminho\para\NikoZago\forex-mt5\python
pip install -r requirements.txt
```

Vai instalar:
- `pyzmq` - Comunicação ZeroMQ
- `numpy` - Cálculos
- `pandas` - Análise de dados
- `scikit-learn` - Machine Learning

### 3️⃣ Configurar MT5

**Habilitar DLLs:**
1. Abra MT5
2. Ferramentas → Opções (Ctrl+O)
3. Aba "Expert Advisors"
4. Marque:
   - ☑️ "Permitir importação de DLLs"
   - ☑️ "Permitir trading automático"
   - ☑️ "Permitir importação de funções de DLLs externas"

### 4️⃣ Instalar Expert Advisor

**Copiar arquivo:**
```
Origem:
  C:\caminho\para\NikoZago\forex-mt5\ea\PythonBridge_EA.mq5

Destino:
  C:\Users\[SEU_USUARIO]\AppData\Roaming\MetaQuotes\Terminal\[ID_ALEATORIO]\MQL5\Experts\
```

**Dica rápida:** No MT5:
1. Arquivo → Abrir pasta de dados
2. Entre em `MQL5\Experts\`
3. Cole o arquivo `PythonBridge_EA.mq5`

**Compilar:**
1. No MT5, pressione F4 (abre MetaEditor)
2. Navegador → Experts → PythonBridge_EA.mq5
3. Pressione F7 (compilar)
4. Deve aparecer: "0 error(s), 0 warning(s)"

## ▶️ Testar Tudo

### Teste 1: Python Bot

```bash
cd C:\caminho\para\NikoZago\forex-mt5\python
python forex_bot.py
```

**Deve aparecer:**
```
🚀 Iniciando Forex ML Bot...
🧠 ML carregado: 0 trades anteriores
📊 Estratégia Forex adaptada de memecoins
📡 ZeroMQ listening on port 5555

✅ Bot pronto!
💡 Aguardando conexão do MT5...
```

**Deixe rodando!** Não feche.

### Teste 2: MT5 Expert Advisor

**Com o Python rodando:**
1. Abra MT5
2. Arquivo → Novo Gráfico → EURUSD M5
3. Navegador → Experts → PythonBridge_EA
4. Arraste para o gráfico EURUSD
5. Na janela de configuração:
   - Stop Loss: 50
   - Take Profit: 100
   - Lot Size: 0.01
   - Clique "OK"

**Deve aparecer no gráfico:**
- 😊 Rosto feliz no canto superior direito
- "PythonBridge_EA EURUSD,M5"

**No terminal do Python deve aparecer:**
```
============================================================
📥 Dados recebidos: EURUSD M5 | 50 candles
============================================================

📊 Análise Forex:
   Score: 65/100
   Momentum: +0.45%
   Volume: 1.3x média
   Rate of Change: +0.2%/candle

🎯 RESULTADO:
   Sinal: HOLD
   Confiança: 65%
   Score: 65/100
   Motivo: Score insuficiente
```

## ✅ Se tudo funcionou:

1. ✅ Python bot conectou com MT5
2. ✅ Dados OHLCV sendo enviados
3. ✅ Análise funcionando
4. ✅ Sinais sendo retornados

**PARABÉNS! 🎉 Sistema funcionando!**

## 🐛 Problemas Comuns

### "DLL não encontrada"
❌ Erro: `Cannot load library 'libzmq.dll'`
✅ Solução:
- Verifique se DLLs estão em `MQL5\Libraries\`
- Reinicie MT5 após copiar
- MT5 64-bit precisa DLLs 64-bit

### "Conexão recusada"
❌ Erro: `Connection refused (10061)`
✅ Solução:
- Inicie Python ANTES do EA
- Firewall pode estar bloqueando porta 5555
- Tente desabilitar firewall temporariamente

### "Trading não permitido"
❌ Erro: `Trade is not allowed`
✅ Solução:
- Botão "AutoTrading" ativado no MT5? (deve estar verde)
- Em conta real: verifique se broker permite EAs
- Tente em conta demo primeiro

### "Expert Advisor não aparece"
❌ EA não está no navegador
✅ Solução:
- Copie para pasta correta (Experts, não Indicators)
- Compile com F7 no MetaEditor
- Reinicie MT5

## 🎓 Próximos Passos

Após instalação funcionando:

1. **Teste em demo:** Deixe rodando algumas horas
2. **Analise logs:** Veja sinais gerados
3. **Ajuste parâmetros:** ml_config.json
4. **Observe ML aprendendo:** A cada 10 trades

## 📞 Suporte

Se continuar com problemas:

1. **Logs do Python:**
   - Console onde rodou `python forex_bot.py`

2. **Logs do MT5:**
   - MT5 → View → Toolbox → Expert (Ctrl+T)

3. **Teste ZeroMQ:**
   ```bash
   pip install pyzmq
   python -c "import zmq; print('ZeroMQ OK!')"
   ```

---

**Criado para facilitar sua vida! 🚀**
