import type { CapturedMedia } from "../types";

export async function captureMedia(): Promise<CapturedMedia> {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });

  const video = document.createElement("video");
  video.srcObject = stream;
  await video.play();

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Failed to create canvas context");
  context.drawImage(video, 0, 0);

  stopStream(stream);

  const blob = await canvasToBlob(canvas);
  return {
    uri: URL.createObjectURL(blob),
    mimeType: "image/png",
    fileSize: blob.size,
    width: canvas.width,
    height: canvas.height,
  };
}

function stopStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to capture image from canvas"));
    }, "image/png");
  });
}
