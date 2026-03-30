import { describe, it, expect } from "vitest";
import { validateUploadInput } from "./validate-upload-input";

describe("validateUploadInput", () => {
  const validInput = {
    uri: "https://example.com/photo.jpg",
    mimeType: "image/jpeg",
    fileSize: 2048,
  };

  it("accepts valid input without throwing", () => {
    expect(() => validateUploadInput(validInput)).not.toThrow();
  });

  it("rejects empty URI", () => {
    expect(() => validateUploadInput({ ...validInput, uri: "" }))
      .toThrow("Upload URI must not be empty");
  });

  it("rejects whitespace-only URI", () => {
    expect(() => validateUploadInput({ ...validInput, uri: "   " }))
      .toThrow("Upload URI must not be empty");
  });

  it("rejects zero fileSize", () => {
    expect(() => validateUploadInput({ ...validInput, fileSize: 0 }))
      .toThrow("Upload fileSize must be a positive number");
  });

  it("rejects negative fileSize", () => {
    expect(() => validateUploadInput({ ...validInput, fileSize: -100 }))
      .toThrow("Upload fileSize must be a positive number");
  });

  it("rejects NaN fileSize", () => {
    expect(() => validateUploadInput({ ...validInput, fileSize: NaN }))
      .toThrow("Upload fileSize must be a positive number");
  });

  it("rejects Infinity fileSize", () => {
    expect(() => validateUploadInput({ ...validInput, fileSize: Infinity }))
      .toThrow("Upload fileSize must be a positive number");
  });

  it("rejects invalid mimeType format", () => {
    expect(() => validateUploadInput({ ...validInput, mimeType: "notamime" }))
      .toThrow("Invalid mimeType");
  });

  it("rejects empty mimeType", () => {
    expect(() => validateUploadInput({ ...validInput, mimeType: "" }))
      .toThrow("Invalid mimeType");
  });

  it("accepts common media mimeTypes", () => {
    for (const mime of ["image/png", "video/mp4", "image/svg+xml", "audio/mpeg"]) {
      expect(() => validateUploadInput({ ...validInput, mimeType: mime })).not.toThrow();
    }
  });
});
