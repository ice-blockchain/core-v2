import { describe, expect, it } from "vitest";
import { toSubscript, formatSubscriptNotation } from "./format-subscript-notation";

describe("toSubscript", () => {
  it("converts single digits to subscript", () => {
    expect(toSubscript(0)).toBe("₀");
    expect(toSubscript(1)).toBe("₁");
    expect(toSubscript(7)).toBe("₇");
    expect(toSubscript(9)).toBe("₉");
  });

  it("converts multi-digit numbers to subscript", () => {
    expect(toSubscript(10)).toBe("₁₀");
    expect(toSubscript(12)).toBe("₁₂");
    expect(toSubscript(25)).toBe("₂₅");
  });
});

describe("formatSubscriptNotation", () => {
  it("formats very small positive values with subscript zeros", () => {
    expect(formatSubscriptNotation(0.00000025)).toBe("0.0₆25");
    expect(formatSubscriptNotation(0.0000001)).toBe("0.0₆1");
    expect(formatSubscriptNotation(0.000000456)).toBe("0.0₆45");
    expect(formatSubscriptNotation(0.00000001)).toBe("0.0₇1");
    expect(formatSubscriptNotation(0.00000000001)).toBe("0.0₁₀1");
  });

  it("handles negative values", () => {
    expect(formatSubscriptNotation(-0.00000025)).toBe("-0.0₆25");
    expect(formatSubscriptNotation(-0.0000001)).toBe("-0.0₆1");
  });

  it("trims trailing zeros from significant digits", () => {
    expect(formatSubscriptNotation(0.0000001)).toBe("0.0₆1");
    expect(formatSubscriptNotation(0.000000010)).toBe("0.0₇1");
  });

  it("adds currency symbol when provided", () => {
    expect(formatSubscriptNotation(0.00000025, "$")).toBe("$0.0₆25");
    expect(formatSubscriptNotation(-0.0000001, "$")).toBe("-$0.0₆1");
  });

  it("handles values with single significant digit", () => {
    expect(formatSubscriptNotation(0.000001)).toBe("0.0₅1");
    expect(formatSubscriptNotation(0.00001)).toBe("0.0₄1");
  });
});
