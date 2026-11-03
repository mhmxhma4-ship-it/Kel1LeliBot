
"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
} from "lightweight-charts";

const TIMEFRAMES = [
  { label: "M1", interval: "1min" },
  { label: "M5", interval: "5min" },
  { label: "M15", interval: "15min" },
  { label: "H1", interval: "1h" },
  { label: "H4", interval: "4h" },
] as const;

type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

function toChartTime(value: string): Time {
  const normalized = value.replace(" ", "T");
  const timestamp = Date.parse(
    normalized.endsWith("Z") ? normalized : `${normalized}Z`
  );

  if (!Number.isFinite(timestamp)) {
    throw new Error("Koha e candles nuk eshte valide.");
  }

  return Math.floor(timestamp / 1000) as Time;
}

export default function GoldChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const [timeframe, setTimeframe] = useState("5min");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 390,
      layout: {
        background: {
          type: ColorType.Solid,
          color: "#0b0c0e",
        },
        textColor: "#a8a8a8",
        fontFamily: "Inter, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.045)" },
        horzLines: { color: "rgba(255,255,255,0.045)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: "rgba(212,175,55,0.2)",
      },
      timeScale: {
        borderColor: "rgba(212,175,55,0.2)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#39ff88",
      downColor: "#ff6577",
      borderUpColor: "#39ff88",
      borderDownColor: "#ff6577",
      wickUpColor: "#39ff88",
      wickDownColor: "#ff6577",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) chart.applyOptions({ width });
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function loadCandles() {
      try {
        setError("");

        const response = await fetch(
          `/api/chart?interval=${encodeURIComponent(timeframe)}`,
          { cache: "no-store" }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Gabim gjate ngarkimit.");
        }

        if (!Array.isArray(data.candles)) {
          throw new Error("API nuk ktheu candles valide.");
        }

        const parsed: CandlestickData<Time>[] = data.candles
          .map((item: Candle) => ({
            time: toChartTime(item.time),
            open: Number(item.open),
            high: Number(item.high),
            low: Number(item.low),
            close: Number(item.close),
          }))
          .filter(
            (item: CandlestickData<Time>) =>
              Number.isFinite(item.open) &&
              Number.isFinite(item.high) &&
              Number.isFinite(item.low) &&
              Number.isFinite(item.close) &&
              item.high >= item.low
          );

        parsed.sort((a, b) => Number(a.time) - Number(b.time));

        const unique = parsed.filter(
          (item, index, array) =>
            index === 0 || Number(item.time) !== Number(array[index - 1].time)
        );

        if (cancelled) return;

        if (unique.length === 0) {
          throw new Error("Nuk ka candles per kete timeframe.");
        }

        seriesRef.current?.setData(unique);
        chartRef.current?.timeScale().fitContent();

        setCandles(data.candles);
        setLastUpdated(new Date().toLocaleTimeString());
        setLoading(false);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Gabim i panjohur."
        );
        setLoading(false);
      }
    }

    setLoading(true);
    void loadCandles();

    timer = setInterval(() => {
      void loadCandles();
    }, 60000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [timeframe]);

  return (
    <section
      style={{
        background: "#101114",
        border: "1px solid rgba(212,175,55,0.18)",
        borderRadius: 16,
        padding: 15,
        marginBottom: 20,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 15,
        }}
      >
        <div>
          <div
            style={{
              color: "#d4af37",
              fontSize: 10,
              letterSpacing: 1.5,
              fontWeight: 800,
            }}
          >
            LIVE MARKET CHART
          </div>
          <div
            style={{
              color: "#fff",
              fontSize: 19,
              fontWeight: 900,
              marginTop: 5,
            }}
          >
            XAU/USD
          </div>
        </div>

        <div
          style={{
            color: "#39ff88",
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          ● AUTO UPDATE
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 7,
          overflowX: "auto",
          paddingBottom: 12,
        }}
      >
        {TIMEFRAMES.map((item) => {
          const active = timeframe === item.interval;

          return (
            <button
              key={item.interval}
              onClick={() => setTimeframe(item.interval)}
              style={{
                flex: "1 0 48px",
                padding: "9px 10px",
                borderRadius: 8,
                border: active
                  ? "1px solid #d4af37"
                  : "1px solid rgba(255,255,255,0.1)",
                background: active
                  ? "rgba(212,175,55,0.15)"
                  : "#17181b",
                color: active ? "#f0ce65" : "#929292",
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div
          style={{
            color: "#ff6577",
            background: "rgba(255,101,119,0.08)",
            padding: 10,
            borderRadius: 8,
            fontSize: 12,
            marginBottom: 10,
            overflowWrap: "anywhere",
          }}
        >
          {error}
        </div>
      )}

      {loading && candles.length === 0 && !error && (
        <div
          style={{
            height: 390,
            display: "grid",
            placeItems: "center",
            color: "#d4af37",
            fontSize: 13,
          }}
        >
          Duke ngarkuar grafikun...
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          width: "100%",
          minHeight: 390,
          display: loading && candles.length === 0 ? "none" : "block",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
          marginTop: 12,
          color: "#777",
          fontSize: 10,
        }}
      >
        <span>{candles.length} candles</span>
        <span>
          {lastUpdated ? `Updated: ${lastUpdated}` : "Waiting..."}
        </span>
      </div>
    </section>
  );
}
