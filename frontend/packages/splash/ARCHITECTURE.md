# @ion/splash Architecture

Constants and logic for the splash screen flow. Minimal package providing shared configuration consumed by `@ion/splash-ui`.

## Public API

```typescript
export { SAFETY_TIMEOUT_MS }          // 2000ms — fallback if video fails to trigger onEnd
export { SPLASH_BACKGROUND_COLOR }    // "#FFFFFF" — screen background during video
```

## Dependencies

- **Runtime**: None
- **Upstream consumers**: `@ion/splash-ui`

## File Structure

```text
src/
  index.ts
  constants.ts      # Runtime constants (timeout, background color)
```
