#!/usr/bin/env python3
"""
Forex ML Trading Bot - Conecta com MT5 via ZeroMQ

Fluxo:
1. Recebe dados OHLCV do MT5
2. Analisa usando estratégia adaptada
3. ML aprende e ajusta thresholds
4. Retorna sinal (BUY/SELL/HOLD)
"""
import zmq
import json
import sys
from datetime import datetime
from strategy import ForexStrategy
from ml_adaptive import AdaptiveML


class ForexBot:
    def __init__(self):
        print("🚀 Iniciando Forex ML Bot...")

        # Inicializa ML adaptativo
        self.ml = AdaptiveML()
        print(f"🧠 ML carregado: {self.ml.total_trades} trades anteriores")

        # Inicializa estratégia
        self.strategy = ForexStrategy(ml_adaptive=self.ml)
        print("📊 Estratégia Forex adaptada de memecoins")

        # ZeroMQ setup
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.REP)  # REP = Reply (responde)
        self.socket.bind("tcp://*:5555")
        print("📡 ZeroMQ listening on port 5555")

        # Tracking
        self.last_signal = None
        self.position_open = False
        self.entry_price = None
        self.entry_time = None

        print("\n✅ Bot pronto!")
        print("💡 Aguardando conexão do MT5...\n")

    def run(self):
        """Loop principal - espera mensagens do MT5"""
        try:
            while True:
                # Aguarda mensagem do MT5
                message = self.socket.recv_string()
                data = json.loads(message)

                # Processa dados
                response = self.process_market_data(data)

                # Envia resposta
                self.socket.send_string(json.dumps(response))

        except KeyboardInterrupt:
            print("\n\n🛑 Bot encerrado pelo usuário")
            self.cleanup()
        except Exception as e:
            print(f"\n❌ Erro: {e}")
            self.cleanup()
            raise

    def process_market_data(self, data: dict) -> dict:
        """
        Processa dados do MT5 e retorna sinal

        Args:
            data: {
                'symbol': 'EURUSD',
                'timeframe': 'M5',
                'candles': [...]
            }

        Returns:
            {
                'signal': 'BUY' | 'SELL' | 'HOLD' | 'CLOSE',
                'confidence': float,
                'score': int,
                'reason': str
            }
        """
        symbol = data.get('symbol', 'UNKNOWN')
        timeframe = data.get('timeframe', 'M5')
        candles = data.get('candles', [])

        print(f"\n{'='*60}")
        print(f"📥 Dados recebidos: {symbol} {timeframe} | {len(candles)} candles")
        print(f"{'='*60}")

        # Verifica se deve fechar posição aberta
        if self.position_open:
            close_signal = self._check_close_conditions(candles)
            if close_signal:
                return close_signal

        # Analisa mercado
        analysis = self.strategy.analyze(candles)

        signal = analysis['signal']
        confidence = analysis['confidence']
        score = analysis['score']
        reason = analysis['reason']

        print(f"\n🎯 RESULTADO:")
        print(f"   Sinal: {signal}")
        print(f"   Confiança: {confidence*100:.0f}%")
        print(f"   Score: {score}/100")
        print(f"   Motivo: {reason}")

        # Registra sinal
        self.last_signal = signal

        # Se executou trade, marca posição
        if signal in ['BUY', 'SELL']:
            self.position_open = True
            self.entry_price = candles[-1]['close']
            self.entry_time = datetime.now()
            print(f"\n✅ Posição {signal} aberta @ {self.entry_price}")

        return {
            'signal': signal,
            'confidence': confidence,
            'score': score,
            'reason': reason
        }

    def _check_close_conditions(self, candles: list) -> dict | None:
        """
        Verifica se deve fechar posição aberta

        Critérios:
        - Score caiu abaixo de 50
        - Momentum inverteu
        - Trade aberto há mais de 1 hora
        """
        if not self.position_open or not self.entry_price:
            return None

        current_price = candles[-1]['close']
        current_time = datetime.now()

        # Calcula PnL
        if self.last_signal == 'BUY':
            pnl_pct = (current_price - self.entry_price) / self.entry_price
        else:  # SELL
            pnl_pct = (self.entry_price - current_price) / self.entry_price

        # Tempo desde entrada
        time_in_trade = (current_time - self.entry_time).total_seconds() / 60  # minutos

        print(f"\n💼 Posição aberta:")
        print(f"   Tipo: {self.last_signal}")
        print(f"   Entrada: {self.entry_price}")
        print(f"   Atual: {current_price}")
        print(f"   PnL: {pnl_pct*100:+.2f}%")
        print(f"   Tempo: {time_in_trade:.0f} min")

        # CLOSE CONDITION 1: Trade muito tempo aberto (> 60 min)
        if time_in_trade > 60:
            print(f"   🕐 Fechando por timeout (60 min)")
            return self._close_position(pnl_pct, "Timeout 60 min")

        # CLOSE CONDITION 2: Score caiu muito
        analysis = self.strategy.analyze(candles)
        if analysis['score'] < 40:
            print(f"   📉 Fechando por score baixo ({analysis['score']})")
            return self._close_position(pnl_pct, "Score baixo")

        return None  # Mantém posição

    def _close_position(self, pnl_pct: float, reason: str) -> dict:
        """
        Fecha posição e registra trade no ML
        """
        result = 'win' if pnl_pct > 0 else 'loss'

        print(f"\n🔔 FECHANDO POSIÇÃO:")
        print(f"   PnL: {pnl_pct*100:+.2f}%")
        print(f"   Resultado: {result.upper()}")
        print(f"   Motivo: {reason}")

        # Registra trade no ML adaptativo
        if self.ml:
            trade_data = {
                'entry_price': self.entry_price,
                'exit_price': self.entry_price * (1 + pnl_pct),
                'pnl': pnl_pct,
                'score': 0,  # Não temos score de saída
                'pump_age': 0,
                'rate_change': 0,
                'result': result
            }
            self.ml.add_trade(trade_data)

            # Mostra stats atualizadas
            stats = self.ml.get_stats()
            print(f"\n📊 ML Stats:")
            print(f"   Total Trades: {stats['total_trades']}")
            print(f"   Win Rate: {stats['win_rate']:.1f}%")
            print(f"   Total PnL: {stats['total_pnl']*100:+.2f}%")

        # Reset tracking
        self.position_open = False
        self.entry_price = None
        self.entry_time = None
        self.strategy.reset_tracking()

        return {
            'signal': 'CLOSE',
            'confidence': 1.0,
            'score': 0,
            'reason': reason
        }

    def cleanup(self):
        """Cleanup resources"""
        print("🧹 Limpando recursos...")
        if hasattr(self, 'socket'):
            self.socket.close()
        if hasattr(self, 'context'):
            self.context.term()
        print("✅ Cleanup concluído")


def main():
    """Entry point"""
    try:
        bot = ForexBot()
        bot.run()
    except Exception as e:
        print(f"❌ Erro fatal: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
