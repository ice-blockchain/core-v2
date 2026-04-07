import { describe, it, expect, vi } from "vitest";
import { capturePhoto } from "./capture-photo";

vi.mock("@ion/media-acquisition", () => ({
  captureMedia: vi.fn(),
}));

const { captureMedia } = await import("@ion/media-acquisition");
const mockCapture = vi.mocked(captureMedia);

const STUB_MEDIA = {
  uri: "file://photo.jpg",
  mimeType: "image/jpeg",
  fileSize: 1024,
  width: 800,
  height: 600,
};

describe("capturePhoto", () => {
  it("returns captured media on success", async () => {
    mockCapture.mockResolvedValueOnce(STUB_MEDIA);
    const result = await capturePhoto();
    expect(result).toEqual(STUB_MEDIA);
  });

  it("returns null when user cancels", async () => {
    mockCapture.mockRejectedValueOnce(new Error("Camera capture was canceled"));
    const result = await capturePhoto();
    expect(result).toBeNull();
  });
});
