
import { NextResponse } from "next/server";
import { analyzeCandles, parseCandles } from "@/lib/strategy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function calculateLatestEMA(
  values: number[],
  period: number
): number | null {
  if (values.length < period) return null;

  let ema =
    values.slice(0, period).reduce((sum, value) => sum + value, 0) /
    period;

  const multiplier = 2 / (period + 1);

  for (let i = period; i < values.length; i++) {
    ema = values[i] * multiplier + ema * (1 - multiplier);
  }

  return Number.isFinite(ema) ? ema : null;
}

function roundToTwo(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  return Number(value.toFixed(2));
}

export async function GET() {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Mungon TWELVE_DATA_API_KEY ne variablat e mjedisit." },
      { status: 503 }
    );
  }

  try {
    const url = new URL("https://api.twelvedata.com/time_series");
    url.searchParams.set("symbol", "XAU/USD");
    url.searchParams.set("interval", "5min");
    url.searchParams.set("outputsize", "500");
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url.toString(), {
      cache: "no-store",
    });

    const data = await response.json();

    if (
      !response.ok ||
      data.status === "error" ||
      data.code ||
      !Array.isArray(data.values)
    ) {
      return NextResponse.json(
        {
          error:
            data.message ||
            "Nuk u moren te dhenat nga Twelve Data. Kontrollo API key dhe limitin e kerkesave.",
        },
        { status: 502 }
      );
    }

    const candles = parseCandles(data.values);

    if (candles.length < 220) {
      return NextResponse.json(
        {
          error: `U moren vetem ${candles.length} qirinj. Nevojiten te pakten 220 per EMA 200.`,
          candlesReceived: candles.length,
        },
        { status: 422 }
      );
    }

    const orderedCandles = [...candles].sort(
      (a, b) =>
        new Date(a.datetime).getTime() -
        new Date(b.datetime).getTime()
    );

    const closes = orderedCandles
      .map((candle) => Number(candle.close))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (closes.length < 220) {
      return NextResponse.json(
        {
          error:
            "Nuk ka mjaft cmime te vlefshme per llogaritjen e EMA-ve.",
          candlesReceived: closes.length,
        },
        { status: 422 }
      );
    }

    const ema9 = calculateLatestEMA(closes, 9);
    const ema21 = calculateLatestEMA(closes, 21);
    const ema200 = calculateLatestEMA(closes, 200);

    if (ema9 === null || ema21 === null || ema200 === null) {
      return NextResponse.json(
        { error: "Llogaritja e EMA-ve deshtoi." },
        { status: 422 }
      );
    }

    const result = analyzeCandles(orderedCandles);

    return NextResponse.json(
      {
        symbol: "XAU/USD",
        ...result,
        ema9: roundToTwo(ema9),
        ema21: roundToTwo(ema21),
        ema200: roundToTwo(ema200),
        candlesReceived: closes.length,
        interval: "5min",
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gabim gjate llogaritjes se EMA-ve.",
      },
      { status: 500 }
    );
  }
}
