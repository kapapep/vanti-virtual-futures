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
