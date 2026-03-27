import { describe, it, expect } from "vitest";
import { validateNickname } from "./validate-nickname";
import { validateReferral } from "./validate-referral";
import { uploadAvatar } from "./upload-avatar";
import { saveProfile } from "./save-profile";
import { fetchLanguages } from "./fetch-languages";
import { saveSelectedLanguages } from "./save-selected-languages";

describe("onboarding action stubs", () => {
  it("validateNickname returns available for valid nickname", async () => {
    const result = await validateNickname("test");
    expect(result).toEqual({ isAvailable: true, isReserved: false });
  });

  it("validateNickname returns unavailable for invalid nickname", async () => {
    const result = await validateNickname("INVALID!");
    expect(result).toEqual({ isAvailable: false, isReserved: false });
  });

  it("validateReferral returns valid for valid nickname", async () => {
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
