import { describe, expect, it } from "vitest";
import { formatCryptoAmount } from "./format-crypto-amount";

describe("formatCryptoAmount", () => {
  describe("zero and negative values", () => {
    it("formats zero as 0.00", () => {
      expect(formatCryptoAmount(0)).toBe("0.00");
    });

    it("formats negative values as 0.00", () => {
      expect(formatCryptoAmount(-1)).toBe("0.00");
      expect(formatCryptoAmount(-0.5)).toBe("0.00");
      expect(formatCryptoAmount(-1000)).toBe("0.00");
      expect(formatCryptoAmount(-1000000)).toBe("0.00");
    });
  });

  describe("millions", () => {
    it("formats millions with M suffix", () => {
      expect(formatCryptoAmount(1000000)).toBe("1M");
      expect(formatCryptoAmount(1500000)).toBe("1.5M");
      expect(formatCryptoAmount(1500900)).toBe("1.5M");
      expect(formatCryptoAmount(1999999)).toBe("1.999M");
      expect(formatCryptoAmount(12345678)).toBe("12.345M");
      expect(formatCryptoAmount(999999999)).toBe("999.999M");
      expect(formatCryptoAmount(1000000.123456)).toBe("1M");
      expect(formatCryptoAmount(2567890)).toBe("2.567M");
    });
  });

  describe("billions", () => {
    it("formats billions with B suffix", () => {
      expect(formatCryptoAmount(1000000000)).toBe("1B");
      expect(formatCryptoAmount(1500000000)).toBe("1.5B");
      expect(formatCryptoAmount(1234567890)).toBe("1.234B");
      expect(formatCryptoAmount(18308397101)).toBe("18.308B");
    });
  });

  describe("trillions", () => {
    it("formats trillions with T suffix", () => {
      expect(formatCryptoAmount(1000000000000)).toBe("1T");
      expect(formatCryptoAmount(1500000000000)).toBe("1.5T");
      expect(formatCryptoAmount(18308397101537)).toBe("18.308T");
    });
  });

  describe("boundary at 1M", () => {
    it("formats 999999 without abbreviation", () => {
      expect(formatCryptoAmount(999999)).toBe("999,999.00");
    });

    it("formats 1000000 with M suffix", () => {
      expect(formatCryptoAmount(1000000)).toBe("1M");
    });
  });

  describe(">= 10 and < 1M", () => {
    it("formats with 2 decimals and comma separators", () => {
      expect(formatCryptoAmount(11)).toBe("11.00");
      expect(formatCryptoAmount(100.5)).toBe("100.50");
      expect(formatCryptoAmount(1000)).toBe("1,000.00");
      expect(formatCryptoAmount(1000.12)).toBe("1,000.12");
      expect(formatCryptoAmount(1000.123)).toBe("1,000.12");
      expect(formatCryptoAmount(999999.89)).toBe("999,999.89");
      expect(formatCryptoAmount(999999.999)).toBe("999,999.99");
      expect(formatCryptoAmount(10.1)).toBe("10.10");
    });
  });

  describe(">= 1 and < 10", () => {
    it("formats with max 6 decimals and min 2", () => {
      expect(formatCryptoAmount(1.0)).toBe("1.00");
      expect(formatCryptoAmount(1.5)).toBe("1.50");
      expect(formatCryptoAmount(1.123456)).toBe("1.123456");
      expect(formatCryptoAmount(1.1234567)).toBe("1.123456");
      expect(formatCryptoAmount(9.999999)).toBe("9.999999");
      expect(formatCryptoAmount(5.123)).toBe("5.123");
      expect(formatCryptoAmount(2.000001)).toBe("2.000001");
      expect(formatCryptoAmount(2.0000001)).toBe("2.00");
      expect(formatCryptoAmount(3.1415926)).toBe("3.141592");
    });
  });

  describe("< 1", () => {
    it("formats with max 6 decimals and min 2", () => {
      expect(formatCryptoAmount(0.1)).toBe("0.10");
      expect(formatCryptoAmount(0.12)).toBe("0.12");
      expect(formatCryptoAmount(0.123456)).toBe("0.123456");
      expect(formatCryptoAmount(0.1234567)).toBe("0.123456");
      expect(formatCryptoAmount(0.001)).toBe("0.001");
      expect(formatCryptoAmount(0.000001)).toBe("0.000001");
      expect(formatCryptoAmount(0.0000001)).toBe("0.0₆1");
      expect(formatCryptoAmount(0.5)).toBe("0.50");
      expect(formatCryptoAmount(0.999999)).toBe("0.999999");
    });
  });

  describe("very small values", () => {
    it("formats with subscript notation", () => {
      expect(formatCryptoAmount(1e-7)).toBe("0.0₆1");
      expect(formatCryptoAmount(0.00000001)).toBe("0.0₇1");
      expect(formatCryptoAmount(0.00000012)).toBe("0.0₆12");
      expect(formatCryptoAmount(0.000000456)).toBe("0.0₆45");
      expect(formatCryptoAmount(0.00000025)).toBe("0.0₆25");
    });
  });

  describe("with currency", () => {
    it("appends currency after a space", () => {
      expect(formatCryptoAmount(0, "BTC")).toBe("0.00 BTC");
      expect(formatCryptoAmount(1.5, "ETH")).toBe("1.50 ETH");
      expect(formatCryptoAmount(1000000, "USD")).toBe("1M USD");
      expect(formatCryptoAmount(0.00001, "SATS")).toBe("0.00001 SATS");
    });
  });

  describe("exact boundaries", () => {
    it("formats boundary values correctly", () => {
      expect(formatCryptoAmount(1)).toBe("1.00");
      expect(formatCryptoAmount(10)).toBe("10.00");
      expect(formatCryptoAmount(0.999999)).toBe("0.999999");
      expect(formatCryptoAmount(0.9999999)).toBe("0.999999");
      expect(formatCryptoAmount(10.000001)).toBe("10.00");
    });
  });
});
