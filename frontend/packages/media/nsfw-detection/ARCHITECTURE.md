# @ion/nsfw-detection Architecture

Cross-platform NSFW content detection using TensorFlow NSFWJS MobileNet v2 model. Provides image and video safety checks with configurable thresholds and frame sampling strategies.

## Public API

```typescript
// Functions
export { checkMediaSafety }    // Check single image for NSFW content
export { checkVideoSafety }    // Check video by sampling frames

// Types
export type { SafetyCategoryLabel, SafetyCategory, SafetyResult }
export type { VideoSafetyOptions, VideoFrameDetail, VideoSafetyResult }
```

## Core Data Structures

```typescript
type SafetyCategoryLabel = "explicit" | "suggestive" | "violence" | "hate";

interface SafetyCategory {
  label: SafetyCategoryLabel;
  confidence: number;          // 0-1
  isAboveThreshold: boolean;
}

interface SafetyResult {
  isSafe: boolean;             // true only if ALL categories below threshold
  categories: SafetyCategory[];
}

interface VideoSafetyOptions {
  frameCount?: number;         // Default 5
  strategy?: "uniform" | "random";  // Default "uniform"
  earlyExit?: boolean;         // Default true (stop on first unsafe frame)
  durationMs?: number;         // Video duration for timestamp calculation
}

interface VideoSafetyResult extends SafetyResult {
  framesAnalyzed: number;
  totalFramesRequested: number;
  flaggedFrameIndices: number[];
  frames: VideoFrameDetail[];
}
```

## Safety Thresholds

| Category | Threshold | Model Source |
|----------|-----------|-------------|
| explicit | 0.50 | max(porn, hentai) from NSFWJS |
| suggestive | 0.50 | sexy from NSFWJS |
| violence | 0.60 | Always 0 (not detected by model) |
| hate | 0.60 | Always 0 (not detected by model) |

Content is `isSafe = true` only when all categories are below their thresholds.

## Processing Pipelines

### Image Safety

```
checkMediaSafety(uri)
  --> loadModel()                   -- Cached TFLite/GraphModel
  --> preprocessImage(uri)          -- Resize to 224x224, normalize RGB 0-1
  --> runInference(model, input)    -- 5-class NSFWJS output
  --> mapScoresToCategories(scores) -- Map to 4 safety categories
  --> SafetyResult { isSafe, categories }
```

### Video Safety

```
checkVideoSafety(uri, options?)
  --> loadModel()
  --> extractVideoFrames(uri, options)  -- Sample frames at timestamps
  --> For each frame (sequential, early-exit by default):
        preprocessImage(frame.uri)
        runInference(model, input)
        mapScoresToCategories(scores)
        [if earlyExit && !isSafe: stop]
  --> aggregateFrameResults()           -- Worst-case score per category
  --> VideoSafetyResult
```

## NSFWJS Model Mapping

Model outputs 5 classes: `[drawing, hentai, neutral, porn, sexy]`

Mapped to 4 safety categories:
- `explicit = max(porn, hentai)`
- `suggestive = sexy`
- `violence = 0` (model limitation)
- `hate = 0` (model limitation)

## Platform Implementations

| Function | Web | Native |
|----------|-----|--------|
| `loadModel` | `@tensorflow/tfjs` GraphModel from `/models/` path | `react-native-nitro-tflite` from bundled asset |
| `preprocessImage` | Canvas 2D API, RGBA to RGB conversion | `jpeg-js` decode + bilinear interpolation resize |
| `runInference` | TF.js tensor creation + model.predict() | TFLite model.run() |
| `extractVideoFrames` | HTMLVideoElement seek + canvas capture (JPEG data URLs) | `react-native-create-thumbnail` |

All use the same platform stub pattern: `.ts` (stub) / `.web.ts` / `.native.ts`.

## Design Decisions

- **Model caching**: Single cached instance via `loadModel()`. First call loads (~100-500ms), subsequent calls return cached model. `resetModelCache()` exposed for tests.
- **Early exit for videos**: Default stops after first unsafe frame. Reduces cost for obviously unsafe content. Controllable via `earlyExit: false`.
- **Worst-case aggregation**: Video result takes highest score per category across all analyzed frames. Single unsafe frame makes entire video unsafe.
- **Frame sampling strategies**: Uniform (evenly spaced) for balanced coverage, random for statistical sampling of long videos.
- **Normalized 224x224 input**: MobileNet v2 required input size. RGB float32, 0-1 range.
- **Threshold-based classification**: Configurable per-category thresholds rather than single binary cutoff.

## Dependencies

- **Runtime**: `@ion/diagnostics` (logging), `jpeg-js` (native JPEG decode)
- **Peer deps (optional)**: `@tensorflow/tfjs` (web), `react-native-nitro-tflite` (native), `react-native-create-thumbnail` (native video)
- **Downstream**: `@ion/diagnostics` (Foundation layer)
- **Upstream consumers**: `@ion/actions` (called before media upload)

## File Structure

```
src/
  index.ts                           # Public API exports
  types.ts                           # All type definitions
  thresholds.ts                      # Safety threshold constants
  check-media-safety.ts              # Image safety orchestrator
  check-media-safety.test.ts
  check-video-safety.ts              # Video safety orchestrator
  check-video-safety.test.ts
  load-model.ts                      # Model caching layer
  load-model.test.ts
  preprocess-image.ts                # Image normalization wrapper
  preprocess-image.test.ts
  run-inference.ts                   # Inference wrapper
  run-inference.test.ts
  extract-video-frames.ts            # Frame extraction wrapper
  extract-video-frames.test.ts
  map-scores-to-categories.ts        # Score to category mapping
  map-scores-to-categories.test.ts
  aggregate-frame-results.ts         # Video result aggregation
  aggregate-frame-results.test.ts
  platform/
    react-native-tflite.d.ts         # TFLite type definitions
    load-model.ts / .web.ts / .native.ts
    preprocess-image.ts / .web.ts / .native.ts
    run-inference.ts / .web.ts / .native.ts
    extract-video-frames.ts / .web.ts / .native.ts
```
