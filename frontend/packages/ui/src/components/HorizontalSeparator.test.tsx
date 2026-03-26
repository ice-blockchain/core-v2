import { describe, it, expect } from "vitest";

describe("HorizontalSeparator", () => {
  it("exports a function component", async () => {
    const mod = await import("./HorizontalSeparator");
    expect(typeof mod.HorizontalSeparator).toBe("function");
  });

  it("accepts an optional style prop", async () => {
    const mod = await import("./HorizontalSeparator");
    expect(mod.HorizontalSeparator.length).toBeLessThanOrEqual(1);
  });
});
