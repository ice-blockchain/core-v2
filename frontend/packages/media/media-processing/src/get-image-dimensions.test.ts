// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getImageDimensions } from "./platform/get-image-dimensions.web";

vi.stubGlobal(
  "Image",
  class {
    naturalWidth = 1024;
    naturalHeight = 768;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_: string) {
      setTimeout(() => this.onload?.(), 0);
    }
  },
);

describe("getImageDimensions (web)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns correct width and height", async () => {
    const dimensions = await getImageDimensions("blob:mock/image");
    expect(dimensions.width).toBe(1024);
    expect(dimensions.height).toBe(768);
  });

  it("rejects when image fails to load", async () => {
    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_: string) {
          setTimeout(() => this.onerror?.(), 0);
        }
      },
    );

    await expect(
      getImageDimensions("blob:mock/broken"),
    ).rejects.toThrow("Failed to load image");
  });
});
