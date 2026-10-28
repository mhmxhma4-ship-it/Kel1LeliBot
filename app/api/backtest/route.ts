
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

    const costInput = Number(
      process.env.XAU_COST_BPS ?? "5"
    );

    if (!Number.isFinite(costInput) || costInput < 0) {
      return NextResponse.json(
        {
          error:
            "XAU_COST_BPS duhet te jete numer jo negativ.",
        },
        { status: 500 }
      );
    }

    // 1 basis point = 0.01%.
    const costPctPerSide = costInput / 100;

    const analysis = analyzeCandles(candles);
    const atrSeries = calculateATR(candles, 14);

    const initialCapital = 1000;
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
    let grossWins = 0;
    let grossLosses = 0;

    const trades: {
      side: "BUY" | "SELL";
      entry: number;
      exit: number;
      entryPrice: number;
      exitPrice: number;
      entryTime: string;
      exitTime: string;
      netReturnPct: number;
      netPct: number;
      result: TradeResult;
      stopLoss: number;
      takeProfit: number;
      exitReason: "SIGNAL" | "STOP_LOSS" | "TAKE_PROFIT" | "END";
    }[] = [];

    function closePosition(
      exitPrice: number,
      exitTime: string,
      exitReason: "SIGNAL" | "STOP_LOSS" | "TAKE_PROFIT" | "END"
    ) {
      if (position === 0) return;

      const grossPct =
        (position * (exitPrice - entryPrice) / entryPrice) * 100;

      // Approximate round-trip trading costs.
      const netPct = grossPct - 2 * costPctPerSide;

      const previousEquity = equity;
      equity *= 1 + netPct / 100;

      const result: TradeResult =
        netPct > 0.000001
          ? "WIN"
          : netPct < -0.000001
            ? "LOSS"
            : "BREAKEVEN";

      if (result === "WIN") {
        wins++;
        grossWins += netPct;
      } else if (result === "LOSS") {
        losses++;
        grossLosses += Math.abs(netPct);
      }

      trades.push({
        side: position === 1 ? "BUY" : "SELL",
        entry: Number(entryPrice.toFixed(3)),
        exit: Number(exitPrice.toFixed(3)),
        entryPrice: Number(entryPrice.toFixed(3)),
        exitPrice: Number(exitPrice.toFixed(3)),
        entryTime,
        exitTime,
        netReturnPct: Number(netPct.toFixed(4)),
        netPct: Number(netPct.toFixed(4)),
        result,
        stopLoss: Number(stopLossPrice.toFixed(3)),
        takeProfit: Number(takeProfitPrice.toFixed(3)),
        exitReason,
      });

      peakEquity = Math.max(peakEquity, equity);

      const drawdown =
        peakEquity > 0
          ? ((peakEquity - equity) / peakEquity) * 100
          : 0;

      maxDrawdownPct = Math.max(maxDrawdownPct, drawdown);

      if (
        !Number.isFinite(equity) ||
        !Number.isFinite(previousEquity) ||
        equity <= 0
      ) {
        throw new Error(
          "Gabim ne llogaritjen e kapitalit."
        );
      }

      position = 0;
      stopLossPrice = 0;
      takeProfitPrice = 0;
    }

    for (let i = 200; i < candles.length - 1; i++) {
      const signal = analysis.signalAt(i);

      const desiredPosition: Position =
        signal === "BUY" ? 1 :
        signal === "SELL" ? -1 : 0;

      // Signal uses candle i, execution occurs at candle i+1 open.
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

        if (desiredPosition !== 0) {
          const atr = atrSeries[i];

          // No entry if a valid ATR is unavailable.
          if (atr !== null && Number.isFinite(atr) && atr > 0) {
            position = desiredPosition;
            entryPrice = executionPrice;
            entryTime = executionTime;

            const stopDistance = atr * 1.5;
            const targetDistance = stopDistance * 2;

            if (position === 1) {
              stopLossPrice = entryPrice - stopDistance;
              takeProfitPrice = entryPrice + targetDistance;
            } else {
              stopLossPrice = entryPrice + stopDistance;
              takeProfitPrice = entryPrice - targetDistance;
            }
          }
        }
      }

      if (position === 0) continue;

      // Test SL/TP against the full OHLC range of this candle.
      const hitStop =
        position === 1
          ? executionCandle.low <= stopLossPrice
          : executionCandle.high >= stopLossPrice;

      const hitTarget =
        position === 1
          ? executionCandle.high >= takeProfitPrice
          : executionCandle.low <= takeProfitPrice;

      if (hitStop && hitTarget) {
        // Conservative assumption: SL is hit first if the
        // candle touches both levels and intrabar order is unknown.
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

    // Close any remaining position at the final candle close.
    const last = candles[candles.length - 1];

    if (position !== 0) {
      closePosition(last.close, last.datetime, "END");
    }

    const totalTrades = trades.length;
    const netReturnPct =
      ((equity / initialCapital) - 1) * 100;

    const profitFactor =
      grossLosses > 0
        ? grossWins / grossLosses
        : grossWins > 0
          ? null
          : 0;

    return NextResponse.json(
      {
        symbol: "XAU/USD",
        strategy: "EMA 9/21/200 + RSI 14 + MACD",
        timeframe: "5min",
        candlesTested: candles.length,
        testStart: candles[0].datetime,
        testEnd: last.datetime,
        initialCapital,
        finalCapital: Number(equity.toFixed(2)),
        netProfit: Number(
          (equity - initialCapital).toFixed(2)
        ),
        netReturnPct: Number(netReturnPct.toFixed(2)),
        totalTrades,
        wins,
        losses,
        breakeven: totalTrades - wins - losses,
        winRatePct:
          totalTrades > 0
            ? Number(
                ((wins / totalTrades) * 100).toFixed(2)
              )
            : 0,
        profitFactor:
          profitFactor === null
            ? null
            : Number(profitFactor.toFixed(2)),
        maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
        costBpsPerSide: costInput,
        estimatedRoundTripCostPct: Number(
          (2 * costPctPerSide).toFixed(4)
        ),
        stopLossATRMultiplier: 1.5,
        takeProfitRiskReward: 2,
        trades,
        disclaimer:
          "Backtest historik, jo garanci fitimi. TP/SL testohen me high/low te qiririt. Nese te dyja preken ne te njejtin qiri, supozohet se SL preket i pari. Kostot, spread-i, slippage dhe ekzekutimi real mund te ndryshojne rezultatet.",
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
