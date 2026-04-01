import { describe, it, expect } from "vitest";
import { buildContainerStyle, buildFallbackStyle, buildImageStyle, buildBadgeOverlayStyle } from "./avatar-styles";

const identity = (n: number) => n;
const colors = {
  onTertiaryFill: "#E1EAF8",
  onPrimaryAccent: "#FFFFFF",
} as Parameters<typeof buildFallbackStyle>[0]["colors"];

describe("Avatar", () => {
  it("exports a function component", async () => {
    const mod = await import("./Avatar");
    expect(typeof mod.Avatar).toBe("function");
  });

  it("exports AvatarProps type", async () => {
    const mod = await import("./avatar-types");
    expect(mod).toBeDefined();
  });
});

const base = { size: 48, borderRadius: 14, scale: identity, colors };

describe("avatar container and image styles", () => {
  it("builds container with correct dimensions", () => {
    const style = buildContainerStyle(base);
    expect(style.width).toBe(48);
    expect(style.height).toBe(48);
    expect(style.borderRadius).toBe(14);
  });

  it("builds image style with contentFit", () => {
    const style = buildImageStyle({ ...base, contentFit: "cover" });
    expect(style.resizeMode).toBe("cover");
    expect(style.width).toBe(48);
  });

  it("scales dimensions via scale function", () => {
    const doubled = (n: number) => n * 2;
    const style = buildContainerStyle({ ...base, scale: doubled });
    expect(style.width).toBe(96);
    expect(style.height).toBe(96);
  });
});

describe("avatar fallback and badge styles", () => {
  it("builds fallback style with background color", () => {
    const style = buildFallbackStyle(base);
    expect(style.backgroundColor).toBe("#E1EAF8");
    expect(style.justifyContent).toBe("center");
    expect(style.alignItems).toBe("center");
  });

  it("builds badge overlay with absolute positioning", () => {
    const style = buildBadgeOverlayStyle(base);
    expect(style.position).toBe("absolute");
    expect(style.top).toBe(0);
    expect(style.left).toBe(0);
  });
});
