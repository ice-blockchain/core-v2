// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { cropImage } from "./platform/crop-image.web";

const mockBlob = new Blob(["cropped"], { type: "image/png" });
const allDrawImageCalls: unknown[][] = [];

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
  createObjectURL: () => "blob://mock/cropped",
  revokeObjectURL: vi.fn(),
});

vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
  if (tag === "canvas") {
    return {
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: (...args: unknown[]) => {
          allDrawImageCalls.push(args);
        },
        getImageData: () => ({ data: new Uint8ClampedArray(32 * 32 * 4) }),
      }),
      toBlob: (cb: (blob: Blob) => void) => cb(mockBlob),
    } as unknown as HTMLElement;
  }
  return document.createElement(tag);
});

describe("cropImage rejects invalid crop regions", () => {
  it("rejects negative crop coordinates", async () => {
    await expect(
      cropImage("blob://mock/original", { x: -1, y: 0, width: 100, height: 100 }),
    ).rejects.toThrow("non-negative");
  });

  it("rejects zero-dimension crop region", async () => {
    await expect(
      cropImage("blob://mock/original", { x: 0, y: 0, width: 0, height: 100 }),
    ).rejects.toThrow("positive");
  });
});

describe("cropImage (web)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    allDrawImageCalls.length = 0;
  });

  it("returns cropped image with correct dimensions", async () => {
    const result = await cropImage("blob://mock/original", {
      x: 100, y: 50, width: 400, height: 300,
    });
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
    expect(result.mimeType).toBe("image/png");
  });

  it("passes crop region coordinates to drawImage", async () => {
    await cropImage("blob://mock/original", {
      x: 100, y: 50, width: 400, height: 300,
    });
    const cropCall = allDrawImageCalls[0]!;
    expect(cropCall[1]).toBe(100);
    expect(cropCall[2]).toBe(50);
    expect(cropCall[3]).toBe(400);
    expect(cropCall[4]).toBe(300);
  });

  it("includes a blurhash in the result", async () => {
    const result = await cropImage("blob://mock/original", {
      x: 0, y: 0, width: 100, height: 100,
    });
    expect(result.blurhash).toBeTruthy();
  });
});
