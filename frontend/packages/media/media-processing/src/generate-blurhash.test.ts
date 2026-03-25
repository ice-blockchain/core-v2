// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateBlurhash } from "./platform/generate-blurhash.web";

vi.stubGlobal(
  "Image",
  class {
    naturalWidth = 800;
    naturalHeight = 600;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_: string) {
      setTimeout(() => this.onload?.(), 0);
    }
  },
);

vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
  if (tag === "canvas") {
    return {
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: vi.fn(),
        getImageData: () => ({ data: new Uint8ClampedArray(32 * 32 * 4) }),
      }),
    } as unknown as HTMLElement;
  }
  return document.createElement(tag);
});

describe("generateBlurhash (web)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a non-empty blurhash string", async () => {
    const hash = await generateBlurhash("blob:mock/image");
    expect(hash).toBeTruthy();
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
  });
});
