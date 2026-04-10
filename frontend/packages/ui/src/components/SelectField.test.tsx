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

describe("select-field-dropdown-types", () => {
  it("exports SELECT_FIELD_Z_INDEX constant", async () => {
    const mod = await import("./select-field-dropdown-types");
    expect(typeof mod.SELECT_FIELD_Z_INDEX).toBe("number");
  });

  it("exports DROPDOWN_GAP constant", async () => {
    const mod = await import("./select-field-dropdown-types");
    expect(typeof mod.DROPDOWN_GAP).toBe("number");
  });
});
