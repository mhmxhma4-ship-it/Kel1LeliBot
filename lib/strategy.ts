
import { NextResponse } from "next/server";
import {
  analyzeCandles,
  parseCandles,
} from "@/lib/strategy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Mungon TWELVE_DATA_API_KEY ne variablat e mjedisit." },
      { status: 503 }
    );
  }

  try {
    const url = new URL(
      "https://api.twelvedata.com/time_series"
    );

    url.searchParams.set("symbol", "XAU/USD");
    url.searchParams.set("interval", "5min");
    url.searchParams.set("outputsize", "500");
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url.toString(), {
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok || data.status === "error" || data.code) {
      return NextResponse.json(
        {
          error:
            data.message ||
            data.message ||
            "Nuk u moren te dhenat nga Twelve Data.",
        },
        { status: 502 }
      );
    }

    if (!Array.isArray(data.values)) {
      return NextResponse.json(
        {
          error:
            data.message ||
            "Twelve Data nuk ktheu qirinj. Kontrollo simbolin, API key dhe limitin e kerkesave.",
        },
        { status: 502 }
      );
    }

    const candles = parseCandles(data.values);

    if (candles.length < 220) {
      return NextResponse.json(
        {
          error: `U moren vetem ${candles.length} qirinj te vlefshem. Nevojiten te pakten 220 per EMA 200 dhe analize te besueshme.`,
          candlesReceived: candles.length,
        },
        { status: 422 }
      );
    }

    const result = analyzeCandles(candles);

    return NextResponse.json(
      {
        symbol: "XAU/USD",
        ...result,
        candlesReceived: candles.length,
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
            : "Gabim i panjohur gjate llogaritjes se sinjalit.",
      },
      { status: 500 }
    );
  }
}
