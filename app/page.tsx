
"use client";

import { useEffect, useState } from "react";

type Signal = {
  symbol: string;
  price: string | null;
  status: string;
  updated: string;
};

export default function Home() {
  const [signal, setSignal] = useState<Signal>({
    symbol: "XAU/USD",
    price: null,
    status: "Po lidhet...",
    updated: "Ne pritje",
  });

  async function refreshSignal() {
    try {
      const response = await fetch("/api/signals", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nuk u moren te dhenat");
      }

      setSignal({
        symbol: data.symbol || "XAU/USD",
        price: data.price ? String(data.price) : null,
        status: data.status || "Te dhenat u moren",
        updated: new Date().toLocaleTimeString(),
      });
    } catch {
      setSignal((old) => ({
        ...old,
        status: "API nuk eshte konfiguruar",
        updated: "Kontrollo konfigurimin",
      }));
    }
  }

  useEffect(() => {
    refreshSignal();
  }, []);

  return (
    <main>
      <header>
        <div>
          <h1>KeliLelibot</h1>
          <p className="subtitle">Gold Trading Dashboard</p>
        </div>
        <span className="badge">XAU/USD</span>
      </header>

      <section className="panel">
        <p className="subtitle">Cmimi i arit</p>
        <h2 className="price">
          {signal.price ? `$${signal.price}` : "—"}
        </h2>
        <p>Instrumenti: {signal.symbol}</p>
        <p>Statusi: {signal.status}</p>
        <p className="note">Perditesuar: {signal.updated}</p>
        <button className="neutral" onClick={refreshSignal}>
          Rifresko te dhenat
        </button>
      </section>

      <section className="panel">
        <h2>Sinjali i tregut</h2>
        <p>
          {signal.price
            ? "Cmimi u mor nga burimi i te dhenave. Ky panel nuk garanton fitim."
            : "Lidh API-ne per te shfaqur cmimin aktual."}
        </p>
        <div className="buttons">
          <button className="buy" onClick={() => alert("Sinjal BUY: vetem informacion, jo urdher tregtimi.")}>
            BUY
          </button>
          <button className="sell" onClick={() => alert("Sinjal SELL: vetem informacion, jo urdher tregtimi.")}>
            SELL
          </button>
          <button className="neutral" onClick={() => alert("WAIT: prit per me shume informacion.")}>
            WAIT
          </button>
        </div>
        <p className="note">
          Sinjalet jane demonstrative dhe nuk perbejne keshille financiare.
          Kontrollo gjithmone tregun para se te marresh vendime.
        </p>
      </section>
    </main>
  );
}
