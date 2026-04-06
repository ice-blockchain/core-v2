import { describe, it, expect } from "vitest";

describe("SelectField", () => {
  it("exports a function component", async () => {
    const mod = await import("./SelectField");
    expect(typeof mod.SelectField).toBe("function");
  });

  it("exports SelectFieldProps type", async () => {
    const mod = await import("./SelectField");
    expect(mod).toBeDefined();
  });
});

describe("SelectFieldDropdown", () => {
  it("exports a function component", async () => {
    const mod = await import("./SelectFieldDropdown");
    expect(typeof mod.SelectFieldDropdown).toBe("function");
  });

  it("exports SelectFieldDropdownProps type", async () => {
    const mod = await import("./SelectFieldDropdown");
    expect(mod).toBeDefined();
  });
});
