const usdFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatUsdBalance(value: number): string {
  return usdFormatter.format(value);
}
