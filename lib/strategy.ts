
export type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type SignalName = "BUY" | "SELL" | "WAIT";

export type StrategyResult = {
  signal: SignalName;
  price: number;
  confidence: number;
  stopLoss: number | null;
  takeProfit: number | null;
  riskReward: number | null;
  rsi: number | null;
  ema9: number | null;
  ema21: number | null;
  ema200: number | null;
  atr: number | null;
  reason: string;
  timestamp: string | null;
};

const RSI_PERIOD = 14;
const ATR_PERIOD = 14;
const EMA_FAST = 9;
const EMA_SLOW = 21;
const EMA_TREND = 200;

// Parametra fillestare per XAU/USD.
// Mund te kalibrohen me backtest, jo te konsiderohen optimale.
const STOP_ATR_MULTIPLIER = 1.5;
const TAKE_PROFIT_R_MULTIPLIER = 2;

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function calculateEMA(
  values: number[],
  period: number
): Array<number | null> {
  if (period < 1 || values.length === 0) {
    return [];
  }

  const result: Array<number | null> = Array(values.length).fill(null);

  if (values.length < period) {
    return result;
  }

  const multiplier = 2 / (period + 1);

  let sum = 0;

  for (let i = 0; i < period; i++) {
    sum += values[i];
  }

  let ema = sum / period;
  result[period - 1] = ema;

  for (let i = period; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
    result[i] = ema;
  }

  return result;
}

export function calculateRSISeries(
  closes: number[],
  period = RSI_PERIOD
): Array<number | null> {
  const result: Array<number | null> = Array(closes.length).fill(null);

  if (period < 1 || closes.length <= period) {
    return result;
  }

  let averageGain = 0;
  let averageLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];

    if (change > 0) {
      averageGain += change;
    } else {
      averageLoss += Math.abs(change);
    }
  }

  averageGain /= period;
  averageLoss /= period;

  result[period] =
    averageLoss === 0
      ? 100
      : 100 - 100 / (1 + averageGain / averageLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    averageGain =
      (averageGain * (period - 1) + gain) / period;

    averageLoss =
      (averageLoss * (period - 1) + loss) / period;

    result[i] =
      averageLoss === 0
        ? 100
        : 100 - 100 / (1 + averageGain / averageLoss);
  }

  return result;
}

export function calculateATR(
  candles: Candle[],
  period = ATR_PERIOD
): Array<number | null> {
  const result: Array<number | null> = Array(candles.length).fill(null);

  if (candles.length <= period || period < 1) {
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

  let atr = 0;

  for (let i = 1; i <= period; i++) {
    atr += trueRanges[i];
  }

  atr /= period;
  result[period] = atr;

  for (let i = period + 1; i < candles.length; i++) {
    atr =
      (atr * (period - 1) + trueRanges[i]) / period;

    result[i] = atr;
  }

  return result;
}

export function parseCandles(values: unknown[]): Candle[] {
  const candles: Candle[] = [];

  for (const item of values) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const row = item as Record<string, unknown>;

    const datetime =
      typeof row.datetime === "string"
        ? row.datetime
        : typeof row.timestamp === "string"
          ? row.timestamp
          : "";

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

    const volume = Number(row.volume);

    candles.push({
      datetime,
      open,
      high,
      low,
      close,
      ...(Number.isFinite(volume) && volume >= 0
        ? { volume }
        : {}),
    });
  }

  // Te dhenat renditen nga qiriri me i vjeter te me i riu.
  const unique = new Map<string, Candle>();

  for (const candle of candles) {
    unique.set(candle.datetime, candle);
  }

  return Array.from(unique.values()).sort(
    (a, b) =>
      new Date(a.datetime).getTime() -
      new Date(b.datetime).getTime()
  );
}

export function analyzeCandles(
  inputCandles: Candle[]
): StrategyResult {
  const candles = inputCandles.filter(
    (candle) =>
      isValidNumber(candle.open) &&
      isValidNumber(candle.high) &&
      isValidNumber(candle.low) &&
      isValidNumber(candle.close) &&
      candle.close > 0 &&
      candle.high >= candle.low
  );

  const lastCandle = candles[candles.length - 1];
  const price = lastCandle?.close ?? 0;

  const emptyResult: StrategyResult = {
    signal: "WAIT",
    price,
    confidence: 0,
    stopLoss: null,
    takeProfit: null,
    riskReward: null,
    rsi: null,
    ema9: null,
    ema21: null,
    ema200: null,
    atr: null,
    reason: "Nuk ka mjaftueshem informacion per analize.",
    timestamp: lastCandle?.datetime ?? null,
  };

  // EMA 200 kerkon te pakten 200 qirinj.
  if (candles.length < 220) {
    return {
      ...emptyResult,
      reason: `Nevojiten te pakten 220 qirinj; aktualisht ka ${candles.length}.`,
    };
  }

  const closes = candles.map((candle) => candle.close);

  const ema9Series = calculateEMA(closes, EMA_FAST);
  const ema21Series = calculateEMA(closes, EMA_SLOW);
  const ema200Series = calculateEMA(closes, EMA_TREND);
  const rsiSeries = calculateRSISeries(closes);
  const atrSeries = calculateATR(candles);

  const lastIndex = candles.length - 1;

  const ema9 = ema9Series[lastIndex];
  const ema21 = ema21Series[lastIndex];
  const ema200 = ema200Series[lastIndex];
  const rsi = rsiSeries[lastIndex];
  const atr = atrSeries[lastIndex];

  if (
    ema9 === null ||
    ema21 === null ||
    ema200 === null ||
    rsi === null ||
    atr === null ||
    !isValidNumber(ema9) ||
    !isValidNumber(ema21) ||
    !isValidNumber(ema200) ||
    !isValidNumber(rsi) ||
    !isValidNumber(atr) ||
    atr <= 0
  ) {
    return {
      ...emptyResult,
      reason: "Indikatoret nuk jane gati.",
    };
  }

  let buyScore = 0;
  let sellScore = 0;

  // Drejtimi i trendit.
  if (ema9 > ema21) buyScore += 25;
  if (ema9 < ema21) sellScore += 25;

  // Filtri i trendit afatgjate.
  if (price > ema200) buyScore += 25;
  if (price < ema200) sellScore += 25;

  // RSI: shmang hyrjet kur tregu duket teper i blere/shitur.
  if (rsi >= 52 && rsi <= 68) buyScore += 25;
  if (rsi >= 32 && rsi <= 48) sellScore += 25;

  // Konfirmimi nga qiriri i fundit.
  const previousCandle = candles[lastIndex - 1];

  if (previousCandle && price > previousCandle.close) {
    buyScore += 25;
  }

  if (previousCandle && price < previousCandle.close) {
    sellScore += 25;
  }

  let signal: SignalName = "WAIT";
  let confidence = 0;
  let reason = "Kushtet per BUY ose SELL nuk jane plotesuar.";

  if (
    buyScore >= 75 &&
    buyScore > sellScore
  ) {
    signal = "BUY";
    confidence = buyScore;
    reason =
      "BUY: EMA 9/21, trendi EMA 200, RSI dhe qiriri mbeshtesin drejtimin rrites.";
  } else if (
    sellScore >= 75 &&
    sellScore > buyScore
  ) {
    signal = "SELL";
    confidence = sellScore;
    reason =
      "SELL: EMA 9/21, trendi EMA 200, RSI dhe qiriri mbeshtesin drejtimin zbrites.";
  } else {
    confidence = Math.max(buyScore, sellScore);
    reason =
      "WAIT: sinjali nuk ka mjaftueshem konfirmime nga strategjia.";
  }

  let stopLoss: number | null = null;
  let takeProfit: number | null = null;
  let riskReward: number | null = null;

  if (signal === "BUY") {
    stopLoss = price - atr * STOP_ATR_MULTIPLIER;

    const risk = price - stopLoss;

    takeProfit = price + risk * TAKE_PROFIT_R_MULTIPLIER;
    riskReward = risk > 0 ? (takeProfit - price) / risk : null;
  } else if (signal === "SELL") {
    stopLoss = price + atr * STOP_ATR_MULTIPLIER;

    const risk = stopLoss - price;

    takeProfit = price - risk * TAKE_PROFIT_R_MULTIPLIER;
    riskReward = risk > 0 ? (price - takeProfit) / risk : null;
  }

  return {
    signal,
    price,
    confidence,
    stopLoss,
    takeProfit,
    riskReward,
    rsi,
    ema9,
    ema21,
    ema200,
    atr,
    reason,
    timestamp: lastCandle.datetime,
  };
}
