---
paths:
  - "apps/**/*.tsx"
  - "apps/**/*.ts"
  - "packages/**/*.tsx"
  - "packages/**/*.ts"
---

# UI Kit Usage Rules (`@ion/ui`)

The `@ion/ui` package is the single source of truth for all visual primitives. Every frontend file (mobile and web) must use it exclusively. No exceptions.

---

## Colors

### CRITICAL: All colors come from `@ion/ui` tokens. Inline hex/rgb/rgba values are strictly prohibited.

Use `colorPalette` for raw brand colors. These are static values usable in `StyleSheet.create()`.

```typescript
import { colorPalette } from '@ion/ui';

// VIOLATION — hardcoded hex
const styles = StyleSheet.create({
  container: { backgroundColor: '#0166FF' },
  label: { color: 'rgba(0, 0, 0, 0.5)' },
  border: { borderColor: '#CCCCCC' },
});

// CORRECT — colors from the palette
const styles = StyleSheet.create({
  container: { backgroundColor: colorPalette.raspberry },
  label: { color: colorPalette.sharkText },
});
```

No `#`, no `rgb()`, no `rgba()`, no `hsl()` anywhere in component or style files. If a color isn't in `colorPalette`, request it to be added to `@ion/ui` first.

---

## Typography

### CRITICAL: All font styles come from `typographyVariants` via the `Text` component. Inline font sizes, weights, and font families are strictly prohibited.

```typescript
import { Text } from '@ion/ui';
import { colorPalette } from '@ion/ui';

// VIOLATION — inline font styles
const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', fontFamily: 'NotoSans-Bold' },
});

// CORRECT — use the Text component with a variant
<Text variant="headline2">Title</Text>
<Text variant="body2" color={colorPalette.sharkText}>Description</Text>
```

Never set `fontSize`, `fontWeight`, `fontFamily`, or `lineHeight` in `StyleSheet.create()` or inline styles. Always use `<Text variant="...">` from `@ion/ui`.

Available variants: `headline1`, `headline2`, `title`, `subtitle`, `subtitle2`, `subtitle3`, `body`, `body2`, `caption`, `caption2`, `caption3`, `caption4`, `caption5`, `caption6`, `notificationCaption`.

If none of the existing variants match the design, request a new variant to be added to `@ion/ui`.

---

## Components

### CRITICAL: Use `@ion/ui` components instead of building your own for common UI elements.

| Need | Use | Do NOT |
|---|---|---|
| Button | `<Button>` or `<SmallButton>` from `@ion/ui` | Build custom `TouchableOpacity` button wrappers |
| Text input | `<TextField>` from `@ion/ui` | Build custom `TextInput` wrappers |
| Text display | `<Text>` from `@ion/ui` | Use raw `<RNText>` with inline styles |
| Container | `<Box>` from `@ion/ui` | N/A (use when semantic wrapping is needed) |

Before creating a new component that resembles an existing `@ion/ui` component, check the UI kit first. If the existing component doesn't cover your use case, extend it in `@ion/ui` rather than building a one-off alternative.

---

## SVG Icons

### CRITICAL: All SVG icons go through the `@ion/ui` icon system. No inline SVGs in app code.

```typescript
// VIOLATION — inline SVG or direct SVG import in app code
import MySvg from '../assets/my-icon.svg';
<Svg width={24} height={24}><Path d="..." /></Svg>

// CORRECT — use the Icon component from the registry
import { Icon } from '@ion/ui';
<Icon name="send" size={24} color={colors.primaryAccent} />
```

To add a new icon:
1. Add the SVG source file to `packages/ui/src/icons/assets/`
2. Run `pnpm generate:icons` to auto-generate the component
3. Use it via `<Icon name="new-icon-name" />`

Never import SVG files directly in app screens or components. The icon registry is the single entry point.

---

## Enforcement Summary

| What | Source of Truth | Prohibited |
|---|---|---|
| Colors | `colorPalette` from `@ion/ui` | Hex, rgb, rgba, hsl literals |
| Typography | `<Text variant="...">` from `@ion/ui` | Inline fontSize, fontWeight, fontFamily, lineHeight in StyleSheet or styles |
| Buttons | `<Button>`, `<SmallButton>` from `@ion/ui` | Custom button wrappers |
| Text inputs | `<TextField>` from `@ion/ui` | Custom TextInput wrappers |
| Icons | `<Icon name="...">` from `@ion/ui` | Inline SVGs, direct SVG imports |
