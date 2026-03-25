import { describe, it, expect } from "vitest";
import { assertValidCropRegion, clampQuality } from "./validate-options";

describe("assertValidCropRegion", () => {
  it("accepts valid crop region", () => {
    expect(() =>
      assertValidCropRegion({ x: 0, y: 0, width: 100, height: 100 }),
    ).not.toThrow();
  });

  it("rejects negative x coordinate", () => {
    expect(() =>
      assertValidCropRegion({ x: -1, y: 0, width: 100, height: 100 }),
    ).toThrow("non-negative");
  });

  it("rejects negative y coordinate", () => {
    expect(() =>
      assertValidCropRegion({ x: 0, y: -5, width: 100, height: 100 }),
    ).toThrow("non-negative");
  });

  it("rejects zero width", () => {
    expect(() =>
      assertValidCropRegion({ x: 0, y: 0, width: 0, height: 100 }),
    ).toThrow("positive");
  });

  it("rejects negative height", () => {
    expect(() =>
      assertValidCropRegion({ x: 0, y: 0, width: 100, height: -1 }),
    ).toThrow("positive");
  });
});

describe("clampQuality", () => {
  it("returns value within range unchanged", () => {
    expect(clampQuality(0.5, 0, 1)).toBe(0.5);
  });

  it("clamps value above max", () => {
    expect(clampQuality(1.5, 0, 1)).toBe(1);
  });

  it("clamps negative value to min", () => {
    expect(clampQuality(-0.5, 0, 1)).toBe(0);
  });

  it("returns min for NaN", () => {
    expect(clampQuality(NaN, 0, 1)).toBe(0);
  });

  it("returns min for Infinity", () => {
    expect(clampQuality(Infinity, 0, 1)).toBe(0);
  });

  it("clamps brotli quality range correctly", () => {
    expect(clampQuality(15, 0, 11)).toBe(11);
    expect(clampQuality(6, 0, 11)).toBe(6);
  });
});
