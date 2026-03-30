import { describe, it, expect } from "vitest";
import { validateNickname } from "./validate-nickname";
import { validateReferral } from "./validate-referral";
import { uploadAvatar } from "./upload-avatar";
import { saveProfile } from "./save-profile";
import { fetchLanguages } from "./fetch-languages";
import { fetchReservedNicknames } from "./fetch-reserved-nicknames";
import { saveSelectedLanguages } from "./save-selected-languages";

const EMPTY_RESERVED = new Set<string>();
const STUB_RESERVED = new Set(["ion", "hades"]);

describe("onboarding action stubs", () => {
  it("validateNickname returns available for valid nickname", async () => {
    const result = await validateNickname("test", EMPTY_RESERVED);
    expect(result).toEqual({ isAvailable: true, isReserved: false });
  });

  it("validateNickname returns unavailable for invalid nickname", async () => {
    const result = await validateNickname("INVALID!", EMPTY_RESERVED);
    expect(result).toEqual({ isAvailable: false, isReserved: false });
  });

  it("validateNickname returns reserved for a reserved nickname", async () => {
    const result = await validateNickname("ion", STUB_RESERVED);
    expect(result).toEqual({ isAvailable: false, isReserved: true });
  });

  it("validateNickname returns available when nickname is not reserved", async () => {
    const result = await validateNickname("alice", STUB_RESERVED);
    expect(result).toEqual({ isAvailable: true, isReserved: false });
  });

  it("fetchReservedNicknames returns an array containing ion and hades", async () => {
    const result = await fetchReservedNicknames();
    expect(Array.isArray(result.reservedNicknames)).toBe(true);
    expect(result.reservedNicknames).toContain("ion");
    expect(result.reservedNicknames).toContain("hades");
  });

  it("validateReferral returns valid for valid referral", async () => {
    const result = await validateReferral("ref123");
    expect(result).toEqual({ isValid: true });
  });

  it("uploadAvatar throws not-implemented error", async () => {
    await expect(uploadAvatar({ imageUri: "file://photo.jpg" })).rejects.toThrow("not implemented");
  });

  it("saveProfile returns success", async () => {
    const input = { displayName: "John", nickname: "john" };
    const result = await saveProfile(input);
    expect(result).toEqual({ success: true });
  });

  it("fetchLanguages returns a non-empty language list", async () => {
    const languages = await fetchLanguages();
    expect(languages.length).toBeGreaterThan(0);
    expect(languages[0]).toHaveProperty("code");
    expect(languages[0]).toHaveProperty("name");
    expect(languages[0]).toHaveProperty("flag");
  });

  it("saveSelectedLanguages resolves without error", async () => {
    await expect(saveSelectedLanguages({ languageCodes: ["en", "fr"] })).resolves.toBeUndefined();
  });
});
