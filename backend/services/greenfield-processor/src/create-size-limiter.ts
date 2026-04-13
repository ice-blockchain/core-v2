import { Transform, type TransformCallback } from 'node:stream';

export class SizeLimitExceededError extends Error {
  constructor(received: number, limit: number) {
    super(`Download exceeded size limit: received ${received} bytes, limit ${limit}`);
    this.name = 'SizeLimitExceededError';
  }
}

export default function createSizeLimiter(maxBytes: number): Transform {
  let bytesReceived = 0;

  return new Transform({
    transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
      bytesReceived += chunk.length;
      if (bytesReceived > maxBytes) {
        callback(new SizeLimitExceededError(bytesReceived, maxBytes));
        return;
      }
      callback(null, chunk);
    },
  });
}
