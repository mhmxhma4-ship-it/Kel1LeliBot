
"use client";

import { useCallback, useEffect, useState } from "react";

type Data = Record<string, any>;

const formatNumber = (value: unknown, decimals = 2): string => {
  if (value === null || value === undefined || value === "") return "—";

  const number =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));

  return Number.isFinite(number) ? number.toFixed(decimals) : "—";
};

const first = (obj: Data | null, keys: string[]) => {
  if (!obj) return undefined;

  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null && value !== "") return value;
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
  },
};

const getText = (language: string, key: string) =>
  translations[language]?.[key] ?? translations.en[key] ?? translations.sq[key] ?? key;

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
      <div className={`metric-value ${accent ? "gold-text" : ""}`}>{value}</div>
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

  const t = (key: string) => getText(language, key);

  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem("kelilelibot-language");
      const savedTimezone = localStorage.getItem("kelilelibot-timezone");

      if (savedLanguage) setLanguage(savedLanguage);
      if (savedTimezone) setTimezone(savedTimezone);
    } catch {
      // Local storage may be unavailable.
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [signalsResponse, backtestResponse] = await Promise.all([
        fetch("/api/signals", { cache: "no-store" }),
        fetch("/api/backtest", { cache: "no-store" }),
      ]);

      if (!signalsResponse.ok) {
        throw new Error(`Signals API: ${signalsResponse.status}`);
      }

      if (!backtestResponse.ok) {
        throw new Error(`Backtest API: ${backtestResponse.status}`);
      }

      const [signalsData, backtestData] = await Promise.all([
        signalsResponse.json(),
        backtestResponse.json(),
      ]);

      setSignals(signalsData);
      setBacktest(backtestData);
      setLastUpdated(
        new Intl.DateTimeFormat(language, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: timezone,
        }).format(new Date())
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
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

  const signalValue = String(
    first(signals, ["signal", "action", "recommendation", "type"]) ?? "—"
  ).toUpperCase();

  const price = formatNumber(
    first(signals, ["price", "currentPrice", "close", "lastPrice", "current_price"])
  );

  const rsi = formatNumber(
    first(signals, ["rsi", "RSI", "rsi_value", "rsiValue"])
  );

  const emaFast = formatNumber(
    first(signals, [
      "emaFast",
      "ema_fast",
      "ema_ fast",
      "fastEMA",
      "ema9",
      "ema_9",
      "ema_20",
      "ema20",
    ])
  );

  const emaSlow = formatNumber(
    first(signals, [
      "emaSlow",
      "ema_slow",
      "slowEMA",
      "ema50",
      "ema_50",
      "ema_200",
      "ema200",
    ])
  );

  const tradesValue = first(backtest, ["trades", "results", "history"]);
  const trades: Data[] = Array.isArray(tradesValue) ? tradesValue : [];

  const totalTrades = formatNumber(
    first(backtest, ["totalTrades", "total_trades", "total", "tradesCount"]) ??
      trades.length,
    0
  );

  const wins = formatNumber(
    first(backtest, ["wins", "winningTrades", "winning_trades"]) ??
      trades.filter((trade) =>
        String(first(trade, ["result", "status", "outcome"]) ?? "").toLowerCase().includes("win")
      ).length,
    0
  );

  const losses = formatNumber(
    first(backtest, ["losses", "losingTrades", "losing_trades"]) ??
      trades.filter((trade) =>
        String(first(trade, ["result", "status", "outcome"]) ?? "").toLowerCase().includes("loss")
      ).length,
    0
  );

  const winRate = formatNumber(
    first(backtest, ["winRate", "win_rate", "winrate", "winRatePercent"])
  );

  const profit = formatNumber(
    first(backtest, ["profit", "netProfit", "net_profit", "totalProfit", "pnl"])
  );

  return (
    <main className="app-shell">
      <style jsx global>{`
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background: #08090c;
          color: #f4f4f5;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        button, select { font: inherit; }
        .app-shell {
          min-height: 100vh;
          padding: 24px;
          background:
            radial-gradient(ellipse at top right, rgba(194, 146, 45, .11), transparent 35%),
            #08090c;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .topbar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; margin-bottom: 28px;
        }
        .brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .brand-mark {
          width: 43px; height: 43px; border: 1px solid #9f792d;
          border-radius: 13px; display: grid; place-items: center;
          color: #e8bd59; font-weight: 900; background: #17130a;
        }
        .brand-title { margin: 0; font-size: 21px; font-weight: 800; letter-spacing: .2px; }
        .subtitle { color: #888b95; font-size: 12px; margin-top: 4px; }
        .top-actions { display: flex; align-items: center; gap: 10px; }
        .live-pill {
          display: flex; align-items: center; gap: 7px; color: #7ee0a4;
          border: 1px solid #235b3b; background: #102218; padding: 8px 11px;
          border-radius: 999px; font-size: 11px; font-weight: 800;
        }
        .live-dot { width: 7px; height: 7px; border-radius: 50%; background: #4cdb82; }
        .icon-button {
          position: relative; width: 38px; height: 38px; display: flex;
          flex-direction: column; align-items: center; justify-content: center;
          gap: 4px; border: 1px solid #33343b; border-radius: 10px;
          background: #14151a; color: #f4f4f5; cursor: pointer; padding: 0;
        }
        .hamb-line { height: 2px; background: #e8bd59; border-radius: 3px; display: block; }
        .hamb-line:nth-child(1), .hamb-line:nth-child(3) { width: 16px; }
        .hamb-line:nth-child(2) { width: 11px; }
        .close-mark { position: relative; width: 17px; height: 17px; display: block; }
        .close-mark::before, .close-mark::after {
          content: ""; position: absolute; left: 7.75px; top: 0;
          height: 17px; width: 1.5px; background: #e8bd59; border-radius: 2px;
        }
        .close-mark::before { transform: rotate(45deg); }
        .close-mark::after { transform: rotate(-45deg); }
        .panel {
          border: 1px solid #282930; border-radius: 17px; padding: 20px;
          background: linear-gradient(145deg, rgba(22,23,28,.96), rgba(13,14,18,.98));
          box-shadow: 0 10px 35px rgba(0,0,0,.12);
        }
        .panel-heading {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-bottom: 18px;
        }
        .panel-title { margin: 0; font-size: 15px; font-weight: 750; }
        .gold-text { color: #e8bd59 !important; }
        .metrics-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
        .metric {
          padding: 17px; border: 1px solid #292a31; border-radius: 13px;
          background: rgba(255,255,255,.018); min-width: 0;
        }
        .metric-label { color: #92939c; font-size: 12px; margin-bottom: 10px; }
        .metric-value {
          color: #f3f3f5; font-size: clamp(18px, 2.4vw, 25px);
          font-weight: 800; overflow-wrap: anywhere; font-variant-numeric: tabular-nums;
        }
        .signal-value { font-size: 25px; letter-spacing: .4px; }
        .signal-buy { color: #54dc94 !important; }
        .signal-sell { color: #ff6e78 !important; }
        .signal-neutral { color: #e8bd59 !important; }
        .section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 18px 0; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; }
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 560px; }
        th, td { padding: 13px 12px; border-bottom: 1px solid #292a31; text-align: left; font-size: 12px; white-space: nowrap; }
        th { color: #92939c; font-weight: 650; }
        td { color: #e4e4e7; }
        .positive { color: #54dc94 !important; }
        .negative { color: #ff6e78 !important; }
        .muted { color: #888b95; font-size: 12px; }
        .refresh-button {
          border: 1px solid #795c24; color: #e8bd59; background: #211a0d;
          padding: 9px 12px; border-radius: 9px; cursor: pointer; font-size: 12px;
        }
        .menu-backdrop {
          position: fixed; inset: 0; z-index: 20; background: rgba(0,0,0,.55);
          display: flex; justify-content: flex-end;
        }
        .menu-panel {
          width: min(340px, 88vw); height: 100%; padding: 22px;
          background: #111217; border-left: 1px solid #383027;
          box-shadow: -20px 0 60px rgba(0,0,0,.35);
        }
        .menu-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 26px; }
        .menu-title { font-size: 17px; font-weight: 800; }
        .menu-close {
          width: 30px; height: 30px; display: flex; align-items: center;
          justify-content: center; border: 1px solid #393a42; border-radius: 8px;
          background: #1c1d23; color: #e8bd59; font-size: 23px; line-height: 1;
          padding: 0; cursor: pointer; transform: translateY(-1px);
        }
        .field-label { display: block; color: #a1a1aa; font-size: 12px; margin: 18px 0 8px; }
        .select-field {
          width: 100%; padding: 12px; color: #f4f4f5; background: #1a1b21;
          border: 1px solid #373840; border-radius: 9px; outline: none;
        }
        .error-message { color: #ff8d94; background: #2a1418; border: 1px solid #5b292f; border-radius: 10px; padding: 12px; font-size: 12px; margin-bottom: 18px; overflow-wrap: anywhere; }
        @media (max-width: 760px) {
          .app-shell { padding: 15px; }
          .topbar { align-items: flex-start; }
          .subtitle { max-width: 200px; line-height: 1.4; }
          .live-pill { padding: 7px 9px; }
          .metrics-grid { grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
          .section-grid { grid-template-columns: 1fr; }
          .panel { padding: 15px; }
          .stats-grid { gap: 8px; }
          .metric { padding: 14px; }
          .metric-value { font-size: 21px; }
        }
      `}</style>

      <div className="container">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">K</div>
            <div>
              <h1 className="brand-title">{t("title")}</h1>
              <div className="subtitle">{t("subtitle")}</div>
            </div>
          </div>

          <div className="top-actions">
            <div className="live-pill"><span className="live-dot" />{t("live")}</div>
            <button
              className="icon-button"
              aria-label={menuOpen ? t("close") : t("menu")}
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

        {error && <div className="error-message">{t("error")} {error}</div>}

        <section className="panel">
          <div className="panel-heading">
            <h2 className="panel-title">{t("signal")}</h2>
            <button className="refresh-button" onClick={loadData} disabled={loading}>
              {loading ? t("loading") : t("refresh")}
            </button>
          </div>

          <div className="metrics-grid">
            <Metric
              label={t("signal")}
              value={signalValue}
              accent
            />
            <Metric label={t("price")} value={price} />
            <Metric label={t("rsi")} value={rsi} />
            <Metric label={t("emaFast")} value={emaFast} />
          </div>
          <div style={{ height: 12 }} />
          <div className="metrics-grid">
            <Metric label={t("emaSlow")} value={emaSlow} />
            <Metric label={t("rsi")} value={rsi} />
            <Metric label={t("emaFast")} value={emaFast} />
            <Metric label={t("emaSlow")} value={emaSlow} />
          </div>
          <div className="muted" style={{ marginTop: 15 }}>
            {lastUpdated ? `${t("refresh")}: ${lastUpdated}` : ""}
          </div>
        </section>

        <section className="section-grid">
          <div className="panel">
            <div className="panel-heading">
              <h2 className="panel-title">{t("performance")}</h2>
            </div>
            <div className="stats-grid">
              <Metric label={t("totalTrades")} value={totalTrades} />
              <Metric label={t("wins")} value={wins} />
              <Metric label={t("losses")} value={losses} />
            </div>
            <div style={{ height: 12 }} />
            <div className="stats-grid">
              <Metric label={t("winRate")} value={`${winRate}${winRate !== "—" ? "%" : ""}`} accent />
              <Metric label={t("profit")} value={profit} accent />
              <Metric label={t("price")} value={price} />
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <h2 className="panel-title">{t("recentTrades")}</h2>
            </div>
            {trades.length === 0 ? (
              <div className="muted">{loading ? t("loading") : t("noTrades")}</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t("date")}</th>
                      <th>{t("type")}</th>
                      <th>{t("entry")}</th>
                      <th>{t("exit")}</th>
                      <th>{t("result")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.slice(0, 10).map((trade, index) => {
                      const result = first(trade, ["result", "profit", "pnl", "status", "outcome"]);
                      const resultText = String(result ?? "—");
                      const positive = Number(result) > 0 || resultText.toLowerCase().includes("win");
                      const negative = Number(result) < 0 || resultText.toLowerCase().includes("loss");

                      return (
                        <tr key={String(first(trade, ["id", "ticket", "time"]) ?? index)}>
                          <td>{String(first(trade, ["date", "time", "timestamp", "openedAt"]) ?? "—")}</td>
                          <td>{String(first(trade, ["type", "side", "direction", "signal"]) ?? "—")}</td>
                          <td>{formatNumber(first(trade, ["entry", "entryPrice", "entry_price"]))}</td>
                          <td>{formatNumber(first(trade, ["exit", "exitPrice", "exit_price"]))}</td>
                          <td className={positive ? "positive" : negative ? "negative" : ""}>
                            {typeof result === "number" ? formatNumber(result) : resultText}
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
        <div className="menu-backdrop" onClick={() => setMenuOpen(false)}>
          <aside className="menu-panel" onClick={(event) => event.stopPropagation()}>
            <div className="menu-header">
              <div className="menu-title">{t("menu")}</div>
              <button
                className="menu-close"
                aria-label={t("close")}
                onClick={() => setMenuOpen(false)}
              >
                ×
              </button>
            </div>

            <label className="field-label">{t("language")}</label>
            <select
              className="select-field"
              value={language}
              onChange={(event) => changeLanguage(event.target.value)}
            >
              {languages.map((item) => (
                <option key={item.code} value={item.code}>{item.label}</option>
              ))}
            </select>

            <label className="field-label">{t("timezone")}</label>
            <select
              className="select-field"
              value={timezone}
              onChange={(event) => changeTimezone(event.target.value)}
            >
              {timeZones.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
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
              {t("refresh")}
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}
