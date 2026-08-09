const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats a virtual-money amount, e.g. 10000 -> "$10,000.00". */
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
export function formatCents(price: number | string | null | undefined): string {
  const value = typeof price === "string" ? Number(price) : (price ?? 0);
  return `${Math.round((Number.isFinite(value) ? value : 0) * 100)}¢`;
}

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Formats a virtual volume compactly, e.g. 340000 -> "$340K". */
export function formatVolume(value: number | string | null | undefined): string {
  const amount = typeof value === "string" ? Number(value) : (value ?? 0);
  return `$${compact.format(Number.isFinite(amount) ? amount : 0)}`;
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
