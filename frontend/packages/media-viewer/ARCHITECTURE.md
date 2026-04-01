# @ion/media-viewer Architecture

React Native media display components. Provides image and video rendering with fullscreen viewing, gesture support (pinch-to-zoom, dismiss), and horizontal pagination.

## Public API

```typescript
// Components
export { MediaImage }       // Single image with resize modes
export { MediaVideo }       // Single video with autoplay, poster, controls
export { MediaFullscreen }  // Fullscreen modal with media pagination

// Types
export type { MediaViewerSource, MediaImageProps, MediaVideoProps, MediaFullscreenProps }
```

## Core Data Structure

```typescript
interface MediaViewerSource {
  uri: string;
  mimeType: string;          // "image/*" or "video/*"
  width?: number;            // For aspect ratio calculation
  height?: number;
  thumbnailUri?: string;     // Video poster/thumbnail
}
```

## Component Hierarchy

```
MediaImage (standalone)       -- React Native Image with resize modes
MediaVideo (standalone)       -- expo-av with autoplay, controls, poster

MediaFullscreen (modal)
  FullscreenHeader            -- Index counter + close button
  FlatList (horizontal, paginated, windowSize=3)
    FullscreenImageItem       -- RN Image + pinch-to-zoom + dismiss gesture
    FullscreenVideoItem       -- MediaVideo + dismiss gesture
```

## Gesture System

| Gesture | Hook | Behavior |
|---------|------|----------|
| Pinch-to-zoom | `usePinchToZoom` | Scale 1x-4x, double-tap toggles 1x/2x |
| Pan (zoomed) | `usePinchToZoom` | Translate image when zoomed in |
| Dismiss | `useDismissGesture` | Vertical pan down to close. Disabled when zoomed. |

Gestures are composed with `Gesture.Exclusive()` to prevent conflicts.

## Design Decisions

- **Type routing**: `MediaFullscreen` routes to image or video item based on `mimeType.startsWith('image/')`.
- **Aspect ratio**: Uses `width/height` from source if available; falls back to 100% fill.
- **FlatList optimization**: `getItemLayout` for scroll perf, `windowSize={3}` for memory.
- **React Native Image**: Uses the built-in RN `Image` component for broad compatibility and minimal dependencies. Resize modes are mapped (`fill` -> `stretch`).
- **Reanimated gestures**: All animations use `react-native-reanimated` worklets for UI thread performance.

## Dependencies

- **Runtime**: `@ion/ui` (Text component in header)
- **Peer deps**: `expo-av`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-safe-area-context`
- **Downstream**: `@ion/ui` (foundation)
- **Upstream consumers**: Screens (chat, feed, profile)

## File Structure

```
src/
  index.ts
  types.ts                          # MediaViewerSource, prop interfaces
  aspect-ratio.ts                   # Aspect ratio calculation
  media-image.tsx                   # Single image component
  media-video.tsx                   # Single video component
  media-fullscreen.tsx              # Fullscreen modal wrapper
  fullscreen-image-item.tsx         # Fullscreen image with gestures
  fullscreen-video-item.tsx         # Fullscreen video with dismiss
  fullscreen-header.tsx             # Index + close button
  use-pinch-to-zoom.ts             # Pinch, pan, double-tap hook
  use-dismiss-gesture.ts           # Vertical pan dismiss hook
  *.test.tsx
```
