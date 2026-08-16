import { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";

export type MarketChartPoint = { time: number; value: number };

export const MARKET_TIMEFRAMES = ["LIVE", "1D", "1W", "1M", "ALL"] as const;
export type MarketTimeframe = (typeof MARKET_TIMEFRAMES)[number];

type Props = {
  yesData: MarketChartPoint[];
  currentYes: number;
  volume?: number;
  timeframe?: MarketTimeframe;
  onTimeframeChange?: (tf: MarketTimeframe) => void;
};

/** Reads a palette token off the document so colours live only in CSS. */
function token(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** Canvas fills need a concrete rgba(), not color-mix(). */
function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m?.[1]) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Drops empty/invalid points, keeps the last value per timestamp, sorts
 * ascending and clamps to 1–99 so the line never spikes to an edge.
 */
function toSeries(points: MarketChartPoint[]): LineData<Time>[] {
  const byTime = new Map<number, number>();
  for (const p of points) {
    const value = Number(p.value);
    if (value === null || value === undefined || !Number.isFinite(value) || value === 0) continue;
    const time = Math.floor(Number(p.time));
    if (!Number.isFinite(time)) continue;
    byTime.set(time, Math.min(99, Math.max(1, value)));
  }
  const out: LineData<Time>[] = [];
  for (const [time, value] of [...byTime.entries()].sort((a, b) => a[0] - b[0])) {
    const prev = out.at(-1)?.value;
    // A >40 point step between neighbouring samples is corrupt data, not a move.
    if (prev !== undefined && Math.abs(value - prev) > 40) continue;
    out.push({ time: time as UTCTimestamp, value });
  }
  return out;
}

const fullRange = {
  autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }),
};

/** Single YES probability line with a gradient area fill on a fixed 0–100 scale. */
export function MarketChart({
  yesData,
  currentYes,
  volume,
  timeframe,
  onTimeframeChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const yesSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const noSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  const [internalTf, setInternalTf] = useState<MarketTimeframe>("1W");
  const activeTf = timeframe ?? internalTf;

  const [hover, setHover] = useState<number | null>(null);

  const yesSeriesData = useMemo(() => toSeries(yesData), [yesData]);
  // NO mirrors YES at every point: they always sum to 100.
  const noSeriesData = useMemo(
    () => yesSeriesData.map((p) => ({ time: p.time, value: 100 - p.value })),
    [yesSeriesData],
  );

  // Create the chart once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const yesColor = token("--vanti-yes", "#3ECF8E");

    const chart = createChart(el, {
      width: el.clientWidth || 300,
      height: el.clientHeight || 280,
      layout: {
        background: { color: "transparent" },
        textColor: "transparent",
        fontFamily: "Figtree",
        attributionLogo: false,
      },
      localization: { locale: "en-US" },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: { visible: false, fixLeftEdge: true, rightOffset: 6 },
      crosshair: {
        mode: 1,
        vertLine: { width: 1, color: "rgba(255,255,255,0.2)", labelVisible: false },
        horzLine: { visible: false, labelVisible: false },
      },
      handleScroll: false,
      handleScale: false,
      autoSize: false,
    });

    const yes = chart.addSeries(AreaSeries, {
      lineColor: yesColor,
      lineWidth: 2,
      topColor: withAlpha(yesColor, 0.18),
      bottomColor: "rgba(0,0,0,0)",
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerBorderColor: yesColor,
      crosshairMarkerBackgroundColor: yesColor,
      ...fullRange,
    });

    const no = chart.addSeries(AreaSeries, {
      lineColor: "#FFFFFF",
      lineWidth: 2,
      topColor: "rgba(0,0,0,0)",
      bottomColor: "rgba(0,0,0,0)",
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerBorderColor: "#FFFFFF",
      crosshairMarkerBackgroundColor: "#FFFFFF",
      ...fullRange,
    });

    chartRef.current = chart;
    yesSeriesRef.current = yes;
    noSeriesRef.current = no;

    const unsub = chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        setHover(null);
        return;
      }
      const y = param.seriesData.get(yes) as { value?: number } | undefined;
      setHover(y?.value ?? null);
    });

    const resize = () => {
      const node = containerRef.current;
      if (!node) return;
      const w = node.clientWidth;
      const h = node.clientHeight;
      if (w <= 0 || h <= 0) return;
      chart.applyOptions({ width: w, height: h });
      chart.timeScale().fitContent();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    // iOS Safari can report a 0/stale width during the first layout pass.
    const raf1 = requestAnimationFrame(resize);
    const raf2 = requestAnimationFrame(() => requestAnimationFrame(resize));
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
      observer.disconnect();
      void unsub;
      chart.remove();
      chartRef.current = null;
      yesSeriesRef.current = null;
      noSeriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push data, then re-measure so the series always spans the full container.
  useEffect(() => {
    const chart = chartRef.current;
    const series = yesSeriesRef.current;
    const noSeries = noSeriesRef.current;
    if (!chart || !series || !noSeries) return;
    series.setData(yesSeriesData);
    noSeries.setData(noSeriesData);

    const fit = () => {
      const node = containerRef.current;
      if (!node) return;
      const w = node.clientWidth;
      const h = node.clientHeight;
      if (w > 0 && h > 0) chart.applyOptions({ width: w, height: h });
      chart.timeScale().fitContent();
    };
    fit();
    const raf = requestAnimationFrame(fit);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yesSeriesData, noSeriesData, currentYes]);

  const shownYes = hover ?? currentYes;
  const shownNo = 100 - shownYes;

  return (
    <div className="w-full">
      {/* Volume left, plain-text timeframes right — its own row above the plot so
          it can never collide with the floating buy buttons. */}
      <div className="mb-3 flex items-center justify-between gap-4">
        <span
          className="vane-num text-[12px]"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          {volume === undefined
            ? ""
            : `V${Math.round(volume).toLocaleString("en-US")} vol`}
        </span>
        <div className="flex items-center gap-4 sm:gap-5">
          {MARKET_TIMEFRAMES.map((tf) => {
            const active = tf === activeTf;
            return (
              <button
                key={tf}
                type="button"
                onClick={() => {
                  setInternalTf(tf);
                  onTimeframeChange?.(tf);
                }}
                className="min-h-9 px-1 text-[12px] font-semibold uppercase tracking-[0.05em]"
                style={{ color: active ? "#FFFFFF" : "rgba(255,255,255,0.35)" }}
              >
                {tf}
              </button>
            );
          })}
        </div>
      </div>

      {/* The plot is absolutely positioned inside a full-width box, so it always
          has a definite width to measure (flex basis could collapse it). */}
      <div className="relative h-[280px] w-full sm:h-[380px] lg:h-[440px]">
        <div ref={containerRef} className="absolute inset-y-0 left-0 right-[60px]" />
        <div className="absolute inset-y-0 right-0 flex w-[54px] flex-col justify-center gap-6">
          <div>
            <div className="vane-label">YES</div>
            <div
              className="vane-num text-[24px] font-extrabold leading-none"
              style={{ color: "var(--vanti-yes)" }}
            >
              {Math.round(shownYes)}%
            </div>
          </div>
          <div>
            <div className="vane-label">NO</div>
            <div
              className="vane-num text-[24px] font-extrabold leading-none"
              style={{ color: "#FFFFFF" }}
            >
              {Math.round(shownNo)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
