import { formatSubscriptNotation } from "./format-subscript-notation";

const MILLION = 1_000_000;
const BILLION = 1_000_000_000;
const TRILLION = 1_000_000_000_000;

function truncateToDecimals(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.floor(value * factor) / factor;
}

function trimTrailingZeros(formatted: string, minDecimals: number): string {
  const [integer, decimal] = formatted.split(".");
  if (!decimal) {
    return formatted;
  }
  const kept = decimal.slice(0, minDecimals);
  const rest = decimal.slice(minDecimals).replace(/0+$/, "");
  return `${integer}.${kept}${rest}`;
}

function formatLargeNumber(value: number): string {
  if (value >= TRILLION) {
    return formatAbbreviated(value, TRILLION, "T");
  }
  if (value >= BILLION) {
    return formatAbbreviated(value, BILLION, "B");
  }
  return formatAbbreviated(value, MILLION, "M");
}

function formatAbbreviated(value: number, divisor: number, suffix: string): string {
  const divided = value / divisor;
  const truncated = truncateToDecimals(divided, 3);
  const formatted = truncated.toFixed(3).replace(/\.?0+$/, "");
  return `${formatted}${suffix}`;
}

function formatMediumNumber(value: number): string {
  const truncated = truncateToDecimals(value, 2);
  return truncated.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatSmallNumber(value: number): string {
  const truncated = truncateToDecimals(value, 6);
  const formatted = truncated.toFixed(6);
  return trimTrailingZeros(formatted, 2);
}

export function formatCryptoAmount(value: number, currency?: string): string {
  let result: string;

  if (value <= 0) {
    result = "0.00";
  } else if (value < 0.000001) {
    result = formatSubscriptNotation(value);
  } else if (value < 10) {
    result = formatSmallNumber(value);
  } else if (value < MILLION) {
    result = formatMediumNumber(value);
  } else {
    result = formatLargeNumber(value);
  }

  if (currency) {
    return `${result} ${currency}`;
  }
  return result;
}
