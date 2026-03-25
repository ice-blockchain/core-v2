// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { captureMedia } from "./platform/capture-media.web";

function createMockMediaStream(): MediaStream {
  return {
    getTracks: () => [{ stop: vi.fn() }],
  } as unknown as MediaStream;
}

function createMockVideo(): {
  srcObject: MediaStream | null;
  videoWidth: number;
  videoHeight: number;
  play: () => Promise<void>;
} {
  return {
    srcObject: null,
    videoWidth: 640,
    videoHeight: 480,
    play: () => Promise.resolve(),
  };
}

vi.stubGlobal("navigator", {
  mediaDevices: {
    getUserMedia: vi.fn(() => Promise.resolve(createMockMediaStream())),
  },
});

vi.stubGlobal("URL", {
  createObjectURL: () => "blob:mock/capture",
  revokeObjectURL: vi.fn(),
});

const mockBlob = new Blob(["fake-png"], { type: "image/png" });

vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
  if (tag === "video") return createMockVideo() as unknown as HTMLElement;
  if (tag === "canvas") {
    return {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: vi.fn() }),
      toBlob: (callback: (blob: Blob) => void) => callback(mockBlob),
    } as unknown as HTMLElement;
  }
  return document.createElement(tag);
});

describe("captureMedia (web)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("captures a snapshot from the camera", async () => {
    const result = await captureMedia();
    expect(result.mimeType).toBe("image/png");
    expect(result.uri).toBe("blob:mock/capture");
    expect(result.width).toBe(640);
    expect(result.height).toBe(480);
  });

  it("requests camera access via getUserMedia", async () => {
    await captureMedia();
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      video: true,
    });
  });
});
