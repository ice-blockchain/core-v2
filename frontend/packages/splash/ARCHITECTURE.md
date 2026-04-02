# @ion/splash Architecture

Constants and logic for the splash screen flow. Minimal package providing shared configuration consumed by `@ion/splash-ui`.

## Public API

```typescript
export { splashConfig }  // { safetyTimeoutMs: 2000, backgroundColor: "#FFFFFF" }
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
