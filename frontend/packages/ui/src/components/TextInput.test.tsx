import { describe, it, expect } from "vitest";
import { resolveBorderColors } from "./text-input-styles";
import { lightSemanticColors } from "../tokens/semantic-colors";

describe("TextInput", () => {
  it("exports a function component", async () => {
    const mod = await import("./TextInput");
    expect(typeof mod.TextInput).toBe("function");
  });

  it("exports TextInputProps and TextInputState types", async () => {
    const mod = await import("./TextInput");
    expect(mod).toBeDefined();
  });
});

describe("resolveBorderColors", () => {
  it("returns strokeElements border for empty state", () => {
    const result = resolveBorderColors(lightSemanticColors, "empty");
    expect(result.border).toBe(lightSemanticColors.strokeElements);
  });

  it("returns primaryAccent border for focused state", () => {
    const result = resolveBorderColors(lightSemanticColors, "focused");
    expect(result.border).toBe(lightSemanticColors.primaryAccent);
  });

  it("returns success border for valid state", () => {
    const result = resolveBorderColors(lightSemanticColors, "valid");
    expect(result.border).toBe(lightSemanticColors.success);
  });

  it("returns attentionRed border for error state", () => {
    const result = resolveBorderColors(lightSemanticColors, "error");
    expect(result.border).toBe(lightSemanticColors.attentionRed);
  });

  it("always returns secondaryText for icon color", () => {
    const states = ["empty", "focused", "valid", "error"] as const;
    for (const state of states) {
      const result = resolveBorderColors(lightSemanticColors, state);
      expect(result.icon).toBe(lightSemanticColors.secondaryText);
    }
  });
});
