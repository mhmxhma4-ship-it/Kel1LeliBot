
"use client";

import { useEffect, useState } from "react";

type Signal = {
  symbol: string;
  price: string | null;
  status: string;
  updated: string;
  signal: "BUY" | "SELL" | "WAIT";
  reason: string;
};

export default function Home() {
  const [data, setData] = useState<Signal>({
    symbol: "XAU/USD",
    price: null,
    status: "Po lidhet...",
    updated: "Ne pritje",
    signal: "WAIT",
    reason: "Po priten te dhenat e analizes.",
  });

  const [loading, setLoading] = useState(false);

  async function refreshSignal() {
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
      const marketSignal = validSignals.includes(result.signal)
        ? result.signal
        : "WAIT";

      setData({
        symbol: result.symbol || "XAU/USD",
        price: result.price != null ? String(result.price) : null,
        status: result.status || "Te dhenat u moren",
        updated: new Date().toLocaleTimeString(),
        signal: marketSignal,
        reason: result.reason || "Nuk u dha arsye per sinjalin.",
      });
    } catch {
      setData((old) => ({
        ...old,
        status: "Gabim ne lidhjen me API",
        reason: "Kontrollo API-ne dhe konfigurimin e saj.",
        updated: "Deshtoi rifreskimi",
        signal: "WAIT",
      }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshSignal();

    const timer = setInterval(refreshSignal, 60000);
    return () => clearInterval(timer);
  }, []);

  const color =
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
        <p className="note">Perditesuar: {data.updated}</p>

        <button
          className="neutral"
          onClick={refreshSignal}
          disabled={loading}
        >
          {loading ? "Po rifreskohet..." : "Rifresko te dhenat"}
        </button>
      </section>

      <section className="panel">
        <h2>Sinjali i tregut</h2>

        <h1 style={{ color, fontSize: 36 }}>
          {data.signal}
        </h1>

        <p>{data.reason}</p>

        <p className="note">
          Sinjal informues, jo garanci fitimi apo keshille
          financiare. Analiza mund te jete e gabuar.
        </p>
      </section>
    </main>
  );
}
