import { describe, it, expect } from "vitest";
import { buildContentContainerStyle, buildAuthHeaderStyle, buildLogoContainerStyle } from "./profile-setup-styles";
import { buildFieldsContainerStyle, buildAvatarSectionStyle, buildSaveButtonContainerStyle } from "./profile-setup-styles";

const identity = (n: number) => n;
const mockColors = { primaryAccent: "#0166FF" } as Parameters<typeof buildLogoContainerStyle>[1];

describe("ProfileSetupScreen", () => {
  it("exports a function component", async () => {
    const mod = await import("./ProfileSetupScreen");
    expect(typeof mod.ProfileSetupScreen).toBe("function");
  });
});

describe("profile-setup-hooks", () => {
  it("exports useProfileForm hook", async () => {
    const mod = await import("./profile-setup-hooks");
    expect(typeof mod.useProfileForm).toBe("function");
  });
});

describe("profile-setup-styles content", () => {
  it("builds content container with center alignment", () => {
    const style = buildContentContainerStyle(identity);
    expect(style.alignItems).toBe("center");
    expect(style.paddingBottom).toBe(40);
  });

  it("builds auth header with 28px padding and 20px gap", () => {
    const style = buildAuthHeaderStyle(identity);
    expect(style.paddingHorizontal).toBe(28);
    expect(style.gap).toBe(20);
  });

  it("builds 65px logo circle with primaryAccent", () => {
    const style = buildLogoContainerStyle(identity, mockColors);
    expect(style.width).toBe(65);
    expect(style.borderRadius).toBe(33);
    expect(style.backgroundColor).toBe("#0166FF");
  });
});

describe("profile-setup-styles fields", () => {
  it("builds fields with 44px padding and 16px gap", () => {
    const style = buildFieldsContainerStyle(identity);
    expect(style.paddingHorizontal).toBe(44);
    expect(style.gap).toBe(16);
  });

  it("builds avatar section with correct padding", () => {
    const style = buildAvatarSectionStyle(identity);
    expect(style.paddingTop).toBe(28);
    expect(style.paddingBottom).toBe(32);
  });

  it("builds save button container with correct padding", () => {
    const style = buildSaveButtonContainerStyle(identity);
    expect(style.paddingHorizontal).toBe(16);
    expect(style.paddingTop).toBe(26);
  });

  it("scales dimensions with provided function", () => {
    const style = buildFieldsContainerStyle((n: number) => n * 3);
    expect(style.paddingHorizontal).toBe(132);
  });
});
