// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { compressImage } from "./platform/compress-image.web";

const mockBlob = new Blob(["compressed"], { type: "image/jpeg" });

vi.stubGlobal(
  "Image",
  class {
    naturalWidth = 1920;
    naturalHeight = 1080;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_: string) {
      setTimeout(() => this.onload?.(), 0);
    }
  },
);

vi.stubGlobal("URL", {
  createObjectURL: () => "blob:mock/compressed",
  revokeObjectURL: vi.fn(),
});

vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
  if (tag === "canvas") {
    return {
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: vi.fn(),
        getImageData: () => ({ data: new Uint8ClampedArray(32 * 32 * 4) }),
      }),
      toBlob: (cb: (blob: Blob) => void) => cb(mockBlob),
    } as unknown as HTMLElement;
  }
  return document.createElement(tag);
});

describe("compressImage (web)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns compressed image with correct dimensions", async () => {
    const result = await compressImage("blob:mock/original");
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
    expect(result.mimeType).toBe("image/jpeg");
    expect(result.uri).toBe("blob:mock/compressed");
  });

  it("scales down when maxWidth is set", async () => {
    const result = await compressImage("blob:mock/original", {
      maxWidth: 960,
    });
    expect(result.width).toBe(960);
    expect(result.height).toBe(540);
  });

  it("scales down when maxHeight is set", async () => {
    const result = await compressImage("blob:mock/original", {
      maxHeight: 540,
    });
    expect(result.width).toBe(960);
    expect(result.height).toBe(540);
  });

  it("respects format option for png output", async () => {
    const result = await compressImage("blob:mock/original", {
      format: "png",
    });
    expect(result.mimeType).toBe("image/png");
  });

  it("respects format option for webp output", async () => {
    const result = await compressImage("blob:mock/original", {
      format: "webp",
    });
    expect(result.mimeType).toBe("image/webp");
  });

  it("includes a blurhash in the result", async () => {
    const result = await compressImage("blob:mock/original");
    expect(result.blurhash).toBeTruthy();
    expect(typeof result.blurhash).toBe("string");
  });
});
