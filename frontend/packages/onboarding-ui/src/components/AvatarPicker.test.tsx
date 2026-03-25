import { describe, it, expect } from "vitest";
import { buildAvatarContainerStyle, buildCameraButtonStyle, buildDashedPlaceholderStyle } from "./avatar-picker-styles";

const identity = (n: number) => n;
const mockColors = {
  strokeElements: "#CCCCCC",
  secondaryBackground: "#FFFFFF",
  primaryAccent: "#0166FF",
  onPrimaryAccent: "#FFFFFF",
} as Parameters<typeof buildDashedPlaceholderStyle>[1];

describe("AvatarPicker", () => {
  it("exports a function component", async () => {
    const mod = await import("./AvatarPicker");
    expect(typeof mod.AvatarPicker).toBe("function");
  });
});

describe("buildAvatarContainerStyle", () => {
  it("returns 100x100 container with background and 20px border radius", () => {
    const style = buildAvatarContainerStyle(identity, mockColors);
    expect(style.width).toBe(100);
    expect(style.height).toBe(100);
    expect(style.borderRadius).toBe(20);
    expect(style.backgroundColor).toBe(mockColors.strokeElements + "4D");
  });

  it("scales dimensions according to the scale function", () => {
    const doubleScale = (n: number) => n * 2;
    const style = buildAvatarContainerStyle(doubleScale, mockColors);
    expect(style.width).toBe(200);
    expect(style.height).toBe(200);
    expect(style.borderRadius).toBe(40);
  });
});

describe("buildDashedPlaceholderStyle", () => {
  it("returns placeholder with dashed white border and 12px radius", () => {
    const style = buildDashedPlaceholderStyle(identity, mockColors);
    expect(style.width).toBe(76);
    expect(style.height).toBe(76);
    expect(style.borderRadius).toBe(12);
    expect(style.borderStyle).toBe("dashed");
    expect(style.borderWidth).toBe(2);
    expect(style.borderColor).toBe(mockColors.onPrimaryAccent);
  });
});

describe("buildCameraButtonStyle", () => {
  it("positions camera button at bottom-right with -6px offset", () => {
    const style = buildCameraButtonStyle(identity, mockColors);
    expect(style.position).toBe("absolute");
    expect(style.bottom).toBe(-6);
    expect(style.right).toBe(-6);
    expect(style.width).toBe(36);
    expect(style.height).toBe(36);
    expect(style.borderRadius).toBe(18);
    expect(style.backgroundColor).toBe(mockColors.primaryAccent);
  });
});
