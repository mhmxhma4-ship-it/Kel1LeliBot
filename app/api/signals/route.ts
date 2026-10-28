
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function calculateEMA(prices: number[], period: number): number[] {
  const multiplier = 2 / (period + 1);
  const result: number[] = [];

  let ema = prices[0];
  result.push(ema);

  for (let i = 1; i < prices.length; i++) {
    ema =
      prices[i] * multiplier +
      ema * (1 - multiplier);

    result.push(ema);
  }

  return result;
}

function calculateRSI(
  prices: number[],
  period = 14
): number {
  if (prices.length <= period) {
    return 50;
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];

    if (change > 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];

    avgGain =
      (avgGain * (period - 1) +
        Math.max(change, 0)) /
      period;

    avgLoss =
      (avgLoss * (period - 1) +
        Math.max(-change, 0)) /
      period;
  }

  if (avgLoss === 0) {
    return avgGain === 0 ? 50 : 100;
  }

  const rs = avgGain / avgLoss;

  return 100 - 100 / (1 + rs);
}

export async function GET() {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Mungon TWELVE_DATA_API_KEY ne Vercel" },
      { status: 503 }
    );
  }

  try {
    const url = new URL(
      "https://api.twelvedata.com/time_series"
    );

    url.searchParams.set("symbol", "XAU/USD");
    url.searchParams.set("interval", "5min");
    url.searchParams.set("outputsize", "100");
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url.toString(), {
      cache: "no-store",
    });

    const data = await response.json();

    if (
      !response.ok ||
      data.status === "error" ||
      !Array.isArray(data.values) ||
      data.values.length < 30
    ) {
      return NextResponse.json(
        {
          error:
            data.message ||
            "Nuk u mor historiku i mjaftueshem i cmimeve",
        },
        { status: 502 }
      );
    }

    const candles = data.values as {
      datetime: string;
      close: string;
    }[];

    const prices = candles
      .map((candle) => Number(candle.close))
      .reverse();

    if (
      prices.some(
        (price) =>
          !Number.isFinite(price) || price <= 0
      )
    ) {
      return NextResponse.json(
        { error: "Cmimet e marra nuk jane te vlefshme" },
        { status: 502 }
      );
    }

    const ema9 = calculateEMA(prices, 9);
    const ema21 = calculateEMA(prices, 21);
    const rsi = calculateRSI(prices, 14);

    const fast = ema9[ema9.length - 1];
    const slow = ema21[ema21.length - 1];
    const currentPrice = prices[prices.length - 1];

    let signal: "BUY" | "SELL" | "WAIT" = "WAIT";
    let reason =
      "Tregu nuk jep nje sinjal te qarte. Prit konfirmim.";

    if (fast > slow && rsi >= 50 && rsi < 70) {
      signal = "BUY";
      reason =
        "EMA 9 eshte mbi EMA 21 dhe RSI tregon moment pozitiv.";
    } else if (
      fast < slow &&
      rsi <= 50 &&
      rsi > 30
    ) {
      signal = "SELL";
      reason =
        "EMA 9 eshte nen EMA 21 dhe RSI tregon moment negativ.";
    } else if (rsi >= 70) {
      reason =
        "RSI eshte 70 ose me lart. Prit konfirmim para nje sinjali te ri.";
    } else if (rsi <= 30) {
      reason =
        "RSI eshte 30 ose me poshte. Prit konfirmim para nje sinjali te ri.";
    }

    return NextResponse.json(
      {
        symbol: "XAU/USD",
        price: currentPrice.toFixed(2),
        status: "Analiza teknike u krye",
        signal,
        reason,
        indicators: {
          ema9: Number(fast.toFixed(3)),
          ema21: Number(slow.toFixed(3)),
          rsi14: Number(rsi.toFixed(2)),
        },
        candleTime: candles[0].datetime,
        strategy: "EMA 9/21 + RSI 14",
        disclaimer:
          "Sinjal informues, jo garanci fitimi.",
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Gabim gjate lidhjes me Twelve Data. Provo perseri.",
      },
      { status: 502 }
    );
  }
}
