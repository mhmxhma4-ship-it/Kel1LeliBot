import { NextResponse } from "next/server";
import { analyzeCandles, parseCandles } from "@/lib/strategy";
export const dynamic = "force-dynamic";
export const revalidate = 0;
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
      (a, b) => Date.parse(a.datetime) - Date.parse(b.datetime)
    );
    const result = analyzeCandles(orderedCandles);
    return NextResponse.json(
      {
        symbol: "XAU/USD",
        ...result,
        price: roundToTwo(result.price),
        stopLoss: roundToTwo(result.stopLoss),
        takeProfit1: roundToTwo(result.takeProfit1),
        takeProfit2: roundToTwo(result.takeProfit2),
        takeProfit: roundToTwo(result.takeProfit),
        ema9: roundToTwo(result.ema9),
        ema21: roundToTwo(result.ema21),
        ema200: roundToTwo(result.ema200),
        rsi: roundToTwo(result.rsi),
        atr: roundToTwo(result.atr),
        candlesReceived: orderedCandles.length,
        interval: "5min",
        updatedAt: new Date().toISOString(),
        latestCandleAt:
          orderedCandles[orderedCandles.length - 1].datetime,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gabim gjate marrjes se te dhenave nga Twelve Data.",
      },
      { status: 500 }
    );
  }
}
