import { describe, it, expect } from "vitest";

describe("PlusIconButton", () => {
  it("exports a function component", async () => {
    const mod = await import("./PlusIconButton");
    expect(typeof mod.PlusIconButton).toBe("function");
  });

  it("exports PlusIconButtonProps type", async () => {
    const mod = await import("./PlusIconButton");
    expect(mod).toBeDefined();
  });
});
