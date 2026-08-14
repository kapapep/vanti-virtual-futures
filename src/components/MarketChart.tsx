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

import { VaneChevron } from "@/components/vanti/vane-chevron";
import { cn } from "@/lib/utils";

export type MarketChartPoint = { time: number; value: number };

export const MARKET_TIMEFRAMES = ["1H", "6H", "1D", "1W", "ALL"] as const;
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
  return [...byTime.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([time, value]) => ({ time: time as UTCTimestamp, value }));
}

const fullRange = {
  autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }),
};

/**
 * Single YES probability line with a gradient area fill and a vane chevron
 * marker at the latest point, tilted with the probability.
 */
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

  const [internalTf, setInternalTf] = useState<MarketTimeframe>("1W");
  const activeTf = timeframe ?? internalTf;

  const [marker, setMarker] = useState<{ top: number; left: number } | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const yesSeriesData = useMemo(() => toSeries(yesData), [yesData]);

  // Latest values the label placement needs, read from inside stable callbacks.
  const latest = useRef({ currentYes, yesSeriesData });
  latest.current = { currentYes, yesSeriesData };

  // Create the chart once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const yesColor = token("--vanti-yes", "#3ECF8E");

    const chart = createChart(el, {
      layout: {
        background: { color: "transparent" },
        textColor: "transparent",
        fontFamily: "Figtree",
        attributionLogo: false,
      },
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
      width: el.clientWidth,
      height: el.clientHeight,
    });

    const yes = chart.addSeries(AreaSeries, {
      lineColor: yesColor,
      lineWidth: 2,
      topColor: `color-mix(in srgb, ${yesColor} 18%, transparent)`,
      bottomColor: "rgba(0,0,0,0)",
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerBorderColor: yesColor,
      crosshairMarkerBackgroundColor: yesColor,
      ...fullRange,
    });

    chartRef.current = chart;
    yesSeriesRef.current = yes;

    const unsub = chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        setHover(null);
        return;
      }
      const y = param.seriesData.get(yes) as { value?: number } | undefined;
      setHover(y?.value ?? null);
    });

    const observer = new ResizeObserver(() => {
      if (!containerRef.current) return;
      chart.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
      chart.timeScale().fitContent();
      queueLabels();
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      void unsub;
      chart.remove();
      chartRef.current = null;
      yesSeriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function queueLabels() {
    requestAnimationFrame(() => {
      const chart = chartRef.current;
      const yes = yesSeriesRef.current;
      if (!chart || !yes) return;
      const snap = latest.current;

      const lastYes = snap.yesSeriesData.at(-1);
      const y = yes.priceToCoordinate(lastYes?.value ?? snap.currentYes);
      const x =
        lastYes === undefined
          ? null
          : chart.timeScale().timeToCoordinate(lastYes.time as Time);
      setMarker(y === null || x === null ? null : { top: y, left: x });
    });
  }

  // Push data and refresh label positions.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !yesSeriesRef.current) return;
    yesSeriesRef.current.setData(yesSeriesData);
    chart.timeScale().fitContent();
    queueLabels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yesSeriesData, currentYes]);

  const shownYes = hover ?? currentYes;
  const tilt = (shownYes - 50) * 0.6;

  return (
    <div className="w-full">
      {/* Timeframe pills sit above the plot. */}
      <div className="flex items-center gap-1.5">
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
              className="vane-num rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors duration-150"
              style={
                active
                  ? { color: "var(--vanti-blue)", backgroundColor: "rgba(76,111,255,0.12)" }
                  : { color: "var(--vanti-muted)", backgroundColor: "transparent" }
              }
            >
              {tf}
            </button>
          );
        })}
      </div>

      <div className="relative mt-2 h-[280px] w-full sm:h-[360px]">
        <div ref={containerRef} className="absolute inset-0" />

        {marker ? (
          <div
            className="pointer-events-none absolute"
            style={{
              top: marker.top,
              left: marker.left,
              transform: `translate(-50%, -50%) rotate(${tilt}deg)`,
              color: "var(--vanti-blue)",
            }}
          >
            <VaneChevron size={14} />
          </div>
        ) : null}

        <div className="pointer-events-none absolute right-0 top-0 text-right">
          <div className="vane-label">YES</div>
          <div
            className="vane-num text-[28px] font-extrabold leading-none"
            style={{ color: "var(--vanti-yes)" }}
          >
            {Math.round(shownYes)}%
          </div>
        </div>
      </div>

      {volume === undefined ? null : (
        <div className={cn("mt-2 flex items-baseline gap-2")}>
          <span className="vane-label">Volume</span>
          <span className="vane-num text-xs" style={{ color: "var(--vanti-muted)" }}>
            V{Math.round(volume).toLocaleString("en-US")}
          </span>
        </div>
      )}
    </div>
  );
}
