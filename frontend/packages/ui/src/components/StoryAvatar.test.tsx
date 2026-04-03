import { describe, it, expect } from "vitest";
import { buildRingContainerStyle, buildSolidRingStyle, buildBadgeOverlayStyle } from "./story-avatar-styles";
import { RING_WIDTH, GAP_RATIO } from "./story-avatar-types";
import { gradients } from "../tokens/gradients";

const identity = (n: number) => n;
const colors = {
  sheetLine: "#B8BCCA",
} as Parameters<typeof buildSolidRingStyle>[0]["colors"];

const base = { size: 65, borderRadius: 20, ringWidth: RING_WIDTH, gap: 65 * GAP_RATIO, scale: identity, colors };

describe("StoryAvatar", () => {
  it("exports a function component", async () => {
    const mod = await import("./StoryAvatar");
    expect(typeof mod.StoryAvatar).toBe("function");
  });

  it("exports StoryAvatarProps type", async () => {
    const mod = await import("./story-avatar-types");
    expect(mod).toBeDefined();
  });
});

describe("story avatar ring container styles", () => {
  it("builds container with correct dimensions", () => {
    const style = buildRingContainerStyle(base);
    expect(style.width).toBe(65);
    expect(style.height).toBe(65);
    expect(style.borderRadius).toBe(20);
  });

  it("centers children", () => {
    const style = buildRingContainerStyle(base);
    expect(style.justifyContent).toBe("center");
    expect(style.alignItems).toBe("center");
  });

  it("scales dimensions via scale function", () => {
    const doubled = (n: number) => n * 2;
    const style = buildRingContainerStyle({ ...base, scale: doubled });
    expect(style.width).toBe(130);
    expect(style.height).toBe(130);
  });
});

describe("story avatar solid ring styles", () => {
  it("uses sheetLine color for viewed state", () => {
    const style = buildSolidRingStyle(base);
    expect(style.borderColor).toBe("#B8BCCA");
  });

  it("applies correct border width", () => {
    const style = buildSolidRingStyle(base);
    expect(style.borderWidth).toBe(RING_WIDTH);
  });

  it("positions absolutely", () => {
    const style = buildSolidRingStyle(base);
    expect(style.position).toBe("absolute");
  });
});

describe("story avatar badge overlay styles", () => {
  it("positions absolutely at top-left", () => {
    const style = buildBadgeOverlayStyle(base);
    expect(style.position).toBe("absolute");
    expect(style.top).toBe(0);
    expect(style.left).toBe(0);
  });
});

describe("story avatar geometry", () => {
  it("computes correct inner avatar size at size 65", () => {
    const gap = 65 * GAP_RATIO;
    const avatarSize = 65 - 2 * gap;
    expect(avatarSize).toBeCloseTo(59, 0);
  });

  it("computes correct inner border radius", () => {
    const gap = 65 * GAP_RATIO;
    const avatarBorderRadius = 20 - gap;
    expect(avatarBorderRadius).toBeCloseTo(17, 0);
  });
});

describe("gradient token lookup", () => {
  it("has orangeRed gradient with stops", () => {
    const stops = gradients.orangeRed;
    expect(stops).toBeDefined();
    expect(stops!.length).toBeGreaterThan(0);
  });

  it("has lightblueLightgreen gradient with stops", () => {
    const stops = gradients.lightblueLightgreen;
    expect(stops).toBeDefined();
    expect(stops!.length).toBeGreaterThan(0);
  });
});
