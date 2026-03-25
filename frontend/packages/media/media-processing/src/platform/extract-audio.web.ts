import type { AudioProcessingOptions, ProcessedMedia } from "../types";

export async function extractAudio(
  uri: string,
  options?: AudioProcessingOptions,
): Promise<ProcessedMedia> {
  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();
  const audioContext = new AudioContext({
    sampleRate: options?.sampleRate ?? 48000,
  });
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const renderedBuffer = await renderOffline(audioBuffer, options);
  const blob = encodeToBlob(renderedBuffer);
  await audioContext.close();
  return {
    uri: URL.createObjectURL(blob),
    mimeType: "audio/ogg; codecs=opus",
    fileSize: blob.size,
    width: 0,
    height: 0,
    blurhash: "",
  };
}

async function renderOffline(
  audioBuffer: AudioBuffer,
  options?: AudioProcessingOptions,
): Promise<AudioBuffer> {
  const sampleRate = options?.sampleRate ?? audioBuffer.sampleRate;
  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    sampleRate,
  );
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start();
  return offlineContext.startRendering();
}

function encodeToBlob(audioBuffer: AudioBuffer): Blob {
  const channelData = audioBuffer.getChannelData(0);
  const wavData = encodeWav(channelData, audioBuffer.sampleRate);
  return new Blob([wavData], { type: "audio/ogg; codecs=opus" });
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeWavHeader(view, samples.length, sampleRate);
  writeSamples(view, samples);
  return buffer;
}

function writeWavHeader(
  view: DataView,
  sampleCount: number,
  sampleRate: number,
): void {
  const byteRate = sampleRate * 2;
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, sampleCount * 2, true);
}

function writeSamples(view: DataView, samples: Float32Array): void {
  let offset = 44;
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped * 0x7fff, true);
    offset += 2;
  }
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
