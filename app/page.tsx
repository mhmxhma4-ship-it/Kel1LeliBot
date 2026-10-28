
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
  entryTime?: string;
  exitTime?: string;
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

const timeZones = [
  { name: "Greqi", zone: "Europe/Athens", flag: "🇬🇷" },
  { name: "Shqiperi", zone: "Europe/Tirane", flag: "🇦🇱" },
  { name: "Londer", zone: "Europe/London", flag: "🇬🇧" },
  { name: "New York", zone: "America/New_York", flag: "🇺🇸" },
  { name: "Tokyo", zone: "Asia/Tokyo", flag: "🇯🇵" },
  { name: "Dubai", zone: "Asia/Dubai", flag: "🇦🇪" },
  { name: "Frankfurt", zone: "Europe/Berlin", flag: "🇩🇪" },
  { name: "Sydney", zone: "Australia/Sydney", flag: "🇦🇺" },
  { name: "UTC", zone: "UTC", flag: "🌐" },
];

function displayValue(value: unknown, suffix = "") {
  if (value === undefined || value === null || value === "") return "--";

  if (typeof value === "number") {
    return Number.isFinite(value) ? `${value.toFixed(2)}${suffix}` : "--";
  }

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

function parseDateTime(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;

  const input = value.trim();
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(input);
  const date = hasTimezone
    ? new Date(input)
    : new Date(input.replace(" ", "T"));

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTimeInZone(value: unknown, zone: string) {
  const date = parseDateTime(value);
  if (!date) return "--";

  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).format(date);
  } catch {
    return "--";
  }
}

function getLocalTime(zone: string, now: Date) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).format(now);
  } catch {
    return "--:--:--";
  }
}

function getLocalDate(zone: string, now: Date) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(now);
  } catch {
    return "--";
  }
}

function getZoneName(zone: string) {
  return timeZones.find((item) => item.zone === zone)?.name ?? zone;
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
  const [now, setNow] = useState<Date | null>(null);

  const [selectedZone, setSelectedZone] = useState("Europe/Athens");
  const [menuOpen, setMenuOpen] = useState(false);

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
      setLastSignalUpdate(new Date().toISOString());
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
      setLastBacktestUpdate(new Date().toISOString());
    } catch (error) {
      setBacktestError(
        error instanceof Error
          ? error.message
          : "Gabim gjate backtest-it."
      );
    } finally {
      setBacktestLoading(false);
    }
  }, []);

  useEffect(() => {
    setNow(new Date());

    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
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

  const signalTimestamp = findValue(signal ?? {}, [
    "timestamp",
    "time",
    "datetime",
    "updatedAt",
  ]);

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

  const activePlace =
    timeZones.find((place) => place.zone === selectedZone) ?? timeZones[0];

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
            gap: 14,
            marginBottom: 26,
            position: "relative",
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

          {/* Menuja e vetme, ne cepin lart djathtas */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? "Mbyll menune" : "Hap menune"}
              aria-expanded={menuOpen}
              style={{
                width: 50,
                height: 50,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                background: menuOpen
                  ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                  : "#111827",
                border: "1px solid #fbbf24",
                borderRadius: 15,
                cursor: "pointer",
                boxShadow: "0 6px 24px #0005",
              }}
            >
              <span
                style={{
                  width: 21,
                  height: 2,
                  background: menuOpen ? "#111827" : "#fbbf24",
                  borderRadius: 2,
                }}
              />
              <span
                style={{
                  width: 21,
                  height: 2,
                  background: menuOpen ? "#111827" : "#fbbf24",
                  borderRadius: 2,
                }}
              />
              <span
                style={{
                  width: 21,
                  height: 2,
                  background: menuOpen ? "#111827" : "#fbbf24",
                  borderRadius: 2,
                }}
              />
            </button>

            {menuOpen && (
              <>
                <button
                  aria-label="Mbyll menune"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 20,
                    background: "transparent",
                    border: "none",
                    cursor: "default",
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    zIndex: 21,
                    top: 60,
                    right: 0,
                    width: "min(310px, calc(100vw - 32px))",
                    padding: 18,
                    background: "#111827",
                    border: "1px solid #374151",
                    borderRadius: 18,
                    boxShadow: "0 18px 55px #0009",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <div style={{ color: "#fbbf24", fontSize: 11, letterSpacing: 2 }}>
                        SETTINGS
                      </div>
                      <h2 style={{ fontSize: 19, margin: "5px 0 0" }}>
                        Ora dhe zona
                      </h2>
                    </div>

                    <button
                      onClick={() => setMenuOpen(false)}
                      aria-label="Mbyll"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 9,
                        border: "1px solid #374151",
                        background: "#0b1220",
                        color: "#f8fafc",
                        fontSize: 20,
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  </div>

                  <label
                    htmlFor="timezone"
                    style={{
                      display: "block",
                      color: "#94a3b8",
                      fontSize: 12,
                      marginBottom: 8,
                    }}
                  >
                    Zgjidh zonen kohore
                  </label>

                  <select
                    id="timezone"
                    value={selectedZone}
                    onChange={(event) => {
                      setSelectedZone(event.target.value);
                    }}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "#0b1220",
                      color: "#f8fafc",
                      border: "1px solid #fbbf24",
                      borderRadius: 11,
                      padding: "12px 10px",
                      fontSize: 14,
                      outline: "none",
                    }}
                  >
                    {timeZones.map((place) => (
                      <option key={place.zone} value={place.zone}>
                        {place.flag} {place.name}
                      </option>
                    ))}
                  </select>

                  <div
                    style={{
                      marginTop: 15,
                      padding: 15,
                      background: "#0b1220",
                      border: "1px solid #273449",
                      borderRadius: 13,
                    }}
                  >
                    <div style={{ color: "#94a3b8", fontSize: 12 }}>
                      {activePlace.flag} Ora ne {activePlace.name}
                    </div>

                    <div
                      style={{
                        color: "#fbbf24",
                        fontSize: 30,
                        fontWeight: 800,
                        marginTop: 7,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {now ? getLocalTime(selectedZone, now) : "--:--:--"}
                    </div>

                    <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 5 }}>
                      {now ? getLocalDate(selectedZone, now) : "--"}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "#94a3b8",
                      fontSize: 12,
                      marginTop: 14,
                    }}
                  >
                    <span style={{ color: "#22c55e" }}>●</span>
                    Ora perditesohet automatikisht
                  </div>

                  <button
                    onClick={() => setMenuOpen(false)}
                    style={{
                      width: "100%",
                      marginTop: 16,
                      padding: "12px 14px",
                      border: "none",
                      borderRadius: 11,
                      background: "#fbbf24",
                      color: "#111827",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    U krye
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <div
          style={{
            ...panelStyle,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 22,
          }}
        >
          <div>
            <div style={{ color: "#22c55e", fontSize: 13, fontWeight: 700 }}>
              ● Sistemi aktiv ne faqe
            </div>
            <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>
              Rifreskim sinjali dhe backtest-i cdo 60 sekonda
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#94a3b8", fontSize: 12 }}>
              Zona kohore aktive
            </div>
            <div style={{ fontWeight: 700, marginTop: 5 }}>
              {activePlace.flag} {activePlace.name}
              <span
                style={{
                  color: "#fbbf24",
                  marginLeft: 10,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {now ? getLocalTime(selectedZone, now) : "--:--:--"}
              </span>
            </div>
          </div>
        </div>

        {/* Sinjali aktual */}
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
            <p style={{ color: "#f87171" }}>Gabim sinjali: {signalError}</p>
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
            Koha e sinjalit:{" "}
            {signalTimestamp
              ? formatDateTimeInZone(signalTimestamp, selectedZone)
              : "--"}
          </div>

          <div style={{ color: "#64748b", fontSize: 12, marginTop: 5 }}>
            Perditesuar:{" "}
            {lastSignalUpdate
              ? formatDateTimeInZone(lastSignalUpdate, selectedZone)
              : "--"}
          </div>

          <button
            onClick={() => void refreshSignal()}
            disabled={signalLoading}
            style={buttonStyle}
          >
            {signalLoading ? "Duke ngarkuar..." : "Rifresko sinjalin"}
          </button>
        </section>

        {/* Backtest */}
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
              { label: "Win rate", value: displayValue(winRate, "%") },
              { label: "Profit factor", value: displayValue(profitFactor) },
              { label: "Kthimi neto", value: displayValue(netReturn, "%") },
              { label: "Max drawdown", value: displayValue(maxDrawdown, "%") },
              { label: "Kapitali final", value: displayValue(finalCapital) },
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
              Backtest-i i fundit:{" "}
              {lastBacktestUpdate
                ? formatDateTimeInZone(lastBacktestUpdate, selectedZone)
                : "--"}
            </div>
          </div>
        </section>

        {/* Tregtimet e fundit */}
        <section style={panelStyle}>
          <h2 style={{ fontSize: 21, marginTop: 0 }}>Tregtimet e fundit</h2>

          <p style={{ color: "#94a3b8", fontSize: 12 }}>
            Oret shfaqen sipas zones aktive: {getZoneName(selectedZone)}.
          </p>

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
                    {[
                      "Drejtimi",
                      "Hyrja",
                      "Ora e hyrjes",
                      "Dalja",
                      "Ora e daljes",
                      "Rezultati",
                      "Kthimi",
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          padding: "12px 10px",
                          borderBottom: "1px solid #273449",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {trades.map((trade, index) => {
                    const rawResult = String(trade.result ?? "").toUpperCase();

                    const numericResult = findValue(trade, [
                      "netReturnPct",
                      "netPct",
                      "pnlPct",
                      "pnl",
                      "profit",
                    ]);

                    const resultNumber =
                      typeof numericResult === "number"
                        ? numericResult
                        : typeof numericResult === "string" &&
                            numericResult.trim() !== ""
                          ? Number(numericResult)
                          : undefined;

                    const isWin =
                      rawResult === "WIN" ||
                      (rawResult !== "LOSS" &&
                        rawResult !== "LOSE" &&
                        typeof resultNumber === "number" &&
                        resultNumber > 0);

                    const isLoss =
                      rawResult === "LOSS" ||
                      rawResult === "LOSE" ||
                      (rawResult !== "WIN" &&
                        typeof resultNumber === "number" &&
                        resultNumber < 0);

                    const resultLabel =
                      rawResult === "BREAKEVEN" || rawResult === "BREAK_EVEN"
                        ? "BREAKEVEN"
                        : isWin
                          ? "WIN"
                          : isLoss
                            ? "LOSE"
                            : rawResult || "--";

                    const resultColor =
                      resultLabel === "WIN"
                        ? "#22c55e"
                        : resultLabel === "LOSE"
                          ? "#ef4444"
                          : "#facc15";

                    const returnText =
                      typeof resultNumber === "number" &&
                      Number.isFinite(resultNumber)
                        ? `${resultNumber > 0 ? "+" : ""}${resultNumber.toFixed(2)}%`
                        : "--";

                    return (
                      <tr
                        key={`${index}-${String(
                          trade.entryTime ?? trade.entryPrice ?? trade.entry ?? ""
                        )}`}
                      >
                        <td style={cellStyle}>
                          {String(trade.side ?? "--").toUpperCase()}
                        </td>

                        <td style={cellStyle}>
                          {displayValue(trade.entryPrice ?? trade.entry)}
                        </td>

                        <td style={cellStyle}>
                          {formatDateTimeInZone(trade.entryTime, selectedZone)}
                        </td>

                        <td style={cellStyle}>
                          {displayValue(trade.exitPrice ?? trade.exit)}
                        </td>

                        <td style={cellStyle}>
                          {formatDateTimeInZone(trade.exitTime, selectedZone)}
                        </td>

                        <td
                          style={{
                            ...cellStyle,
                            color: resultColor,
                            fontWeight: 800,
                          }}
                        >
                          {resultLabel}
                        </td>

                        <td
                          style={{
                            ...cellStyle,
                            color:
                              typeof resultNumber === "number" && resultNumber > 0
                                ? "#22c55e"
                                : typeof resultNumber === "number" &&
                                    resultNumber < 0
                                  ? "#ef4444"
                                  : "#94a3b8",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {returnText}
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
  whiteSpace: "nowrap" as const,
} as const;
