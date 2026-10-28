
import { NextResponse } from "next/server";
import { analyzeCandles, parseCandles } from "@/lib/strategy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Mungon TWELVE_DATA_API_KEY" },
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

    if (!response.ok || data.status === "error") {
      return NextResponse.json(
        { error: data.message || "Gabim nga Twelve Data" },
        { status: 502 }
      );
    }

    const candles = parseCandles(data.values);

    if (candles.length < 250) {
      return NextResponse.json(
        { error: "Nuk ka mjaft qirinj per EMA 200" },
        { status: 502 }
      );
    }

    const analysis = analyzeCandles(candles);
    const i = candles.length - 1;

    const signal = analysis.signalAt(i);
    let reason = "Treguesit nuk japin nje sinjal te qarte.";

    if (signal === "BUY") {
      reason =
        "Cmimi mbi EMA 200, EMA 9 mbi EMA 21 dhe RSI pozitiv.";
    } else if (signal === "SELL") {
      reason =
        "Cmimi nen EMA 200, EMA 9 nen EMA 21 dhe RSI negativ.";
    } else if (analysis.prices[i] > analysis.ema200[i]) {
      reason =
        "Cmimi eshte mbi EMA 200, por kushtet e tjera per BUY nuk jane plotesuar.";
    } else if (analysis.prices[i] < analysis.ema200[i]) {
      reason =
        "Cmimi eshte nen EMA 200, por kushtet e tjera per SELL nuk jane plotesuar.";
    }

    return NextResponse.json(
      {
        symbol: "XAU/USD",
        price: analysis.prices[i].toFixed(2),
        status: "Analiza teknike u krye",
        signal,
        reason,
        indicators: {
          ema9: Number(analysis.ema9[i].toFixed(3)),
          ema21: Number(analysis.ema21[i].toFixed(3)),
          ema200: Number(analysis.ema200[i].toFixed(3)),
          rsi14: Number(analysis.rsi[i].toFixed(2)),
        },
        candleTime: candles[i].datetime,
        strategy: "EMA 9/21/200 + RSI 14",
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gabim gjate analizes se tregut",
      },
      { status: 502 }
    );
  }
}
