import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { PricePoint } from "@/lib/markets";
import { cn } from "@/lib/utils";

const TIMEFRAMES = [
  { label: "1H", minutes: 60 },
  { label: "6H", minutes: 360 },
  { label: "1D", minutes: 1440 },
  { label: "1W", minutes: 10080 },
  { label: "1M", minutes: 43200 },
  { label: "ALL", minutes: null },
] as const;

type Timeframe = (typeof TIMEFRAMES)[number]["label"];

function formatTick(t: number, short: boolean) {
  const date = new Date(t);
  return short
    ? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Interactive YES-price history chart with timeframe toggles. Y axis in cents. */
export function PriceChart({ points }: { points: PricePoint[] }) {
  const [timeframe, setTimeframe] = useState<Timeframe>("1W");

  const active = TIMEFRAMES.find((t) => t.label === timeframe)!;
  const data = useMemo(() => {
    const source = active.minutes
      ? points.filter((p) => p.t >= Date.now() - active.minutes * 60 * 1000)
      : points;
    const series = source.length >= 2 ? source : points.slice(-2);
    return series.map((p) => ({ t: p.t, cents: Number((p.price * 100).toFixed(1)) }));
  }, [points, active.minutes]);

  const short = Boolean(active.minutes && active.minutes <= 1440);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.label}
            type="button"
            onClick={() => setTimeframe(tf.label)}
            className={cn(
              "num rounded-md px-2.5 py-1 text-meta font-semibold transition-colors",
              tf.label === timeframe
                ? "bg-accent-subtle text-accent-solid"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {tf.label}
          </button>
        ))}
      </div>

      <div className="h-64 w-full sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(t) => formatTick(Number(t), short)}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              stroke="var(--border)"
              minTickGap={32}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v) => `${v}¢`}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              stroke="var(--border)"
              width={48}
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--popover-foreground)",
              }}
              labelFormatter={(t) => new Date(Number(t)).toLocaleString("en-US")}
              formatter={(value) => [`${value}¢`, "YES"]}
            />
            <Line
              type="monotone"
              dataKey="cents"
              stroke="var(--accent-solid)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}