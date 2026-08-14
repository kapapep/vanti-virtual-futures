/**
 * Single source of truth for feed trend descriptors.
 *
 * These labels describe a MARKET's own 24h YES-price movement (`market.change24h`).
 * They are never user-specific and must not read like a verdict on the viewer's trades.
 */
export const TREND_LABEL = {
  /** Market's YES price rose over the last 24h. */
  PRICE_UP: "Trending · price up",
  /** Market's YES price fell over the last 24h. */
  PRICE_DOWN: "Trending · price down",
  /** A watched market moved sharply, regardless of direction. */
  WATCHLIST_MOVE: "Price move · watchlist",
} as const;

/** Picks the trend descriptor from a market's 24h YES-price change. */
export function trendLabel(change24h: number | null): string {
  return (change24h ?? 0) >= 0 ? TREND_LABEL.PRICE_UP : TREND_LABEL.PRICE_DOWN;
}

export type TrendDirection = "up" | "down" | "flat";

/**
 * Single source of truth for how a 24h change is rendered: arrow direction and
 * colour always derive from the sign of the one shared change value.
 */
export function trendDirection(change24h: number | null): TrendDirection {
  if (change24h === null || !Number.isFinite(change24h) || change24h === 0) return "flat";
  return change24h > 0 ? "up" : "down";
}

/** CSS colour for a trend direction: up = green, down = red, flat = muted gray. */
export function trendColor(direction: TrendDirection): string {
  if (direction === "up") return "var(--vanti-yes)";
  if (direction === "down") return "var(--vanti-no)";
  return "var(--vanti-muted)";
}
