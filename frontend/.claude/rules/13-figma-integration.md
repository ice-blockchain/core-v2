---
paths:
  - "apps/**/*.tsx"
  - "apps/**/*.ts"
  - "packages/**/*.tsx"
  - "packages/**/*.ts"
---

# Figma MCP Integration Rules

These rules define how to translate Figma designs into code for this project. Follow them for every Figma-driven change.

---

## Required Flow (do not skip)

1. Run `get_design_context` to fetch the structured representation for the exact node(s).
2. If the response is too large or truncated, run `get_metadata` to get the high-level node map, then re-fetch only the required node(s) with `get_design_context`.
3. Run `get_screenshot` for a visual reference of the node being implemented.
4. Only after you have both `get_design_context` and `get_screenshot`, download any assets and start implementation.
5. Translate the output (React + Tailwind) into this project's conventions (see below).
6. Validate against Figma for 1:1 look and behavior before marking complete.

---

## Framework Translation

### CRITICAL: This is a React Native project, not a web React project.

Figma MCP returns React + Tailwind by default. You must translate to:

| Figma MCP Output | ION Equivalent |
|---|---|
| `<div>` | `<View>` from `react-native` |
| `<span>`, `<p>`, `<h1>` | `<Text variant="...">` from `@ion/ui` |
| `<button>` | `<Button>` or `<SmallButton>` from `@ion/ui` |
| `<input>` | `<TextField>` from `@ion/ui` |
| `<img>` | `<Image>` from `react-native` |
| Tailwind classes | `StyleSheet.create()` with `@ion/ui` tokens |
| CSS flexbox | React Native `flexDirection`, `alignItems`, `justifyContent` |
| `px`/`rem` units | Unitless numbers using `spacingTokens` from `@ion/ui` |
| `className` | `style` prop |

### CRITICAL: Never use HTML elements, Tailwind classes, or CSS in React Native code.

---

## Color Mapping

### CRITICAL: Map Figma hex values to `colorPalette` or `semanticColors` from `@ion/ui`.

When Figma returns a hex color, find the matching token:

| Figma Hex | ION Token |
|---|---|
| `#EA3665` | `colorPalette.raspberry` |
| `#7D40FF` | `colorPalette.purple` |
| `#1B9CF0` | `colorPalette.lightBlue` |
| `#0166FF` | `semanticColors.primaryAccent` |
| `#0E0E0E` | `colorPalette.ink` / `semanticColors.primaryText` |
| `#494949` | `colorPalette.slate` / `semanticColors.secondaryText` |
| `#FFFFFF` | `colorPalette.white` / `semanticColors.secondaryBackground` |
| `#F5F7FF` | `semanticColors.primaryBackground` |
| `#FD4E4E` | `semanticColors.attentionRed` |
| `#35D487` | `semanticColors.success` |
| `#CCCCCC` | `semanticColors.strokeElements` |

If a color is not in `colorPalette` or `semanticColors`, do not hardcode it. Request it be added to `@ion/ui` first.

---

## Typography Mapping

### CRITICAL: Map Figma text styles to `<Text variant="...">` from `@ion/ui`.

Match by font size and weight:

| Figma Size/Weight | ION Variant |
|---|---|
| 28px / Bold (700) | `headline1` |
| 24px / Bold (700) | `headline2` |
| 17px / SemiBold (600) | `title` |
| 15px / SemiBold (600) | `subtitle` |
| 15px / Medium (500) | `subtitle2` |
| 14px / Medium (500) | `subtitle3` |
| 13px / SemiBold (600) | `body` |
| 13px / Regular (400) | `body2` |
| 12px / Medium (500) | `caption` |
| 12px / Regular (400) | `caption2` |
| 11px / Regular (400) | `caption3` |
| 11px / SemiBold (600) | `caption4` |
| 10px / Medium (500) | `caption5` |
| 11px / Medium (500) | `caption6` |

Font family is always NotoSans (Regular, Medium, SemiBold, Bold). Never set `fontSize`, `fontWeight`, `fontFamily`, or `lineHeight` directly in styles.

---

## Spacing Mapping

### IMPORTANT: Map Figma pixel values to `spacingTokens` from `@ion/ui`.

| Figma Pixels | ION Token |
|---|---|
| 2px | `spacing.xxs` |
| 4px | `spacing.xs` |
| 8px | `spacing.sm` |
| 12px | `spacing.md` |
| 16px | `spacing.lg` |
| 20px | `spacing.xl` |
| 24px | `spacing.xxl` |
| 32px | `spacing.xxxl` |

Border radii: `radii.small` (8), `radii.medium` (12), `radii.large` (16).

---

## Component Reuse

### CRITICAL: Check `@ion/ui` components before creating new ones.

Available components in `packages/ui/src/components/`:

| Need | Use |
|---|---|
| Button | `<Button>` from `@ion/ui` |
| Small button | `<SmallButton>` from `@ion/ui` |
| Text display | `<Text variant="...">` from `@ion/ui` |
| Text input | `<TextField>` from `@ion/ui` |
| Container | `<Box>` from `@ion/ui` |
| Bottom sheet | `<BottomSheet>` from `@ion/ui` |
| Fullscreen sheet | `<FullscreenBottomSheet>` from `@ion/ui` |
| Divider | `<HorizontalSeparator>` from `@ion/ui` |
| Search | `<SearchBar>` from `@ion/ui` |
| Loading spinner | `<IONLoader>` from `@ion/ui` |
| Toast/notification | `useNotificationBar` from `@ion/ui` |

If a Figma component matches an existing `@ion/ui` component, use it. If it doesn't exist, extend `@ion/ui` rather than building a one-off.

---

## Icons

### CRITICAL: Map Figma icons to the `<Icon>` component from `@ion/ui`.

Never inline SVGs. If the Figma MCP server returns an icon asset:
1. Check if a matching icon exists in `packages/ui/src/icons/assets/`.
2. If yes, use `<Icon name="icon-name" size={24} color={colors.primaryAccent} />`.
3. If no, add the SVG to `packages/ui/src/icons/assets/`, run `pnpm generate:icons`, then use it via `<Icon>`.

---

## Asset Handling

### CRITICAL: Multi-color illustrations must be exported as PNG raster images, not SVG.

The SVG icon generator (`pnpm generate:icons`) replaces all white/black fills with a dynamic `{color}` prop. This breaks multi-color assets where white or black are intentional design colors (e.g., white details on a blue background). Only monochrome, single-color icons should use the `<Icon>` SVG system.

### CRITICAL: Export raster assets from Figma using `get_design_context`, not by converting local SVGs.

To get a pixel-perfect raster export:
1. Call `get_design_context` on the Figma icon/illustration node to get individual sub-asset URLs.
2. Download each sub-asset SVG via `curl` from the Figma MCP asset URLs.
3. Compose a single SVG using the **exact inset positions** from the Figma layout (the `inset-[top% right% bottom% left%]` values map to `translate(x, y)` within a 48x48 or similar viewBox).
4. Convert the composite SVG to PNG at 1x, 2x, 3x using `rsvg-convert`:
   ```bash
   rsvg-convert -w 48 -h 48 composite.svg -o icon.png
   rsvg-convert -w 96 -h 96 composite.svg -o icon@2x.png
   rsvg-convert -w 144 -h 144 composite.svg -o icon@3x.png
   ```
5. Store in the package's `src/assets/` directory with `@2x`/`@3x` suffixes.

### IMPORTANT: Use RN `Image` with `ImageSourcePropType` for bundled raster assets.

`MediaImage` from `@ion/media-viewer` depends on `expo-image`, which requires Expo modules infrastructure not yet set up in the bare RN project. Until Expo modules are configured, use React Native's `Image` for bundled assets. Use `ImageSourcePropType` so the switch to `MediaImage`/`MediaViewerSource` is a one-line change later.

Create platform-specific image source files:
```typescript
// feature-images.native.ts (mobile — RN picks best @1x/@2x/@3x variant)
import { Image } from "react-native";
import type { ImageSourcePropType } from "react-native";

const resolveAsset = (asset: number): ImageSourcePropType => ({
  uri: Image.resolveAssetSource(asset).uri,
});

export const myImage: ImageSourcePropType = resolveAsset(require("../assets/my-image.png") as number);

// feature-images.ts (web — Vite static import of @3x variant)
import type { ImageSourcePropType } from "react-native";
import myImageUrl from "../assets/my-image@3x.png";

export const myImage: ImageSourcePropType = { uri: myImageUrl as string };
```

Use in components: `<Image source={myImage} style={{ width: scale(48), height: scale(48) }} />`

Add `*.png` module declaration in `src/assets/assets.d.ts`.

**Other rules:**
- Do not install new icon packages.
- Do not use or create placeholders if a localhost source is provided.
- Monochrome, single-color icons use the `<Icon>` SVG system from `@ion/ui`.

---

## Localization

### CRITICAL: No raw strings in UI components.

Every user-visible string from the Figma design must go through `translate()` from `@ion/localization`. Do not hardcode text from Figma directly into JSX.

```typescript
// WRONG (from Figma)
<Text variant="headline2">Welcome Back</Text>

// CORRECT
<Text variant="headline2">{translate('welcomeBackTitle')}</Text>
```

### CRITICAL: Translations must cover all supported locales (en, fr, de).

`registerTranslations()` validates that every supported locale has an entry. Missing locales cause a runtime crash. When creating a new package with translations:

1. Define translations as `TranslationResource[]` from `@ion/localization` — not a plain object.
2. Include all three locales: `en`, `fr`, `de`.
3. Register in `apps/mobile/App.tsx` via `registerTranslations(i18n, yourTranslations)`.

```typescript
// translations/index.ts
import type { TranslationResource } from "@ion/localization";

export const FEATURE_NAMESPACE = "feature";

const featureEN = { title: "Hello" };
const featureFR = { title: "Bonjour" };
const featureDE = { title: "Hallo" };

export const featureTranslations: readonly TranslationResource[] = [
  { namespace: FEATURE_NAMESPACE, locale: "en", translations: featureEN },
  { namespace: FEATURE_NAMESPACE, locale: "fr", translations: featureFR },
  { namespace: FEATURE_NAMESPACE, locale: "de", translations: featureDE },
];
```

Use exact text from Figma designs for the `en` locale. Translate accurately for `fr` and `de`.

---

## Styling Pattern

### STANDARD: Use `StyleSheet.create()` with design tokens.

```typescript
import { StyleSheet, View } from 'react-native';
import { Text, Button } from '@ion/ui';
import { colorPalette } from '@ion/ui';
import { spacingTokens } from '@ion/ui';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorPalette.white,
    padding: spacingTokens.spacing.lg,
    borderRadius: spacingTokens.radii.medium,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingTokens.spacing.sm,
  },
});
```

---

## Validation Checklist

Before marking a Figma implementation complete:

- Layout matches (spacing, alignment, sizing)
- Typography matches (correct `<Text variant>` for each text element)
- Colors match (all mapped to `colorPalette` or `semanticColors`)
- Interactive states work (hover, active, disabled)
- Icons use `<Icon>` component
- All strings use `translate()`
- No hardcoded hex values, font sizes, or pixel values
- Existing `@ion/ui` components reused where possible
- File follows project size limits (250 lines max)
