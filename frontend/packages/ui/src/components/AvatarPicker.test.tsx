import { describe, it, expect } from "vitest";
import { buildPickerContainerStyle, buildPlaceholderStyle, buildCameraButtonStyle } from "./avatar-picker-styles";

const identity = (n: number) => n;
const colors = {
  strokeElements: "#CCCCCC",
  onPrimaryAccent: "#FFFFFF",
  primaryAccent: "#0166FF",
} as Parameters<typeof buildPickerContainerStyle>[0]["colors"];

describe("AvatarPicker", () => {
  it("exports a function component", async () => {
    const mod = await import("./AvatarPicker");
    expect(typeof mod.AvatarPicker).toBe("function");
  });

  it("exports AvatarPickerProps type", async () => {
    const mod = await import("./avatar-picker-types");
    expect(mod).toBeDefined();
  });
});

describe("avatar-picker-styles", () => {
  const base = { size: 100, borderRadius: 20, scale: identity, colors };

  it("builds container with correct dimensions and background", () => {
    const style = buildPickerContainerStyle(base);
    expect(style.width).toBe(100);
    expect(style.height).toBe(100);
    expect(style.borderRadius).toBe(20);
    expect(style.backgroundColor).toBe("#CCCCCC4D");
  });

  it("builds placeholder with dashed border", () => {
    const style = buildPlaceholderStyle(base);
    expect(style.borderStyle).toBe("dashed");
    expect(style.borderWidth).toBe(2);
    expect(style.borderColor).toBe("#FFFFFF");
  });

  it("builds camera button with absolute positioning", () => {
    const style = buildCameraButtonStyle({ ...base, buttonSize: 36 });
    expect(style.position).toBe("absolute");
    expect(style.bottom).toBe(-6);
    expect(style.right).toBe(-6);
    expect(style.backgroundColor).toBe("#0166FF");
    expect(style.borderRadius).toBe(18);
  });

  it("scales all dimensions via scale function", () => {
    const doubled = (n: number) => n * 2;
    const style = buildPickerContainerStyle({ ...base, scale: doubled });
    expect(style.width).toBe(200);
    expect(style.borderRadius).toBe(40);
  });
});
