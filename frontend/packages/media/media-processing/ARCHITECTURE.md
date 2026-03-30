# @ion/media-processing Architecture

Cross-platform media processing library. Provides image compression/cropping, video compression, audio extraction, blurhash generation, and data compression with platform-specific implementations.

## Public API

```typescript
// Image processing
export { compressImage }        // Resize + compress image
export { cropImage }            // Crop image region
export { generateBlurhash }     // Generate blurhash placeholder string
export { getImageDimensions }   // Probe image width/height

// Video/audio processing
export { compressVideo }        // Compress video file
export { extractAudio }         // Extract audio track from video

// Data compression
export { compressData }         // Brotli compression for arbitrary data

// Types
export type { ImageFormat, ProcessingOptions, CropRegion, ProcessedMedia }
export type { VideoFormat, VideoProcessingOptions }
export type { AudioFormat, AudioProcessingOptions }
export type { CompressionAlgorithm, CompressDataOptions, CompressedData }
```

## Core Data Structures

```typescript
interface ProcessedMedia {
  uri: string;
  mimeType: string;
  fileSize: number;
  width: number;            // 0 for audio
  height: number;           // 0 for audio
  blurhash: string;         // Empty for audio
}

interface ProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;         // 0-1, default 0.8
  format?: ImageFormat;     // "jpeg" | "png" | "webp"
}

interface CropRegion {
  x: number;                // >= 0
  y: number;                // >= 0
  width: number;            // > 0
  height: number;           // > 0
}

interface VideoProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  bitrate?: number;
  format?: VideoFormat;     // "mp4"
}

interface AudioProcessingOptions {
  bitrate?: number;         // Default 128000 bps
  sampleRate?: number;      // Default 48000 Hz
  format?: AudioFormat;     // "opus"
}

interface CompressedData {
  data: Uint8Array;
  originalSize: number;
  compressedSize: number;
  algorithm: CompressionAlgorithm;  // "brotli"
}
```

## Processing Pipeline

```
Input URI
  --> [assertSafeUri] validate URI safety
  --> [Load media] platform-specific loading
  --> [Process] resize/crop/compress/extract
  --> [Promise.all] generate blurhash + get file size (parallel)
  --> ProcessedMedia { uri, mimeType, fileSize, width, height, blurhash }
```

All processing functions return the same `ProcessedMedia` shape. Audio fills `width: 0`, `height: 0`, `blurhash: ""`.

## Platform Abstraction Pattern

```
src/
  compress-image.ts           -- Re-exports from platform/
  platform/
    compress-image.ts         -- Stub (throws if bundler misconfigured)
    compress-image.web.ts     -- Canvas 2D API
    compress-image.native.ts  -- expo-image-manipulator
```

Same pattern for all functions. Bundler resolves `.web.ts` or `.native.ts` at build time.

## Platform Implementations

| Function | Web | Native |
|----------|-----|--------|
| `compressImage` | Canvas drawImage + toBlob | `expo-image-manipulator` resize + save |
| `cropImage` | Canvas drawImage region + toBlob (PNG) | `expo-image-manipulator` crop action |
| `generateBlurhash` | Canvas getImageData at 32x32 | Resize to 32x32 + pngjs decode + blurhash encode |
| `getImageDimensions` | Image element naturalWidth/Height | `expo-image-manipulator` probe |
| `compressVideo` | No actual compression (returns original URI + metadata) | `react-native-compressor` + FFprobeKit |
| `extractAudio` | Web Audio API OfflineAudioContext (WAV) | FFmpegKit (OGG/Opus) |
| `compressData` | brotli-wasm | brotli-wasm |

## Input Validation

| Validator | What it checks |
|-----------|---------------|
| `assertSafeUri(uri)` | Rejects spaces, quotes, backticks, pipes, newlines, shell metacharacters |
| `assertValidCropRegion(region)` | x, y >= 0; width, height > 0 |
| `clampQuality(value, min, max)` | Returns min if NaN/Infinity, clamps to range |
| `assertFinitePositive(value, name)` | Throws if not finite or <= 0 |

URI validation is critical for preventing command injection in FFmpeg commands.

## Design Decisions

- **Unified ProcessedMedia return type**: All functions return same shape. Simplifies downstream handling in media-upload.
- **Parallel post-processing**: After compression, blurhash and fileSize fetched via `Promise.all()`.
- **Aspect ratio preservation**: Image/video downscaling maintains ratio when both maxWidth and maxHeight specified.
- **Blurhash consistency**: All images downsampled to 32x32 with 4x3 components across platforms.
- **Web video limitation**: Web `compressVideo` returns original URI with metadata only (no actual compression). Native uses real codec.
- **URI safety validation**: Prevents command injection especially for FFmpeg command building.

## Dependencies

- **Runtime**: `blurhash`, `brotli-wasm`, `pngjs` (native blurhash)
- **Peer deps (optional)**: `expo-image-manipulator`, `ffmpeg-kit-react-native`, `react-native-compressor`
- **Downstream**: No internal package dependencies
- **Upstream consumers**: `@ion/media-upload`, `@ion/actions`

## File Structure

```
src/
  index.ts                              # Public API exports
  types.ts                              # All type definitions
  compress-image.ts                     # Re-export from platform
  compress-image.test.ts
  crop-image.ts
  crop-image.test.ts
  generate-blurhash.ts
  generate-blurhash.test.ts
  get-image-dimensions.ts
  get-image-dimensions.test.ts
  compress-video.ts
  compress-video.test.ts
  extract-audio.ts
  extract-audio.test.ts
  compress-data.ts
  compress-data.test.ts
  platform/
    native-modules.d.ts                 # Type stubs for peer deps
    compress-image.ts / .web.ts / .native.ts
    crop-image.ts / .web.ts / .native.ts
    generate-blurhash.ts / .web.ts / .native.ts
    get-image-dimensions.ts / .web.ts / .native.ts
    compress-video.ts / .web.ts / .native.ts
    extract-audio.ts / .web.ts / .native.ts
    compress-data.ts / .web.ts / .native.ts
    get-file-size.native.ts             # expo-file-system
    decode-base64-pixels.ts             # pngjs pixel extraction (native)
    validate-uri.ts                     # URI safety validation
    validate-uri.test.ts
    validate-options.ts                 # Numeric/region validation
    validate-options.test.ts
```
