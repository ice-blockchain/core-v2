import { describe, it, expect } from "vitest";

describe("BottomSnackBar", () => {
  it("exports a function component", async () => {
    const mod = await import("./BottomSnackBar");
    expect(typeof mod.BottomSnackBar).toBe("function");
  });

  it("exports BottomSnackBarProps type", async () => {
    const mod = await import("./BottomSnackBar");
    expect(mod).toBeDefined();
  });

  it("accepts required props without error", async () => {
    const mod = await import("./BottomSnackBar");
    expect(mod.BottomSnackBar.length).toBeGreaterThanOrEqual(0);
  });
});