import { validateIdentityKeyName } from "./identity-key-rules";

describe("validateIdentityKeyName with valid input", () => {
  it("returns null for valid lowercase alphanumeric names", () => {
    expect(validateIdentityKeyName("alice")).toBeNull();
    expect(validateIdentityKeyName("bob123")).toBeNull();
  });

  it("returns null for names with dots, hyphens, and underscores", () => {
    expect(validateIdentityKeyName("alice.bob")).toBeNull();
    expect(validateIdentityKeyName("alice-bob")).toBeNull();
    expect(validateIdentityKeyName("alice_bob")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(validateIdentityKeyName("")).toBeNull();
  });
});

describe("validateIdentityKeyName with invalid input", () => {
  it("returns error for uppercase characters", () => {
    expect(validateIdentityKeyName("Alice")).toBe(
      "Lowercase, numbers, dots, hyphens only",
    );
  });

  it("returns error for spaces", () => {
    expect(validateIdentityKeyName("alice bob")).toBe(
      "Lowercase, numbers, dots, hyphens only",
    );
  });

  it("returns error for special characters", () => {
    expect(validateIdentityKeyName("alice@bob")).toBe(
      "Lowercase, numbers, dots, hyphens only",
    );
  });
});
