// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { compressVideo } from "./platform/compress-video.web";

const mockVideoBlob = new Blob(["video-data"], { type: "video/mp4" });

vi.stubGlobal("fetch", vi.fn(() =>
  Promise.resolve({
    ok: true,
    blob: () => Promise.resolve(mockVideoBlob),
  }),
));

vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
  if (tag === "video") {
    return {
      preload: "",
      muted: false,
      videoWidth: 1280,
      videoHeight: 720,
      onloadeddata: null as (() => void) | null,
      onerror: null as (() => void) | null,
      set src(_: string) {
        setTimeout(() => (this as { onloadeddata: (() => void) | null }).onloadeddata?.(), 0);
      },
    } as unknown as HTMLElement;
  }
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

describe("compressVideo (web)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns video with mp4 mimeType", async () => {
    const result = await compressVideo("blob://mock/video.mp4");
    expect(result.mimeType).toBe("video/mp4");
  });

  it("returns correct dimensions from video metadata", async () => {
    const result = await compressVideo("blob://mock/video.mp4");
    expect(result.width).toBe(1280);
    expect(result.height).toBe(720);
  });

  it("scales down when maxWidth is set", async () => {
    const result = await compressVideo("blob://mock/video.mp4", {
      maxWidth: 640,
    });
    expect(result.width).toBe(640);
    expect(result.height).toBe(360);
  });

  it("includes a blurhash from the first frame", async () => {
    const result = await compressVideo("blob://mock/video.mp4");
    expect(result.blurhash).toBeTruthy();
  });
});
