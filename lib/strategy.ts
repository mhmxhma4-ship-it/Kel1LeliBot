
export type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type StrategyResult = {
  signal: "BUY" | "SELL" | "WAIT";
  action: "BUY" | "SELL" | "WAIT";
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
};

export function calculateEMA(
  values: number[],
  period: number
): Array<number | null> {
  const result: Array<number | null> = Array(values.length).fill(null);

  if (period < 1 || values.length < period) {
    return result;
  }

  let sum = 0;

  for (let i = 0; i < period; i++) {
    sum += values[i];
  }

  let ema = sum / period;
  result[period - 1] = ema;

  const multiplier = 2 / (period + 1);

  for (let i = period; i < values.length; i++) {
    ema = values[i] * multiplier + ema * (1 - multiplier);
    result[i] = ema;
  }

  return result;
}

export function calculateRSISeries(
  values: number[],
  period = 14
): Array<number | null> {
  const result: Array<number | null> = Array(values.length).fill(null);

  if (period < 1 || values.length <= period) {
    return result;
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];

    if (change > 0) gains += change;
    else losses -= change;
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  const getRSI = () => {
    if (averageLoss === 0 && averageGain === 0) return 50;
    if (averageLoss === 0) return 100;

    const rs = averageGain / averageLoss;
    return 100 - 100 / (1 + rs);
  };

  result[period] = getRSI();

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    averageGain =
      (averageGain * (period - 1) + gain) / period;

    averageLoss =
      (averageLoss * (period - 1) + loss) / period;

    result[i] = getRSI();
  }

  return result;
}

export function calculateATR(
  candles: Candle[],
  period = 14
): Array<number | null> {
  const result: Array<number | null> = Array(candles.length).fill(null);

  if (period < 1 || candles.length <= period) {
    return result;
  }

  const trueRanges: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];

    if (i === 0) {
      trueRanges.push(candle.high - candle.low);
      continue;
    }

    const previousClose = candles[i - 1].close;

    trueRanges.push(
      Math.max(
        candle.high - candle.low,
        Math.abs(candle.high - previousClose),
        Math.abs(candle.low - previousClose)
      )
    );
  }

  let initialSum = 0;

  for (let i = 1; i <= period; i++) {
    initialSum += trueRanges[i];
  }

  let atr = initialSum / period;
  result[period] = atr;

  for (let i = period + 1; i < candles.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
    result[i] = atr;
  }

  return result;
}

export function parseCandles(values: unknown[]): Candle[] {
  const candles: Candle[] = [];

  for (const item of values) {
    if (!item || typeof item !== "object") continue;

    const row = item as Record<string, unknown>;

    const datetime = String(row.datetime ?? row.date ?? "");
    const open = Number(row.open);
    const high = Number(row.high);
    const low = Number(row.low);
    const close = Number(row.close);

    if (
      !datetime ||
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close) ||
      open <= 0 ||
      high <= 0 ||
      low <= 0 ||
      close <= 0 ||
      high < low
    ) {
      continue;
    }

    const volumeNumber = Number(row.volume);

    candles.push({
      datetime,
      open,
      high,
      low,
      close,
      ...(Number.isFinite(volumeNumber) && volumeNumber >= 0
        ? { volume: volumeNumber }
        : {}),
    });
  }

  // Twelve Data zakonisht i kthen qirinjte nga me i riu te me i vjetri.
  // Strategjia ka nevoje per renditje kronologjike.
  candles.sort(
    (a, b) =>
      new Date(a.datetime).getTime() -
      new Date(b.datetime).getTime()
  );

  return candles;
}

export function analyzeCandles(candles: Candle[]): StrategyResult {
  const validCandles = [...candles].sort(
    (a, b) =>
      new Date(a.datetime).getTime() -
      new Date(b.datetime).getTime()
  );

  const closes = validCandles.map((candle) => candle.close);
  const last = validCandles[validCandles.length - 1];

  if (!last || closes.length < 220) {
    return {
      signal: "WAIT",
      action: "WAIT",
      price: last?.close ?? 0,
      confidence: 0,
      stopLoss: null,
      takeProfit: null,
      riskReward: 0,
      rsi: null,
      ema9: null,
      ema21: null,
      ema200: null,
      atr: null,
      reason: `Nevojiten te pakten 220 qirinj. Aktualisht: ${closes.length}.`,
      timestamp: last?.datetime ?? new Date().toISOString(),
    };
  }

  const ema9Series = calculateEMA(closes, 9);
  const ema21Series = calculateEMA(closes, 21);
  const ema200Series = calculateEMA(closes, 200);
  const rsiSeries = calculateRSISeries(closes, 14);
  const atrSeries = calculateATR(validCandles, 14);

  const index = closes.length - 1;

  const ema9 = ema9Series[index];
  const ema21 = ema21Series[index];
  const ema200 = ema200Series[index];
  const rsi = rsiSeries[index];
  const atr = atrSeries[index];

  if (
    ema9 === null ||
    ema21 === null ||
    ema200 === null ||
    rsi === null ||
    atr === null
  ) {
    return {
      signal: "WAIT",
      action: "WAIT",
      price: last.close,
      confidence: 0,
      stopLoss: null,
      takeProfit: null,
      riskReward: 0,
      rsi,
      ema9,
      ema21,
      ema200,
      atr,
      reason: "Nuk u arrit te llogariten te gjithe treguesit.",
      timestamp: last.datetime,
    };
  }

  let buyScore = 0;
  let sellScore = 0;
  const reasons: string[] = [];

  if (ema9 > ema21) {
    buyScore += 30;
    reasons.push("EMA 9 mbi EMA 21");
  } else if (ema9 < ema21) {
    sellScore += 30;
    reasons.push("EMA 9 nen EMA 21");
  }

  if (last.close > ema200) {
    buyScore += 30;
    reasons.push("Cmimi mbi EMA 200");
  } else if (last.close < ema200) {
    sellScore += 30;
    reasons.push("Cmimi nen EMA 200");
  }

  if (rsi >= 50 && rsi <= 68) {
    buyScore += 20;
    reasons.push("RSI favorizon bleresit");
  } else if (rsi >= 32 && rsi < 50) {
    sellScore += 20;
    reasons.push("RSI favorizon shitesit");
  }

  if (last.close > last.open) {
    buyScore += 20;
    reasons.push("Qiri i fundit bullish");
  } else if (last.close < last.open) {
    sellScore += 20;
    reasons.push("Qiri i fundit bearish");
  }

  let signal: "BUY" | "SELL" | "WAIT" = "WAIT";
  let confidence = Math.max(buyScore, sellScore);

  if (buyScore >= 75 && buyScore > sellScore) {
    signal = "BUY";
    confidence = buyScore;
  } else if (sellScore >= 75 && sellScore > buyScore) {
    signal = "SELL";
    confidence = sellScore;
  }

  let stopLoss: number | null = null;
  let takeProfit: number | null = null;
  const riskReward = 2;

  if (signal === "BUY") {
    stopLoss = last.close - atr * 1.5;
    takeProfit = last.close + atr * 3;
  } else if (signal === "SELL") {
    stopLoss = last.close + atr * 1.5;
    takeProfit = last.close - atr * 3;
  }

  return {
    signal,
    action: signal,
    price: last.close,
    confidence,
    stopLoss,
    takeProfit,
    riskReward,
    rsi,
    ema9,
    ema21,
    ema200,
    atr,
    reason:
      signal === "WAIT"
        ? `Sinjali nuk i ploteson kushtet. BUY: ${buyScore}/100, SELL: ${sellScore}/100.`
        : reasons.join(" | "),
    timestamp: last.datetime,
  };
}
