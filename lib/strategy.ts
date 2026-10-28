
export type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type TradeSignal = "BUY" | "SELL" | "WAIT";

export type StrategyResult = {
  signal: TradeSignal;
  action: TradeSignal;
  price: number;
  confidence: number;
  stopLoss: number | null;
  takeProfit1: number | null;
  takeProfit2: number | null;
  /** Backward compatibility: takeProfit eshte i njejte me TP2. */
  takeProfit: number | null;
  riskReward: number;
  rsi: number | null;
  ema9: number | null;
  ema21: number | null;
  ema200: number | null;
  atr: number | null;
  reason: string;
  timestamp: string;
  signalAt: (index: number) => TradeSignal;
};

const isValidNumber = (value: number) => Number.isFinite(value);

function roundPrice(value: number): number {
  return Number(value.toFixed(2));
}

function roundIndicator(value: number | null): number | null {
  return value !== null && Number.isFinite(value)
    ? Number(value.toFixed(2))
    : null;
}

export function calculateEMA(
  values: number[],
  period: number
): (number | null)[] {
  const result: (number | null)[] = Array(values.length).fill(null);

  if (
    !Number.isInteger(period) ||
    period < 1 ||
    values.length < period ||
    values.some((value) => !isValidNumber(value))
  ) {
    return result;
  }

  const multiplier = 2 / (period + 1);
  let sum = 0;

  for (let i = 0; i < period; i++) {
    sum += values[i];
  }

  let previousEMA = sum / period;
  result[period - 1] = previousEMA;

  for (let i = period; i < values.length; i++) {
    previousEMA =
      values[i] * multiplier + previousEMA * (1 - multiplier);
    result[i] = previousEMA;
  }

  return result;
}

export function calculateRSISeries(
  values: number[],
  period = 14
): (number | null)[] {
  const result: (number | null)[] = Array(values.length).fill(null);

  if (
    !Number.isInteger(period) ||
    period < 1 ||
    values.length <= period ||
    values.some((value) => !isValidNumber(value))
  ) {
    return result;
  }

  let averageGain = 0;
  let averageLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];
    averageGain += Math.max(change, 0);
    averageLoss += Math.max(-change, 0);
  }

  averageGain /= period;
  averageLoss /= period;

  const getRSI = (gain: number, loss: number): number => {
    if (gain === 0 && loss === 0) return 50;
    if (loss === 0) return 100;
    if (gain === 0) return 0;

    const rs = gain / loss;
    return 100 - 100 / (1 + rs);
  };

  result[period] = getRSI(averageGain, averageLoss);

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];

    averageGain =
      (averageGain * (period - 1) + Math.max(change, 0)) / period;

    averageLoss =
      (averageLoss * (period - 1) + Math.max(-change, 0)) / period;

    result[i] = getRSI(averageGain, averageLoss);
  }

  return result;
}

export function calculateATR(
  candles: Candle[],
  period = 14
): (number | null)[] {
  const result: (number | null)[] = Array(candles.length).fill(null);

  if (
    !Number.isInteger(period) ||
    period < 1 ||
    candles.length < period ||
    candles.some(
      (candle) =>
        !Number.isFinite(candle.high) ||
        !Number.isFinite(candle.low) ||
        !Number.isFinite(candle.close)
    )
  ) {
    return result;
  }

  const trueRanges = candles.map((candle, index) => {
    const previousClose =
      index > 0 ? candles[index - 1].close : candle.close;

    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose)
    );
  });

  let atr = 0;

  for (let i = 0; i < period; i++) {
    atr += trueRanges[i];
  }

  atr /= period;
  result[period - 1] = atr;

  for (let i = period; i < candles.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
    result[i] = atr;
  }

  return result;
}

export function parseCandles(values: unknown): Candle[] {
  if (!Array.isArray(values)) {
    throw new Error(
      "Te dhenat e qirinjve nga Twelve Data nuk jane valide."
    );
  }

  const candles: Candle[] = [];

  for (const item of values) {
    if (!item || typeof item !== "object") continue;

    const row = item as Record<string, unknown>;
    const datetime = String(row.datetime ?? "");
    const open = Number(row.open);
    const high = Number(row.high);
    const low = Number(row.low);
    const close = Number(row.close);

    const valid =
      datetime.length > 0 &&
      Number.isFinite(Date.parse(datetime)) &&
      Number.isFinite(open) &&
      Number.isFinite(high) &&
      Number.isFinite(low) &&
      Number.isFinite(close) &&
      open > 0 &&
      high > 0 &&
      low > 0 &&
      close > 0 &&
      high >= low &&
      high >= open &&
      high >= close &&
      low <= open &&
      low <= close;

    if (!valid) continue;

    const volume = Number(row.volume);

    candles.push({
      datetime,
      open,
      high,
      low,
      close,
      ...(Number.isFinite(volume) && volume >= 0 ? { volume } : {}),
    });
  }

  candles.sort(
    (a, b) => Date.parse(a.datetime) - Date.parse(b.datetime)
  );

  const uniqueCandles: Candle[] = [];
  const seen = new Set<string>();

  for (const candle of candles) {
    if (seen.has(candle.datetime)) continue;

    seen.add(candle.datetime);
    uniqueCandles.push(candle);
  }

  return uniqueCandles;
}

export function analyzeCandles(candles: Candle[]): StrategyResult {
  if (candles.length < 220) {
    throw new Error(
      `Nuk ka mjaft qirinj per strategjine. U moren ${candles.length}; duhen te pakten 220.`
    );
  }

  const closes = candles.map((candle) => candle.close);

  const ema9Series = calculateEMA(closes, 9);
  const ema21Series = calculateEMA(closes, 21);
  const ema50Series = calculateEMA(closes, 50);
  const ema12Series = calculateEMA(closes, 12);
  const ema26Series = calculateEMA(closes, 26);
  const ema200Series = calculateEMA(closes, 200);
  const rsiSeries = calculateRSISeries(closes, 14);
  const atrSeries = calculateATR(candles, 14);

  const macdSeries: (number | null)[] = closes.map((_, index) => {
    const fast = ema12Series[index];
    const slow = ema26Series[index];

    return fast !== null && slow !== null ? fast - slow : null;
  });

  const validMacd = macdSeries.filter(
    (value): value is number => value !== null
  );

  const macdSignalValues = calculateEMA(validMacd, 9);
  const macdSignalSeries: (number | null)[] = Array(candles.length).fill(null);

  let validIndex = 0;

  for (let i = 0; i < macdSeries.length; i++) {
    if (macdSeries[i] === null) continue;

    macdSignalSeries[i] = macdSignalValues[validIndex];
    validIndex++;
  }

  function getAverageRange(
    index: number,
    period: number
  ): number | null {
    if (index - period + 1 < 0) return null;

    let total = 0;

    for (let i = index - period + 1; i <= index; i++) {
      total += candles[i].high - candles[i].low;
    }

    return total / period;
  }

  function signalAt(index: number): TradeSignal {
    if (
      !Number.isInteger(index) ||
      index < 205 ||
      index >= candles.length
    ) {
      return "WAIT";
    }

    const candle = candles[index];
    const previousCandle = candles[index - 1];

    const ema9 = ema9Series[index];
    const ema21 = ema21Series[index];
    const ema50 = ema50Series[index];
    const ema200 = ema200Series[index];
    const previousEma200 = ema200Series[index - 5];
    const rsi = rsiSeries[index];
    const previousRsi = rsiSeries[index - 1];
    const atr = atrSeries[index];
    const macd = macdSeries[index];
    const macdSignal = macdSignalSeries[index];
    const averageRange = getAverageRange(index, 20);

    if (
      ema9 === null ||
      ema21 === null ||
      ema50 === null ||
      ema200 === null ||
      previousEma200 === null ||
      rsi === null ||
      previousRsi === null ||
      atr === null ||
      macd === null ||
      macdSignal === null ||
      averageRange === null ||
      atr <= 0
    ) {
      return "WAIT";
    }

    const range = candle.high - candle.low;
    if (range <= 0) return "WAIT";

    if (Math.abs(candle.close - ema21) > atr * 2) {
      return "WAIT";
    }

    if (
      atr / candle.close < 0.00002 ||
      range < averageRange * 0.25 ||
      range > atr * 3
    ) {
      return "WAIT";
    }

    const closeLocation = (candle.close - candle.low) / range;

    const bullishCandle =
      candle.close > candle.open &&
      candle.close > previousCandle.close &&
      closeLocation >= 0.55;

    const bearishCandle =
      candle.close < candle.open &&
      candle.close < previousCandle.close &&
      closeLocation <= 0.45;

    const bullishTrend =
      candle.close > ema200 &&
      ema21 > ema50 &&
      ema200 >= previousEma200;

    const bearishTrend =
      candle.close < ema200 &&
      ema21 < ema50 &&
      ema200 <= previousEma200;

    const histogram = macd - macdSignal;

    const lookback = 8;
    let previousHigh = -Infinity;
    let previousLow = Infinity;

    for (let i = index - lookback; i < index; i++) {
      previousHigh = Math.max(previousHigh, candles[i].high);
      previousLow = Math.min(previousLow, candles[i].low);
    }

    const bullishBreakout = candle.close > previousHigh;
    const bearishBreakout = candle.close < previousLow;

    const bullishPullback =
      ema9 > ema21 &&
      previousCandle.close <= ema9 &&
      candle.close > ema9;

    const bearishPullback =
      ema9 < ema21 &&
      previousCandle.close >= ema9 &&
      candle.close < ema9;

    const bullishMomentum = bullishBreakout || bullishPullback;
    const bearishMomentum = bearishBreakout || bearishPullback;

    let buyScore = 0;
    let sellScore = 0;

    if (ema9 > ema21) buyScore += 15;
    if (ema9 < ema21) sellScore += 15;

    if (bullishTrend) buyScore += 20;
    if (bearishTrend) sellScore += 20;

    if (rsi >= 50 && rsi <= 70 && rsi >= previousRsi) {
      buyScore += 15;
    }

    if (rsi >= 30 && rsi <= 50 && rsi <= previousRsi) {
      sellScore += 15;
    }

    if (macd > macdSignal && histogram > 0) {
      buyScore += 15;
    }

    if (macd < macdSignal && histogram < 0) {
      sellScore += 15;
    }

    if (bullishCandle) buyScore += 15;
    if (bearishCandle) sellScore += 15;

    if (bullishMomentum) buyScore += 15;
    if (bearishMomentum) sellScore += 15;

    const minimumScore = 60;

    if (
      buyScore >= minimumScore &&
      buyScore > sellScore &&
      ema9 > ema21 &&
      candle.close > ema50
    ) {
      return "BUY";
    }

    if (
      sellScore >= minimumScore &&
      sellScore > buyScore &&
      ema9 < ema21 &&
      candle.close < ema50
    ) {
      return "SELL";
    }

    return "WAIT";
  }

  const lastIndex = candles.length - 1;
  const lastCandle = candles[lastIndex];

  const ema9 = ema9Series[lastIndex];
  const ema21 = ema21Series[lastIndex];
  const ema200 = ema200Series[lastIndex];
  const rsi = rsiSeries[lastIndex];
  const atr = atrSeries[lastIndex];

  const signal = signalAt(lastIndex);

  let confidence = 0;
  let reason =
    "WAIT: Piket ose konfirmimet nuk jane te mjaftueshme per sinjal.";

  if (signal !== "WAIT") {
    const previousCandle = candles[lastIndex - 1];
    const ema50 = ema50Series[lastIndex];
    const previousEma200 = ema200Series[lastIndex - 5];
    const previousRsi = rsiSeries[lastIndex - 1];
    const macd = macdSeries[lastIndex];
    const macdSignal = macdSignalSeries[lastIndex];

    let score = 0;

    if (
      ema9 !== null &&
      ema21 !== null &&
      (signal === "BUY" ? ema9 > ema21 : ema9 < ema21)
    ) {
      score += 15;
    }

    if (
      ema200 !== null &&
      previousEma200 !== null &&
      ema50 !== null &&
      ema21 !== null &&
      (signal === "BUY"
        ? lastCandle.close > ema200 &&
          ema21 > ema50 &&
          ema200 >= previousEma200
        : lastCandle.close < ema200 &&
          ema21 < ema50 &&
          ema200 <= previousEma200)
    ) {
      score += 20;
    }

    if (
      rsi !== null &&
      previousRsi !== null &&
      (signal === "BUY"
        ? rsi >= 50 && rsi <= 70 && rsi >= previousRsi
        : rsi >= 30 && rsi <= 50 && rsi <= previousRsi)
    ) {
      score += 15;
    }

    if (
      macd !== null &&
      macdSignal !== null &&
      (signal === "BUY" ? macd > macdSignal : macd < macdSignal)
    ) {
      score += 15;
    }

    const range = lastCandle.high - lastCandle.low;
    const closeLocation =
      range > 0 ? (lastCandle.close - lastCandle.low) / range : 0.5;

    if (
      signal === "BUY"
        ? lastCandle.close > lastCandle.open &&
          lastCandle.close > previousCandle.close &&
          closeLocation >= 0.55
        : lastCandle.close < lastCandle.open &&
          lastCandle.close < previousCandle.close &&
          closeLocation <= 0.45
    ) {
      score += 15;
    }

    let previousHigh = -Infinity;
    let previousLow = Infinity;

    for (let i = lastIndex - 8; i < lastIndex; i++) {
      previousHigh = Math.max(previousHigh, candles[i].high);
      previousLow = Math.min(previousLow, candles[i].low);
    }

    if (
      signal === "BUY"
        ? lastCandle.close > previousHigh ||
          (ema9 !== null &&
            ema21 !== null &&
            ema9 > ema21 &&
            previousCandle.close <= ema9 &&
            lastCandle.close > ema9)
        : lastCandle.close < previousLow ||
          (ema9 !== null &&
            ema21 !== null &&
            ema9 < ema21 &&
            previousCandle.close >= ema9 &&
            lastCandle.close < ema9)
    ) {
      score += 15;
    }

    confidence = score;

    reason =
      `${signal}: Sinjali kaloi pragun e strategjise. ` +
      `Piket e konfirmimit: ${confidence}/100. ` +
      `Piket nuk jane probabilitet fitimi.`;
  }

  // Hyrja merret nga mbyllja e qiririt te fundit.
  // Rreziku fillestar = 1.5 x ATR.
  // TP1 = 1R, TP2 = 2R.
  const stopDistance =
    atr !== null && atr > 0 ? atr * 1.5 : null;

  const entryPrice = lastCandle.close;
  let stopLoss: number | null = null;
  let takeProfit1: number | null = null;
  let takeProfit2: number | null = null;

  if (signal !== "WAIT" && stopDistance !== null) {
    const direction = signal === "BUY" ? 1 : -1;

    stopLoss = roundPrice(entryPrice - direction * stopDistance);
    takeProfit1 = roundPrice(entryPrice + direction * stopDistance);
    takeProfit2 = roundPrice(entryPrice + direction * stopDistance * 2);
  }

  return {
    signal,
    action: signal,
    price: roundPrice(entryPrice),
    confidence,
    stopLoss,
    takeProfit1,
    takeProfit2,
    // Mban kompatibilitet me kodin e vjeter qe lexon takeProfit.
    takeProfit: takeProfit2,
    riskReward:
      stopLoss !== null && takeProfit2 !== null ? 2 : 0,
    rsi: roundIndicator(rsi),
    ema9: roundIndicator(ema9),
    ema21: roundIndicator(ema21),
    ema200: roundIndicator(ema200),
    atr: roundIndicator(atr),
    reason:
      signal === "WAIT"
        ? reason
        : `${reason} TP1 = 1R, TP2 = 2R, SL = 1.5 x ATR.`,
    timestamp: lastCandle.datetime,
    signalAt,
  };
}
