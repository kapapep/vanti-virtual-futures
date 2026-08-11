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
export function trendLabel(change24h: number): string {
  return change24h >= 0 ? TREND_LABEL.PRICE_UP : TREND_LABEL.PRICE_DOWN;
}
