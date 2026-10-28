
export type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type TradeSignal = "BUY" | "SELL" | "WAIT";

export function calculateEMA(
  prices: number[],
  period: number
): number[] {
  const multiplier = 2 / (period + 1);
  const result: number[] = [];
  let ema = prices[0];

  result.push(ema);

  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * multiplier + ema * (1 - multiplier);
    result.push(ema);
  }

  return result;
}

export function calculateRSISeries(
  prices: number[],
  period = 14
): number[] {
  const result = Array(prices.length).fill(NaN);

  if (prices.length <= period) return result;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    gains += Math.max(change, 0);
    losses += Math.max(-change, 0);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  result[period] =
    avgLoss === 0
      ? avgGain === 0
        ? 50
        : 100
      : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];

    avgGain =
      (avgGain * (period - 1) + Math.max(change, 0)) /
      period;

    avgLoss =
      (avgLoss * (period - 1) + Math.max(-change, 0)) /
      period;

    result[i] =
      avgLoss === 0
        ? avgGain === 0
          ? 50
          : 100
        : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return result;
}

export function analyzeCandles(candles: Candle[]) {
  const prices = candles.map((c) => c.close);

  const ema9 = calculateEMA(prices, 9);
  const ema21 = calculateEMA(prices, 21);
  const ema200 = calculateEMA(prices, 200);
  const rsi = calculateRSISeries(prices, 14);

  function signalAt(i: number): TradeSignal {
    // 200 qirinj per ngrohjen fillestare te EMA 200
    if (i < 200 || !Number.isFinite(rsi[i])) {
      return "WAIT";
    }

    const price = prices[i];

    if (
      price > ema200[i] &&
      ema9[i] > ema21[i] &&
      rsi[i] >= 50 &&
      rsi[i] < 70
    ) {
      return "BUY";
    }

    if (
      price < ema200[i] &&
      ema9[i] < ema21[i] &&
      rsi[i] > 30 &&
      rsi[i] <= 50
    ) {
      return "SELL";
    }

    return "WAIT";
  }

  return { prices, ema9, ema21, ema200, rsi, signalAt };
}

export function parseCandles(values: unknown): Candle[] {
  if (!Array.isArray(values)) {
    throw new Error("Nuk u gjet historiku i cmimeve.");
  }

  const candles = values.map((item: any) => ({
    datetime: String(item.datetime),
    open: Number(item.open),
    high: Number(item.high),
    low: Number(item.low),
    close: Number(item.close),
  }));

  if (
    candles.some(
      (c) =>
        !c.datetime ||
        !Number.isFinite(c.open) ||
        !Number.isFinite(c.high) ||
        !Number.isFinite(c.low) ||
        !Number.isFinite(c.close) ||
        c.open <= 0 ||
        c.close <= 0
    )
  ) {
    throw new Error("Te dhena te pavlefshme nga Twelve Data.");
  }

  // Twelve Data zakonisht i kthen qirinjt nga me i riu te me i vjetri.
  candles.sort((a, b) => a.datetime.localeCompare(b.datetime));

  return candles;
}
