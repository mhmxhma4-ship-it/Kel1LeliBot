
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

const colors = {
  background: "#070707",
  panel: "rgba(19, 19, 19, 0.88)",
  panelSoft: "rgba(255, 255, 255, 0.025)",
  border: "rgba(242, 190, 76, 0.16)",
  gold: "#f5c15c",
  goldBright: "#ffdc8a",
  muted: "#929292",
  text: "#f7f4ed",
  green: "#4ade80",
  red: "#fb7185",
};

const panelStyle = {
  background: colors.panel,
  border: `1px solid ${colors.border}`,
  borderRadius: 20,
  padding: 20,
  boxShadow: "0 12px 36px rgba(0,0,0,0.20)",
  backdropFilter: "blur(16px)",
} as const;

const labelStyle = {
  color: colors.muted,
  fontSize: 12,
  letterSpacing: 0.7,
} as const;

const buttonStyle = {
  background: `linear-gradient(135deg, ${colors.goldBright}, ${colors.gold})`,
  color: "#17120a",
  border: "1px solid rgba(255, 220, 138, 0.65)",
  borderRadius: 12,
  padding: "12px 16px",
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
  boxShadow: "0 4px 18px rgba(245,193,92,0.10)",
  transition: "transform 180ms ease, box-shadow 180ms ease",
} as const;

const smallLabelStyle = {
  color: "#858585",
  fontSize: 11,
  letterSpacing: 1.4,
  fontWeight: 700,
} as const;

const cellStyle = {
  padding: "14px 12px",
  borderBottom: "1px solid rgba(255,255,255,0.065)",
  whiteSpace: "nowrap" as const,
} as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        color: colors.gold,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 2,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
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

  const isBuy =
    signalName.includes("BUY") || signalName.includes("LONG");
  const isSell =
    signalName.includes("SELL") || signalName.includes("SHORT");

  const signalColor = isBuy
    ? colors.green
    : isSell
      ? colors.red
      : colors.gold;

  const signalDescription = isBuy
    ? "Sinjal per blerje"
    : isSell
      ? "Sinjal per shitje"
      : "Ne pritje te nje konfigurimi";

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

  const activePlace =
    timeZones.find((place) => place.zone === selectedZone) ?? timeZones[0];

  const statCards = [
    {
      label: "Tregtime",
      value: displayValue(tradeCount),
      icon: "↗",
      accent: "#f5c15c",
    },
    {
      label: "Win rate",
      value: displayValue(winRate, "%"),
      icon: "%",
      accent: "#4ade80",
    },
    {
      label: "Profit factor",
      value: displayValue(profitFactor),
      icon: "◆",
      accent: "#f5c15c",
    },
    {
      label: "Kthimi neto",
      value: displayValue(netReturn, "%"),
      icon: "↑",
      accent:
        typeof netReturn === "number" && netReturn < 0
          ? colors.red
          : colors.green,
    },
    {
      label: "Max drawdown",
      value: displayValue(maxDrawdown, "%"),
      icon: "↓",
      accent: colors.red,
    },
    {
      label: "Kapitali final",
      value: displayValue(finalCapital),
      icon: "$",
      accent: "#f5c15c",
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at 50% -12%, rgba(184,132,39,0.17), transparent 43%), radial-gradient(ellipse at 100% 40%, rgba(132,88,22,0.06), transparent 35%), #070707",
        color: colors.text,
        padding: "26px 16px 55px",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        html { background: #070707; }
        body { margin: 0; background: #070707; }
        button, select { font: inherit; }
        button { -webkit-tap-highlight-color: transparent; }
        button:disabled { opacity: .58; cursor: wait; }
        .kl-card {
          transition: border-color 200ms ease, transform 200ms ease, box-shadow 200ms ease;
        }
        .kl-card:hover {
          border-color: rgba(245,193,92,.38) !important;
          box-shadow: 0 12px 36px rgba(0,0,0,.25), 0 0 22px rgba(245,193,92,.035);
        }
        .kl-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 7px 23px rgba(245,193,92,.19);
        }
        .kl-menu-button:hover { border-color: #ffdc8a !important; }
        .kl-live-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 12px rgba(74,222,128,.65);
          animation: kl-pulse 1.8s infinite;
        }
        .kl-gold-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(245,193,92,.5), transparent);
        }
        .kl-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .kl-table { min-width: 720px; }
        .kl-table tbody tr { transition: background 150ms ease; }
        .kl-table tbody tr:hover { background: rgba(245,193,92,.035); }
        .kl-menu-select:focus { outline: 2px solid rgba(245,193,92,.35); outline-offset: 2px; }
        @keyframes kl-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .55; transform: scale(.82); }
        }
        @keyframes kl-appear {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .kl-appear { animation: kl-appear 350ms ease both; }
        @media (max-width: 540px) {
          .kl-main { padding: 19px 12px 38px !important; }
          .kl-heading { font-size: 26px !important; }
          .kl-panel { padding: 16px !important; border-radius: 17px !important; }
          .kl-status-time { text-align: left !important; width: 100%; }
          .kl-signal-value { font-size: 31px !important; }
          .kl-stat-value { font-size: 21px !important; }
          .kl-header-subtitle { font-size: 12px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      <div className="kl-main" style={{ maxWidth: 1120, margin: "0 auto" }}>
        {/* HEADER */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 14,
            marginBottom: 27,
            position: "relative",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                color: colors.gold,
                fontSize: 10,
                letterSpacing: 2.7,
                fontWeight: 800,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  border: "1px solid rgba(245,193,92,.65)",
                  borderRadius: 9,
                  background:
                    "linear-gradient(145deg, rgba(245,193,92,.18), rgba(245,193,92,.025))",
                  fontSize: 12,
                  letterSpacing: -1,
                  boxShadow: "0 0 18px rgba(245,193,92,.08)",
                }}
              >
                KL
              </span>
              <span>GOLD TRADING SYSTEM</span>
            </div>

            <h1
              className="kl-heading"
              style={{
                fontSize: 34,
                letterSpacing: -1.5,
                margin: "12px 0 7px",
                fontWeight: 850,
                lineHeight: 1.1,
              }}
            >
              Keli<span style={{ color: colors.gold }}>Leli</span>
              <span style={{ color: "#777" }}>bot</span>
            </h1>

            <p
              className="kl-header-subtitle"
              style={{ color: "#929292", margin: 0, fontSize: 13 }}
            >
              XAU/USD <span style={{ color: "#555" }}>·</span> EMA 9/21/200
              <span style={{ color: "#555" }}> · </span> RSI 14
            </p>
          </div>

          {/* Menuja e vetme */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              className="kl-menu-button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? "Mbyll menune" : "Hap menune"}
              aria-expanded={menuOpen}
              style={{
                width: 48,
                height: 48,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                background: menuOpen
                  ? `linear-gradient(135deg, ${colors.goldBright}, ${colors.gold})`
                  : "rgba(245,193,92,.055)",
                border: "1px solid rgba(245,193,92,.4)",
                borderRadius: 15,
                cursor: "pointer",
                transition: "all 180ms ease",
                boxShadow: "0 5px 22px rgba(0,0,0,.22)",
              }}
            >
              {[0, 1, 2].map((line) => (
                <span
                  key={line}
                  style={{
                    width: line === 1 ? 16 : 20,
                    height: 2,
                    background: menuOpen ? "#17120a" : colors.gold,
                    borderRadius: 4,
                    transition: "all 180ms ease",
                  }}
                />
              ))}
            </button>

            {menuOpen && (
              <>
                <button
                  aria-label="Mbyll menune"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 40,
                    background: "transparent",
                    border: "none",
                    cursor: "default",
                  }}
                />

                <div
                  className="kl-appear"
                  style={{
                    position: "absolute",
                    zIndex: 41,
                    top: 59,
                    right: 0,
                    width: "min(320px, calc(100vw - 28px))",
                    padding: 19,
                    background: "rgba(17,17,17,.98)",
                    border: "1px solid rgba(245,193,92,.3)",
                    borderRadius: 19,
                    boxShadow: "0 22px 65px rgba(0,0,0,.72), 0 0 30px rgba(245,193,92,.045)",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 18,
                    }}
                  >
                    <div>
                      <SectionLabel>Personalizo</SectionLabel>
                      <h2 style={{ fontSize: 19, margin: "7px 0 0" }}>
                        Ora dhe zona
                      </h2>
                    </div>

                    <button
                      onClick={() => setMenuOpen(false)}
                      aria-label="Mbyll"
                      style={{
                        width: 33,
                        height: 33,
                        borderRadius: 10,
                        border: `1px solid ${colors.border}`,
                        background: "#101010",
                        color: "#eee",
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
                      color: colors.muted,
                      fontSize: 12,
                      marginBottom: 8,
                    }}
                  >
                    Zgjidh zonen kohore
                  </label>

                  <select
                    id="timezone"
                    className="kl-menu-select"
                    value={selectedZone}
                    onChange={(event) => setSelectedZone(event.target.value)}
                    style={{
                      width: "100%",
                      background: "#0a0a0a",
                      color: colors.text,
                      border: "1px solid rgba(245,193,92,.38)",
                      borderRadius: 12,
                      padding: "13px 11px",
                      fontSize: 14,
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
                      marginTop: 16,
                      padding: 16,
                      background:
                        "linear-gradient(145deg, rgba(245,193,92,.09), rgba(255,255,255,.015))",
                      border: "1px solid rgba(245,193,92,.2)",
                      borderRadius: 15,
                    }}
                  >
                    <div style={{ color: colors.muted, fontSize: 12 }}>
                      {activePlace.flag} Ora ne {activePlace.name}
                    </div>

                    <div
                      style={{
                        color: colors.goldBright,
                        fontSize: 30,
                        fontWeight: 850,
                        letterSpacing: -0.8,
                        marginTop: 7,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {now ? getLocalTime(selectedZone, now) : "--:--:--"}
                    </div>

                    <div style={{ color: "#858585", fontSize: 12, marginTop: 5 }}>
                      {now ? getLocalDate(selectedZone, now) : "--"}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "#8d8d8d",
                      fontSize: 11,
                      marginTop: 15,
                    }}
                  >
                    <span className="kl-live-dot" />
                    Ora perditesohet automatikisht
                  </div>

                  <button
                    className="kl-button"
                    onClick={() => setMenuOpen(false)}
                    style={{ ...buttonStyle, width: "100%", marginTop: 17 }}
                  >
                    U krye
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* STATUS BAR */}
        <div
          className="kl-card kl-panel"
          style={{
            ...panelStyle,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 17,
            marginBottom: 20,
            padding: "17px 20px",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                fontSize: 13,
                fontWeight: 750,
              }}
            >
              <span className="kl-live-dot" />
              <span>Sistemi aktiv ne faqe</span>
            </div>
            <div style={{ color: "#828282", fontSize: 11, marginTop: 7 }}>
              Rifreskim automatik cdo 60 sekonda
            </div>
          </div>

          <div className="kl-status-time" style={{ textAlign: "right" }}>
            <div style={{ color: "#858585", fontSize: 11 }}>
              ZONA KOHORE AKTIVE
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                marginTop: 6,
                fontSize: 13,
                fontWeight: 750,
              }}
            >
              <span>{activePlace.flag} {activePlace.name}</span>
              <span
                style={{
                  color: colors.gold,
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 800,
                }}
              >
                {now ? getLocalTime(selectedZone, now) : "--:--:--"}
              </span>
            </div>
          </div>
        </div>

        {/* SINJALI AKTUAL */}
        <section
          className="kl-card kl-panel kl-appear"
          style={{
            ...panelStyle,
            position: "relative",
            overflow: "hidden",
            marginBottom: 27,
            borderColor: isBuy
              ? "rgba(74,222,128,.28)"
              : isSell
                ? "rgba(251,113,133,.28)"
                : "rgba(245,193,92,.32)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -95,
              right: -70,
              width: 240,
              height: 240,
              borderRadius: "50%",
              background: signalColor,
              opacity: 0.055,
              filter: "blur(65px)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 14,
              position: "relative",
            }}
          >
            <div>
              <SectionLabel>Sinjali aktual · XAU/USD</SectionLabel>
              <div
                style={{
                  color: "#858585",
                  fontSize: 12,
                  marginTop: 8,
                }}
              >
                Analiza e fundit e tregut
              </div>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "7px 10px",
                borderRadius: 100,
                border: `1px solid ${signalColor}40`,
                background: `${signalColor}0D`,
                color: signalColor,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 1,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  background: signalColor,
                  borderRadius: "50%",
                }}
              />
              XAU/USD
            </div>
          </div>

          <div
            className="kl-gold-line"
            style={{ margin: "19px 0 20px" }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 15,
              position: "relative",
            }}
          >
            <div>
              <div
                className="kl-signal-value"
                style={{
                  fontSize: 39,
                  lineHeight: 1.05,
                  letterSpacing: -1,
                  fontWeight: 900,
                  color: signalColor,
                  textShadow: `0 0 28px ${signalColor}20`,
                }}
              >
                {signalLoading && !signal ? "Duke ngarkuar..." : signalName}
              </div>
              <div style={{ color: "#999", fontSize: 12, marginTop: 9 }}>
                {signalDescription}
              </div>
            </div>

            <div
              style={{
                padding: "13px 16px",
                minWidth: 125,
                borderRadius: 14,
                border: `1px solid ${signalColor}2B`,
                background: `${signalColor}09`,
              }}
            >
              <div style={smallLabelStyle}>CMIMI AKTUAL</div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 850,
                  marginTop: 7,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {displayValue(findValue(signal ?? {}, ["price", "close"]))}
              </div>
            </div>
          </div>

          {signalError && (
            <div
              style={{
                marginTop: 17,
                padding: 12,
                borderRadius: 11,
                background: "rgba(251,113,133,.07)",
                border: "1px solid rgba(251,113,133,.2)",
                color: colors.red,
                fontSize: 12,
              }}
            >
              Gabim sinjali: {signalError}
            </div>
          )}

          {signal?.reason && (
            <div
              style={{
                marginTop: 17,
                padding: 13,
                borderRadius: 12,
                background: "rgba(255,255,255,.025)",
                border: "1px solid rgba(255,255,255,.06)",
                color: "#bdbdbd",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              <span style={{ color: colors.gold, fontWeight: 800 }}>
                Arsyeja:{" "}
              </span>
              {signal.reason}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(115px, 1fr))",
              gap: 10,
              marginTop: 23,
            }}
          >
            {[
              {
                label: "RSI 14",
                value: signal?.rsi,
                detail: "Momentum",
              },
              {
                label: "EMA 9",
                value: signal?.ema9,
                detail: "Afatshkurter",
              },
              {
                label: "EMA 21",
                value: signal?.ema21,
                detail: "Afatmesem",
              },
              {
                label: "EMA 200",
                value: signal?.ema200,
                detail: "Tendenca",
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: "rgba(255,255,255,.025)",
                  border: "1px solid rgba(255,255,255,.065)",
                  borderRadius: 14,
                  padding: 14,
                  minWidth: 0,
                }}
              >
                <div style={smallLabelStyle}>{item.label}</div>
                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 800,
                    marginTop: 10,
                    overflowWrap: "anywhere",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {displayValue(item.value)}
                </div>
                <div style={{ color: "#707070", fontSize: 10, marginTop: 6 }}>
                  {item.detail}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 19,
              color: "#777",
              fontSize: 11,
            }}
          >
            <span>
              Koha e sinjalit:{" "}
              <span style={{ color: "#b1b1b1" }}>
                {signalTimestamp
                  ? formatDateTimeInZone(signalTimestamp, selectedZone)
                  : "--"}
              </span>
            </span>
            <span style={{ color: "#454545" }}>·</span>
            <span>
              Perditesuar:{" "}
              <span style={{ color: "#b1b1b1" }}>
                {lastSignalUpdate
                  ? formatDateTimeInZone(lastSignalUpdate, selectedZone)
                  : "--"}
              </span>
            </span>
          </div>

          <button
            className="kl-button"
            onClick={() => void refreshSignal()}
            disabled={signalLoading}
            style={{ ...buttonStyle, marginTop: 19 }}
          >
            {signalLoading ? "Duke ngarkuar..." : "↻  Rifresko sinjalin"}
          </button>
        </section>

        {/* BACKTEST */}
        <section style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 13,
              marginBottom: 16,
            }}
          >
            <div>
              <SectionLabel>Performanca</SectionLabel>
              <h2
                style={{
                  fontSize: 23,
                  letterSpacing: -0.6,
                  margin: "7px 0 0",
                }}
              >
                Backtest automatik
              </h2>
              <p style={{ color: "#858585", fontSize: 12, margin: "6px 0 0" }}>
                Statistikat e strategjise
              </p>
            </div>

            <button
              className="kl-button"
              onClick={() => void refreshBacktest()}
              disabled={backtestLoading}
              style={buttonStyle}
            >
              {backtestLoading ? "Duke llogaritur..." : "↻  Rillogarit"}
            </button>
          </div>

          {backtestError && (
            <div
              className="kl-panel"
              style={{
                ...panelStyle,
                color: colors.red,
                marginBottom: 14,
                fontSize: 13,
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
            {statCards.map((item) => (
              <div
                key={item.label}
                className="kl-card kl-panel"
                style={{
                  ...panelStyle,
                  padding: 17,
                  minWidth: 0,
                  position: "relative",
                  overflow: "hidden",
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
                  <div style={labelStyle}>{item.label}</div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 27,
                      height: 27,
                      borderRadius: 9,
                      background: `${item.accent}12`,
                      border: `1px solid ${item.accent}25`,
                      color: item.accent,
                      fontSize: 13,
                      fontWeight: 900,
                    }}
                  >
                    {item.icon}
                  </span>
                </div>

                <div
                  className="kl-stat-value"
                  style={{
                    fontSize: 24,
                    fontWeight: 850,
                    letterSpacing: -0.6,
                    marginTop: 16,
                    overflowWrap: "anywhere",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {item.value}
                </div>

                <div
                  style={{
                    height: 2,
                    width: 29,
                    borderRadius: 5,
                    background: item.accent,
                    opacity: 0.7,
                    marginTop: 14,
                  }}
                />
              </div>
            ))}
          </div>

          <div
            className="kl-card kl-panel"
            style={{
              ...panelStyle,
              marginTop: 13,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <div style={smallLabelStyle}>KAPITALI FILLESTAR</div>
              <div
                style={{
                  fontSize: 23,
                  fontWeight: 850,
                  marginTop: 9,
                  letterSpacing: -0.4,
                }}
              >
                {displayValue(startingCapital)}
              </div>
            </div>

            <div
              style={{
                width: 1,
                height: 43,
                background: "rgba(255,255,255,.09)",
              }}
            />

            <div style={{ flex: 1, minWidth: 145 }}>
              <div style={smallLabelStyle}>BACKTEST-I I FUNDIT</div>
              <div style={{ fontSize: 12, color: "#b4b4b4", marginTop: 9 }}>
                {lastBacktestUpdate
                  ? formatDateTimeInZone(lastBacktestUpdate, selectedZone)
                  : "--"}
              </div>
            </div>

            <div
              style={{
                padding: "8px 11px",
                borderRadius: 10,
                background: "rgba(245,193,92,.06)",
                border: "1px solid rgba(245,193,92,.15)",
                color: colors.gold,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 1,
              }}
            >
              HISTORIK
            </div>
          </div>
        </section>

        {/* TREGTIMET E FUNDIT */}
        <section
          className="kl-card kl-panel"
          style={{ ...panelStyle, padding: 20 }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 9,
            }}
          >
            <div>
              <SectionLabel>Historiku</SectionLabel>
              <h2
                style={{
                  fontSize: 22,
                  letterSpacing: -0.5,
                  margin: "7px 0 0",
                }}
              >
                Tregtimet e fundit
              </h2>
            </div>

            <div
              style={{
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                padding: "7px 10px",
                color: "#aaa",
                fontSize: 11,
              }}
            >
              {trades.length} tregtime
            </div>
          </div>

          <p style={{ color: "#858585", fontSize: 12, marginBottom: 18 }}>
            Oret shfaqen sipas zones aktive: {getZoneName(selectedZone)}.
          </p>

          {trades.length === 0 ? (
            <div
              style={{
                padding: "35px 15px",
                textAlign: "center",
                background: "rgba(255,255,255,.018)",
                border: "1px dashed rgba(245,193,92,.16)",
                borderRadius: 15,
              }}
            >
              <div style={{ fontSize: 25, marginBottom: 12, color: colors.gold }}>
                ◇
              </div>
              <div style={{ color: "#c5c5c5", fontSize: 13, fontWeight: 700 }}>
                {backtestLoading
                  ? "Duke ngarkuar tregtimet..."
                  : "Nuk ka tregtime per tu shfaqur"}
              </div>
              <div
                style={{
                  color: "#777",
                  fontSize: 11,
                  marginTop: 7,
                  lineHeight: 1.6,
                }}
              >
                {backtestLoading
                  ? "Po marrim te dhenat e fundit."
                  : "Kontrollo nese API-ja e backtest-it kthen listen e tregtimeve."}
              </div>
            </div>
          ) : (
            <div className="kl-table-wrap">
              <table
                className="kl-table"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr style={{ color: "#8f8f8f" }}>
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
                          padding: "13px 12px",
                          borderBottom: "1px solid rgba(245,193,92,.18)",
                          whiteSpace: "nowrap",
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: 0.8,
                        }}
                      >
                        {heading.toUpperCase()}
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
                        ? colors.green
                        : resultLabel === "LOSE"
                          ? colors.red
                          : colors.gold;

                    const returnText =
                      typeof resultNumber === "number" &&
                      Number.isFinite(resultNumber)
                        ? `${resultNumber > 0 ? "+" : ""}${resultNumber.toFixed(2)}%`
                        : "--";

                    const side = String(trade.side ?? "--").toUpperCase();
                    const sideColor =
                      side.includes("BUY") || side.includes("LONG")
                        ? colors.green
                        : side.includes("SELL") || side.includes("SHORT")
                          ? colors.red
                          : "#c4c4c4";

                    return (
                      <tr
                        key={`${index}-${String(
                          trade.entryTime ?? trade.entryPrice ?? trade.entry ?? ""
                        )}`}
                      >
                        <td style={{ ...cellStyle, color: sideColor, fontWeight: 800 }}>
                          {side}
                        </td>

                        <td style={cellStyle}>
                          {displayValue(trade.entryPrice ?? trade.entry)}
                        </td>

                        <td style={{ ...cellStyle, color: "#9d9d9d" }}>
                          {formatDateTimeInZone(trade.entryTime, selectedZone)}
                        </td>

                        <td style={cellStyle}>
                          {displayValue(trade.exitPrice ?? trade.exit)}
                        </td>

                        <td style={{ ...cellStyle, color: "#9d9d9d" }}>
                          {formatDateTimeInZone(trade.exitTime, selectedZone)}
                        </td>

                        <td style={cellStyle}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "5px 8px",
                              borderRadius: 7,
                              color: resultColor,
                              background: `${resultColor}10`,
                              border: `1px solid ${resultColor}25`,
                              fontSize: 10,
                              fontWeight: 900,
                              letterSpacing: 0.5,
                            }}
                          >
                            {resultLabel}
                          </span>
                        </td>

                        <td
                          style={{
                            ...cellStyle,
                            color:
                              typeof resultNumber === "number" && resultNumber > 0
                                ? colors.green
                                : typeof resultNumber === "number" &&
                                    resultNumber < 0
                                  ? colors.red
                                  : "#9b9b9b",
                            fontWeight: 850,
                            fontVariantNumeric: "tabular-nums",
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

          <div
            style={{
              marginTop: 19,
              paddingTop: 15,
              borderTop: "1px solid rgba(255,255,255,.06)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              color: "#777",
              fontSize: 10,
            }}
          >
            <span>KeliLelibot · XAU/USD</span>
            <span>Ora lokale: {getZoneName(selectedZone)}</span>
          </div>
        </section>

        <footer
          style={{
            textAlign: "center",
            paddingTop: 25,
            color: "#565656",
            fontSize: 10,
            letterSpacing: 1.2,
          }}
        >
          <span style={{ color: colors.gold }}>KL</span>
          {"  "}KELILELIBOT · GOLD TRADING SYSTEM
        </footer>
      </div>
    </main>
  );
}
