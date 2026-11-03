import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import webpush from "web-push";

import { analyzeCandles, parseCandles } from "@/lib/strategy";
import {
  analyzeMultiTimeframe,
  Timeframe,
} from "@/lib/multi-timeframe";
import { analyzeSMC, SMCCandle } from "@/lib/smc";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const COOKIE_NAME = "keli_access";

const TIMEFRAMES: Timeframe[] = ["M5", "M15", "H1", "H4"];

const INTERVALS: Record<Timeframe, string> = {
  M5: "5min",
  M15: "15min",
  H1: "1h",
  H4: "4h",
};

function roundToTwo(
  value: number | null | undefined
): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Number(value.toFixed(2));
}

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

    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      return false;
    }

    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    if (session.access !== true) return false;

    if (
      session.expiresAt &&
      Date.parse(session.expiresAt) <= Date.now()
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

async function fetchTimeframe(
  timeframe: Timeframe,
  apiKey: string
) {
  const url = new URL(
    "https://api.twelvedata.com/time_series"
  );

  url.searchParams.set("symbol", "XAU/USD");
  url.searchParams.set("interval", INTERVALS[timeframe]);
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
    throw new Error(
      `${timeframe}: ${
        data.message ||
        "Nuk u moren te dhenat nga Twelve Data."
      }`
    );
  }

  const candles = parseCandles(data.values);

  if (candles.length < 220) {
    throw new Error(
      `${timeframe}: U moren ${candles.length} qirinj. Nevojiten 220.`
    );
  }

  return candles.sort(
    (a, b) =>
      Date.parse(a.datetime) - Date.parse(b.datetime)
  );
}

function toSMCCandles(
  candles: Awaited<ReturnType<typeof fetchTimeframe>>
): SMCCandle[] {
  return candles.map((candle) => ({
    time: Date.parse(candle.datetime),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  }));
}

/* ---------------------------------
   MADARABOT PUSH NOTIFICATIONS
---------------------------------- */

function configurePush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

async function claimNewSignal(
  symbol: string,
  signal: string,
  latestCandleAt: string
): Promise<boolean> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("MadaraBot Push: Mungojne variablat Supabase.");
    return false;
  }

  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/madarabot_claim_new_signal`,
    {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_symbol: symbol,
        p_signal: signal,
        p_latest_candle_at: latestCandleAt,
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    console.error(
      "MadaraBot Push claim error:",
      await response.text()
    );
    return false;
  }

  return response.json();
}

async function sendSignalPush(
  signal: string,
  price: number | null,
  confidence: number | null,
  latestCandleAt: string
) {
  if (signal !== "BUY" && signal !== "SELL") return;

  if (!configurePush()) {
    console.warn("MadaraBot Push: VAPID keys mungojne.");
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("MadaraBot Push: Supabase nuk eshte konfiguruar.");
    return;
  }

  try {
    const isNewSignal = await claimNewSignal(
      "XAU/USD",
      signal,
      latestCandleAt
    );

    if (!isNewSignal) return;

    const subscriptionsResponse = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/rest/v1/push_subscriptions?select=subscription,endpoint`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        cache: "no-store",
      }
    );

    if (!subscriptionsResponse.ok) {
      console.error(
        "MadaraBot Push subscriptions error:",
        await subscriptionsResponse.text()
      );
      return;
    }

    const subscriptions = await subscriptionsResponse.json();

    const title =
      signal === "BUY"
        ? "🟢 MadaraBot – BUY SIGNAL"
        : "🔴 MadaraBot – SELL SIGNAL";

    const payload = JSON.stringify({
      title,
      body: [
        "XAU/USD",
        price != null ? `Cmimi: $${price}` : null,
        confidence != null ? `Confidence: ${confidence}%` : null,
        "Hap MadaraBot per detaje.",
      ]
        .filter(Boolean)
        .join("\n"),
      tag: `madarabot-${signal}-${latestCandleAt}`,
      url: "/",
    });

    await Promise.allSettled(
      subscriptions.map(
        async (item: {
          endpoint: string;
          subscription: webpush.PushSubscription;
        }) => {
          try {
            await webpush.sendNotification(
              item.subscription,
              payload
            );
          } catch (error: unknown) {
            const statusCode =
              typeof error === "object" &&
              error !== null &&
              "statusCode" in error
                ? Number(error.statusCode)
                : 0;

            if (statusCode === 404 || statusCode === 410) {
              await fetch(
                `${supabaseUrl.replace(/\/$/, "")}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(item.endpoint)}`,
                {
                  method: "DELETE",
                  headers: {
                    apikey: serviceKey,
                    Authorization: `Bearer ${serviceKey}`,
                  },
                  cache: "no-store",
                }
              );
            } else {
              console.error("MadaraBot Push send error:", error);
            }
          }
        }
      )
    );
  } catch (error) {
    console.error("MadaraBot Push error:", error);
  }
}

/* ---------------------------------
   SIGNAL API
---------------------------------- */

export async function GET(request: NextRequest) {
  if (!hasValidSession(request)) {
    return NextResponse.json(
      {
        error:
          "Duhet nje kod aktiv per te pare sinjalet.",
      },
      { status: 401 }
    );
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Mungon TWELVE_DATA_API_KEY ne variablat e mjedisit.",
      },
      { status: 503 }
    );
  }

  try {
    const results = await Promise.allSettled(
      TIMEFRAMES.map((timeframe) =>
        fetchTimeframe(timeframe, apiKey)
      )
    );

    const candlesByTimeframe = {
      M5: [],
      M15: [],
      H1: [],
      H4: [],
    } as Record<
      Timeframe,
      Awaited<ReturnType<typeof fetchTimeframe>>
    >;

    const fetchErrors: string[] = [];

    results.forEach((result, index) => {
      const timeframe = TIMEFRAMES[index];

      if (result.status === "fulfilled") {
        candlesByTimeframe[timeframe] = result.value;
      } else {
        fetchErrors.push(
          result.reason instanceof Error
            ? result.reason.message
            : `${timeframe}: Gabim gjate marrjes se te dhenave.`
        );
      }
    });

    const multiTimeframe = analyzeMultiTimeframe(
      candlesByTimeframe
    );

    const m5Candles = candlesByTimeframe.M5;

    if (m5Candles.length < 220) {
      return NextResponse.json(
        {
          error:
            fetchErrors.join(" | ") ||
            "Nuk ka mjaftueshem te dhena per M5.",
          multiTimeframe,
        },
        { status: 502 }
      );
    }

    const baseResult = analyzeCandles(m5Candles);

    const smcCandles = toSMCCandles(m5Candles);
    const smc = analyzeSMC(smcCandles);

    const warnings = [
      ...multiTimeframe.warnings,
      ...fetchErrors,
    ];

    const latestCandleAt =
      m5Candles[m5Candles.length - 1].datetime;

    const responseData = {
      symbol: "XAU/USD",

      ...baseResult,

      signal: multiTimeframe.signal,
      confidence: multiTimeframe.confidence,
      reason: multiTimeframe.reason,

      price: roundToTwo(baseResult.price),
      stopLoss: roundToTwo(baseResult.stopLoss),
      takeProfit1: roundToTwo(baseResult.takeProfit1),
      takeProfit2: roundToTwo(baseResult.takeProfit2),
      takeProfit: roundToTwo(baseResult.takeProfit),

      ema9: roundToTwo(baseResult.ema9),
      ema21: roundToTwo(baseResult.ema21),
      ema200: roundToTwo(baseResult.ema200),
      rsi: roundToTwo(baseResult.rsi),
      atr: roundToTwo(baseResult.atr),

      trend: multiTimeframe.trend,
      alignment: multiTimeframe.alignment,
      confirmations: multiTimeframe.confirmations,
      warnings,

      timeframes: multiTimeframe.timeframes,
      entry: multiTimeframe.entry,

      smc: {
        ...smc,
        events: smc.events.slice(-20),
        orderBlocks: smc.orderBlocks.map((zone) => ({
          ...zone,
          high: roundToTwo(zone.high),
          low: roundToTwo(zone.low),
        })),
        fairValueGaps: smc.fairValueGaps.map((zone) => ({
          ...zone,
          high: roundToTwo(zone.high),
          low: roundToTwo(zone.low),
        })),
      },

      candlesReceived: {
        M5: candlesByTimeframe.M5.length,
        M15: candlesByTimeframe.M15.length,
        H1: candlesByTimeframe.H1.length,
        H4: candlesByTimeframe.H4.length,
      },

      interval: "multi-timeframe",
      updatedAt: new Date().toISOString(),
      latestCandleAt,
    };

    // Dergo njoftim vetem kur sinjali BUY/SELL eshte i ri.
    // Gabimet e Push nuk duhet te bllokojne API e sinjaleve.
    await sendSignalPush(
      String(multiTimeframe.signal),
      roundToTwo(baseResult.price),
      roundToTwo(multiTimeframe.confidence),
      latestCandleAt
    );

    return NextResponse.json(responseData, {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gabim gjate analizes se tregut.",
      },
      { status: 500 }
    );
  }
}
