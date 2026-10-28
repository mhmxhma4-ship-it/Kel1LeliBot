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
  { name: "Greqi", city: "Athine", zone: "Europe/Athens", flag: "🇬🇷" },
  { name: "Shqiperi", city: "Tirane", zone: "Europe/Tirane", flag: "🇦🇱" },
  { name: "Londer", city: "Londer", zone: "Europe/London", flag: "🇬🇧" },
  { name: "New York", city: "New York", zone: "America/New_York", flag: "🇺🇸" },
  { name: "Tokyo", city: "Tokyo", zone: "Asia/Tokyo", flag: "🇯🇵" },
  { name: "Dubai", city: "Dubai", zone: "Asia/Dubai", flag: "🇦🇪" },
  { name: "Frankfurt", city: "Frankfurt", zone: "Europe/Berlin", flag: "🇩🇪" },
  { name: "Sydney", city: "Sydney", zone: "Australia/Sydney", flag: "🇦🇺" },
  { name: "UTC", city: "Koha universale", zone: "UTC", flag: "🌐" },
];

function displayValue(value: unknown, suffix = "") {
  if (value === undefined || value === null || value === "") {
    return "--";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? `${value.toFixed(2)}${suffix}` : "--";
  }

  if (typeof value === "string") {
    return `${value}${suffix}`;
  }

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

/**
 * Konverton nje timestamp ne zonen kohore te zgjedhur.
 * Nese timestamp-i nuk ka Z ose offset, ai interpretohet si kohe lokale
 * e pajisjes, sepse burimi nuk ka dhene informacion te qarte per zonen.
 */
function parseDateTime(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;

  const input = value.trim();
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(input);

  let date: Date;

  if (hasTimezone) {
    date = new Date(input);
  } else {
    date = new Date(input.replace(" ", "T"));
  }

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatTimeInZone(value: unknown, zone: string) {
  const date = parseDateTime(value);
  if (!date) return "--";

  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).format(date);
  } catch {
    return "--";
  }
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

  // Zona kryesore kohore e faqes. Parazgjedhja eshte Greqia.
  const [selectedZone, setSelectedZone] = useState("Europe/Athens");

  const [selectedZones, setSelectedZones] = useState<string[]>(
    timeZones
      .filter((item) => item.zone !== "UTC")
      .map((item) => item.zone)
  );

  const [showAllZones, setShowAllZones] = useState(true);

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

    const clockTimer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(clockTimer);
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

  const visibleZones = timeZones.filter((item) =>
    selectedZones.includes(item.zone)
  );

  const signalTimestamp = findValue(signal ?? {}, [
    "timestamp",
    "time",
    "datetime",
    "updatedAt",
  ]);

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

          <div style={{ ...panelStyle, padding: "12px 16px", fontSize: 13 }}>
            <div style={{ color: "#22c55e" }}>● Sistemi aktiv ne faqe</div>
            <div style={{ color: "#94a3b8", marginTop: 6 }}>
              Rifreskim sinjali: cdo 60 sekonda
            </div>
          </div>
        </header>

        {/* Zgjedhja e zones kohore per oret kryesore te faqes */}
        <section style={{ ...panelStyle, marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 14,
            }}
          >
            <div>
              <h2 style={{ fontSize: 20, margin: 0 }}>
                Zona kohore e faqes
              </h2>
              <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 0 }}>
                Ndrysho zonen per te pare oraret kryesore ne kohen lokale te
                qytetit te zgjedhur.
              </p>
            </div>

            <select
              value={selectedZone}
              onChange={(event) => setSelectedZone(event.target.value)}
              aria-label="Zgjidh zonen kohore te faqes"
              style={{
                background: "#0b1220",
                color: "#f8fafc",
                border: "1px solid #fbbf24",
                borderRadius: 10,
                padding: "12px 14px",
                minWidth: 190,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {timeZones.map((place) => (
                <option key={place.zone} value={place.zone}>
                  {place.flag} {place.name}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 18,
              padding: 14,
              background: "#0b1220",
              border: "1px solid #273449",
              borderRadius: 12,
            }}
          >
            <div>
              <div style={labelStyle}>Ora aktuale e zones se zgjedhur</div>
              <div
                style={{
                  fontSize: 27,
                  fontWeight: 800,
                  color: "#fbbf24",
                  marginTop: 5,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {now ? getLocalTime(selectedZone, now) : "--:--:--"}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
                {now ? getLocalDate(selectedZone, now) : "--"}
              </div>
            </div>

            <div style={{ color: "#cbd5e1", fontSize: 13 }}>
              Zona aktive: <strong>{getZoneName(selectedZone)}</strong>
            </div>
          </div>

          <p
            style={{
              color: "#64748b",
              fontSize: 12,
              marginBottom: 0,
              marginTop: 12,
            }}
          >
            Kjo zgjedhje ndryshon shfaqjen e orareve ne dashboard, jo kohen
            reale te tregut ose te dhenat origjinale te API-se.
          </p>
        </section>

        {/* Oret boterore */}
        <section style={{ ...panelStyle, marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <h2 style={{ fontSize: 22, margin: 0 }}>Oraret boterore</h2>
              <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 0 }}>
                Ora lokale ne secilin vend, ne kohe reale
              </p>
            </div>

            <button
              onClick={() => setShowAllZones((value) => !value)}
              style={buttonStyle}
            >
              {showAllZones ? "Fshih zgjedhjet" : "Zgjidh vendet"}
            </button>
          </div>

          {showAllZones && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 18,
              }}
            >
              {timeZones.map((place) => {
                const checked = selectedZones.includes(place.zone);

                return (
                  <button
                    key={place.zone}
                    onClick={() => {
                      setSelectedZones((current) =>
                        checked
                          ? current.filter((zone) => zone !== place.zone)
                          : [...current, place.zone]
                      );
                    }}
                    style={{
                      border: checked
                        ? "1px solid #fbbf24"
                        : "1px solid #334155",
                      background: checked ? "#292315" : "#0b1220",
                      color: checked ? "#fbbf24" : "#cbd5e1",
                      borderRadius: 9,
                      padding: "8px 11px",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    {place.flag} {place.name} {checked ? "✓" : "+"}
                  </button>
                );
              })}
            </div>
          )}

          {visibleZones.length === 0 ? (
            <p style={{ color: "#94a3b8" }}>
              Zgjidh te pakten nje vend per te pare oren.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 12,
              }}
            >
              {visibleZones.map((place) => (
                <div
                  key={place.zone}
                  style={{
                    background: "#0b1220",
                    border:
                      selectedZone === place.zone
                        ? "1px solid #fbbf24"
                        : "1px solid #273449",
                    borderRadius: 13,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 15, fontWeight: 700 }}>
                      {place.flag} {place.name}
                    </span>
                    <span style={{ color: "#64748b", fontSize: 11 }}>
                      {place.city}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: 29,
                      fontWeight: 800,
                      color: "#fbbf24",
                      marginTop: 14,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {now ? getLocalTime(place.zone, now) : "--:--:--"}
                  </div>

                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 5 }}>
                    {now ? getLocalDate(place.zone, now) : "--"}
                  </div>

                  <button
                    onClick={() => setSelectedZone(place.zone)}
                    style={{
                      ...buttonStyle,
                      marginTop: 12,
                      padding: "7px 10px",
                      fontSize: 12,
                      background:
                        selectedZone === place.zone ? "#22c55e" : "#1e293b",
                      color: "#f8fafc",
                    }}
                  >
                    {selectedZone === place.zone
                      ? "Zona aktive"
                      : "Perdor kete zone"}
                  </button>
                </div>
              ))}
            </div>
          )}

          <p
            style={{
              color: "#64748b",
              fontSize: 12,
              marginBottom: 0,
              marginTop: 16,
            }}
          >
            Oret perditesohen cdo sekonde. Zonat kohore pershtaten
            automatikisht me oren verore dhe dimerore.
          </p>
        </section>

        {/* Sinjali */}
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
            style={{ ...buttonStyle, marginTop: 12 }}
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
