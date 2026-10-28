
"use client";

import { useCallback, useEffect, useState } from "react";

type Signal = {
  symbol?: string;
  signal?: string;
  action?: string;
  price?: number | string;
  close?: number | string;
  rsi?: number | string;
  ema9?: number | string;
  ema21?: number | string;
  ema200?: number | string;
  timestamp?: string;
  time?: string;
  reason?: string;
  error?: string;
  [key: string]: unknown;
};

type Trade = {
  side?: string;
  entry?: number;
  exit?: number;
  entryPrice?: number;
  exitPrice?: number;
  pnlPct?: number;
  netPct?: number;
  netReturnPct?: number;
  pnl?: number;
  profit?: number;
  result?: string;
  [key: string]: unknown;
};

type Backtest = {
  error?: string;
  symbol?: string;
  totalTrades?: number;
  tradesCount?: number;
  wins?: number;
  losses?: number;
  winRate?: number;
  winRatePct?: number;
  profitFactor?: number;
  netProfitPct?: number;
  netReturnPct?: number;
  totalReturnPct?: number;
  startingCapital?: number;
  initialCapital?: number;
  finalCapital?: number;
  maxDrawdownPct?: number;
  trades?: Trade[];
  [key: string]: unknown;
};

function displayValue(value: unknown, suffix = "") {
  if (value === undefined || value === null || value === "") return "--";
  if (typeof value === "number") return `${value.toFixed(2)}${suffix}`;
  if (typeof value === "string") return `${value}${suffix}`;
  return String(value);
}

function findValue(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null) {
      return data[key];
    }
  }
  return undefined;
}

export default function Home() {
  const [signal, setSignal] = useState<Signal | null>(null);
  const [backtest, setBacktest] = useState<Backtest | null>(null);
  const [signalLoading, setSignalLoading] = useState(true);
  const [backtestLoading, setBacktestLoading] = useState(true);
  const [signalError, setSignalError] = useState("");
  const [backtestError, setBacktestError] = useState("");
  const [lastSignalUpdate, setLastSignalUpdate] = useState("");
  const [lastBacktestUpdate, setLastBacktestUpdate] = useState("");

  const refreshSignal = useCallback(async () => {
    try {
      const response = await fetch("/api/signals", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Nuk u mor sinjali.");
      }

      setSignal(data);
      setSignalError("");
      setLastSignalUpdate(new Date().toLocaleTimeString());
    } catch (error) {
      setSignalError(
        error instanceof Error
          ? error.message
          : "Gabim gjate marrjes se sinjalit."
      );
    } finally {
      setSignalLoading(false);
    }
  }, []);

  const refreshBacktest = useCallback(async () => {
    try {
      const response = await fetch("/api/backtest", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Backtest-i deshtoi.");
      }

      setBacktest(data);
      setBacktestError("");
      setLastBacktestUpdate(new Date().toLocaleTimeString());
    } catch (error) {
      setBacktestError(
        error instanceof Error ? error.message : "Gabim gjate backtest-it."
      );
    } finally {
      setBacktestLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let signalBusy = false;
    let backtestBusy = false;

    const safeSignal = async () => {
      if (!active || signalBusy) return;
      signalBusy = true;
      try {
        await refreshSignal();
      } finally {
        signalBusy = false;
      }
    };

    const safeBacktest = async () => {
      if (!active || backtestBusy) return;
      backtestBusy = true;
      try {
        await refreshBacktest();
      } finally {
        backtestBusy = false;
      }
    };

    void safeSignal();
    void safeBacktest();

    const signalTimer = window.setInterval(() => {
      void safeSignal();
    }, 60_000);

    const backtestTimer = window.setInterval(() => {
      void safeBacktest();
    }, 60_000);

    return () => {
      active = false;
      window.clearInterval(signalTimer);
      window.clearInterval(backtestTimer);
    };
  }, [refreshSignal, refreshBacktest]);

  const signalName = String(
    findValue(signal ?? {}, ["signal", "action", "recommendation"]) ?? "WAIT"
  ).toUpperCase();

  const signalColor =
    signalName.includes("BUY") || signalName.includes("LONG")
      ? "#22c55e"
      : signalName.includes("SELL") || signalName.includes("SHORT")
        ? "#ef4444"
        : "#facc15";

  const tradeCount = findValue(backtest ?? {}, [
    "totalTrades",
    "tradesCount",
    "total_trades",
  ]);

  const winRate = findValue(backtest ?? {}, [
    "winRatePct",
    "winRate",
    "win_rate",
  ]);

  const profitFactor = findValue(backtest ?? {}, [
    "profitFactor",
    "profit_factor",
  ]);

  const netReturn = findValue(backtest ?? {}, [
    "netReturnPct",
    "netProfitPct",
    "totalReturnPct",
    "net_return_pct",
    "total_return_pct",
  ]);

  const maxDrawdown = findValue(backtest ?? {}, [
    "maxDrawdownPct",
    "max_drawdown_pct",
  ]);

  const finalCapital = findValue(backtest ?? {}, [
    "finalCapital",
    "final_capital",
  ]);

  const startingCapital = findValue(backtest ?? {}, [
    "initialCapital",
    "startingCapital",
    "starting_capital",
  ]);

  const trades = Array.isArray(backtest?.trades)
    ? backtest.trades.slice(-20).reverse()
    : [];

  const panelStyle = {
    background: "#111827",
    border: "1px solid #273449",
    borderRadius: 16,
    padding: 18,
  } as const;

  const labelStyle = {
    color: "#94a3b8",
    fontSize: 13,
  } as const;

  const valueStyle = {
    fontSize: 24,
    fontWeight: 700,
    marginTop: 8,
    overflowWrap: "anywhere" as const,
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#080d18",
        color: "#f8fafc",
        padding: "24px 16px 48px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 26,
          }}
        >
          <div>
            <div
              style={{
                color: "#fbbf24",
                fontSize: 12,
                letterSpacing: 3,
                fontWeight: 700,
              }}
            >
              GOLD TRADING SYSTEM
            </div>
            <h1 style={{ fontSize: 30, margin: "8px 0" }}>
              Keli<span style={{ color: "#fbbf24" }}>Leli</span>bot
            </h1>
            <p style={{ color: "#94a3b8", margin: 0 }}>
              XAU/USD · EMA 9/21/200 · RSI 14
            </p>
          </div>

          <div
            style={{
              ...panelStyle,
              padding: "12px 16px",
              fontSize: 13,
            }}
          >
            <div style={{ color: "#22c55e" }}>● Sistemi aktiv ne faqe</div>
            <div style={{ color: "#94a3b8", marginTop: 6 }}>
              Rifreskim: cdo 60 sekonda
            </div>
          </div>
        </header>

        <section
          style={{
            ...panelStyle,
            marginBottom: 18,
            borderColor: signalColor,
          }}
        >
          <div style={labelStyle}>SINJALI AKTUAL · XAU/USD</div>

          <div
            style={{
              fontSize: 34,
              fontWeight: 800,
              color: signalColor,
              marginTop: 10,
            }}
          >
            {signalLoading && !signal ? "Duke ngarkuar..." : signalName}
          </div>

          {signalError && (
            <p style={{ color: "#f87171" }}>
              Gabim sinjali: {signalError}
            </p>
          )}

          {signal?.reason && (
            <p style={{ color: "#cbd5e1" }}>{signal.reason}</p>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: 16,
              marginTop: 22,
            }}
          >
            {[
              {
                label: "Cmimi",
                value: findValue(signal ?? {}, ["price", "close"]),
              },
              { label: "RSI 14", value: signal?.rsi },
              { label: "EMA 9", value: signal?.ema9 },
              { label: "EMA 21", value: signal?.ema21 },
              { label: "EMA 200", value: signal?.ema200 },
            ].map((item) => (
              <div key={item.label}>
                <div style={labelStyle}>{item.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 7 }}>
                  {displayValue(item.value)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ color: "#64748b", fontSize: 12, marginTop: 18 }}>
            Perditesuar: {lastSignalUpdate || "--"}
          </div>

          <button
            onClick={() => void refreshSignal()}
            disabled={signalLoading}
            style={buttonStyle}
          >
            {signalLoading ? "Duke ngarkuar..." : "Rifresko sinjalin"}
          </button>
        </section>

        <section style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <h2 style={{ fontSize: 22, margin: 0 }}>Backtest automatik</h2>
            <button
              onClick={() => void refreshBacktest()}
              disabled={backtestLoading}
              style={buttonStyle}
            >
              {backtestLoading ? "Duke llogaritur..." : "Rillogarit tani"}
            </button>
          </div>

          {backtestError && (
            <div
              style={{
                ...panelStyle,
                color: "#f87171",
                marginBottom: 14,
              }}
            >
              Gabim backtest-i: {backtestError}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
              gap: 12,
            }}
          >
            {[
              { label: "Tregtime", value: displayValue(tradeCount) },
              {
                label: "Win rate",
                value: displayValue(winRate, "%"),
              },
              {
                label: "Profit factor",
                value: displayValue(profitFactor),
              },
              {
                label: "Kthimi neto",
                value: displayValue(netReturn, "%"),
              },
              {
                label: "Max drawdown",
                value: displayValue(maxDrawdown, "%"),
              },
              {
                label: "Kapitali final",
                value: displayValue(finalCapital),
              },
            ].map((item) => (
              <div key={item.label} style={panelStyle}>
                <div style={labelStyle}>{item.label}</div>
                <div style={valueStyle}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{ ...panelStyle, marginTop: 14 }}>
            <div style={labelStyle}>Kapitali fillestar</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 7 }}>
              {displayValue(startingCapital)}
            </div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 12 }}>
              Backtest-i i fundit: {lastBacktestUpdate || "--"}
            </div>
          </div>
        </section>

        <section style={panelStyle}>
          <h2 style={{ fontSize: 21, marginTop: 0 }}>Tregtimet e fundit</h2>

          {trades.length === 0 ? (
            <p style={{ color: "#94a3b8" }}>
              {backtestLoading
                ? "Duke ngarkuar tregtimet..."
                : "Nuk ka tregtime per tu shfaqur, ose API nuk ktheu listen e tregtimeve."}
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr style={{ color: "#94a3b8" }}>
                    {["Drejtimi", "Hyrja", "Dalja", "Rezultati"].map(
                      (heading) => (
                        <th
                          key={heading}
                          style={{
                            padding: "12px 10px",
                            borderBottom: "1px solid #273449",
                          }}
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade, index) => {
                    const result = findValue(trade, [
                      "netReturnPct",
                      "netPct",
                      "pnlPct",
                      "pnl",
                      "profit",
                      "result",
                    ]);

                    const numericResult =
                      typeof result === "number"
                        ? result
                        : typeof result === "string" &&
                            result.trim() !== "" &&
                            Number.isFinite(Number(result))
                          ? Number(result)
                          : undefined;

                    return (
                      <tr key={`${index}-${String(trade.entryPrice ?? trade.entry ?? "")}`}>
                        <td style={cellStyle}>
                          {String(trade.side ?? "--").toUpperCase()}
                        </td>
                        <td style={cellStyle}>
                          {displayValue(trade.entryPrice ?? trade.entry)}
                        </td>
                        <td style={cellStyle}>
                          {displayValue(trade.exitPrice ?? trade.exit)}
                        </td>
                        <td
                          style={{
                            ...cellStyle,
                            color:
                              numericResult === undefined
                                ? "#f8fafc"
                                : numericResult >= 0
                                  ? "#22c55e"
                                  : "#ef4444",
                          }}
                        >
                          {displayValue(numericResult ?? result, numericResult !== undefined ? "%" : "")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const buttonStyle = {
  background: "#fbbf24",
  color: "#111827",
  border: "none",
  borderRadius: 10,
  padding: "11px 15px",
  fontWeight: 700,
  cursor: "pointer",
} as const;

const cellStyle = {
  padding: "13px 10px",
  borderBottom: "1px solid #273449",
} as const;
