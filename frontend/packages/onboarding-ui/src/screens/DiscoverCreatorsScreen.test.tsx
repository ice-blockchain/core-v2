import { describe, it, expect } from "vitest";
import { buildListContainerStyle, buildListContentStyle } from "./discover-creators-styles";

const identity = (n: number) => n;

describe("DiscoverCreatorsScreen", () => {
  it("exports a function component", async () => {
    const mod = await import("./DiscoverCreatorsScreen");
    expect(typeof mod.DiscoverCreatorsScreen).toBe("function");
  });
});

describe("discover-creators-hooks", () => {
  it("exports useDiscoverCreators hook", async () => {
    const mod = await import("./discover-creators-hooks");
    expect(typeof mod.useDiscoverCreators).toBe("function");
  });
});

describe("discover-creators-styles", () => {
  it("builds list container with full width and 16px horizontal padding", () => {
    const style = buildListContainerStyle(identity);
    expect(style.width).toBe("100%");
    expect(style.paddingHorizontal).toBe(16);
    expect(style.paddingTop).toBe(34);
  });

  it("builds list content with 12px gap and 104px bottom padding", () => {
    const style = buildListContentStyle(identity);
    expect(style.gap).toBe(12);
    expect(style.paddingBottom).toBe(104);
  });

  it("scales dimensions with provided function", () => {
    const style = buildListContainerStyle((n: number) => n * 2);
    expect(style.paddingHorizontal).toBe(32);
    expect(style.paddingTop).toBe(68);
  });
});
