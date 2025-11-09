# 🚀 Guia Rápido de Início

Este guia irá ajudá-lo a colocar o bot em funcionamento em menos de 10 minutos.

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Uma carteira Solana/BSC/Base com saldo mínimo de US$15 (US$10 + taxas)
- Chaves de API (opcional mas recomendado)

## ⚡ Setup Rápido (Solana)

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Ambiente

Crie o arquivo `.env`:

```bash
cp .env.example .env
```

### 3. Configuração Mínima

Edite `.env` com as configurações essenciais:

```bash
# Configuração Básica
INITIAL_CAPITAL=10
NETWORK=solana

# Solana RPC (use uma RPC pública ou privada)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Sua chave privada da carteira Solana
# IMPORTANTE: Use uma carteira dedicada apenas para o bot!
SOLANA_WALLET_PRIVATE_KEY=[1,2,3,...64 números]
```

#### 📝 Como obter sua chave privada Solana:

**Phantom Wallet:**
1. Abra Phantom
2. Configurações → Mostrar Chave Privada
3. Digite sua senha
4. Copie a chave privada (formato array de números)

**Solana CLI:**
```bash
solana-keygen new --outfile ~/bot-wallet.json
cat ~/bot-wallet.json
```

### 4. Compilar o Projeto

```bash
npm run build
```

### 5. Executar o Bot

**Modo Desenvolvimento (com logs detalhados):**
```bash
npm run dev
```

**Modo Produção:**
```bash
npm start
```

## 🎯 Primeiro Trade

O bot irá:

1. ✅ Escanear novos tokens a cada 2 minutos
2. ✅ Avaliar segurança e sinais de mercado
3. ✅ Executar compra se critérios forem atendidos
4. ✅ Monitorar posições a cada 30 segundos
5. ✅ Executar saída conforme estratégia

## 📊 Monitorando o Bot

### Logs em Tempo Real

```bash
# Logs gerais
tail -f logs/combined.log

# Apenas trades
tail -f logs/trades.log

# Apenas erros
tail -f logs/error.log
```

### Estado do Bot

O estado é salvo em `data/bot-state.json`:

```bash
cat data/bot-state.json | jq
```

### Histórico de Trades

```bash
cat data/trades.jsonl
```

## 🛑 Parando o Bot

Pressione `Ctrl+C` para parar o bot de forma segura.

O bot irá:
- Salvar o estado atual
- Manter posições abertas (serão restauradas no próximo start)
- Finalizar logs corretamente

## ⚙️ Configurações Recomendadas

### Para Iniciantes

```bash
INITIAL_CAPITAL=10
POSITION_SIZE_PERCENT=2
MAX_CONCURRENT_POSITIONS=2
STOP_LOSS_PERCENT=8
TAKE_PROFIT_PERCENT=40
```

### Para Usuários Avançados

```bash
INITIAL_CAPITAL=20
POSITION_SIZE_PERCENT=3
MAX_CONCURRENT_POSITIONS=3
STOP_LOSS_PERCENT=6
TAKE_PROFIT_PERCENT=50
TRAILING_STOP_PERCENT=8
```

## 🔑 APIs Recomendadas (Opcional)

### DexTools
- **Benefício**: Dados mais precisos de volume e liquidez
- **Custo**: Grátis (tier básico) ou US$29/mês (pro)
- **Setup**: https://www.dextools.io/app/en/pairs

### Twitter API
- **Benefício**: Detecção de trending tokens
- **Custo**: Grátis (tier básico)
- **Setup**: https://developer.twitter.com/

### RugCheck (Solana)
- **Benefício**: Análise profunda de contratos
- **Custo**: Variável
- **Setup**: https://rugcheck.xyz/

## ⚠️ Checklist Antes de Começar

- [ ] Instalei todas as dependências (`npm install`)
- [ ] Configurei o arquivo `.env` com minhas chaves
- [ ] Usei uma carteira dedicada (não minha principal)
- [ ] Tenho saldo suficiente (US$10 + taxas de gas)
- [ ] Compilei o projeto (`npm run build`)
- [ ] Testei em modo dev primeiro (`npm run dev`)
- [ ] Configurei monitoramento de logs
- [ ] Entendo os riscos do trading de criptomoedas

## 🆘 Problemas Comuns

### Erro: "Invalid private key"
- Verifique se a chave privada está no formato correto
- Para Solana: array de 64 números `[1,2,3,...]`
- Para EVM: string hexadecimal `0x...`

### Erro: "Insufficient funds"
- Certifique-se de ter saldo suficiente na carteira
- Considere taxas de gas/transação

### Erro: "RPC connection failed"
- Teste a URL do RPC:
```bash
curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' YOUR_RPC_URL
```

### Bot não encontra tokens
- Normal no início - pode levar alguns minutos
- Verifique se há tokens novos na rede escolhida
- Considere relaxar os filtros (MIN_VOLUME_24H, MIN_LIQUIDITY)

### Bot pausou após perdas
- Comportamento esperado após 2 perdas consecutivas
- Revise os logs para entender as perdas
- Retome manualmente se necessário (edite `data/bot-state.json`)

## 📈 Próximos Passos

1. **Monitore por 24h** e analise os logs
2. **Ajuste configurações** baseado em performance
3. **Adicione APIs** para melhorar sinais
4. **Escale gradualmente** após validar estratégia

## 💡 Dicas Pro

1. **Use RPC privado** para evitar rate limits
   - QuickNode: https://www.quicknode.com/
   - Alchemy: https://www.alchemy.com/

2. **Configure alertas** via Discord/Telegram
   - Adicione webhook no código

3. **Backtest primeiro** com dados históricos
   - Valide estratégia antes de usar capital real

4. **Diversifique horários**
   - Tokens novos aparecem mais em certos horários
   - Ajuste `scanInterval` conforme necessário

## 🔒 Segurança

1. ✅ **Sempre use carteira dedicada**
2. ✅ **Nunca compartilhe suas chaves**
3. ✅ **Faça backup do .env**
4. ✅ **Use .env local (não .env.production)**
5. ✅ **Monitore transações regularmente**

---

**Pronto para começar? Execute: `npm run dev`**

Boa sorte e trade com responsabilidade! 🚀
