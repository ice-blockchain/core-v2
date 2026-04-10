const SUBSCRIPT_DIGITS = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];

export function toSubscript(count: number): string {
  return String(count)
    .split("")
    .map((digit) => SUBSCRIPT_DIGITS[Number(digit)])
    .join("");
}

export function formatSubscriptNotation(value: number, symbol = ""): string {
  const absValue = Math.abs(value);
  const exponentMatch = absValue.toExponential(12).match(/^(\d(?:\.\d+)?)e([+-]\d+)$/);
  if (!exponentMatch) {
    return "";
  }

  const mantissa = exponentMatch[1] ?? "";
  const exponent = Math.abs(Number(exponentMatch[2]));
  const zeroCount = exponent - 1;

  const digits = mantissa.replace(".", "");
  const trailing = digits.substring(0, 2).replace(/0+$/, "") || "0";

  const sign = value < 0 ? "-" : "";
  return `${sign}${symbol}0.0${toSubscript(zeroCount)}${trailing}`;
}
