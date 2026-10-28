
"use client";

import { useCallback, useEffect, useState } from "react";

type Signal = {
  symbol: string;
  price: string | null;
  status: string;
  updated: string;
  signal: "BUY" | "SELL" | "WAIT";
  reason: string;
  indicators?: {
    ema9: number;
    ema21: number;
    ema200: number;
    rsi14: number;
  };
  candleTime?: string;
};

type Trade = {
  side: "BUY" | "SELL";
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  netReturnPct: number;
  result: "WIN" | "LOSS" | "BREAKEVEN";
};

type Backtest = {
  symbol: string;
  strategy: string;
  timeframe: string;
  candlesTested: number;
  testStart: string;
  testEnd: string;
  initialCapital: number;
  finalCapital: number;
  netProfit: number;
  netReturnPct: number;
  totalTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRatePct: number;
  profitFactor: number | null;
  maxDrawdownPct: number;
  costBpsPerSide: number;
  estimatedRoundTripCostPct: number;
  trades: Trade[];
};

export default function Home() {
  const [data, setData] = useState<Signal>({
    symbol: "XAU/USD",
    price: null,
    status: "Po lidhet...",
    updated: "Ne pritje",
    signal: "WAIT",
    reason: "Po priten te dhenat e tregut.",
  });

  const [loading, setLoading] = useState(true);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [backtest, setBacktest] = useState<Backtest | null>(null);
  const [backtestError, setBacktestError] = useState("");

  const refreshSignal = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/signals", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gabim ne API");
      }

      const validSignals = ["BUY", "SELL", "WAIT"];
      const nextSignal = validSignals.includes(result.signal)
        ? result.signal
        : "WAIT";

      setData({
        symbol: result.symbol || "XAU/USD",
        price:
          result.price !== null && result.price !== undefined
            ? String(result.price)
            : null,
        status: result.status || "Te dhenat u moren",
        updated: new Date().toLocaleTimeString(),
        signal: nextSignal,
        reason: result.reason || "Nuk ka arsye te disponueshme.",
        indicators: result.indicators,
        candleTime: result.candleTime,
      });
    } catch (error) {
      setData((old) => ({
        ...old,
        status:
          error instanceof Error
            ? error.message
            : "Gabim ne lidhjen me API",
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  const runBacktest = useCallback(async () => {
    setBacktestLoading(true);
    setBacktestError("");

    try {
      const response = await fetch("/api/backtest", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Backtest-i deshtoi");
      }

      setBacktest(result);
    } catch (error) {
      setBacktestError(
        error instanceof Error
          ? error.message
          : "Gabim gjate backtest-it"
      );
    } finally {
      setBacktestLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSignal();

    const timer = setInterval(refreshSignal, 60000);

    return () => clearInterval(timer);
  }, [refreshSignal]);

  const signalColor =
    data.signal === "BUY"
      ? "#16a34a"
      : data.signal === "SELL"
        ? "#dc2626"
        : "#d97706";

  const money = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);

  return (
    <main>
      <header>
        <div>
          <h1>KeliLelibot</h1>
          <p className="subtitle">Gold Trading Dashboard</p>
        </div>
        <span className="badge">{data.symbol}</span>
      </header>

      <section className="panel">
        <p className="subtitle">Cmimi i arit</p>

        <h2 className="price">
          {data.price !== null ? `$${data.price}` : "—"}
        </h2>

        <p>Statusi: {data.status}</p>
        <p className="note">Perditesuar: {data.updated}</p>

        <p className="note">
          {loading
            ? "Po merren te dhenat..."
            : "Perditesim automatik cdo 60 sekonda"}
        </p>

        <button
          className="neutral"
          onClick={refreshSignal}
          disabled={loading}
        >
          {loading ? "Po rifreskohet..." : "Rifresko cmimin"}
        </button>
      </section>

      <section className="panel">
        <h2>Sinjali i tregut</h2>

        <h1
          style={{
            color: signalColor,
            fontSize: 38,
            fontWeight: 800,
          }}
        >
          {data.signal}
        </h1>

        <p>{data.reason}</p>

        {data.indicators && (
          <div>
            <p>EMA 9: {data.indicators.ema9}</p>
            <p>EMA 21: {data.indicators.ema21}</p>
            <p>EMA 200: {data.indicators.ema200}</p>
            <p>RSI 14: {data.indicators.rsi14}</p>
          </div>
        )}

        {data.candleTime && (
          <p className="note">
            Koha e qiriut te fundit: {data.candleTime}
          </p>
        )}

        <p className="note">
          Strategjia: EMA 9/21/200 + RSI 14.
          Sinjalet jane informuese dhe nuk garantojne fitim.
        </p>
      </section>

      <section className="panel">
        <h2>Backtest historik</h2>
        <p>
          Testo strategjine XAU/USD mbi te dhenat historike
          dhe shiko rezultatin pas kostove te parashikuara.
        </p>

        <button
          className="neutral"
          onClick={runBacktest}
          disabled={backtestLoading}
        >
          {backtestLoading
            ? "Po analizohet historiku..."
            : "Nis backtest-in"}
        </button>

        {backtestError && (
          <p style={{ color: "#dc2626" }}>
            Gabim: {backtestError}
          </p>
        )}

        {backtest && (
          <div>
            <h3>Rezultatet</h3>

            <p>Periudha: {backtest.testStart} - {backtest.testEnd}</p>
            <p>Qirinj te testuar: {backtest.candlesTested}</p>
            <p>Strategjia: {backtest.strategy}</p>
            <p>Intervali: {backtest.timeframe}</p>

            <hr />

            <p>Kapitali fillestar: {money(backtest.initialCapital)}</p>
            <p>Kapitali perfundimtar: {money(backtest.finalCapital)}</p>

            <p
              style={{
                color: backtest.netProfit >= 0 ? "#16a34a" : "#dc2626",
                fontWeight: 700,
              }}
            >
              Fitimi/Humbja neto: {money(backtest.netProfit)}
              {" "}({backtest.netReturnPct}%)
            </p>

            <hr />

            <p>Gjithsej tregtime: {backtest.totalTrades}</p>
            <p>Fitore: {backtest.wins}</p>
            <p>Humbje: {backtest.losses}</p>
            <p>Barazime: {backtest.breakeven}</p>
            <p>Perqindja e fitoreve: {backtest.winRatePct}%</p>
            <p>
              Profit factor:{" "}
              {backtest.profitFactor === null
                ? "Pa humbje neto"
                : backtest.profitFactor}
            </p>
            <p>Renia maksimale e kapitalit: {backtest.maxDrawdownPct}%</p>

            <hr />

            <p>
              Kosto per ane: {backtest.costBpsPerSide} bps
            </p>
            <p>
              Kosto e vleresuar vajtje-ardhje:{" "}
              {backtest.estimatedRoundTripCostPct}%
            </p>

            <h3>Historiku i tregtimeve</h3>

            {backtest.trades.length === 0 ? (
              <p>Nuk u krijuan tregtime ne periudhen e testuar.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Tipi</th>
                      <th>Hyrja</th>
                      <th>Dalja</th>
                      <th>Rezultati neto</th>
                      <th>Statusi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...backtest.trades].reverse().map((trade, index) => (
                      <tr key={`${trade.entryTime}-${index}`}>
                        <td>{trade.side}</td>
                        <td>{trade.entryPrice}</td>
                        <td>{trade.exitPrice}</td>
                        <td>{trade.netReturnPct}%</td>
                        <td>{trade.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="note">
              Backtest-i eshte simulim historik. Kostot jane
              vleresime dhe rezultati nuk parashikon fitimin ne te ardhmen.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
