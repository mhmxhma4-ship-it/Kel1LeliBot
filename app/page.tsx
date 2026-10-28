
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
    rsi14: number;
  };
  candleTime?: string;
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

  useEffect(() => {
    refreshSignal();

    const timer = setInterval(() => {
      refreshSignal();
    }, 60000);

    return () => clearInterval(timer);
  }, [refreshSignal]);

  const signalColor =
    data.signal === "BUY"
      ? "#16a34a"
      : data.signal === "SELL"
        ? "#dc2626"
        : "#d97706";

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

        <p className="note">
          Perditesuar: {data.updated}
        </p>

        <p className="note">
          {loading
            ? "Po merren te dhenat..."
            : "Perditesim automatik cdo 60 sekonda"}
        </p>
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
            <p>
              EMA 9: {data.indicators.ema9}
            </p>
            <p>
              EMA 21: {data.indicators.ema21}
            </p>
            <p>
              RSI 14: {data.indicators.rsi14}
            </p>
          </div>
        )}

        {data.candleTime && (
          <p className="note">
            Koha e qiriut te fundit: {data.candleTime}
          </p>
        )}

        <p className="note">
          Sinjalet jane analiza teknike automatike, jo
          garanci fitimi apo keshille financiare.
        </p>
      </section>
    </main>
  );
}
