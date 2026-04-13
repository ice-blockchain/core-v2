import { formatSubscriptNotation } from "./format-subscript-notation";

const MILLION = 1_000_000;
const BILLION = 1_000_000_000;
const TRILLION = 1_000_000_000_000;
const BASE_TEN = 10;
const PRECISION_TWO = 2;
const PRECISION_THREE = 3;
const PRECISION_SIX = 6;
const MIN_NON_ZERO = 0.000001;
const ZERO_DISPLAY = "0.00";

function truncateToDecimals(value: number, decimals: number): number {
  const factor = Math.pow(BASE_TEN, decimals);
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
  const truncated = truncateToDecimals(divided, PRECISION_THREE);
  const formatted = truncated.toFixed(PRECISION_THREE).replace(/\.?0+$/, "");
  return `${formatted}${suffix}`;
}

function formatMediumNumber(value: number): string {
  const truncated = truncateToDecimals(value, PRECISION_TWO);
  return truncated.toLocaleString("en-US", {
    minimumFractionDigits: PRECISION_TWO,
    maximumFractionDigits: PRECISION_TWO,
  });
}

function formatSmallNumber(value: number): string {
  const truncated = truncateToDecimals(value, PRECISION_SIX);
  const formatted = truncated.toFixed(PRECISION_SIX);
  return trimTrailingZeros(formatted, PRECISION_TWO);
}

export function formatCryptoAmount(value: number, currency?: string): string {
  let result: string;

  if (!Number.isFinite(value) || value <= 0) {
    result = ZERO_DISPLAY;
  } else if (value < MIN_NON_ZERO) {
    result = formatSubscriptNotation(value);
  } else if (value < BASE_TEN) {
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
