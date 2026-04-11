import { describe, expect, it } from "vitest";
import { formatSubscriptNotation } from "./format-subscript-notation";

describe("formatSubscriptNotation", () => {
  it("uses subscript digits for zero counts", () => {
    expect(formatSubscriptNotation(0.000001)).toBe("0.0₅1");
    expect(formatSubscriptNotation(0.00000000001)).toBe("0.0₁₀1");
  });


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
