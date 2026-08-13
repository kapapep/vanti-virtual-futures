import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

const SEED_MARKETS = [
  { question: "Will the Fed cut rates before September?", base: 63, x: "2%", y: "10%", delay: "0s", dur: "38s" },
  { question: "Will the model ship this quarter?", base: 41, x: "84%", y: "12%", delay: "-9s", dur: "46s" },
  { question: "Will inflation print below 3%?", base: 77, x: "3%", y: "74%", delay: "-18s", dur: "52s" },
  { question: "Will the merger close in 2026?", base: 29, x: "85%", y: "72%", delay: "-27s", dur: "43s" },
] as const;

const SEED_MARKETS_WIDE = [
  { question: "Will the index close green this week?", base: 55, x: "18%", y: "4%", delay: "-5s", dur: "49s" },
  { question: "Will the launch slip past Q4?", base: 34, x: "70%", y: "86%", delay: "-21s", dur: "55s" },
] as const;

const TICKER = [
  { label: "FED CUT", value: 63 },
  { label: "CPI < 3%", value: 77 },
  { label: "MERGER", value: 29 },
  { label: "SHIP Q3", value: 41 },
  { label: "INDEX GREEN", value: 55 },
  { label: "LAUNCH SLIP", value: 34 },
] as const;

/** Deterministic pseudo-random walk so SSR and client render the same curve. */
function seededCurve(points: number, seed: number) {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  let v = 0.52;
  const out: number[] = [];
  for (let i = 0; i < points; i += 1) {
    v = Math.min(0.9, Math.max(0.12, v + (rand() - 0.5) * 0.09));
    out.push(v);
  }
  return out;
}

function toPath(values: number[], width: number, height: number) {
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - v * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function toArea(values: number[], width: number, height: number) {
  return `${toPath(values, width, height)} L${width} ${height} L0 ${height} Z`;
}

function markers(values: number[], width: number, height: number, every: number) {
  const out: { x: number; y: number }[] = [];
  for (let i = 6; i < values.length; i += every) {
    out.push({
      x: (i / (values.length - 1)) * width,
      y: height - values[i]! * height,
    });
  }
  return out;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);
  return reduced;
}

export function MarketAmbientBackground() {
  const reduced = usePrefersReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 2600);
    return () => window.clearInterval(id);
  }, [reduced]);

  const curves = useMemo(() => {
    const a = seededCurve(96, 20260809);
    const b = seededCurve(96, 77771);
    return {
      a: toPath(a, 1800, 320),
      b: toPath(b, 1800, 320),
      areaA: toArea(a, 1800, 320),
      dots: markers(a, 1800, 320, 17),
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Faint chart grid */}
      <div
        className="absolute inset-0 opacity-[0.6]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 18%), radial-gradient(circle at 50% 40%, transparent 18%, black 70%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 18%), radial-gradient(circle at 50% 40%, transparent 18%, black 70%)",
        }}
      />

      {/* Fade chart behind wordmark + headline so curves don't collide with text */}
      <div
        className="absolute inset-x-0 top-0 h-[55%]"
        style={{
          background:
            "radial-gradient(circle at 50% 22%, var(--background) 0%, var(--background) 22%, transparent 55%)",
          opacity: 0.7,
        }}
      />

      {/* Primary brand probability curve */}
      <svg
        viewBox="0 0 1200 320"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-[6%] h-[66%] w-full text-accent-solid/30"
      >
        <defs>
          <linearGradient id="vanti-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={curves.areaA}
          fill="url(#vanti-area)"
          className={reduced ? undefined : "vanti-curve"}
        />
        <path
          d={curves.a}
          fill="none"
          stroke="currentColor"
          strokeWidth={3.5}
          strokeLinecap="round"
          className={reduced ? undefined : "vanti-curve"}
        />
        <path
          d={curves.b}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          opacity={0.7}
          className={reduced ? undefined : "vanti-curve vanti-curve-slow"}
        />
        <g className={reduced ? undefined : "vanti-curve"}>
          {curves.dots.map((d) => (
            <circle
              key={`${d.x}-${d.y}`}
              cx={d.x}
              cy={d.y}
              r={4}
              fill="currentColor"
              className={reduced ? undefined : "vanti-pulse"}
            />
          ))}
        </g>
      </svg>

      {/* Secondary echo curve for depth */}
      <svg
        viewBox="0 0 1200 320"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-[12%] h-[54%] w-full text-accent-subtle/20"
      >
        <path
          d={curves.a}
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
          strokeLinecap="round"
          opacity={0.5}
          className={reduced ? undefined : "vanti-curve vanti-curve-reverse"}
        />
      </svg>

      {[...SEED_MARKETS, ...SEED_MARKETS_WIDE].map((m, i) => {
        const yes = Math.min(96, Math.max(4, m.base + ((tick + i * 3) % 5) - 2));
        return (
          <div
            key={m.question}
            className={cn(
              "absolute hidden w-44 rounded-lg border border-border/50 bg-surface/40 p-2.5 opacity-[0.45] sm:block",
              i >= SEED_MARKETS.length && "hidden xl:block",
            )}
            style={{
              left: m.x,
              top: m.y,
              animation: reduced ? undefined : `vanti-drift ${m.dur} ease-in-out ${m.delay} infinite`,
            }}
          >
            <p className="line-clamp-2 text-xs text-foreground">{m.question}</p>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="num text-xs text-yes">YES {yes}%</span>
              <span className="num text-xs text-no">NO {100 - yes}%</span>
            </div>
            <div className="mt-2 flex h-[3px] w-full overflow-hidden rounded-full">
              <span className="bg-yes" style={{ width: `${yes}%` }} />
              <span className="flex-1 bg-no" />
            </div>
          </div>
        );
      })}

      {/* Slow ticker strip near the bottom */}
      <div className="absolute inset-x-0 bottom-[8%] overflow-hidden opacity-[0.4]">
        <div className={cn("flex w-max gap-8", reduced ? undefined : "vanti-ticker")}>
          {[...TICKER, ...TICKER].map((t, i) => {
            const yes = Math.min(96, Math.max(4, t.value + ((tick + i) % 5) - 2));
            return (
              <span
                key={`${t.label}-${i}`}
                className="num flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground"
              >
                <span className="eyebrow text-muted-foreground">{t.label}</span>
                <span className={yes >= 50 ? "text-yes" : "text-no"}>{yes}¢</span>
              </span>
            );
          })}
        </div>
      </div>

      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 50% 38%, var(--background) 0%, var(--background) 25%, transparent 60%)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
    </div>
  );
}
