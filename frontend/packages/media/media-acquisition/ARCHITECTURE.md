# @ion/media-acquisition Architecture

Cross-platform media acquisition library. Provides unified APIs for picking media from device library, capturing from camera, and extracting metadata on both web and native platforms.

## Public API

```typescript
// Functions
export { pickMedia }          // Open device media library for selection
export { captureMedia }       // Open device camera for capture
export { extractMetadata }    // Extract EXIF/file metadata from URI

// Types
export type { MediaPickerOptions, CapturedMedia, MediaMetadata, MediaType }
```

## Core Data Structures

```typescript
type MediaType = "images" | "videos" | "all";

interface MediaPickerOptions {
  allowsMultiple?: boolean;
  mediaTypes?: MediaType[];
  videoMaxDuration?: number;
}

interface CapturedMedia {
  uri: string;              // Object URL (web) or file URI (native)
  mimeType: string;         // e.g., "image/jpeg", "video/mp4"
  fileSize: number;         // Bytes
  width: number;            // Pixels
  height: number;           // Pixels
  duration?: number;        // Milliseconds (videos only)
}

interface MediaMetadata {
  filename?: string;
  creationDate?: Date;
  location?: { latitude: number; longitude: number };
  orientation?: 0 | 90 | 180 | 270;
}
```

## Platform Abstraction Pattern

```
src/
  pick-media.ts              -- Re-exports from platform/
  capture-media.ts           -- Re-exports from platform/
  extract-metadata.ts        -- Re-exports from platform/
  platform/
    *.ts                     -- Stub (throws if bundler misconfigured)
    *.web.ts                 -- Web implementation (DOM APIs)
    *.native.ts              -- Native implementation (Expo APIs)
```

Bundlers resolve `.web.ts` or `.native.ts` at build time. Base `.ts` stub throws at runtime to catch misconfiguration.

## Function Behavior by Platform

| Function | Web | Native |
|----------|-----|--------|
| `pickMedia` | Hidden `<input type="file">`, measures via DOM | `expo-image-picker.launchImageLibraryAsync()` |
| `captureMedia` | `getUserMedia` + canvas snapshot (PNG only) | `expo-image-picker.launchCameraAsync()` (photo + video) |
| `extractMetadata` | URL parsing (filename only) | `expo-media-library.getAssetInfoAsync()` (full EXIF) |

### Platform Coverage

| Feature | Web | Native |
|---------|-----|--------|
| Pick from library | Yes | Yes |
| Capture photo | Snapshot only | Full photo + video |
| Multiple select | Yes | Yes |
| Video duration limit | No | Yes |
| Filename | URL parsing | From media library |
| Creation date / Location / Orientation | No | Yes (EXIF) |

## Design Decisions

- **Platform stub pattern**: Base `.ts` throws at runtime rather than using conditional imports. Ensures bundlers correctly eliminate unused platform code.
- **Unified `CapturedMedia` interface**: Both platforms return the same shape despite different URI schemes (blob: vs file:). Consumers are platform-agnostic.
- **Single capture return**: `captureMedia()` returns one `CapturedMedia`; `pickMedia()` returns an array. Capture is inherently single-asset.
- **Optional peer deps**: `expo-image-picker` and `expo-camera` are optional peers so web builds don't require Expo.
- **No framework dependency**: Pure async functions, no React or UI framework imports.

## Dependencies

- **Peer deps (optional)**: `expo-image-picker`, `expo-camera`
- **Runtime (native only)**: `expo-media-library` (metadata extraction)
- **Downstream**: No internal package dependencies
- **Upstream consumers**: `@ion/actions` (orchestration), feeds into `@ion/media-processing` and `@ion/media-upload`

## File Structure

```
src/
  index.ts                           # Public API gate
  types.ts                           # MediaType, CapturedMedia, MediaMetadata, MediaPickerOptions
  pick-media.ts                      # Re-export from platform
  capture-media.ts                   # Re-export from platform
  extract-metadata.ts                # Re-export from platform
  pick-media.test.ts                 # Web picker tests (jsdom)
  capture-media.test.ts              # Web camera tests (jsdom)
  extract-metadata.test.ts           # Web metadata tests (jsdom)
  platform/
    native-modules.d.ts              # Expo type stubs
    pick-media.ts                    # Stub
    pick-media.web.ts                # Hidden file input
    pick-media.native.ts             # expo-image-picker
    capture-media.ts                 # Stub
    capture-media.web.ts             # getUserMedia + canvas
    capture-media.native.ts          # expo camera
    extract-metadata.ts              # Stub
    extract-metadata.web.ts          # URL parsing + DOM load
    extract-metadata.native.ts       # expo-media-library
```
