"""
ML Adaptativo - Aprende com resultados e ajusta thresholds
"""
import json
import os
from typing import Dict, List
from datetime import datetime


class AdaptiveML:
    """
    Machine Learning Adaptativo que ajusta parâmetros baseado em performance

    Como funciona:
    1. Armazena histórico de trades
    2. Analisa win rate, profit factor, etc
    3. Ajusta thresholds automaticamente:
       - Performance ruim → mais seletivo (aumenta min_score)
       - Performance boa → mantém ou relaxa
    """

    def __init__(self, config_file='ml_config.json'):
        self.config_file = config_file
        self.trade_history: List[Dict] = []

        # Thresholds adaptativos (começam com valores padrão)
        self.min_score = 70
        self.max_pump_age_sec = 30
        self.max_rate_change = 0.03  # 3%

        # Métricas de performance
        self.total_trades = 0
        self.winning_trades = 0
        self.total_pnl = 0.0

        # Carrega configuração se existir
        self.load_config()

    def add_trade(self, trade_data: Dict):
        """
        Adiciona trade ao histórico e aprende

        Args:
            trade_data: {
                'entry_price': float,
                'exit_price': float,
                'pnl': float,
                'score': int,
                'pump_age': float,
                'rate_change': float,
                'result': 'win' ou 'loss'
            }
        """
        self.trade_history.append({
            **trade_data,
            'timestamp': datetime.now().isoformat()
        })

        # Atualiza métricas
        self.total_trades += 1
        if trade_data['result'] == 'win':
            self.winning_trades += 1
        self.total_pnl += trade_data['pnl']

        # Aprende a cada 10 trades
        if self.total_trades % 10 == 0:
            self.adapt_thresholds()

        # Salva estado
        self.save_config()

    def adapt_thresholds(self):
        """
        Ajusta thresholds baseado em performance recente
        """
        if self.total_trades < 10:
            return  # Precisa de mais dados

        # Analisa últimos 20 trades
        recent_trades = self.trade_history[-20:]
        recent_wins = sum(1 for t in recent_trades if t['result'] == 'win')
        win_rate = recent_wins / len(recent_trades)

        print(f"\n📈 ML Adaptativo: Analisando performance...")
        print(f"   Win Rate: {win_rate*100:.1f}% (últimos {len(recent_trades)} trades)")
        print(f"   Total PnL: {self.total_pnl:.2f}")

        # REGRA 1: Win rate baixo → mais seletivo
        if win_rate < 0.40:  # < 40%
            old_score = self.min_score
            self.min_score = min(85, self.min_score + 5)
            print(f"   🔧 Win rate baixo! Aumentando seletividade")
            print(f"   📊 min_score: {old_score} → {self.min_score}")

            # Também reduz tempo máximo de pump
            old_age = self.max_pump_age_sec
            self.max_pump_age_sec = max(15, self.max_pump_age_sec - 5)
            print(f"   ⏱️  max_pump_age: {old_age}s → {self.max_pump_age_sec}s")

        # REGRA 2: Win rate alto → pode relaxar um pouco
        elif win_rate > 0.60:  # > 60%
            old_score = self.min_score
            self.min_score = max(65, self.min_score - 2)
            print(f"   ✅ Win rate bom! Relaxando levemente")
            print(f"   📊 min_score: {old_score} → {self.min_score}")

        # REGRA 3: Analisa trades perdedores - quais características tinham?
        losing_trades = [t for t in recent_trades if t['result'] == 'loss']
        if losing_trades:
            avg_losing_rate_change = sum(t['rate_change'] for t in losing_trades) / len(losing_trades)

            # Se trades perdedores tinham rate of change alto → reduz limite
            if avg_losing_rate_change > self.max_rate_change * 0.8:
                old_rate = self.max_rate_change
                self.max_rate_change = max(0.02, self.max_rate_change - 0.005)  # -0.5%
                print(f"   📉 Trades perdedores com rate alto!")
                print(f"   🎚️  max_rate_change: {old_rate*100:.1f}% → {self.max_rate_change*100:.1f}%")

        print(f"   💾 Thresholds salvos\n")

    def should_trade(self, score: int, pump_age_sec: float, rate_change: float) -> tuple[bool, float]:
        """
        Decide se deve tradear baseado nos thresholds adaptativos

        Returns:
            (should_trade: bool, confidence: float)
        """
        # Verifica cada critério
        criteria_passed = 0
        criteria_total = 3

        # 1. Score
        if score >= self.min_score:
            criteria_passed += 1

        # 2. Pump age
        if pump_age_sec <= self.max_pump_age_sec:
            criteria_passed += 1

        # 3. Rate of change
        if abs(rate_change) <= self.max_rate_change:
            criteria_passed += 1

        # Confidence baseado em quantos critérios passaram
        confidence = criteria_passed / criteria_total
        should_trade = criteria_passed == criteria_total  # Todos devem passar

        return should_trade, confidence

    def get_stats(self) -> Dict:
        """Retorna estatísticas atuais"""
        win_rate = (self.winning_trades / self.total_trades * 100) if self.total_trades > 0 else 0

        return {
            'total_trades': self.total_trades,
            'winning_trades': self.winning_trades,
            'losing_trades': self.total_trades - self.winning_trades,
            'win_rate': win_rate,
            'total_pnl': self.total_pnl,
            'current_thresholds': {
                'min_score': self.min_score,
                'max_pump_age_sec': self.max_pump_age_sec,
                'max_rate_change': self.max_rate_change
            }
        }

    def save_config(self):
        """Salva configuração e histórico"""
        data = {
            'thresholds': {
                'min_score': self.min_score,
                'max_pump_age_sec': self.max_pump_age_sec,
                'max_rate_change': self.max_rate_change
            },
            'stats': {
                'total_trades': self.total_trades,
                'winning_trades': self.winning_trades,
                'total_pnl': self.total_pnl
            },
            'trade_history': self.trade_history[-100:]  # Últimos 100 trades
        }

        with open(self.config_file, 'w') as f:
            json.dump(data, f, indent=2)

    def load_config(self):
        """Carrega configuração salva"""
        if not os.path.exists(self.config_file):
            return

        try:
            with open(self.config_file, 'r') as f:
                data = json.load(f)

            # Carrega thresholds
            thresholds = data.get('thresholds', {})
            self.min_score = thresholds.get('min_score', 70)
            self.max_pump_age_sec = thresholds.get('max_pump_age_sec', 30)
            self.max_rate_change = thresholds.get('max_rate_change', 0.03)

            # Carrega stats
            stats = data.get('stats', {})
            self.total_trades = stats.get('total_trades', 0)
            self.winning_trades = stats.get('winning_trades', 0)
            self.total_pnl = stats.get('total_pnl', 0.0)

            # Carrega histórico
            self.trade_history = data.get('trade_history', [])

            print(f"📁 ML config carregado: {self.total_trades} trades anteriores")

        except Exception as e:
            print(f"⚠️  Erro ao carregar config: {e}")
