import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

import type { PricePoint } from "@/lib/markets";
import { trendColor, type TrendDirection } from "@/lib/market-trend";

/** Tiny YES-price trend line for a market card. Colour follows the 24h direction. */
export function MarketSparkline({
  points,
  direction,
}: {
  points: PricePoint[];
  direction: TrendDirection;
}) {
  if (points.length < 2) return <div className="h-8" />;
  const color = trendColor(direction);

  return (
    <div className="h-8 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}