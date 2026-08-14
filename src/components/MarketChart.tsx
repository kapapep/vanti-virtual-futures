import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";

import { cn } from "@/lib/utils";

export type MarketChartPoint = { time: number; value: number };

export const MARKET_TIMEFRAMES = ["LIVE", "1D", "1W", "1M", "ALL"] as const;
export type MarketTimeframe = (typeof MARKET_TIMEFRAMES)[number];

type Props = {
  yesData: MarketChartPoint[];
  noData: MarketChartPoint[];
  yesLabel: string;
  noLabel: string;
  currentYes: number;
  currentNo: number;
  volume?: number;
  timeframe?: MarketTimeframe;
  onTimeframeChange?: (tf: MarketTimeframe) => void;
};

const YES_COLOR = "#00D68F";
const NO_COLOR = "#FFFFFF";
/** Minimum vertical distance between the two overlay labels, in pixels. */
const LABEL_MIN_GAP = 60;

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

/** Market probability chart drawn with TradingView Lightweight Charts. */
export function MarketChart({
  yesData,
  noData,
  yesLabel,
  noLabel,
  currentYes,
  currentNo,
  volume,
  timeframe,
  onTimeframeChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const yesSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const noSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const [internalTf, setInternalTf] = useState<MarketTimeframe>("1W");
  const activeTf = timeframe ?? internalTf;

  const [yesTop, setYesTop] = useState<number | null>(null);
  const [noTop, setNoTop] = useState<number | null>(null);
  const [labelLeft, setLabelLeft] = useState<number | null>(null);
  const [hover, setHover] = useState<{ yes: number; no: number } | null>(null);

  const yesSeriesData = useMemo(() => toSeries(yesData), [yesData]);
  const noSeriesData = useMemo(() => toSeries(noData), [noData]);

  // Latest values the label placement needs, read from inside stable callbacks.
  const latest = useRef({ currentYes, currentNo, yesSeriesData, noSeriesData });
  latest.current = { currentYes, currentNo, yesSeriesData, noSeriesData };

  // Create the chart once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

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
      timeScale: { visible: false, fixLeftEdge: true, fixRightEdge: true, rightOffset: 12 },
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

    const yes = chart.addSeries(LineSeries, {
      color: YES_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
      ...fullRange,
    });
    const no = chart.addSeries(LineSeries, {
      color: NO_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
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
      const n = param.seriesData.get(no) as { value?: number } | undefined;
      if (y?.value === undefined || n?.value === undefined) {
        setHover(null);
        return;
      }
      setHover({ yes: y.value, no: n.value });
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
      noSeriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function queueLabels() {
    requestAnimationFrame(() => {
      const chart = chartRef.current;
      const yes = yesSeriesRef.current;
      const no = noSeriesRef.current;
      if (!chart || !yes || !no) return;
      const snap = latest.current;

      const lastYes = snap.yesSeriesData.at(-1);
      const lastNo = snap.noSeriesData.at(-1);
      let y: number | null = yes.priceToCoordinate(lastYes?.value ?? snap.currentYes);
      let n: number | null = no.priceToCoordinate(lastNo?.value ?? snap.currentNo);

      // Never let the two labels collide: push the lower one further down.
      if (y !== null && n !== null && Math.abs(y - n) < LABEL_MIN_GAP) {
        if (y >= n) y = n + LABEL_MIN_GAP;
        else n = y + LABEL_MIN_GAP;
      }

      const lastTime = lastYes?.time ?? lastNo?.time;
      const x =
        lastTime === undefined ? null : chart.timeScale().timeToCoordinate(lastTime as Time);

      setYesTop(y);
      setNoTop(n);
      setLabelLeft(x === null ? null : x + 8);
    });
  }

  // Push data and refresh label positions.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !yesSeriesRef.current || !noSeriesRef.current) return;
    yesSeriesRef.current.setData(yesSeriesData);
    noSeriesRef.current.setData(noSeriesData);
    chart.timeScale().fitContent();
    queueLabels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yesSeriesData, noSeriesData, currentYes, currentNo]);

  const shownYes = hover ? hover.yes : currentYes;
  const shownNo = hover ? hover.no : currentNo;

  return (
    <div className="w-full">
      <div className="relative h-[440px] w-full sm:h-[480px]">
        <div ref={containerRef} className="absolute inset-0" />

        <Overlay top={yesTop} left={labelLeft} label={yesLabel} value={shownYes} color={YES_COLOR} />
        <Overlay top={noTop} left={labelLeft} label={noLabel} value={shownNo} color={NO_COLOR} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-4">
        <span className="num text-xs text-white/35">
          {volume === undefined
            ? null
            : `V${Math.round(volume).toLocaleString("en-US")} vol`}
        </span>
        <div className="flex items-center gap-5">
          {MARKET_TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => {
                setInternalTf(tf);
                onTimeframeChange?.(tf);
              }}
              className={cn(
                "bg-transparent text-xs font-semibold uppercase tracking-[0.05em] transition-opacity",
                tf === activeTf ? "text-white opacity-100" : "text-white opacity-35",
              )}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Overlay({
  top,
  left,
  label,
  value,
  color,
}: {
  top: number | null;
  left: number | null;
  label: string;
  value: number;
  color: string;
}) {
  if (top === null || left === null) return null;
  return (
    <div
      className="pointer-events-none absolute translate-y-[-50%]"
      style={{ top, left }}
    >
      <div
        className="text-[13px] uppercase tracking-[0.12em] opacity-60"
        style={{ color }}
      >
        {label}
      </div>
      <div className="num text-[32px] font-extrabold leading-none" style={{ color }}>
        {Math.round(value)}%
      </div>
    </div>
  );
}
