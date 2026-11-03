
import {
  Candle,
  TradeSignal,
  StrategyResult,
  analyzeCandles,
} from "./strategy";

export type Timeframe = "M5" | "M15" | "H1" | "H4";

export type TimeframeInput = {
  M5: Candle[];
  M15: Candle[];
  H1: Candle[];
  H4: Candle[];
};

export type TimeframeResult = {
  timeframe: Timeframe;
  signal: TradeSignal;
  price: number | null;
  confidence: number;
  ema9: number | null;
  ema21: number | null;
  ema200: number | null;
  rsi: number | null;
  reason: string;
  timestamp: string | null;
};

export type MultiTimeframeResult = {
  signal: TradeSignal;
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  alignment: number;
  confidence: number;
  timeframes: Record<Timeframe, TimeframeResult>;
  entry: TimeframeResult;
  confirmations: string[];
  warnings: string[];
  reason: string;
  timestamp: string;
};

function emptyResult(
  timeframe: Timeframe,
  reason: string
): TimeframeResult {
  return {
    timeframe,
    signal: "WAIT",
    price: null,
    confidence: 0,
    ema9: null,
    ema21: null,
    ema200: null,
    rsi: null,
    reason,
    timestamp: null,
  };
}

function analyzeTimeframe(
  timeframe: Timeframe,
  candles: Candle[]
): TimeframeResult {
  try {
    if (!Array.isArray(candles) || candles.length < 220) {
      return emptyResult(
        timeframe,
        `Nevojiten 220 qirinj. Disponibel: ${
          Array.isArray(candles) ? candles.length : 0
        }.`
      );
    }

    const analysis: StrategyResult = analyzeCandles(candles);

    return {
      timeframe,
      signal: analysis.signal,
      price: analysis.price,
      confidence: analysis.confidence,
      ema9: analysis.ema9,
      ema21: analysis.ema21,
      ema200: analysis.ema200,
      rsi: analysis.rsi,
      reason: analysis.reason,
      timestamp: analysis.timestamp,
    };
  } catch (error) {
    return emptyResult(
      timeframe,
      error instanceof Error
        ? error.message
        : "Gabim gjate analizes."
    );
  }
}

function getTrend(
  results: Record<Timeframe, TimeframeResult>
): "BULLISH" | "BEARISH" | "NEUTRAL" {
  const higher = [results.H4, results.H1];

  const bullish = higher.filter(
    (item) => item.signal === "BUY"
  ).length;

  const bearish = higher.filter(
    (item) => item.signal === "SELL"
  ).length;

  if (bullish === 2) return "BULLISH";
  if (bearish === 2) return "BEARISH";

  return "NEUTRAL";
}

export function analyzeMultiTimeframe(
  input: TimeframeInput
): MultiTimeframeResult {
  const timeframes: Record<Timeframe, TimeframeResult> = {
    M5: analyzeTimeframe("M5", input.M5),
    M15: analyzeTimeframe("M15", input.M15),
    H1: analyzeTimeframe("H1", input.H1),
    H4: analyzeTimeframe("H4", input.H4),
  };

  const warnings: string[] = [];
  const confirmations: string[] = [];

  const required = ["M5", "M15", "H1", "H4"] as const;

  for (const timeframe of required) {
    if (timeframes[timeframe].price === null) {
      warnings.push(
        `${timeframe}: ${timeframes[timeframe].reason}`
      );
    }
  }

  const entry = timeframes.M5;
  const trend = getTrend(timeframes);

  const validResults = required
    .map((timeframe) => timeframes[timeframe])
    .filter((item) => item.price !== null);

  const bullishCount = validResults.filter(
    (item) => item.signal === "BUY"
  ).length;

  const bearishCount = validResults.filter(
    (item) => item.signal === "SELL"
  ).length;

  const alignment = Math.max(
    bullishCount,
    bearishCount
  );

  let signal: TradeSignal = "WAIT";
  let confidence = 0;

  if (validResults.length === 4) {
    const bullishConfirmed =
      trend === "BULLISH" &&
      timeframes.M15.signal === "BUY" &&
      timeframes.M5.signal === "BUY";

    const bearishConfirmed =
      trend === "BEARISH" &&
      timeframes.M15.signal === "SELL" &&
      timeframes.M5.signal === "SELL";

    if (bullishConfirmed) {
      signal = "BUY";
      confirmations.push("H4 trend bullish");
      confirmations.push("H1 trend bullish");
      confirmations.push("M15 BUY confirmation");
      confirmations.push("M5 BUY entry confirmation");
    } else if (bearishConfirmed) {
      signal = "SELL";
      confirmations.push("H4 trend bearish");
      confirmations.push("H1 trend bearish");
      confirmations.push("M15 SELL confirmation");
      confirmations.push("M5 SELL entry confirmation");
    }
  }

  if (signal !== "WAIT") {
    const matching = validResults.filter(
      (item) => item.signal === signal
    );

    confidence = Math.round(
      matching.reduce(
        (total, item) => total + item.confidence,
        0
      ) / matching.length
    );
  } else {
    warnings.push(
      "Nuk ka konfirmim te plote nga H4, H1, M15 dhe M5."
    );
  }

  const timestamps = validResults
    .map((item) => item.timestamp)
    .filter((value): value is string => value !== null)
    .sort(
      (a, b) => Date.parse(b) - Date.parse(a)
    );

  const timestamp = timestamps[0] ?? new Date().toISOString();

  return {
    signal,
    trend,
    alignment,
    confidence,
    timeframes,
    entry,
    confirmations,
    warnings,
    reason:
      signal === "WAIT"
        ? "WAIT: Timeframe-et nuk japin konfirmim te plote."
        : `${signal}: Konfirmim nga te kater timeframe-et.`,
    timestamp,
  };
}
