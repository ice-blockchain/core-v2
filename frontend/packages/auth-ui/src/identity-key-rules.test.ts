import { validateIdentityKeyName, isValidIdentityKeyName } from "./identity-key-rules";

describe("isValidIdentityKeyName", () => {
  it("accepts valid names", () => {
    expect(isValidIdentityKeyName("alice")).toBe(true);
    expect(isValidIdentityKeyName("bob.123")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidIdentityKeyName("")).toBe(false);
  });

  it("rejects uppercase", () => {
    expect(isValidIdentityKeyName("Alice")).toBe(false);
  });

  it("rejects names exceeding 64 characters", () => {
    expect(isValidIdentityKeyName("a".repeat(65))).toBe(false);
  });

  it("accepts names at exactly 64 characters", () => {
    expect(isValidIdentityKeyName("a".repeat(64))).toBe(true);
  });
});

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
    expect(validateIdentityKeyName("Alice")).toEqual(expect.any(String));
  });

  it("returns error for spaces", () => {
    expect(validateIdentityKeyName("alice bob")).toEqual(expect.any(String));
  });

  it("returns error for special characters", () => {
    expect(validateIdentityKeyName("alice@bob")).toEqual(expect.any(String));
  });
});
