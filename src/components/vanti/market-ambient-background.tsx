import { useEffect, useMemo, useState } from "react";

const SEED_MARKETS = [
  { question: "Will the Fed cut rates before September?", base: 63, x: "6%", y: "12%", delay: "0s", dur: "38s" },
  { question: "Will the model ship this quarter?", base: 41, x: "58%", y: "26%", delay: "-9s", dur: "46s" },
  { question: "Will inflation print below 3%?", base: 77, x: "22%", y: "62%", delay: "-18s", dur: "52s" },
  { question: "Will the merger close in 2026?", base: 29, x: "70%", y: "74%", delay: "-27s", dur: "43s" },
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

  const paths = useMemo(
    () => [
      toPath(seededCurve(48, 20260809), 1200, 320),
      toPath(seededCurve(48, 77771), 1200, 320),
    ],
    [],
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        viewBox="0 0 1200 320"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-[70%] w-full text-accent-solid opacity-[0.12]"
      >
        <path
          d={paths[0]}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className={reduced ? undefined : "vanti-curve"}
        />
        <path
          d={paths[1]}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.6}
          className={reduced ? undefined : "vanti-curve vanti-curve-slow"}
        />
      </svg>

      {SEED_MARKETS.map((m, i) => {
        const yes = Math.min(96, Math.max(4, m.base + ((tick + i * 3) % 5) - 2));
        return (
          <div
            key={m.question}
            className="absolute w-52 rounded-lg border border-border/40 bg-surface/30 p-3 opacity-[0.16]"
            style={{
              left: m.x,
              top: m.y,
              animation: reduced ? undefined : `vanti-drift ${m.dur} ease-in-out ${m.delay} infinite`,
            }}
          >
            <p className="line-clamp-2 text-meta text-foreground">{m.question}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="num text-meta text-yes">YES {yes}%</span>
              <span className="num text-meta text-no">NO {100 - yes}%</span>
            </div>
            <div className="mt-2 flex h-[3px] w-full overflow-hidden rounded-full">
              <span className="bg-yes" style={{ width: `${yes}%` }} />
              <span className="flex-1 bg-no" />
            </div>
          </div>
        );
      })}

      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
    </div>
  );
}
