import { describe, it, expect, vi } from "vitest";
import { capturePhoto } from "./capture-photo";

vi.mock("react-native-image-picker", () => ({
  launchCamera: vi.fn(),
}));

const { launchCamera } = await import("react-native-image-picker");
const mockLaunchCamera = vi.mocked(launchCamera);

describe("capturePhoto", () => {
  it("returns captured photo on success", async () => {
    mockLaunchCamera.mockImplementation((_opts, cb) => {
      cb!({ assets: [{ uri: "file://photo.jpg", width: 800, height: 600, type: "image/jpeg" }] });
      return Promise.resolve({ assets: [] });
    });
    const result = await capturePhoto();
    expect(result).toMatchObject({ uri: "file://photo.jpg", width: 800, height: 600, mediaType: "photo" });
  });

  it("returns null when user cancels", async () => {
    mockLaunchCamera.mockImplementation((_opts, cb) => {
      cb!({ didCancel: true });
      return Promise.resolve({ assets: [] });
    });
    const result = await capturePhoto();
    expect(result).toBeNull();
  });
});
