# @ion/splash-ui Architecture

Cross-platform splash screen with video playback. Plays `logo_static.mp4` on app launch, then navigates to `Onboarding` via `@ion/navigation`.

## Public API

```typescript
export { SplashScreen }   // Full-screen splash with video + fallback icon
```

## Screen Flow

1. SplashScreen mounts, starts video playback
2. Video ends (or 2s safety timeout fires) -> `navigation.reset()` to `Routes.Onboarding`
3. On video error -> shows `login-ice-logo` icon fallback, timeout still advances

## Future Direction

- Keep `GetStarted` in navigation context for upcoming intro/auth entry work.
- Implement future `Intro` / `GetStarted` UI inside `@ion/splash-ui` to keep launch and intro video logic in one package.
- Reuse the same platform approach that currently works in app-level `IntroVideo` implementations:
  - mobile: media viewer playback with RN-native asset resolution.
  - web: HTML/video-compatible media viewer source path.
- Goal: use one splash/intro package-level approach that avoids Metro/bundler issues seen with ad-hoc app-shell video wiring.
- `intro.mp4` should play on the future `Intro` / `GetStarted` screen via this shared approach.

## Platform-Specific Files

| File | Platform | Purpose |
|---|---|---|
| `splash-video.native.tsx` | iOS/Android | Uses `react-native-video` |
| `splash-video.web.tsx` | Web | Uses HTML5 `<video>` |
| `splash-video-source.native.ts` | iOS/Android | `require()` for RN bundler |
| `splash-video-source.ts` | Web | ES import for Vite bundler |

## Dependencies

- `@ion/splash` — constants (timeout, background color)
- `@ion/ui` — Icon component, color palette
- `@ion/navigation` — `useAppNavigation()`, `Routes`
- `react-native-video` — native video playback (optional peer dep for web)

## File Structure

```
src/
  index.ts
  assets.d.ts
  assets/videos/logo_static.mp4
  screens/
    SplashScreen.tsx
    splash-video.native.tsx
    splash-video.web.tsx
    splash-video-source.native.ts
    splash-video-source.ts
```
