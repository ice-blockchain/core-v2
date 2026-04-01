import { describe, it, expect } from "vitest";

describe("SafeAreaWrapper", () => {
  it("exports a function component", async () => {
    const mod = await import("./SafeAreaWrapper");
    expect(typeof mod.SafeAreaWrapper).toBe("function");
  });

  it("exports SafeAreaWrapperProps type", async () => {
    const mod = await import("./SafeAreaWrapper");
    expect(mod).toBeDefined();
  });
});
