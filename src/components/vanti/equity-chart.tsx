import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatBalance } from "@/lib/format";
import type { EquityPoint } from "@/lib/portfolio";

/** Portfolio value over time, drawn in the Vanti accent blue. */
export function EquityChart({ points }: { points: EquityPoint[] }) {
  const first = points[0]?.value ?? 0;
  const color = "var(--accent-solid)";
  const values = points.map((p) => p.value);
  const min = Math.min(...values, first);
  const max = Math.max(...values, first);
  const pad = Math.max(20, (max - min) * 0.12);
  const spanMs = (points[points.length - 1]?.t ?? 0) - (points[0]?.t ?? 0);
  const intraday = spanMs < 3 * 24 * 60 * 60 * 1000;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t: number) =>
              intraday
                ? new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                : new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            }
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            minTickGap={32}
          />
          <YAxis
            domain={[min - pad, max + pad]}
            tickFormatter={(v: number) => `V${Math.round(v).toLocaleString("en-US")}`}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(t) => new Date(Number(t)).toLocaleString("en-US")}
            formatter={(v) => [formatBalance(Number(v)), "Portfolio value"]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill="url(#equityFill)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
