import { describe, expect, it } from "vitest";
import { formatUsdAmount } from "./format-usd-amount";

describe("formatUsdAmount", () => {
  it("formats zero", () => {
    expect(formatUsdAmount(0.0)).toBe("$0.00");
  });

  it("formats standard amounts", () => {
    expect(formatUsdAmount(1.0)).toBe("$1.00");
    expect(formatUsdAmount(1.5)).toBe("$1.50");
    expect(formatUsdAmount(0.01)).toBe("$0.01");
    expect(formatUsdAmount(1234.56)).toBe("$1,234.56");
  });

  it("formats negative amounts", () => {
    expect(formatUsdAmount(-1.0)).toBe("-$1.00");
    expect(formatUsdAmount(-0.01)).toBe("-$0.01");
  });

  it("returns less than $0.01 for tiny positive amounts", () => {
    expect(formatUsdAmount(0.009)).toBe("< $0.01");
    expect(formatUsdAmount(0.001)).toBe("< $0.01");
    expect(formatUsdAmount(0.0001)).toBe("< $0.01");
    expect(formatUsdAmount(0.0099)).toBe("< $0.01");
  });

  it("returns less than $0.01 for tiny negative amounts", () => {
    expect(formatUsdAmount(-0.009)).toBe("< $0.01");
    expect(formatUsdAmount(-0.001)).toBe("< $0.01");
  });
});
