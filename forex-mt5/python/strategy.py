"""
Estratégia de Trading Forex - Adaptada de Memecoins

Diferenças principais:
- Memecoins: pump 10-50%
- Forex: momentum 0.5-3%

Mantém mesma estrutura:
- Score system
- Anti-late entry filters
- Volume analysis
"""
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime, timedelta


class ForexStrategy:
    """
    Estratégia adaptada de pump detection para Forex
    """

    def __init__(self, ml_adaptive=None):
        self.ml = ml_adaptive

        # Thresholds Forex (mais conservadores que memecoins)
        self.min_momentum_pct = 0.003  # 0.3% mínimo
        self.max_momentum_pct = 0.03   # 3% máximo
        self.volume_multiplier_threshold = 1.3  # 30% acima da média

        # Anti-late entry (igual aos memecoins)
        self.max_pump_age_sec = 30
        self.max_rate_change = 0.03  # 3% por candle

        # Tracking
        self.pump_start_times: Dict[str, datetime] = {}
        self.initial_prices: Dict[str, float] = {}

    def analyze(self, candles: List[Dict]) -> Dict:
        """
        Analisa candles e retorna sinal de trade

        Args:
            candles: Lista de dicionários com OHLCV

        Returns:
            {
                'signal': 'BUY' | 'SELL' | 'CLOSE' | 'HOLD',
                'confidence': float (0-1),
                'score': int (0-100),
                'reason': str
            }
        """
        if len(candles) < 20:
            return self._no_signal("Dados insuficientes")

        # Converte para arrays numpy
        closes = np.array([c['close'] for c in candles])
        volumes = np.array([c['volume'] for c in candles])

        # Calcula indicadores
        score = self._calculate_score(closes, volumes)
        momentum = self._calculate_momentum(closes)
        volume_spike = self._calculate_volume_spike(volumes)
        rate_of_change = self._calculate_rate_of_change(closes)

        # Anti-late entry filters
        pump_age_sec = self._get_pump_age(closes[-1])
        is_too_old = pump_age_sec > self.max_pump_age_sec if pump_age_sec else False
        is_too_fast = abs(rate_of_change) > self.max_rate_change

        print(f"\n📊 Análise Forex:")
        print(f"   Score: {score}/100")
        print(f"   Momentum: {momentum*100:+.2f}%")
        print(f"   Volume: {volume_spike:.1f}x média")
        print(f"   Rate of Change: {rate_of_change*100:+.1f}%/candle")

        if pump_age_sec:
            print(f"   Pump Age: {pump_age_sec:.1f}s")

        # Decide se deve tradear usando ML adaptativo
        if self.ml:
            should_trade, confidence = self.ml.should_trade(score, pump_age_sec or 0, abs(rate_of_change))
        else:
            should_trade = score >= 70 and not is_too_old and not is_too_fast
            confidence = score / 100

        # Filtros de late entry
        if is_too_old:
            print(f"   ⏱️  PUMP MUITO VELHO! {pump_age_sec:.1f}s")
            return self._no_signal("Pump muito velho")

        if is_too_fast:
            print(f"   📊 RATE OF CHANGE MUITO RÁPIDO! {rate_of_change*100:.1f}%")
            return self._no_signal("Movimento muito rápido")

        # Determina direção
        if should_trade:
            if momentum > 0:
                print(f"   ✅ Pump saudável! Idade: {pump_age_sec or 0:.1f}s")
                return {
                    'signal': 'BUY',
                    'confidence': confidence,
                    'score': score,
                    'reason': f'Momentum positivo {momentum*100:.1f}% com volume {volume_spike:.1f}x'
                }
            elif momentum < 0:
                return {
                    'signal': 'SELL',
                    'confidence': confidence,
                    'score': score,
                    'reason': f'Momentum negativo {momentum*100:.1f}% com volume {volume_spike:.1f}x'
                }

        return self._no_signal("Score insuficiente ou critérios não atendidos")

    def _calculate_score(self, closes: np.ndarray, volumes: np.ndarray) -> int:
        """
        Calcula score de 0-100 baseado em múltiplos fatores
        """
        score = 0

        # 1. Momentum (40 pontos max)
        momentum = self._calculate_momentum(closes)
        momentum_score = min(40, abs(momentum) / self.max_momentum_pct * 40)
        score += momentum_score

        # 2. Volume (30 pontos max)
        volume_spike = self._calculate_volume_spike(volumes)
        volume_score = min(30, (volume_spike - 1) / 1.5 * 30)  # 1.5x = 30 pontos
        score += volume_score

        # 3. Trend strength (30 pontos max)
        trend_strength = self._calculate_trend_strength(closes)
        trend_score = trend_strength * 30
        score += trend_score

        return int(score)

    def _calculate_momentum(self, closes: np.ndarray) -> float:
        """
        Calcula momentum: variação % nas últimas 5 barras
        """
        if len(closes) < 5:
            return 0.0

        recent_5 = closes[-5:]
        momentum = (recent_5[-1] - recent_5[0]) / recent_5[0]
        return momentum

    def _calculate_volume_spike(self, volumes: np.ndarray) -> float:
        """
        Calcula spike de volume: volume atual vs média 20 períodos
        """
        if len(volumes) < 20:
            return 1.0

        avg_volume = np.mean(volumes[-20:-1])  # Exclui atual
        current_volume = volumes[-1]

        if avg_volume == 0:
            return 1.0

        return current_volume / avg_volume

    def _calculate_rate_of_change(self, closes: np.ndarray) -> float:
        """
        Calcula taxa de mudança: variação % do último candle
        """
        if len(closes) < 2:
            return 0.0

        return (closes[-1] - closes[-2]) / closes[-2]

    def _calculate_trend_strength(self, closes: np.ndarray) -> float:
        """
        Calcula força da tendência usando correlação linear
        """
        if len(closes) < 10:
            return 0.0

        x = np.arange(len(closes[-10:]))
        y = closes[-10:]

        # Correlação de Pearson
        correlation = np.corrcoef(x, y)[0, 1]

        # Retorna valor absoluto (força da tendência, não direção)
        return abs(correlation) if not np.isnan(correlation) else 0.0

    def _get_pump_age(self, current_price: float) -> Optional[float]:
        """
        Retorna idade do pump em segundos (se estiver rastreando)
        """
        symbol_key = 'current'  # Simplificado para single symbol

        if symbol_key not in self.pump_start_times:
            # Primeira detecção - marca início
            self.pump_start_times[symbol_key] = datetime.now()
            self.initial_prices[symbol_key] = current_price
            return None

        # Verifica se preço mudou significativamente (novo pump)
        initial_price = self.initial_prices[symbol_key]
        price_change = abs(current_price - initial_price) / initial_price

        if price_change > 0.005:  # 0.5% = ainda é o mesmo pump
            pump_age = (datetime.now() - self.pump_start_times[symbol_key]).total_seconds()
            return pump_age
        else:
            # Preço voltou ao normal - reset
            self.pump_start_times[symbol_key] = datetime.now()
            self.initial_prices[symbol_key] = current_price
            return None

    def _no_signal(self, reason: str) -> Dict:
        """Retorna estrutura de 'sem sinal'"""
        return {
            'signal': 'HOLD',
            'confidence': 0.0,
            'score': 0,
            'reason': reason
        }

    def reset_tracking(self):
        """Reset pump tracking (chamado após trade executado)"""
        self.pump_start_times.clear()
        self.initial_prices.clear()
