# @ion/media Architecture

Cross-platform media handling with two sub-packages: processing (compression, cropping, blurhash) and acquisition (picking, capturing, metadata).

## Sub-Packages

| Package | Purpose |
|---------|---------|
| `media-processing/` | Image, video, audio compression and manipulation |
| `media-acquisition/` | Media picking from library, camera capture, metadata extraction |

---

## media-processing

### Public API

```typescript
// Image
export { compressImage }        // Compress and resize
export { cropImage }            // Crop with coordinates
export { getImageDimensions }   // Get width/height

// Video
export { compressVideo }        // Compress and resize
export { extractAudio }         // Extract audio track

// Generic
export { generateBlurhash }     // Blurhash placeholder from image
export { compressData }         // Brotli compression for arbitrary data

export type { ProcessedMedia, ProcessingOptions, CropRegion, ... }
```

### Core Data Structure

```typescript
interface ProcessedMedia {
  uri: string;        // blob: (web) or file:// (native)
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  blurhash: string;
}
```

### Platform Implementations

| Function | Web | Native |
|----------|-----|--------|
| compressImage | Canvas API | expo-image-manipulator |
| compressVideo | Canvas + MediaRecorder | react-native-compressor |
| extractAudio | AudioContext/OfflineAudioContext | FFmpeg (libopus) |
| generateBlurhash | Canvas -> pixel data -> blurhash | Native blurhash encoder |
| compressData | brotli-wasm | brotli-wasm |

### Defaults

- Image quality: 0.8 (80%)
- Brotli quality: 6 (0-11 scale)
- Audio bitrate: 128kbps, sample rate: 48kHz
- Blurhash: 32x32 canvas, 4x3 components
- Load timeout: 30 seconds

---

## media-acquisition

### Public API

```typescript
export { pickMedia }            // Open photo/video library picker
export { captureMedia }         // Capture from camera
export { extractMetadata }      // Get metadata from media file

export type { CapturedMedia, MediaPickerOptions, MediaMetadata, MediaType }
```

### Core Data Structure

```typescript
interface CapturedMedia {
  uri: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  duration?: number;    // Video only (ms)
}
```

### Platform Implementations

| Function | Web | Native |
|----------|-----|--------|
| pickMedia | `<input type="file">` | expo-image-picker |
| captureMedia | `getUserMedia` (webcam) | expo-camera / expo-image-picker camera mode |
| extractMetadata | Image/video load for dimensions | expo-media-library (full metadata) |

---

## Shared Design Decisions

- **Platform abstraction**: `.ts` (stub), `.web.ts`, `.native.ts` per function. Bundler resolves.
- **URI-based interface**: All inputs/outputs are URIs, not file paths.
- **Input validation**: URI safety regex, crop region validation, quality clamping.
- **Async-first**: All functions return Promises.
- **Blurhash generation**: Every processed image gets a blurhash for progressive loading.

## Dependencies

- **Runtime** (processing): `blurhash`, `brotli-wasm`, `pngjs`
- **Peer deps**: `expo-image-manipulator`, `ffmpeg-kit-react-native`, `react-native-compressor`, `expo-camera`, `expo-image-picker` (all optional)
- **Downstream**: None (media layer)
- **Upstream consumers**: `@ion/onboarding`, actions, upload flows

## File Structure

```
media-processing/
  src/
    index.ts, types.ts
    compress-image.ts, compress-video.ts, compress-data.ts,
    crop-image.ts, get-image-dimensions.ts, extract-audio.ts,
    generate-blurhash.ts
    platform/
      [each function].{ts,web.ts,native.ts}
      validate-uri.ts, validate-options.ts

media-acquisition/
  src/
    index.ts, types.ts
    pick-media.ts, capture-media.ts, extract-metadata.ts
    platform/
      [each function].{ts,web.ts,native.ts}
```
