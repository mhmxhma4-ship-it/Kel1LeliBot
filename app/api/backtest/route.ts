
import { NextResponse } from "next/server";
import {
  analyzeCandles,
  calculateATR,
  parseCandles,
} from "@/lib/strategy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Position = 1 | -1 | 0;
type TradeResult = "WIN" | "LOSS" | "BREAKEVEN";
type ExitReason =
  | "SIGNAL"
  | "STOP_LOSS"
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
  exitReason: ExitReason;
};

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];

  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }

  return Number(raw);
}

function round(value: number, decimals = 2): number {
  return Number(value.toFixed(decimals));
}

export async function GET() {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Mungon TWELVE_DATA_API_KEY" },
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

    // Kostot modelohen ne basis points per ane.
    // 1 bps = 0.01% e vleres se pozicionit.
    const costBpsPerSide = envNumber("XAU_COST_BPS", 5);
    const slippageBpsPerSide = envNumber(
      "XAU_SLIPPAGE_BPS",
      1
    );

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
    const riskReward = 2;
    const stopLossATRMultiplier = 1.5;

    const analysis = analyzeCandles(candles);
    const atrSeries = calculateATR(candles, 14);

    let equity = initialCapital;
    let peakEquity = initialCapital;
    let maxDrawdownPct = 0;

    let position: Position = 0;
    let entryPrice = 0;
    let entryTime = "";
    let stopLossPrice = 0;
    let takeProfitPrice = 0;

    let wins = 0;
    let losses = 0;
    let breakeven = 0;

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
        throw new Error(
          "Cmimi i hyrjes ose daljes nuk eshte valid."
        );
      }

      // Slippage ne dalje aplikohet kunder pozicionit.
      const exitPrice =
        rawExitPrice *
        (1 - position * (slippageBpsPerSide / 10000));

      const grossPct =
        ((position * (rawExitPrice - entryPrice)) /
          entryPrice) *
        100;

      const tradingCostPct =
        (totalCostBpsPerRoundTrip / 10000) * 100;

      const netPct = grossPct - tradingCostPct;
      const previousEquity = equity;

      const grossMoney = previousEquity * (grossPct / 100);
      const netMoney = previousEquity * (netPct / 100);

      equity = previousEquity + netMoney;

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

      trades.push({
        side: position === 1 ? "BUY" : "SELL",
        entry: round(entryPrice, 3),
        exit: round(exitPrice, 3),
        entryPrice: round(entryPrice, 3),
        exitPrice: round(exitPrice, 3),
        entryTime,
        exitTime,
        grossReturnPct: round(grossPct, 4),
        netReturnPct: round(netPct, 4),
        netPct: round(netPct, 4),
        netProfit: round(netMoney, 2),
        result,
        stopLoss: round(stopLossPrice, 3),
        takeProfit: round(takeProfitPrice, 3),
        exitReason,
      });

      updateDrawdown();

      if (
        !Number.isFinite(equity) ||
        equity <= 0 ||
        !Number.isFinite(grossMoney)
      ) {
        throw new Error(
          "Kapitali u be jo valid gjate backtest-it."
        );
      }

      position = 0;
      entryPrice = 0;
      entryTime = "";
      stopLossPrice = 0;
      takeProfitPrice = 0;
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

      // Slippage ne hyrje aplikohet kunder pozicionit.
      entryPrice =
        rawEntryPrice *
        (1 + side * (slippageBpsPerSide / 10000));

      entryTime = time;
      position = side;

      const stopDistance = atr * stopLossATRMultiplier;
      const targetDistance = stopDistance * riskReward;

      if (side === 1) {
        stopLossPrice = entryPrice - stopDistance;
        takeProfitPrice = entryPrice + targetDistance;
      } else {
        stopLossPrice = entryPrice + stopDistance;
        takeProfitPrice = entryPrice - targetDistance;
      }
    }

    for (let i = 205; i < candles.length - 1; i++) {
      const signal = analysis.signalAt(i);

      const desiredPosition: Position =
        signal === "BUY"
          ? 1
          : signal === "SELL"
            ? -1
            : 0;

      // Sinjali nga qiriu i mbyllur ekzekutohet ne
      // hapjen e qiriut pasues.
      const executionCandle = candles[i + 1];
      const executionPrice = executionCandle.open;
      const executionTime = executionCandle.datetime;

      if (desiredPosition !== position) {
        if (position !== 0) {
          closePosition(
            executionPrice,
            executionTime,
            "SIGNAL"
          );
        }

        // Kontrollo sinjalin origjinal, jo krahasimin
        // e tipit Position me vleren 0.
        if (signal === "BUY" || signal === "SELL") {
          const atr = atrSeries[i];

          if (atr !== null && atr > 0) {
            const side: Position =
              signal === "BUY" ? 1 : -1;

            openPosition(
              side,
              executionPrice,
              executionTime,
              atr
            );
          }
        }
      }

      if (position === 0) continue;

      // Nese hapja kalon SL/TP, perdor cmimin e hapjes.
      const gapThroughStop =
        position === 1
          ? executionCandle.open <= stopLossPrice
          : executionCandle.open >= stopLossPrice;

      const gapThroughTarget =
        position === 1
          ? executionCandle.open >= takeProfitPrice
          : executionCandle.open <= takeProfitPrice;

      if (gapThroughStop) {
        closePosition(
          executionCandle.open,
          executionTime,
          "STOP_LOSS"
        );
        continue;
      }

      if (gapThroughTarget) {
        closePosition(
          executionCandle.open,
          executionTime,
          "TAKE_PROFIT"
        );
        continue;
      }

      const hitStop =
        position === 1
          ? executionCandle.low <= stopLossPrice
          : executionCandle.high >= stopLossPrice;

      const hitTarget =
        position === 1
          ? executionCandle.high >= takeProfitPrice
          : executionCandle.low <= takeProfitPrice;

      // Kur te dyja preken ne te njejtin qiri,
      // perdor supozimin konservator: SL i pari.
      if (hitStop && hitTarget) {
        closePosition(
          stopLossPrice,
          executionTime,
          "STOP_LOSS"
        );
      } else if (hitStop) {
        closePosition(
          stopLossPrice,
          executionTime,
          "STOP_LOSS"
        );
      } else if (hitTarget) {
        closePosition(
          takeProfitPrice,
          executionTime,
          "TAKE_PROFIT"
        );
      }
    }

    const last = candles[candles.length - 1];

    if (position !== 0) {
      closePosition(last.close, last.datetime, "END");
    }

    const totalTrades = trades.length;
    const netProfit = equity - initialCapital;
    const netReturnPct =
      (netProfit / initialCapital) * 100;

    const profitFactor =
      grossLossMoney > 0
        ? grossProfitMoney / grossLossMoney
        : grossProfitMoney > 0
          ? null
          : 0;

    const averageNetTradePct =
      totalTrades > 0
        ? trades.reduce(
            (sum, trade) => sum + trade.netReturnPct,
            0
          ) / totalTrades
        : 0;

    return NextResponse.json(
      {
        symbol: "XAU/USD",
        strategy:
          "EMA 9/21/200 + RSI 14 + MACD + ATR filters",
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

        winRatePct:
          totalTrades > 0
            ? round((wins / totalTrades) * 100)
            : 0,

        profitFactor:
          profitFactor === null
            ? null
            : round(profitFactor, 3),

        grossProfit: round(grossProfitMoney),
        grossLoss: round(grossLossMoney),
        averageNetTradePct: round(averageNetTradePct, 4),
        maxDrawdownPct: round(maxDrawdownPct),

        costBpsPerSide,
        slippageBpsPerSide,
        estimatedRoundTripCostBps:
          totalCostBpsPerRoundTrip,

        stopLossATRMultiplier,
        takeProfitRiskReward: riskReward,

        trades,

        disclaimer:
          "Backtest historik, jo garanci fitimi. Kostot dhe slippage jane supozime, jo kuotime te matura nga brokeri. Nuk perfshihen komisionet specifike te brokerit, financimi overnight ose ekzekutimi real. Nese SL dhe TP preken brenda te njejtit qiri, llogaritet SL i pari.",
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
            : "Gabim gjate backtest-it.",
      },
      { status: 502 }
    );
  }
}
