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
        { error: "Nuk ka mjaft te dhena per backtest" },
        { status: 502 }
      );
    }
    const costInput = Number(process.env.XAU_COST_BPS ?? "5");
    if (!Number.isFinite(costInput) || costInput < 0) {
      return NextResponse.json(
        { error: "XAU_COST_BPS duhet te jete numer pozitiv" },
        { status: 500 }
      );
    }
    const costBpsPerSide = costInput;
    const costPctPerSide = costBpsPerSide / 100;
    const analysis = analyzeCandles(candles);
    let position: 1 | -1 | 0 = 0;
    let entryPrice = 0;
    let entryTime = "";
    let equity = 1000;
    let peakEquity = equity;
    let maxDrawdownPct = 0;
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
      result: "WIN" | "LOSS" | "BREAKEVEN";
    }[] = [];
    function closePosition(exitPrice: number, exitTime: string) {
      if (position === 0) return;
      const grossPct =
        (position * (exitPrice - entryPrice) / entryPrice) * 100;
      const netPct = grossPct - 2 * costPctPerSide;
      const previousEquity = equity;
      equity *= 1 + netPct / 100;
      const result =
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
      const roundedEntry = Number(entryPrice.toFixed(3));
      const roundedExit = Number(exitPrice.toFixed(3));
      const roundedNetPct = Number(netPct.toFixed(4));
      trades.push({
        side: position === 1 ? "BUY" : "SELL",
        entry: roundedEntry,
        exit: roundedExit,
        entryPrice: roundedEntry,
        exitPrice: roundedExit,
        entryTime,
        exitTime,
        netReturnPct: roundedNetPct,
        netPct: roundedNetPct,
        result,
      });
      peakEquity = Math.max(peakEquity, equity);
      const drawdown =
        peakEquity > 0
          ? ((peakEquity - equity) / peakEquity) * 100
          : 0;
      maxDrawdownPct = Math.max(maxDrawdownPct, drawdown);
      if (!Number.isFinite(equity) || !Number.isFinite(previousEquity)) {
        throw new Error("Gabim ne llogaritjen e kapitalit.");
      }
      position = 0;
    }
    for (let i = 200; i < candles.length - 1; i++) {
      const signal = analysis.signalAt(i);
      const desiredPosition: 1 | -1 | 0 =
        signal === "BUY" ? 1 : signal === "SELL" ? -1 : 0;
      const executionPrice = candles[i + 1].open;
      const executionTime = candles[i + 1].datetime;
      if (desiredPosition !== position) {
        if (position !== 0) {
          closePosition(executionPrice, executionTime);
        }
        if (desiredPosition !== 0) {
          position = desiredPosition;
          entryPrice = executionPrice;
          entryTime = executionTime;
        }
      }
    }
    const last = candles[candles.length - 1];
    if (position !== 0) {
      closePosition(last.close, last.datetime);
    }
    const totalTrades = trades.length;
    const netReturnPct = ((equity / 1000) - 1) * 100;
    const profitFactor =
      grossLosses > 0
        ? grossWins / grossLosses
        : grossWins > 0
          ? null
          : 0;
    return NextResponse.json(
      {
        symbol: "XAU/USD",
        strategy: "EMA 9/21/200 + RSI 14",
        timeframe: "5min",
        candlesTested: candles.length,
        testStart: candles[0].datetime,
        testEnd: last.datetime,
        initialCapital: 1000,
        finalCapital: Number(equity.toFixed(2)),
        netProfit: Number((equity - 1000).toFixed(2)),
        netReturnPct: Number(netReturnPct.toFixed(2)),
        totalTrades,
        wins,
        losses,
        breakeven: totalTrades - wins - losses,
        winRatePct:
          totalTrades > 0
            ? Number(((wins / totalTrades) * 100).toFixed(2))
            : 0,
        profitFactor:
          profitFactor === null
            ? null
            : Number(profitFactor.toFixed(2)),
        maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
        costBpsPerSide,
        estimatedRoundTripCostPct: Number(
          (2 * costPctPerSide).toFixed(4)
        ),
        trades,
        disclaimer:
          "Backtest historik, jo garanci fitimi. Rezultatet varen nga cilesia e te dhenave dhe kostot reale.",
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
            : "Gabim gjate backtest-it",
      },
      { status: 502 }
    );
  }
}
