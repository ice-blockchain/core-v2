import { describe, it, expect } from "vitest";
import { buildListSectionStyle, buildScrollContentStyle } from "./select-languages-styles";

const identity = (n: number) => n;

describe("SelectLanguagesScreen", () => {
  it("exports a function component", async () => {
    const mod = await import("./SelectLanguagesScreen");
    expect(typeof mod.SelectLanguagesScreen).toBe("function");
  });
});

describe("select-languages-hooks", () => {
  it("exports useLanguageSelection hook", async () => {
    const mod = await import("./select-languages-hooks");
    expect(typeof mod.useLanguageSelection).toBe("function");
  });
});

describe("select-languages-styles", () => {
  it("builds list section with full width and 34px top padding", () => {
    const style = buildListSectionStyle(identity);
    expect(style.width).toBe("100%");
    expect(style.paddingTop).toBe(34);
    expect(style.gap).toBe(12);
  });

  it("builds scroll content with 12px gap and 104px bottom padding", () => {
    const style = buildScrollContentStyle(identity);
    expect(style.gap).toBe(12);
    expect(style.paddingBottom).toBe(104);
  });

  it("scales dimensions with provided function", () => {
    const style = buildListSectionStyle((n: number) => n * 2);
    expect(style.paddingHorizontal).toBe(32);
    expect(style.paddingTop).toBe(68);
  });
});
