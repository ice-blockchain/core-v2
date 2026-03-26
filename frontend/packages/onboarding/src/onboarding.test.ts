import { describe, it, expect } from "vitest";
import { validateNickname } from "./validate-nickname";
import { validateReferral } from "./validate-referral";
import { uploadAvatar } from "./upload-avatar";
import { saveProfile } from "./save-profile";

describe("onboarding action stubs", () => {
  it("validateNickname throws not-implemented error", async () => {
    await expect(validateNickname("test")).rejects.toThrow("not implemented");
  });

  it("validateReferral throws not-implemented error", async () => {
    await expect(validateReferral("ref123")).rejects.toThrow("not implemented");
  });

  it("uploadAvatar throws not-implemented error", async () => {
    await expect(uploadAvatar({ imageUri: "file://photo.jpg" })).rejects.toThrow("not implemented");
  });

  it("saveProfile throws not-implemented error", async () => {
    const input = { displayName: "John", nickname: "john" };
    await expect(saveProfile(input)).rejects.toThrow("not implemented");
  });
});
