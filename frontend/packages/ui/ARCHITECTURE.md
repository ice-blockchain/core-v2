# @ion/ui Architecture

Centralized design system library. Single source of truth for all visual primitives: components, tokens, theming, icons, and responsive scaling.

## Public API

### Theme
- `ThemeProvider` -- React context provider
- `useTheme()` -- Hook to access current theme

### Components
- `Box` -- Container (View wrapper)
- `Text` -- Typography with `variant` prop
- `Button` -- Primary button (height 44 or 56, 5 color variants)
- `SmallButton` -- Secondary button variant
- `TextField` -- Rich text input (floating label, icons, states, clear button)
- `TextInput` -- Simpler multiline input
- `SearchBar` -- Search input with icon
- `BottomSheet` -- Modal bottom sheet with header/footer
- `HorizontalSeparator` -- Gradient divider

### Icons
- `Icon` -- Renders from registry by name
- `IconName` -- Union type of 20+ registered icon names

### Tokens
- `colorPalette` -- 19 brand color constants
- `gradients` -- Predefined gradient definitions

## Theme Object

```typescript
interface Theme {
  colors: SemanticColors;      // 22 semantic color tokens
  typography: ThemeTypography;  // 14 typography variants (scaled)
  spacing: ThemeSpacing;        // 8 sizes: xxs(2) through xxxl(32)
  radii: ThemeRadii;           // 3 sizes: small(8), medium(12), large(16)
  scale: ScaleFunctions;        // Responsive scaling functions
  colorMode: ColorMode;         // 'light' | 'dark'
}
```

## Scaling System

- **Base design width**: 375px (iPhone SE reference)
- **Formula**: `scaledValue = Math.round((value * screenWidth / 375) * 2) / 2`
- Typography, spacing, and radii are all scaled at runtime via `buildTheme()`
- Snaps to 0.5px increments for clean rendering

## Icon System

- SVG sources in `src/icons/assets/`
- Auto-generated JSX components via `pnpm generate:icons` (SVGR)
- Registry pattern in `icon-registry.ts` for type-safe lookup
- `Icon` component renders by name with size and color props

## Color Architecture

| Layer | File | Purpose |
|-------|------|---------|
| Brand palette | `color-palette.ts` | Raw hex values (19 colors). Never used directly in components. |
| Semantic (light) | `semantic-colors.ts` | Named tokens mapped to palette (22 tokens). |
| Semantic (dark) | `semantic-colors-dark.ts` | Dark mode overrides (structure ready, values pending). |

## Design Decisions

- **Context-based theming**: `ThemeProvider` injects theme via React Context. All components access via `useTheme()`.
- **Variant-enforced typography**: `Text` requires a `variant` prop. No inline font styling.
- **No internal deps**: Foundation layer. Does not import from other `@ion/*` packages.
- **Platform splits**: `BottomSheet` and `TextInput` have `.native.tsx` / `.web.tsx` variants.
- **Dark mode infrastructure**: Color structure supports it. Actual dark values pending from design team.
- **Catalog screen**: Built-in `CatalogScreen` component for interactive design system showcase.

## Dependencies

- **Downstream**: None (foundation layer)
- **Peer deps**: `react`, `react-native`, `react-native-safe-area-context`, `react-native-svg`
- **Dev deps**: `@svgr/*` (icon generation)
- **Upstream consumers**: Every UI package and app shell

## File Structure

```
src/
  index.ts                          # Public API
  types.ts                          # Central type definitions
  components/
    Box.tsx, Text.tsx, Button.tsx, SmallButton.tsx,
    TextField.tsx, TextInput.tsx, SearchBar.tsx,
    BottomSheet.tsx, HorizontalSeparator.tsx
    [+ supporting files per component]
  theme/
    ThemeProvider.tsx, build-theme.ts, theme-types.ts
  tokens/
    color-palette.ts, semantic-colors.ts, semantic-colors-dark.ts,
    typography-variants.ts, spacing.ts, gradients.ts
  scaling/
    scale-functions.ts, scaling-types.ts
  icons/
    Icon.tsx, icon-registry.ts, icon-types.ts
    assets/          # SVG source files
    generated/       # Auto-generated JSX components
  catalog/
    CatalogScreen.tsx, [section components]
  fonts/             # NotoSans font files
```
