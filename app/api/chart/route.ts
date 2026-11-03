
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const COOKIE_NAME = "keli_access";

function hasValidSession(request: NextRequest): boolean {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const secret = process.env.ACCESS_ADMIN_SECRET;

  if (!token || !secret) return false;

  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return false;

    const expected = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);

    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return false;
    }

    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    return (
      session.access === true &&
      (!session.expiresAt ||
        Date.parse(session.expiresAt) > Date.now())
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!hasValidSession(request)) {
    return NextResponse.json(
      { error: "Duhet nje kod aktiv." },
      { status: 401 }
    );
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Mungon TWELVE_DATA_API_KEY." },
      { status: 503 }
    );
  }

  const requestedInterval =
    request.nextUrl.searchParams.get("interval") || "5min";

  const allowedIntervals = [
    "1min",
    "5min",
    "15min",
    "1h",
    "4h",
  ];

  const interval = allowedIntervals.includes(requestedInterval)
    ? requestedInterval
    : "5min";

  try {
    const url = new URL(
      "https://api.twelvedata.com/time_series"
    );

    url.searchParams.set("symbol", "XAU/USD");
    url.searchParams.set("interval", interval);
    url.searchParams.set("outputsize", "100");
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json();

    if (
      !response.ok ||
      data.status === "error" ||
      !Array.isArray(data.values)
    ) {
      return NextResponse.json(
        {
          error:
            data.message ||
            "Nuk u moren dot te dhenat e grafikut.",
        },
        { status: 502 }
      );
    }

    const candles = data.values
      .map((item: Record<string, unknown>) => ({
        time: String(item.datetime || ""),
        open: Number(item.open),
        high: Number(item.high),
        low: Number(item.low),
        close: Number(item.close),
        volume:
          item.volume == null ? null : Number(item.volume),
      }))
      .filter(
        (candle: {
          time: string;
          open: number;
          high: number;
          low: number;
          close: number;
        }) =>
          candle.time &&
          Number.isFinite(candle.open) &&
          Number.isFinite(candle.high) &&
          Number.isFinite(candle.low) &&
          Number.isFinite(candle.close) &&
          candle.open > 0 &&
          candle.high > 0 &&
          candle.low > 0 &&
          candle.close > 0
      )
      .reverse();

    return NextResponse.json(
      {
        symbol: "XAU/USD",
        interval,
        candles,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gabim gjate ngarkimit te grafikut.",
      },
      { status: 502 }
    );
  }
}
