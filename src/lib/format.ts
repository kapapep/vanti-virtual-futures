/** Prefix for Vanti's virtual currency. Never a real-money symbol. */
export const VIRTUAL_CURRENCY_SYMBOL = "V";

const decimal = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const currency = {
  format: (value: number) => `${VIRTUAL_CURRENCY_SYMBOL}${decimal.format(value)}`,
};

/** Formats a virtual-currency amount, e.g. 10000 -> "V10,000.00". */
export function formatBalance(value: number | string | null | undefined): string {
  const amount = typeof value === "string" ? Number(value) : (value ?? 0);
  return currency.format(Number.isFinite(amount) ? amount : 0);
}

/** Formats a 0–1 contract price as a probability percentage, e.g. 0.5 -> "50%". */
export function formatProbability(price: number | string | null | undefined): string {
  const value = typeof price === "string" ? Number(price) : (price ?? 0);
  return `${Math.round((Number.isFinite(value) ? value : 0) * 100)}%`;
}

/** Formats a 0–1 contract price in cents, e.g. 0.63 -> "63¢". */
export function formatProbability(price: number | string | null | undefined): string {
  const value = typeof price === "string" ? Number(price) : (price ?? 0);
  return `${Math.round((Number.isFinite(value) ? value : 0) * 100)}¢`;
}

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Formats a virtual volume compactly, e.g. 340000 -> "V340K". */
export function formatVolume(value: number | string | null | undefined): string {
  const amount = typeof value === "string" ? Number(value) : (value ?? 0);
  return `${VIRTUAL_CURRENCY_SYMBOL}${compact.format(Number.isFinite(amount) ? amount : 0)}`;
}

/** Formats a whole count compactly, e.g. 2140 -> "2.1K". */
export function formatCount(value: number | string | null | undefined): string {
  const amount = typeof value === "string" ? Number(value) : (value ?? 0);
  return compact.format(Number.isFinite(amount) ? amount : 0);
}

/** Formats a signed probability delta in cents, e.g. 0.031 -> "+3.1¢". */
export function formatDelta(delta: number): string {
  const cents = delta * 100;
  const sign = cents > 0 ? "+" : cents < 0 ? "−" : "";
  return `${sign}${Math.abs(cents).toFixed(1)}¢`;
}

/** Short resolution date, e.g. "Dec 31, 2026". */
export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Formats a signed virtual amount, e.g. -42.5 -> "−V42.50". */
export function formatSignedBalance(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${currency.format(Math.abs(value))}`;
}

/** Formats a signed ratio as a percentage, e.g. 0.1234 -> "+12.34%". */
export function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${(Math.abs(value) * 100).toFixed(2)}%`;
}

/** Formats a 0–1 ratio as a whole percentage, e.g. 0.62 -> "62%". */
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** Formats a contract count, e.g. 1234.5 -> "1,234.5". */
export function formatContracts(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

/** Date and time, e.g. "Aug 9, 2026, 2:04 PM". */
export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Compact relative timestamp for feeds, e.g. "3h", "2d", "Aug 9". */
export function formatRelativeTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
