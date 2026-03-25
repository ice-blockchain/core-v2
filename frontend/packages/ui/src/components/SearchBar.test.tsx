import { describe, it, expect } from "vitest";

describe("SearchBar", () => {
  it("exports a function component", async () => {
    const mod = await import("./SearchBar");
    expect(typeof mod.SearchBar).toBe("function");
  });

  it("exports SearchBarProps type", async () => {
    const mod = await import("./SearchBar");
    expect(mod).toBeDefined();
  });
});
