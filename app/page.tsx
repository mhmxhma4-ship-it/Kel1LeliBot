
"use client";

import { useCallback, useEffect, useState } from "react";

type Data = Record<string, any>;

const formatNumber = (value: unknown, decimals = 2): string => {
  if (value === null || value === undefined || value === "") return "—";

  const n =
    typeof value === "number"
      ? value
      : Number(String(value).replace(",", "."));

  return Number.isFinite(n) ? n.toFixed(decimals) : "—";
};

const getNumber = (obj: Data | null, keys: string[]): number | null => {
  if (!obj) return null;

  for (const key of keys) {
    const value = obj[key];

    if (value !== null && value !== undefined && value !== "") {
      const n = Number(String(value).replace(",", "."));
      if (Number.isFinite(n)) return n;
    }
  }

  return null;
};

const getValue = (obj: Data | null, keys: string[]): any => {
  if (!obj) return undefined;

  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      return obj[key];
    }
  }

  return undefined;
};

const languages = [
  { code: "sq", label: "Shqip" },
  { code: "en", label: "English" },
  { code: "el", label: "Ελληνικά" },
  { code: "it", label: "Italiano" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "tr", label: "Türkçe" },
  { code: "ar", label: "العربية" },
  { code: "ru", label: "Русский" },
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
];

const timeZones = [
  { value: "Europe/Athens", label: "Greece" },
  { value: "Europe/Tirane", label: "Albania" },
  { value: "Europe/London", label: "London" },
  { value: "America/New_York", label: "New York" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Europe/Berlin", label: "Frankfurt" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "UTC", label: "UTC" },
];

const translations: Record<string, Record<string, string>> = {
  sq: {
    title: "KeliLelibot",
    subtitle: "Sistemi i sinjaleve XAU/USD",
    live: "LIVE",
    refresh: "Rifresko",
    language: "Gjuha",
    timezone: "Zona kohore",
    signal: "Sinjali aktual",
    price: "Cmimi aktual",
    rsi: "RSI",
    emaFast: "EMA Fast",
    emaSlow: "EMA Slow",
    performance: "Performanca",
    totalTrades: "Gjithsej tregtime",
    wins: "Fitore",
    losses: "Humbje",
    winRate: "Norma e fitoreve",
    profit: "Fitimi",
    recentTrades: "Tregtimet e fundit",
    date: "Data",
    type: "Lloji",
    entry: "Hyrja",
    exit: "Dalja",
    result: "Rezultati",
    loading: "Duke ngarkuar...",
    noTrades: "Nuk ka tregtime per te shfaqur.",
    error: "Nuk u moren te dhenat.",
    menu: "Menuja",
    close: "Mbyll",
    buyScore: "BUY Score",
    sellScore: "SELL Score",
    scoreNote: "Vleresim teknik, jo probabilitet i garantuar fitimi",
    indicators: "Indikatoret teknik",
    macd: "MACD",
    entryPrice: "Cmimi i hyrjes",
    stopLoss: "Stop Loss",
    takeProfit: "Take Profit",
    unavailable: "Nuk ka te dhena",
  },
  en: {
    title: "KeliLelibot",
    subtitle: "XAU/USD Signal System",
    live: "LIVE",
    refresh: "Refresh",
    language: "Language",
    timezone: "Time zone",
    signal: "Current signal",
    price: "Current price",
    rsi: "RSI",
    emaFast: "EMA Fast",
    emaSlow: "EMA Slow",
    performance: "Performance",
    totalTrades: "Total trades",
    wins: "Wins",
    losses: "Losses",
    winRate: "Win rate",
    profit: "Profit",
    recentTrades: "Recent trades",
    date: "Date",
    type: "Type",
    entry: "Entry",
    exit: "Exit",
    result: "Result",
    loading: "Loading...",
    noTrades: "No trades to display.",
    error: "Could not load data.",
    menu: "Menu",
    close: "Close",
    buyScore: "BUY Score",
    sellScore: "SELL Score",
    scoreNote: "Technical score, not a guaranteed win probability",
    indicators: "Technical indicators",
    macd: "MACD",
    entryPrice: "Entry price",
    stopLoss: "Stop Loss",
    takeProfit: "Take Profit",
    unavailable: "No data available",
  },
};

const t = (language: string, key: string) =>
  translations[language]?.[key] ?? translations.en[key] ?? translations.sq[key] ?? key;

/*
 * Llogarit nje score teknik orientues nga indikatorët e disponueshem.
 * Nuk eshte probabilitet i kalibruar fitimi.
 *
 * EMA: 40 pike
 * RSI: 30 pike
 * MACD: 30 pike
 *
 * Nese mungon nje indikator, pesha e tij nuk perdoret.
 */
function calculateScores(data: Data | null) {
  const rsi = getNumber(data, ["rsi", "RSI", "rsi_value", "rsiValue"]);

  const emaFast = getNumber(data, [
    "emaFast",
    "ema_fast",
    "fastEMA",
    "ema9",
    "ema_9",
    "ema20",
    "ema_20",
  ]);

  const emaSlow = getNumber(data, [
    "emaSlow",
    "ema_slow",
    "slowEMA",
    "ema50",
    "ema_50",
    "ema200",
    "ema_200",
  ]);

  const macd = getNumber(data, [
    "macd",
    "MACD",
    "macd_value",
    "macdValue",
    "macdHistogram",
    "macd_histogram",
    "histogram",
  ]);

  let buyPoints = 0;
  let sellPoints = 0;
  let availableWeight = 0;

  if (emaFast !== null && emaSlow !== null) {
    availableWeight += 40;

    if (emaFast > emaSlow) buyPoints += 40;
    else if (emaFast < emaSlow) sellPoints += 40;
    else {
      buyPoints += 20;
      sellPoints += 20;
    }
  }

  if (rsi !== null) {
    availableWeight += 30;

    if (rsi > 55) buyPoints += 30;
    else if (rsi < 45) sellPoints += 30;
    else {
      buyPoints += 15;
      sellPoints += 15;
    }
  }

  if (macd !== null) {
    availableWeight += 30;

    if (macd > 0) buyPoints += 30;
    else if (macd < 0) sellPoints += 30;
    else {
      buyPoints += 15;
      sellPoints += 15;
    }
  }

  if (availableWeight === 0) {
    return {
      buy: 50,
      sell: 50,
      hasData: false,
      rsi,
      emaFast,
      emaSlow,
      macd,
    };
  }

  const buy = Math.round((buyPoints / availableWeight) * 100);
  const sell = 100 - buy;

  return {
    buy,
    sell,
    hasData: true,
    rsi,
    emaFast,
    emaSlow,
    macd,
  };
}

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${accent ? "gold-text" : ""}`}>
        {value}
      </div>
    </div>
  );
}

export default function Home() {
  const [signals, setSignals] = useState<Data | null>(null);
  const [backtest, setBacktest] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [language, setLanguage] = useState("sq");
  const [timezone, setTimezone] = useState("Europe/Athens");
  const [lastUpdated, setLastUpdated] = useState("");

  const text = (key: string) => t(language, key);

  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem("kelilelibot-language");
      const savedTimezone = localStorage.getItem("kelilelibot-timezone");

      if (savedLanguage) setLanguage(savedLanguage);
      if (savedTimezone) setTimezone(savedTimezone);
    } catch {
      // Local storage mund te mos jete i disponueshem.
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [signalResponse, backtestResponse] = await Promise.all([
        fetch("/api/signals", { cache: "no-store" }),
        fetch("/api/backtest", { cache: "no-store" }),
      ]);

      if (!signalResponse.ok) {
        throw new Error(`Signals API: ${signalResponse.status}`);
      }

      if (!backtestResponse.ok) {
        throw new Error(`Backtest API: ${backtestResponse.status}`);
      }

      const [signalData, backtestData] = await Promise.all([
        signalResponse.json(),
        backtestResponse.json(),
      ]);

      setSignals(signalData);
      setBacktest(backtestData);

      setLastUpdated(
        new Intl.DateTimeFormat(language, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: timezone,
        }).format(new Date())
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : text("error"));
    } finally {
      setLoading(false);
    }
  }, [language, timezone]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60_000);

    return () => clearInterval(interval);
  }, [loadData]);

  const changeLanguage = (value: string) => {
    setLanguage(value);
    try {
      localStorage.setItem("kelilelibot-language", value);
    } catch {}
  };

  const changeTimezone = (value: string) => {
    setTimezone(value);
    try {
      localStorage.setItem("kelilelibot-timezone", value);
    } catch {}
  };

  const scores = calculateScores(signals);

  const signalValue = String(
    getValue(signals, ["signal", "action", "recommendation", "type"]) ?? "—"
  ).toUpperCase();

  const signalClass = signalValue.includes("BUY")
    ? "signal-buy"
    : signalValue.includes("SELL")
      ? "signal-sell"
      : "signal-neutral";

  const price = formatNumber(
    getNumber(signals, [
      "price",
      "currentPrice",
      "close",
      "lastPrice",
      "current_price",
    ])
  );

  const tradesValue = getValue(backtest, ["trades", "results", "history"]);
  const trades: Data[] = Array.isArray(tradesValue) ? tradesValue : [];

  const totalTrades = formatNumber(
    getValue(backtest, [
      "totalTrades",
      "total_trades",
      "total",
      "tradesCount",
    ]) ?? trades.length,
    0
  );

  const wins = formatNumber(
    getValue(backtest, ["wins", "winningTrades", "winning_trades"]) ??
      trades.filter((trade) =>
        String(
          getValue(trade, ["result", "status", "outcome"]) ?? ""
        )
          .toLowerCase()
          .includes("win")
      ).length,
    0
  );

  const losses = formatNumber(
    getValue(backtest, ["losses", "losingTrades", "losing_trades"]) ??
      trades.filter((trade) =>
        String(
          getValue(trade, ["result", "status", "outcome"]) ?? ""
        )
          .toLowerCase()
          .includes("loss")
      ).length,
    0
  );

  const winRate = formatNumber(
    getNumber(backtest, ["winRate", "win_rate", "winrate", "winRatePercent"])
  );

  const profit = formatNumber(
    getNumber(backtest, [
      "profit",
      "netProfit",
      "net_profit",
      "totalProfit",
      "pnl",
    ])
  );

  const entryPrice = formatNumber(
    getNumber(signals, ["entry", "entryPrice", "entry_price", "entry_price"])
  );

  const stopLoss = formatNumber(
    getNumber(signals, ["stopLoss", "stop_loss", "sl"])
  );

  const takeProfit = formatNumber(
    getNumber(signals, ["takeProfit", "take_profit", "tp"])
  );

  return (
    <main className="app-shell">
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #08090c;
          color: #f4f4f5;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        button,
        select {
          font: inherit;
        }

        .app-shell {
          min-height: 100vh;
          padding: 24px;
          background:
            radial-gradient(
              ellipse at top right,
              rgba(194, 146, 45, 0.11),
              transparent 35%
            ),
            #08090c;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 28px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .brand-mark {
          width: 43px;
          height: 43px;
          border: 1px solid #9f792d;
          border-radius: 13px;
          display: grid;
          place-items: center;
          color: #e8bd59;
          font-weight: 900;
          background: #17130a;
        }

        .brand-title {
          margin: 0;
          font-size: 21px;
          font-weight: 800;
        }

        .subtitle {
          color: #888b95;
          font-size: 12px;
          margin-top: 4px;
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .live-pill {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #7ee0a4;
          border: 1px solid #235b3b;
          background: #102218;
          padding: 8px 11px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }

        .live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #4cdb82;
        }

        .icon-button {
          width: 38px;
          height: 38px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          border: 1px solid #33343b;
          border-radius: 10px;
          background: #14151a;
          color: #f4f4f5;
          cursor: pointer;
          padding: 0;
        }

        .hamb-line {
          height: 2px;
          background: #e8bd59;
          border-radius: 3px;
          display: block;
        }

        .hamb-line:nth-child(1),
        .hamb-line:nth-child(3) {
          width: 16px;
        }

        .hamb-line:nth-child(2) {
          width: 11px;
        }

        .close-mark {
          position: relative;
          width: 17px;
          height: 17px;
          display: block;
        }

        .close-mark::before,
        .close-mark::after {
          content: "";
          position: absolute;
          left: 7.75px;
          top: 0;
          height: 17px;
          width: 1.5px;
          background: #e8bd59;
          border-radius: 2px;
        }

        .close-mark::before {
          transform: rotate(45deg);
        }

        .close-mark::after {
          transform: rotate(-45deg);
        }

        .panel {
          border: 1px solid #282930;
          border-radius: 17px;
          padding: 20px;
          background: linear-gradient(
            145deg,
            rgba(22, 23, 28, 0.96),
            rgba(13, 14, 18, 0.98)
          );
          box-shadow: 0 10px 35px rgba(0, 0, 0, 0.12);
        }

        .panel-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 18px;
        }

        .panel-title {
          margin: 0;
          font-size: 15px;
          font-weight: 750;
        }

        .gold-text {
          color: #e8bd59 !important;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .metric {
          padding: 17px;
          border: 1px solid #292a31;
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.018);
          min-width: 0;
        }

        .metric-label {
          color: #92939c;
          font-size: 12px;
          margin-bottom: 10px;
        }

        .metric-value {
          color: #f3f3f5;
          font-size: clamp(18px, 2.4vw, 25px);
          font-weight: 800;
          overflow-wrap: anywhere;
          font-variant-numeric: tabular-nums;
        }

        .signal-value {
          font-size: 25px;
          letter-spacing: 0.4px;
        }

        .signal-buy,
        .positive {
          color: #54dc94 !important;
        }

        .signal-sell,
        .negative {
          color: #ff6e78 !important;
        }

        .signal-neutral {
          color: #e8bd59 !important;
        }

        .score-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-top: 14px;
        }

        .score-card {
          padding: 17px;
          border-radius: 13px;
          border: 1px solid #292a31;
          background: #101116;
        }

        .score-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .score-name {
          font-size: 13px;
          font-weight: 750;
        }

        .score-number {
          font-size: 25px;
          font-weight: 850;
          font-variant-numeric: tabular-nums;
        }

        .buy-color {
          color: #54dc94;
        }

        .sell-color {
          color: #ff6e78;
        }

        .bar-track {
          width: 100%;
          height: 8px;
          border-radius: 999px;
          overflow: hidden;
          background: #282930;
        }

        .bar-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.35s ease;
        }

        .buy-fill {
          background: #39c981;
        }

        .sell-fill {
          background: #f05d6c;
        }

        .score-note {
          color: #888b95;
          font-size: 11px;
          margin-top: 12px;
          line-height: 1.5;
        }

        .section-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin: 18px 0;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .table-wrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 560px;
        }

        th,
        td {
          padding: 13px 12px;
          border-bottom: 1px solid #292a31;
          text-align: left;
          font-size: 12px;
          white-space: nowrap;
        }

        th {
          color: #92939c;
          font-weight: 650;
        }

        td {
          color: #e4e4e7;
        }

        .muted {
          color: #888b95;
          font-size: 12px;
        }

        .refresh-button {
          border: 1px solid #795c24;
          color: #e8bd59;
          background: #211a0d;
          padding: 9px 12px;
          border-radius: 9px;
          cursor: pointer;
          font-size: 12px;
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .menu-backdrop {
          position: fixed;
          inset: 0;
          z-index: 20;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          justify-content: flex-end;
        }

        .menu-panel {
          width: min(340px, 88vw);
          height: 100%;
          padding: 22px;
          background: #111217;
          border-left: 1px solid #383027;
          box-shadow: -20px 0 60px rgba(0, 0, 0, 0.35);
        }

        .menu-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 26px;
        }

        .menu-title {
          font-size: 17px;
          font-weight: 800;
        }

        .menu-close {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #393a42;
          border-radius: 8px;
          background: #1c1d23;
          color: #e8bd59;
          font-size: 23px;
          line-height: 1;
          padding: 0;
          cursor: pointer;
        }

        .field-label {
          display: block;
          color: #a1a1aa;
          font-size: 12px;
          margin: 18px 0 8px;
        }

        .select-field {
          width: 100%;
          padding: 12px;
          color: #f4f4f5;
          background: #1a1b21;
          border: 1px solid #373840;
          border-radius: 9px;
          outline: none;
        }

        .error-message {
          color: #ff8d94;
          background: #2a1418;
          border: 1px solid #5b292f;
          border-radius: 10px;
          padding: 12px;
          font-size: 12px;
          margin-bottom: 18px;
          overflow-wrap: anywhere;
        }

        @media (max-width: 760px) {
          .app-shell {
            padding: 15px;
          }

          .topbar {
            align-items: flex-start;
          }

          .subtitle {
            max-width: 200px;
            line-height: 1.4;
          }

          .live-pill {
            padding: 7px 9px;
          }

          .metrics-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .score-grid,
          .section-grid {
            grid-template-columns: 1fr;
          }

          .panel {
            padding: 15px;
          }

          .stats-grid {
            gap: 8px;
          }

          .metric {
            padding: 14px;
          }

          .metric-value {
            font-size: 21px;
          }
        }
      `}</style>

      <div className="container">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">K</div>
            <div>
              <h1 className="brand-title">{text("title")}</h1>
              <div className="subtitle">{text("subtitle")}</div>
            </div>
          </div>

          <div className="top-actions">
            <div className="live-pill">
              <span className="live-dot" />
              {text("live")}
            </div>

            <button
              className="icon-button"
              aria-label={menuOpen ? text("close") : text("menu")}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <span className="close-mark" />
              ) : (
                <>
                  <span className="hamb-line" />
                  <span className="hamb-line" />
                  <span className="hamb-line" />
                </>
              )}
            </button>
          </div>
        </header>

        {error && (
          <div className="error-message">
            {text("error")} {error}
          </div>
        )}

        <section className="panel">
          <div className="panel-heading">
            <h2 className="panel-title">{text("signal")}</h2>
            <button
              className="refresh-button"
              onClick={loadData}
              disabled={loading}
            >
              {loading ? text("loading") : text("refresh")}
            </button>
          </div>

          <div className="metrics-grid">
            <div className="metric">
              <div className="metric-label">{text("signal")}</div>
              <div className={`metric-value signal-value ${signalClass}`}>
                {signalValue}
              </div>
            </div>

            <Metric label={text("price")} value={price} />
            <Metric label={text("rsi")} value={formatNumber(scores.rsi)} />
            <Metric
              label={text("emaFast")}
              value={formatNumber(scores.emaFast)}
            />
          </div>

          <div className="score-grid">
            <div className="score-card">
              <div className="score-top">
                <span className="score-name buy-color">
                  {text("buyScore")}
                </span>
                <span className="score-number buy-color">
                  {scores.buy}%
                </span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill buy-fill"
                  style={{ width: `${scores.buy}%` }}
                />
              </div>
            </div>

            <div className="score-card">
              <div className="score-top">
                <span className="score-name sell-color">
                  {text("sellScore")}
                </span>
                <span className="score-number sell-color">
                  {scores.sell}%
                </span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill sell-fill"
                  style={{ width: `${scores.sell}%` }}
                />
              </div>
            </div>
          </div>

          <div className="score-note">
            {!scores.hasData
              ? "Nuk u gjeten te dhenat e nevojshme per score. Shfaqet 50/50 derisa API te ktheje RSI, EMA ose MACD."
              : text("scoreNote")}
          </div>

          <div style={{ height: 14 }} />

          <div className="metrics-grid">
            <Metric
              label={text("emaSlow")}
              value={formatNumber(scores.emaSlow)}
            />
            <Metric label={text("macd")} value={formatNumber(scores.macd)} />
            <Metric
              label={text("entryPrice")}
              value={entryPrice}
            />
            <Metric
              label={text("stopLoss")}
              value={stopLoss}
            />
          </div>

          <div style={{ height: 12 }} />

          <div className="metrics-grid">
            <Metric label={text("takeProfit")} value={takeProfit} />
          </div>

          <div className="muted" style={{ marginTop: 15 }}>
            {lastUpdated
              ? `${text("refresh")}: ${lastUpdated}`
              : ""}
          </div>
        </section>

        <section className="section-grid">
          <div className="panel">
            <div className="panel-heading">
              <h2 className="panel-title">{text("performance")}</h2>
            </div>

            <div className="stats-grid">
              <Metric label={text("totalTrades")} value={totalTrades} />
              <Metric label={text("wins")} value={wins} />
              <Metric label={text("losses")} value={losses} />
            </div>

            <div style={{ height: 12 }} />

            <div className="stats-grid">
              <Metric
                label={text("winRate")}
                value={`${winRate}${winRate !== "—" ? "%" : ""}`}
                accent
              />
              <Metric label={text("profit")} value={profit} accent />
              <Metric label={text("price")} value={price} />
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <h2 className="panel-title">{text("recentTrades")}</h2>
            </div>

            {trades.length === 0 ? (
              <div className="muted">
                {loading ? text("loading") : text("noTrades")}
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{text("date")}</th>
                      <th>{text("type")}</th>
                      <th>{text("entry")}</th>
                      <th>{text("exit")}</th>
                      <th>{text("result")}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {trades.slice(0, 10).map((trade, index) => {
                      const result = getValue(trade, [
                        "result",
                        "profit",
                        "pnl",
                        "status",
                        "outcome",
                      ]);

                      const resultText = String(result ?? "—");
                      const lower = resultText.toLowerCase();

                      const positive =
                        Number(result) > 0 || lower.includes("win");

                      const negative =
                        Number(result) < 0 || lower.includes("loss");

                      return (
                        <tr
                          key={String(
                            getValue(trade, ["id", "ticket", "time"]) ?? index
                          )}
                        >
                          <td>
                            {String(
                              getValue(trade, [
                                "date",
                                "time",
                                "timestamp",
                                "openedAt",
                              ]) ?? "—"
                            )}
                          </td>

                          <td>
                            {String(
                              getValue(trade, [
                                "type",
                                "side",
                                "direction",
                                "signal",
                              ]) ?? "—"
                            )}
                          </td>

                          <td>
                            {formatNumber(
                              getNumber(trade, [
                                "entry",
                                "entryPrice",
                                "entry_price",
                              ])
                            )}
                          </td>

                          <td>
                            {formatNumber(
                              getNumber(trade, [
                                "exit",
                                "exitPrice",
                                "exit_price",
                              ])
                            )}
                          </td>

                          <td
                            className={
                              positive
                                ? "positive"
                                : negative
                                  ? "negative"
                                  : ""
                            }
                          >
                            {typeof result === "number"
                              ? formatNumber(result)
                              : resultText}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      {menuOpen && (
        <div
          className="menu-backdrop"
          onClick={() => setMenuOpen(false)}
        >
          <aside
            className="menu-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="menu-header">
              <div className="menu-title">{text("menu")}</div>
              <button
                className="menu-close"
                aria-label={text("close")}
                onClick={() => setMenuOpen(false)}
              >
                ×
              </button>
            </div>

            <label className="field-label">{text("language")}</label>
            <select
              className="select-field"
              value={language}
              onChange={(event) => changeLanguage(event.target.value)}
            >
              {languages.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>

            <label className="field-label">{text("timezone")}</label>
            <select
              className="select-field"
              value={timezone}
              onChange={(event) => changeTimezone(event.target.value)}
            >
              {timeZones.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <button
              className="refresh-button"
              style={{ width: "100%", marginTop: 24 }}
              onClick={() => {
                setMenuOpen(false);
                loadData();
              }}
            >
              {text("refresh")}
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}
