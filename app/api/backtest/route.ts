
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  analyzeCandles,
  calculateATR,
  parseCandles,
} from "@/lib/strategy";

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

type Position = 1 | -1 | 0;
type TradeResult = "WIN" | "LOSS" | "BREAKEVEN";
type ExitReason =
  | "STOP_LOSS"
  | "TP1_THEN_STOP_LOSS"
  | "TP1_THEN_TP2"
  | "TP1_THEN_END"
  | "TAKE_PROFIT"
  | "END";

type Trade = {
  side: "BUY" | "SELL";
  entry: number;
  exit: number;
  entryPrice: number;
  exitPrice: number;
  entryTime: string;
  exitTime: string;
  grossReturnPct: number;
  netReturnPct: number;
  netPct: number;
  netProfit: number;
  result: TradeResult;
  stopLoss: number;
  takeProfit: number;
  takeProfit1: number;
  takeProfit2: number;
  tp1Hit: boolean;
  exitReason: ExitReason;
};

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  return Number(raw);
}

function round(value: number, decimals = 2): number {
  return Number(value.toFixed(decimals));
}

export async function GET(request: NextRequest) {
  if (!hasValidSession(request)) {
    return NextResponse.json(
      { error: "Duhet nje kod aktiv per te perdorur backtest-in." },
      { status: 401 }
    );
  }

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
            "Gabim gjate marrjes se te dhenave nga Twelve Data.",
        },
        { status: 502 }
      );
    }

    const candles = parseCandles(data.values);

    if (candles.length < 220) {
      return NextResponse.json(
        {
          error:
            "Nuk ka mjaft qirinj per backtest. Nevojiten te pakten 220.",
          candlesReceived: candles.length,
        },
        { status: 422 }
      );
    }

    const costBpsPerSide = envNumber("XAU_COST_BPS", 5);
    const slippageBpsPerSide = envNumber("XAU_SLIPPAGE_BPS", 1);

    if (
      !Number.isFinite(costBpsPerSide) ||
      costBpsPerSide < 0 ||
      !Number.isFinite(slippageBpsPerSide) ||
      slippageBpsPerSide < 0
    ) {
      return NextResponse.json(
        {
          error:
            "XAU_COST_BPS dhe XAU_SLIPPAGE_BPS duhet te jene numra jo negative.",
        },
        { status: 500 }
      );
    }

    const initialCapital = 1000;
    const stopLossATRMultiplier = 1.5;
    const tp1RiskReward = 1;
    const tp2RiskReward = 2;
    const tp1CloseFraction = 0.5;

    const analysis = analyzeCandles(candles);
    const atrSeries = calculateATR(candles, 14);

    let equity = initialCapital;
    let peakEquity = initialCapital;
    let maxDrawdownPct = 0;

    let position: Position = 0;
    let entryPrice = 0;
    let entryTime = "";
    let stopLossPrice = 0;
    let takeProfit1Price = 0;
    let takeProfit2Price = 0;
    let tp1Hit = false;
    let tp1GrossPct = 0;
    let tp1Time = "";

    let wins = 0;
    let losses = 0;
    let breakeven = 0;
    let tp1Hits = 0;
    let tp2Hits = 0;

    let grossProfitMoney = 0;
    let grossLossMoney = 0;

    const trades: Trade[] = [];

    const totalCostBpsPerRoundTrip =
      2 * (costBpsPerSide + slippageBpsPerSide);

    function updateDrawdown() {
      peakEquity = Math.max(peakEquity, equity);

      const drawdown =
        peakEquity > 0
          ? ((peakEquity - equity) / peakEquity) * 100
          : 0;

      maxDrawdownPct = Math.max(maxDrawdownPct, drawdown);
    }

    function resetPosition() {
      position = 0;
      entryPrice = 0;
      entryTime = "";
      stopLossPrice = 0;
      takeProfit1Price = 0;
      takeProfit2Price = 0;
      tp1Hit = false;
      tp1GrossPct = 0;
      tp1Time = "";
    }

    function closePosition(
      rawExitPrice: number,
      exitTime: string,
      exitReason: ExitReason
    ) {
      if (position === 0) return;

      if (
        !Number.isFinite(rawExitPrice) ||
        rawExitPrice <= 0 ||
        entryPrice <= 0
      ) {
        throw new Error("Cmimi i hyrjes ose daljes nuk eshte valid.");
      }

      const remainingFraction = tp1Hit ? 1 - tp1CloseFraction : 1;

      const finalGrossPct =
        ((position * (rawExitPrice - entryPrice)) / entryPrice) * 100;

      const combinedGrossPct = tp1Hit
        ? tp1GrossPct * tp1CloseFraction +
          finalGrossPct * remainingFraction
        : finalGrossPct;

      const tradingCostPct =
        (totalCostBpsPerRoundTrip / 10000) * 100;

      const netPct = combinedGrossPct - tradingCostPct;
      const netMoney = equity * (netPct / 100);

      equity += netMoney;

      const result: TradeResult =
        netPct > 0.000001
          ? "WIN"
          : netPct < -0.000001
            ? "LOSS"
            : "BREAKEVEN";

      if (result === "WIN") {
        wins++;
        grossProfitMoney += netMoney;
      } else if (result === "LOSS") {
        losses++;
        grossLossMoney += Math.abs(netMoney);
      } else {
        breakeven++;
      }

      const adjustedExitPrice =
        rawExitPrice *
        (1 - position * (slippageBpsPerSide / 10000));

      trades.push({
        side: position === 1 ? "BUY" : "SELL",
        entry: round(entryPrice, 3),
        exit: round(adjustedExitPrice, 3),
        entryPrice: round(entryPrice, 3),
        exitPrice: round(adjustedExitPrice, 3),
        entryTime,
        exitTime,
        grossReturnPct: round(combinedGrossPct, 4),
        netReturnPct: round(netPct, 4),
        netPct: round(netPct, 4),
        netProfit: round(netMoney, 2),
        result,
        stopLoss: round(stopLossPrice, 3),
        takeProfit: round(takeProfit2Price, 3),
        takeProfit1: round(takeProfit1Price, 3),
        takeProfit2: round(takeProfit2Price, 3),
        tp1Hit,
        exitReason,
      });

      updateDrawdown();

      if (!Number.isFinite(equity) || equity <= 0) {
        throw new Error("Kapitali u be jo valid gjate backtest-it.");
      }

      resetPosition();
    }

    function openPosition(
      side: Position,
      rawEntryPrice: number,
      time: string,
      atr: number
    ) {
      if (
        side === 0 ||
        !Number.isFinite(rawEntryPrice) ||
        rawEntryPrice <= 0 ||
        !Number.isFinite(atr) ||
        atr <= 0
      ) {
        return;
      }

      entryPrice =
        rawEntryPrice *
        (1 + side * (slippageBpsPerSide / 10000));

      entryTime = time;
      position = side;

      const stopDistance = atr * stopLossATRMultiplier;
      const tp1Distance = stopDistance * tp1RiskReward;
      const tp2Distance = stopDistance * tp2RiskReward;

      if (side === 1) {
        stopLossPrice = entryPrice - stopDistance;
        takeProfit1Price = entryPrice + tp1Distance;
        takeProfit2Price = entryPrice + tp2Distance;
      } else {
        stopLossPrice = entryPrice + stopDistance;
        takeProfit1Price = entryPrice - tp1Distance;
        takeProfit2Price = entryPrice - tp2Distance;
      }

      tp1Hit = false;
      tp1GrossPct = 0;
      tp1Time = "";
    }

    for (let i = 205; i < candles.length - 1; i++) {
      const signal = analysis.signalAt(i);

      const desiredPosition: Position =
        signal === "BUY" ? 1 : signal === "SELL" ? -1 : 0;

      const executionCandle = candles[i + 1];
      const executionPrice = executionCandle.open;
      const executionTime = executionCandle.datetime;

      if (desiredPosition !== position) {
        if (position !== 0) {
          closePosition(executionPrice, executionTime, "END");
        }

        if (signal === "BUY" || signal === "SELL") {
          const atr = atrSeries[i];

          if (atr !== null && atr > 0) {
            openPosition(
              signal === "BUY" ? 1 : -1,
              executionPrice,
              executionTime,
              atr
            );
          }
        }
      }

      if (position === 0) continue;

      const gapThroughStop =
        position === 1
          ? executionCandle.open <= stopLossPrice
          : executionCandle.open >= stopLossPrice;

      if (gapThroughStop) {
        closePosition(
          executionCandle.open,
          executionTime,
          tp1Hit ? "TP1_THEN_STOP_LOSS" : "STOP_LOSS"
        );
        continue;
      }

      const gapThroughTP1 =
        !tp1Hit &&
        (position === 1
          ? executionCandle.open >= takeProfit1Price
          : executionCandle.open <= takeProfit1Price);

      const gapThroughTP2 =
        position === 1
          ? executionCandle.open >= takeProfit2Price
          : executionCandle.open <= takeProfit2Price;

      if (gapThroughTP2) {
        if (!tp1Hit) {
          tp1Hit = true;
          tp1Hits++;
          tp2Hits++;
          tp1GrossPct =
            ((position * (takeProfit1Price - entryPrice)) / entryPrice) * 100;
          closePosition(executionCandle.open, executionTime, "TP1_THEN_TP2");
        } else {
          tp2Hits++;
          closePosition(executionCandle.open, executionTime, "TP1_THEN_TP2");
        }
        continue;
      }

      if (gapThroughTP1 && !tp1Hit) {
        tp1Hit = true;
        tp1Hits++;
        tp1Time = executionTime;
        tp1GrossPct =
          ((position * (takeProfit1Price - entryPrice)) / entryPrice) * 100;
      }

      const hitStop =
        position === 1
          ? executionCandle.low <= stopLossPrice
          : executionCandle.high >= stopLossPrice;

      const hitTP1 =
        !tp1Hit &&
        (position === 1
          ? executionCandle.high >= takeProfit1Price
          : executionCandle.low <= takeProfit1Price);

      const hitTP2 =
        position === 1
          ? executionCandle.high >= takeProfit2Price
          : executionCandle.low <= takeProfit2Price;

      if (hitStop && !tp1Hit && hitTP1) {
        closePosition(executionCandle.open, executionTime, "STOP_LOSS");
        continue;
      }

      if (hitStop && hitTP2) {
        closePosition(
          stopLossPrice,
          executionTime,
          tp1Hit ? "TP1_THEN_STOP_LOSS" : "STOP_LOSS"
        );
        continue;
      }

      if (hitStop) {
        closePosition(
          stopLossPrice,
          executionTime,
          tp1Hit ? "TP1_THEN_STOP_LOSS" : "STOP_LOSS"
        );
        continue;
      }

      if (hitTP1 && !tp1Hit) {
        tp1Hit = true;
        tp1Hits++;
        tp1Time = executionTime;
        tp1GrossPct =
          ((position * (takeProfit1Price - entryPrice)) / entryPrice) * 100;
      }

      if (hitTP2) {
        if (!tp1Hit) {
          tp1Hit = true;
          tp1Hits++;
          tp1GrossPct =
            ((position * (takeProfit1Price - entryPrice)) / entryPrice) * 100;
        }

        tp2Hits++;
        closePosition(takeProfit2Price, executionTime, "TP1_THEN_TP2");
      }
    }

    const last = candles[candles.length - 1];

    if (position !== 0) {
      closePosition(
        last.close,
        last.datetime,
        tp1Hit ? "TP1_THEN_END" : "END"
      );
    }

    const totalTrades = trades.length;
    const netProfit = equity - initialCapital;
    const netReturnPct = (netProfit / initialCapital) * 100;

    const profitFactor =
      grossLossMoney > 0
        ? grossProfitMoney / grossLossMoney
        : grossProfitMoney > 0
          ? null
          : 0;

    const averageNetTradePct =
      totalTrades > 0
        ? trades.reduce((sum, trade) => sum + trade.netReturnPct, 0) /
          totalTrades
        : 0;

    return NextResponse.json(
      {
        symbol: "XAU/USD",
        strategy: "EMA 9/21/200 + RSI 14 + MACD + ATR filters",
        timeframe: "5min",
        candlesTested: candles.length,
        testStart: candles[0].datetime,
        testEnd: last.datetime,
        initialCapital,
        finalCapital: round(equity),
        netProfit: round(netProfit),
        netReturnPct: round(netReturnPct),
        totalTrades,
        wins,
        losses,
        breakeven,
        tp1Hits,
        tp2Hits,
        tp1CloseFraction: tp1CloseFraction * 100,
        winRatePct:
          totalTrades > 0 ? round((wins / totalTrades) * 100) : 0,
        profitFactor:
          profitFactor === null ? null : round(profitFactor, 3),
        grossProfit: round(grossProfitMoney),
        grossLoss: round(grossLossMoney),
        averageNetTradePct: round(averageNetTradePct, 4),
        maxDrawdownPct: round(maxDrawdownPct),
        costBpsPerSide,
        slippageBpsPerSide,
        estimatedRoundTripCostBps: totalCostBpsPerRoundTrip,
        stopLossATRMultiplier,
        tp1RiskReward,
        tp2RiskReward,
        trades,
        disclaimer:
          "Backtest historik, jo garanci fitimi. TP1 mbyll 50% te pozicionit dhe TP2 synon pjesen e mbetur. Kostot dhe slippage jane supozime. Qirinjte 5-minutesh nuk tregojne gjithmone rendin e sakte te prekjes se niveleve; rezultatet jane vleresime.",
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
            : "Gabim gjate backtest-it.",
      },
      { status: 502 }
    );
  }
}
