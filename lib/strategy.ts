
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

export function calculateEMA(
  values: number[],
  period: number
): (number | null)[] {
  const result: (number | null)[] = Array(values.length).fill(null);

  if (
    !Number.isInteger(period) ||
    period < 1 ||
    values.length < period
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
      values[i] * multiplier +
      previousEMA * (1 - multiplier);

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
    values.length <= period
  ) {
    return result;
  }

  let averageGain = 0;
  let averageLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];

    if (change > 0) {
      averageGain += change;
    } else {
      averageLoss += Math.abs(change);
    }
  }

  averageGain /= period;
  averageLoss /= period;

  const getRSI = (gain: number, loss: number): number => {
    if (gain === 0 && loss === 0) return 50;
    if (loss === 0) return 100;
    if (gain === 0) return 0;

    const relativeStrength = gain / loss;
    return 100 - 100 / (1 + relativeStrength);
  };

  result[period] = getRSI(averageGain, averageLoss);

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    averageGain =
      (averageGain * (period - 1) + gain) / period;

    averageLoss =
      (averageLoss * (period - 1) + loss) / period;

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
    candles.length < period
  ) {
    return result;
  }

  const trueRanges: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];

    const previousClose =
      i > 0 ? candles[i - 1].close : candle.close;

    const trueRange = Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose)
    );

    trueRanges.push(trueRange);
  }

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
    throw new Error("Te dhenat e qirinjve nga Twelve Data nuk jane valide.");
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
      Number.isFinite(open) &&
      Number.isFinite(high) &&
      Number.isFinite(low) &&
      Number.isFinite(close) &&
      open > 0 &&
      high > 0 &&
      low > 0 &&
      close > 0 &&
      high >= low;

    if (!valid) continue;

    const volumeValue = Number(row.volume);

    candles.push({
      datetime,
      open,
      high,
      low,
      close,
      ...(Number.isFinite(volumeValue) && volumeValue >= 0
        ? { volume: volumeValue }
        : {}),
    });
  }

  // Twelve Data zakonisht i kthen qirinjt nga me i riu te me i vjetri.
  // Backtest-i ka nevoje per rend kronologjik.
  candles.sort((a, b) => {
    const timeA = Date.parse(a.datetime);
    const timeB = Date.parse(b.datetime);

    if (Number.isFinite(timeA) && Number.isFinite(timeB)) {
      return timeA - timeB;
    }

    return a.datetime.localeCompare(b.datetime);
  });

  // Hiq qirinjte e dyfishte me te njejten kohe.
  return candles.filter(
    (candle, index) =>
      index === 0 ||
      candle.datetime !== candles[index - 1].datetime
  );
}

export function analyzeCandles(candles: Candle[]): StrategyResult {
  if (candles.length < 200) {
    throw new Error(
      `Nuk ka mjaft qirinj per EMA 200. U moren ${candles.length}; duhen te pakten 200.`
    );
  }

  const closes = candles.map((candle) => candle.close);
  const ema9Series = calculateEMA(closes, 9);
  const ema21Series = calculateEMA(closes, 21);
  const ema200Series = calculateEMA(closes, 200);
  const rsiSeries = calculateRSISeries(closes, 14);
  const atrSeries = calculateATR(candles, 14);

  function signalAt(index: number): TradeSignal {
    if (
      !Number.isInteger(index) ||
      index < 200 ||
      index >= candles.length
    ) {
      return "WAIT";
    }

    const candle = candles[index];
    const previousCandle = candles[index - 1];

    const ema9 = ema9Series[index];
    const ema21 = ema21Series[index];
    const ema200 = ema200Series[index];
    const rsi = rsiSeries[index];

    if (
      ema9 === null ||
      ema21 === null ||
      ema200 === null ||
      rsi === null
    ) {
      return "WAIT";
    }

    let buyScore = 0;
    let sellScore = 0;

    // Drejtimi afatshkurter.
    if (ema9 > ema21) buyScore += 25;
    if (ema9 < ema21) sellScore += 25;

    // Filtri i trendit me EMA 200.
    if (candle.close > ema200) buyScore += 25;
    if (candle.close < ema200) sellScore += 25;

    // RSI 14: shmang blerjen ne zona shume te mbinxehura.
    if (rsi >= 50 && rsi <= 70) buyScore += 25;
    if (rsi >= 30 && rsi < 50) sellScore += 25;

    // Konfirmimi nga qiriri i fundit.
    if (candle.close > previousCandle.close) buyScore += 25;
    if (candle.close < previousCandle.close) sellScore += 25;

    if (buyScore >= 75 && buyScore > sellScore) return "BUY";
    if (sellScore >= 75 && sellScore > buyScore) return "SELL";

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

  const confidence =
    signal === "BUY"
      ? calculateConfidence(
          ema9,
          ema21,
          ema200,
          rsi,
          lastCandle.close,
          lastCandle.close > candles[lastIndex - 1].close,
          "BUY"
        )
      : signal === "SELL"
        ? calculateConfidence(
            ema9,
            ema21,
            ema200,
            rsi,
            lastCandle.close,
            lastCandle.close < candles[lastIndex - 1].close,
            "SELL"
          )
        : 0;

  const stopDistance =
    atr !== null && Number.isFinite(atr) ? atr * 1.5 : null;

  const stopLoss =
    signal !== "WAIT" && stopDistance !== null
      ? lastCandle.close +
        (signal === "BUY" ? -stopDistance : stopDistance)
      : null;

  const takeProfit =
    signal !== "WAIT" && stopDistance !== null
      ? lastCandle.close +
        (signal === "BUY" ? stopDistance * 2 : -stopDistance * 2)
      : null;

  let reason = "Nuk ka konfirmim te mjaftueshem nga EMA dhe RSI.";

  if (signal === "BUY") {
    reason = "BUY: EMA, RSI dhe drejtimi i qiririt japin konfirmim.";
  } else if (signal === "SELL") {
    reason = "SELL: EMA, RSI dhe drejtimi i qiririt japin konfirmim.";
  }

  return {
    signal,
    action: signal,
    price: lastCandle.close,
    confidence,
    stopLoss,
    takeProfit,
    riskReward: stopLoss !== null && takeProfit !== null ? 2 : 0,
    rsi,
    ema9,
    ema21,
    ema200,
    atr,
    reason,
    timestamp: lastCandle.datetime,
    signalAt,
  };
}

function calculateConfidence(
  ema9: number | null,
  ema21: number | null,
  ema200: number | null,
  rsi: number | null,
  price: number,
  candleConfirms: boolean,
  direction: "BUY" | "SELL"
): number {
  if (
    ema9 === null ||
    ema21 === null ||
    ema200 === null ||
    rsi === null
  ) {
    return 0;
  }

  let score = 0;

  if (
    direction === "BUY"
      ? ema9 > ema21
      : ema9 < ema21
  ) {
    score += 25;
  }

  if (
    direction === "BUY"
      ? price > ema200
      : price < ema200
  ) {
    score += 25;
  }

  if (
    direction === "BUY"
      ? rsi >= 50 && rsi <= 70
      : rsi >= 30 && rsi < 50
  ) {
    score += 25;
  }

  if (candleConfirms) score += 25;

  return score;
}
