import { describe, it, expect } from "vitest";

describe("AvatarPicker", () => {
  it("exports a function component wrapping @ion/ui AvatarPicker", async () => {
    const mod = await import("./AvatarPicker");
    expect(typeof mod.AvatarPicker).toBe("function");
  });
});
