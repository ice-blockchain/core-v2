// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { pickMedia } from "./platform/pick-media.web";

function createMockFile(name: string, type: string, size: number): File {
  const blob = new Blob(["x".repeat(size)], { type });
  return new File([blob], name, { type });
}

function stubFileInput(files: File[]): void {
  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag !== "input") return document.createElement(tag);
    const input = { type: "", accept: "", multiple: false } as {
      type: string;
      accept: string;
      multiple: boolean;
      onchange: (() => void) | null;
      files: FileList | null;
      click: () => void;
    };
    input.onchange = null;
    input.files = createFileList(files);
    input.click = () => {
      if (input.onchange) input.onchange();
    };
    return input as unknown as HTMLElement;
  });
}

function createFileList(files: File[]): FileList {
  return {
    length: files.length,
    item: (index: number) => files[index] ?? null,
    [Symbol.iterator]: () => files[Symbol.iterator](),
    ...files.reduce(
      (acc, file, i) => ({ ...acc, [i]: file }),
      {} as Record<number, File>,
    ),
  } as FileList;
}

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

vi.stubGlobal("URL", {
  createObjectURL: (blob: Blob) => `blob:mock/${blob.size}`,
  revokeObjectURL: vi.fn(),
});

describe("pickMedia (web)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an empty array when no files are selected", async () => {
    stubFileInput([]);
    const result = await pickMedia();
    expect(result).toEqual([]);
  });

  it("returns media for a single image file", async () => {
    const file = createMockFile("photo.jpg", "image/jpeg", 1024);
    stubFileInput([file]);

    const result = await pickMedia();
    expect(result).toHaveLength(1);
    const media = result[0]!;
    expect(media.mimeType).toBe("image/jpeg");
    expect(media.fileSize).toBe(1024);
    expect(media.width).toBe(800);
    expect(media.height).toBe(600);
  });

  it("returns multiple media when allowsMultiple is true", async () => {
    const files = [
      createMockFile("a.jpg", "image/jpeg", 100),
      createMockFile("b.png", "image/png", 200),
    ];
    stubFileInput(files);

    const result = await pickMedia({ allowsMultiple: true });
    expect(result).toHaveLength(2);
  });

  it("sets accept attribute based on mediaTypes option", async () => {
    stubFileInput([]);
    let capturedInput: { accept: string } | undefined;

    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag !== "input") return document.createElement(tag);
      const input = {
        type: "",
        accept: "",
        multiple: false,
        onchange: null as (() => void) | null,
        files: createFileList([]),
        click() {
          capturedInput = input;
          if (input.onchange) input.onchange();
        },
      };
      return input as unknown as HTMLElement;
    });

    await pickMedia({ mediaTypes: ["images"] });
    expect(capturedInput?.accept).toBe("image/*");
  });
});
