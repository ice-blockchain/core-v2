// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractAudio } from "./platform/extract-audio.web";

function createMockAudioBuffer(): AudioBuffer {
  const channelData = new Float32Array(1024);
  for (let i = 0; i < channelData.length; i++) {
    channelData[i] = Math.sin(i * 0.1) * 0.5;
  }
  return {
    numberOfChannels: 1,
    length: 1024,
    sampleRate: 48000,
    duration: 1024 / 48000,
    getChannelData: () => channelData,
    copyFromChannel: vi.fn(),
    copyToChannel: vi.fn(),
  } as unknown as AudioBuffer;
}

const mockAudioBuffer = createMockAudioBuffer();

vi.stubGlobal("fetch", vi.fn(() =>
  Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
  }),
));

vi.stubGlobal("AudioContext", class {
  sampleRate = 48000;
  decodeAudioData = vi.fn(() => Promise.resolve(mockAudioBuffer));
  close = vi.fn(() => Promise.resolve());
});

vi.stubGlobal("OfflineAudioContext", class {
  createBufferSource = () => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
  });
  destination = {};
  startRendering = vi.fn(() => Promise.resolve(mockAudioBuffer));
});

vi.stubGlobal("URL", {
  createObjectURL: () => "blob:mock/audio",
  revokeObjectURL: vi.fn(),
});

describe("extractAudio (web)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns audio with wav mimeType", async () => {
    const result = await extractAudio("blob:mock/video.mp4");
    expect(result.mimeType).toBe("audio/wav");
  });

  it("returns zero dimensions for audio", async () => {
    const result = await extractAudio("blob:mock/video.mp4");
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
  });

  it("returns empty blurhash for audio", async () => {
    const result = await extractAudio("blob:mock/video.mp4");
    expect(result.blurhash).toBe("");
  });

  it("has non-zero file size", async () => {
    const result = await extractAudio("blob:mock/video.mp4");
    expect(result.fileSize).toBeGreaterThan(0);
  });
});
