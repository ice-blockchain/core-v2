const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatUsdAmount(value: number): string {
  if (value === 0) {
    return "$0.00";
  }
  if (Math.abs(value) > 0 && Math.abs(value) < 0.01) {
    return "< $0.01";
  }
  return usdFormatter.format(value);
}
