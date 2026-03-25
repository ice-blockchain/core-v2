import { describe, it, expect, vi } from "vitest";
import { extractMetadata } from "./platform/extract-metadata.web";

vi.stubGlobal("fetch", vi.fn(() =>
  Promise.resolve({
    blob: () =>
      Promise.resolve(new Blob(["img"], { type: "image/jpeg" })),
  }),
));

vi.stubGlobal(
  "Image",
  class {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_: string) {
      setTimeout(() => this.onload?.(), 0);
    }
  },
);

describe("extractMetadata (web)", () => {
  it("extracts filename from a URL", async () => {
    const metadata = await extractMetadata("https://example.com/photos/beach.jpg");
    expect(metadata.filename).toBe("beach.jpg");
  });

  it("returns undefined filename for non-URL strings", async () => {
    const metadata = await extractMetadata("not-a-url");
    expect(metadata.filename).toBeUndefined();
  });

  it("returns a MediaMetadata object", async () => {
    const metadata = await extractMetadata("https://example.com/img.png");
    expect(metadata).toHaveProperty("filename");
  });
});
