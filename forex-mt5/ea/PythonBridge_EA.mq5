//+------------------------------------------------------------------+
//|                                           PythonBridge_EA.mq5    |
//|                        Expert Advisor com ZeroMQ para Python     |
//|                        Envia dados OHLCV e recebe sinais         |
//+------------------------------------------------------------------+
#property copyright "AI Trading Bot"
#property link      "https://github.com"
#property version   "1.00"
#property strict

// Importa ZeroMQ library
#import "libzmq.dll"
   int zmq_ctx_new();
   int zmq_socket(int context, int type);
   int zmq_connect(int socket, string endpoint);
   int zmq_send(int socket, string data, int len, int flags);
   int zmq_recv(int socket, uchar &buffer[], int len, int flags);
   int zmq_close(int socket);
   int zmq_ctx_destroy(int context);
#import

// Parâmetros de entrada (configuráveis no MT5)
input double StopLoss = 50.0;        // Stop Loss em pips
input double TakeProfit = 100.0;     // Take Profit em pips
input double LotSize = 0.01;         // Tamanho do lote
input int MaxTrades = 1;             // Máximo de trades simultâneos
input int MagicNumber = 12345;       // Magic number único

// Variáveis globais
int zmqContext;
int zmqSocket;
bool zmqConnected = false;
datetime lastBarTime = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("🚀 Iniciando Python Bridge EA...");

   // Verifica se trading automático está habilitado
   if(!TerminalInfoInteger(TERMINAL_TRADE_ALLOWED))
   {
      Alert("⚠️ Trading automático não está habilitado! Habilite em Ferramentas → Opções");
      return(INIT_FAILED);
   }

   // Inicializa ZeroMQ
   zmqContext = zmq_ctx_new();
   if(zmqContext == 0)
   {
      Alert("❌ Erro ao criar contexto ZeroMQ");
      return(INIT_FAILED);
   }

   // Cria socket REQ (Request - aguarda resposta)
   zmqSocket = zmq_socket(zmqContext, 3); // 3 = ZMQ_REQ
   if(zmqSocket == 0)
   {
      Alert("❌ Erro ao criar socket ZeroMQ");
      zmq_ctx_destroy(zmqContext);
      return(INIT_FAILED);
   }

   // Conecta ao Python (localhost:5555)
   int result = zmq_connect(zmqSocket, "tcp://localhost:5555");
   if(result != 0)
   {
      Alert("⚠️ Não foi possível conectar ao Python. Certifique-se que o bot Python está rodando!");
      zmq_close(zmqSocket);
      zmq_ctx_destroy(zmqContext);
      return(INIT_FAILED);
   }

   zmqConnected = true;
   Print("✅ Conectado ao Python via ZeroMQ (localhost:5555)");
   Print("📊 Par: ", Symbol(), " | Timeframe: ", PeriodToString());
   Print("⚙️ Config: SL=", StopLoss, " pips | TP=", TakeProfit, " pips | Lote=", LotSize);

   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   Print("🔌 Desconectando Python Bridge EA...");

   if(zmqConnected)
   {
      zmq_close(zmqSocket);
      zmq_ctx_destroy(zmqContext);
   }

   Print("✅ EA desconectado");
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   // Só processa em novo candle (evita spam)
   if(lastBarTime == iTime(Symbol(), Period(), 0))
      return;

   lastBarTime = iTime(Symbol(), Period(), 0);

   // Envia dados para Python e recebe sinal
   string signal = GetPythonSignal();

   if(signal == "")
      return; // Sem sinal

   // Processa sinal
   if(signal == "BUY")
   {
      if(CountOpenTrades() < MaxTrades)
         OpenBuy();
   }
   else if(signal == "SELL")
   {
      if(CountOpenTrades() < MaxTrades)
         OpenSell();
   }
   else if(signal == "CLOSE")
   {
      CloseAllTrades();
   }
}

//+------------------------------------------------------------------+
//| Envia dados para Python e recebe sinal                          |
//+------------------------------------------------------------------+
string GetPythonSignal()
{
   if(!zmqConnected)
      return "";

   // Coleta dados OHLCV dos últimos 50 candles
   string jsonData = BuildMarketDataJSON();

   // Envia para Python
   uchar data[];
   StringToCharArray(jsonData, data);
   int sendResult = zmq_send(zmqSocket, jsonData, ArraySize(data)-1, 0);

   if(sendResult < 0)
   {
      Print("❌ Erro ao enviar dados para Python");
      return "";
   }

   // Recebe resposta do Python
   uchar buffer[];
   ArrayResize(buffer, 1024);
   int recvResult = zmq_recv(zmqSocket, buffer, 1024, 0);

   if(recvResult < 0)
   {
      Print("❌ Erro ao receber resposta do Python");
      return "";
   }

   // Converte resposta para string
   string response = CharArrayToString(buffer, 0, recvResult);

   // Parse JSON response: {"signal": "BUY", "confidence": 0.85}
   string signal = ExtractJSONValue(response, "signal");
   double confidence = StringToDouble(ExtractJSONValue(response, "confidence"));

   if(signal != "" && signal != "HOLD")
   {
      Print("📡 Python → ", signal, " (confiança: ", DoubleToString(confidence*100, 0), "%)");
   }

   return signal;
}

//+------------------------------------------------------------------+
//| Constrói JSON com dados de mercado                              |
//+------------------------------------------------------------------+
string BuildMarketDataJSON()
{
   string json = "{";
   json += "\"symbol\":\"" + Symbol() + "\",";
   json += "\"timeframe\":\"" + PeriodToString() + "\",";
   json += "\"candles\":[";

   // Últimos 50 candles
   for(int i = 49; i >= 0; i--)
   {
      double open = iOpen(Symbol(), Period(), i);
      double high = iHigh(Symbol(), Period(), i);
      double low = iLow(Symbol(), Period(), i);
      double close = iClose(Symbol(), Period(), i);
      long volume = iVolume(Symbol(), Period(), i);
      datetime time = iTime(Symbol(), Period(), i);

      json += "{";
      json += "\"time\":" + IntegerToString(time) + ",";
      json += "\"open\":" + DoubleToString(open, Digits()) + ",";
      json += "\"high\":" + DoubleToString(high, Digits()) + ",";
      json += "\"low\":" + DoubleToString(low, Digits()) + ",";
      json += "\"close\":" + DoubleToString(close, Digits()) + ",";
      json += "\"volume\":" + IntegerToString(volume);
      json += "}";

      if(i > 0) json += ",";
   }

   json += "]}";
   return json;
}

//+------------------------------------------------------------------+
//| Extrai valor de JSON simples                                    |
//+------------------------------------------------------------------+
string ExtractJSONValue(string json, string key)
{
   string searchKey = "\"" + key + "\":";
   int startPos = StringFind(json, searchKey);

   if(startPos < 0)
      return "";

   startPos += StringLen(searchKey);

   // Remove espaços e aspas
   while(StringGetCharacter(json, startPos) == ' ' ||
         StringGetCharacter(json, startPos) == '\"')
      startPos++;

   int endPos = startPos;
   while(endPos < StringLen(json))
   {
      ushort ch = StringGetCharacter(json, endPos);
      if(ch == ',' || ch == '}' || ch == '\"')
         break;
      endPos++;
   }

   return StringSubstr(json, startPos, endPos - startPos);
}

//+------------------------------------------------------------------+
//| Abre posição de compra                                          |
//+------------------------------------------------------------------+
void OpenBuy()
{
   double price = SymbolInfoDouble(Symbol(), SYMBOL_ASK);
   double sl = price - StopLoss * Point() * 10;
   double tp = price + TakeProfit * Point() * 10;

   MqlTradeRequest request = {};
   MqlTradeResult result = {};

   request.action = TRADE_ACTION_DEAL;
   request.symbol = Symbol();
   request.volume = LotSize;
   request.type = ORDER_TYPE_BUY;
   request.price = price;
   request.sl = sl;
   request.tp = tp;
   request.deviation = 10;
   request.magic = MagicNumber;
   request.comment = "Python ML Bot";

   if(OrderSend(request, result))
   {
      if(result.retcode == TRADE_RETCODE_DONE)
         Print("✅ BUY executado: ", result.order, " @ ", price);
      else
         Print("⚠️ BUY falhou: ", result.retcode, " - ", result.comment);
   }
   else
   {
      Print("❌ Erro ao enviar BUY: ", GetLastError());
   }
}

//+------------------------------------------------------------------+
//| Abre posição de venda                                           |
//+------------------------------------------------------------------+
void OpenSell()
{
   double price = SymbolInfoDouble(Symbol(), SYMBOL_BID);
   double sl = price + StopLoss * Point() * 10;
   double tp = price - TakeProfit * Point() * 10;

   MqlTradeRequest request = {};
   MqlTradeResult result = {};

   request.action = TRADE_ACTION_DEAL;
   request.symbol = Symbol();
   request.volume = LotSize;
   request.type = ORDER_TYPE_SELL;
   request.price = price;
   request.sl = sl;
   request.tp = tp;
   request.deviation = 10;
   request.magic = MagicNumber;
   request.comment = "Python ML Bot";

   if(OrderSend(request, result))
   {
      if(result.retcode == TRADE_RETCODE_DONE)
         Print("✅ SELL executado: ", result.order, " @ ", price);
      else
         Print("⚠️ SELL falhou: ", result.retcode, " - ", result.comment);
   }
   else
   {
      Print("❌ Erro ao enviar SELL: ", GetLastError());
   }
}

//+------------------------------------------------------------------+
//| Fecha todas as posições                                         |
//+------------------------------------------------------------------+
void CloseAllTrades()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(PositionSelectByTicket(ticket))
      {
         if(PositionGetString(POSITION_SYMBOL) == Symbol() &&
            PositionGetInteger(POSITION_MAGIC) == MagicNumber)
         {
            MqlTradeRequest request = {};
            MqlTradeResult result = {};

            request.action = TRADE_ACTION_DEAL;
            request.position = ticket;
            request.symbol = Symbol();
            request.volume = PositionGetDouble(POSITION_VOLUME);
            request.type = PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ?
                          ORDER_TYPE_SELL : ORDER_TYPE_BUY;
            request.price = PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ?
                           SymbolInfoDouble(Symbol(), SYMBOL_BID) :
                           SymbolInfoDouble(Symbol(), SYMBOL_ASK);
            request.deviation = 10;
            request.magic = MagicNumber;

            if(OrderSend(request, result))
               Print("✅ Posição ", ticket, " fechada");
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Conta trades abertos                                            |
//+------------------------------------------------------------------+
int CountOpenTrades()
{
   int count = 0;
   for(int i = 0; i < PositionsTotal(); i++)
   {
      if(PositionGetSymbol(i) == Symbol() &&
         PositionGetInteger(POSITION_MAGIC) == MagicNumber)
         count++;
   }
   return count;
}

//+------------------------------------------------------------------+
//| Converte período para string                                    |
//+------------------------------------------------------------------+
string PeriodToString()
{
   switch(Period())
   {
      case PERIOD_M1: return "M1";
      case PERIOD_M5: return "M5";
      case PERIOD_M15: return "M15";
      case PERIOD_M30: return "M30";
      case PERIOD_H1: return "H1";
      case PERIOD_H4: return "H4";
      case PERIOD_D1: return "D1";
      default: return "M5";
   }
}
//+------------------------------------------------------------------+
