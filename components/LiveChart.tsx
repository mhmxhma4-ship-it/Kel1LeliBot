
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

type Props = {
  entry?: number | null;
  stopLoss?: number | null;
  takeProfit1?: number | null;
  takeProfit2?: number | null;
};

const WIDTH = 900;
const HEIGHT = 440;
const TOP = 24;
const BOTTOM = 42;
const LEFT = 12;
const RIGHT = 82;

function formatPrice(value: number) {
  return value.toFixed(2);
}

export default function LiveChart({
  entry = null,
  stopLoss = null,
  takeProfit1 = null,
  takeProfit2 = null,
}: Props) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [interval, setIntervalValue] = useState("5min");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  const loadCandles = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/chart?interval=${interval}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Grafiku nuk u ngarkua.");
      }

      if (!Array.isArray(data.candles)) {
        throw new Error("Te dhenat e grafikut nuk jane valide.");
      }

      setCandles(data.candles);
      setUpdatedAt(data.updatedAt || new Date().toISOString());
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gabim ne grafik."
      );
    } finally {
      setLoading(false);
    }
  }, [interval]);

  useEffect(() => {
    setLoading(true);
    loadCandles();

    const timer = window.setInterval(loadCandles, 60000);

    return () => window.clearInterval(timer);
  }, [loadCandles]);

  const chart = useMemo(() => {
    if (!candles.length) return null;

    const visible = candles.slice(-70);
    const highs = visible.map((c) => c.high);
    const lows = visible.map((c) => c.low);

    const levels = [
      entry,
      stopLoss,
      takeProfit1,
      takeProfit2,
    ].filter(
      (value): value is number =>
        typeof value === "number" &&
        Number.isFinite(value) &&
        value > 0
    );

    const min = Math.min(...lows, ...levels);
    const max = Math.max(...highs, ...levels);
    const padding = Math.max((max - min) * 0.08, max * 0.0002);

    const minPrice = min - padding;
    const maxPrice = max + padding;
    const plotHeight = HEIGHT - TOP - BOTTOM;
    const plotWidth = WIDTH - LEFT - RIGHT;

    const y = (price: number) =>
      TOP +
      ((maxPrice - price) / (maxPrice - minPrice)) *
        plotHeight;

    const step = plotWidth / visible.length;
    const bodyWidth = Math.max(3, step * 0.62);

    return {
      visible,
      minPrice,
      maxPrice,
      plotHeight,
      plotWidth,
      step,
      bodyWidth,
      y,
      candles: visible.map((candle, index) => {
        const x = LEFT + index * step + step / 2;
        const rising = candle.close >= candle.open;
        const top = y(Math.max(candle.open, candle.close));
        const bottom = y(Math.min(candle.open, candle.close));

        return {
          ...candle,
          x,
          rising,
          wickTop: y(candle.high),
          wickBottom: y(candle.low),
          bodyTop: top,
          bodyHeight: Math.max(1.5, bottom - top),
        };
      }),
    };
  }, [candles, entry, stopLoss, takeProfit1, takeProfit2]);

  const currentPrice = candles.length
    ? candles[candles.length - 1].close
    : null;

  const priceLines = [
    { label: "ENTRY", value: entry, color: "#60a5fa" },
    { label: "SL", value: stopLoss, color: "#ef4444" },
    { label: "TP1", value: takeProfit1, color: "#eab308" },
    { label: "TP2", value: takeProfit2, color: "#22c55e" },
  ].filter(
    (item): item is { label: string; value: number; color: string } =>
      typeof item.value === "number" &&
      Number.isFinite(item.value) &&
      item.value > 0
  );

  return (
    <section className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220] text-white shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
        <div>
          <div className="text-xs font-semibold tracking-[0.2em] text-gray-400">
            LIVE MARKET CHART
          </div>
          <div className="mt-1 text-xl font-bold">XAU/USD</div>
          <div className="mt-1 text-sm text-gray-400">
            {currentPrice !== null
              ? `$${formatPrice(currentPrice)}`
              : "Duke ngarkuar cmimin..."}
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {[
            ["1min", "1M"],
            ["5min", "5M"],
            ["15min", "15M"],
            ["1h", "1H"],
            ["4h", "4H"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setIntervalValue(value)}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                interval === value
                  ? "bg-blue-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 px-4 py-3 text-xs text-gray-400">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          Bullish
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-400" />
          Bearish
        </span>
        <span>70 candles</span>
        <span className="ml-auto">
          {updatedAt
            ? `Update: ${new Date(updatedAt).toLocaleTimeString()}`
            : "Waiting..."}
        </span>
      </div>

      {loading && candles.length === 0 ? (
        <div className="flex h-80 items-center justify-center text-sm text-gray-400">
          Duke ngarkuar grafikun...
        </div>
      ) : error && candles.length === 0 ? (
        <div className="p-8 text-center text-sm text-red-400">
          {error}
          <button
            onClick={loadCandles}
            className="ml-3 rounded-lg bg-white/10 px-3 py-2 text-white"
          >
            Provo perseri
          </button>
        </div>
      ) : chart ? (
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="block h-auto w-full min-w-[620px]"
            role="img"
            aria-label="Grafik candlestick XAU/USD"
          >
            {Array.from({ length: 6 }).map((_, index) => {
              const price =
                chart.maxPrice -
                ((chart.maxPrice - chart.minPrice) * index) / 5;
              const y = chart.y(price);

              return (
                <g key={index}>
                  <line
                    x1={LEFT}
                    x2={WIDTH - RIGHT}
                    y1={y}
                    y2={y}
                    stroke="#263244"
                    strokeDasharray="4 5"
                  />
                  <text
                    x={WIDTH - RIGHT + 9}
                    y={y + 4}
                    fill="#94a3b8"
                    fontSize="12"
                  >
                    {formatPrice(price)}
                  </text>
                </g>
              );
            })}

            {chart.candles.map((candle, index) => (
              <g key={`${candle.time}-${index}`}>
                <line
                  x1={candle.x}
                  x2={candle.x}
                  y1={candle.wickTop}
                  y2={candle.wickBottom}
                  stroke={candle.rising ? "#22c55e" : "#ef4444"}
                  strokeWidth="1.5"
                />
                <rect
                  x={candle.x - chart.bodyWidth / 2}
                  y={candle.bodyTop}
                  width={chart.bodyWidth}
                  height={candle.bodyHeight}
                  rx="1"
                  fill={candle.rising ? "#22c55e" : "#ef4444"}
                />
              </g>
            ))}

            {priceLines.map((line) => {
              if (
                line.value < chart.minPrice ||
                line.value > chart.maxPrice
              ) {
                return null;
              }

              const y = chart.y(line.value);

              return (
                <g key={line.label}>
                  <line
                    x1={LEFT}
                    x2={WIDTH - RIGHT}
                    y1={y}
                    y2={y}
                    stroke={line.color}
                    strokeWidth="1.5"
                    strokeDasharray="7 4"
                  />
                  <text
                    x={WIDTH - RIGHT + 8}
                    y={y - 5}
                    fill={line.color}
                    fontSize="11"
                    fontWeight="bold"
                  >
                    {line.label}
                  </text>
                </g>
              );
            })}

            {currentPrice !== null && (
              <g>
                <line
                  x1={LEFT}
                  x2={WIDTH - RIGHT}
                  y1={chart.y(currentPrice)}
                  y2={chart.y(currentPrice)}
                  stroke="#f8fafc"
                  strokeDasharray="3 4"
                  opacity="0.8"
                />
                <circle
                  cx={WIDTH - RIGHT}
                  cy={chart.y(currentPrice)}
                  r="3"
                  fill="#f8fafc"
                />
              </g>
            )}

            {chart.candles
              .filter((_, index) => index % 10 === 0)
              .map((candle, index) => (
                <text
                  key={index}
                  x={candle.x}
                  y={HEIGHT - 13}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {candle.time.slice(11, 16)}
                </text>
              ))}
          </svg>
        </div>
      ) : (
        <div className="p-8 text-center text-gray-400">
          Nuk ka te dhena per grafikun.
        </div>
      )}

      <div className="flex flex-wrap gap-3 border-t border-white/10 p-4 text-xs">
        {priceLines.map((line) => (
          <span key={line.label} style={{ color: line.color }}>
            {line.label}: {formatPrice(line.value)}
          </span>
        ))}
        {error && (
          <span className="text-red-400">
            Rifreskimi i fundit deshtoi: {error}
          </span>
        )}
      </div>
    </section>
  );
}
