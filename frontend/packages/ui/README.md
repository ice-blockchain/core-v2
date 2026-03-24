# @ion/ui

Shared UI design system for ION mobile and web apps.

## Icons

Icons use an SVG-to-component generation pipeline. Raw `.svg` files are converted into typed React Native components with a single command.

### Adding a new icon

1. Drop your `.svg` file into `src/icons/assets/`
   - Use **kebab-case** for filenames: `arrow-left.svg`, `chevron-down.svg`
   - Use `stroke="black"` or `fill="black"` for colors that should be dynamic (replaced with the `color` prop at generation time)

2. Run the generator:
   ```sh
   pnpm --filter @ion/ui generate:icons
   ```

3. Use it in code:
   ```tsx
   import { Icon } from "@ion/ui";

   <Icon name="arrow-left" size={24} color={theme.colors.primaryText} />
   ```
   TypeScript autocomplete will suggest all available icon names.

### What the generator produces

| File | Purpose |
|---|---|
| `src/icons/generated/<Name>Icon.tsx` | React Native component per SVG |
| `src/icons/icon-registry.ts` | Map from icon name to component |
| `src/icons/icon-types.ts` | `IconName` union type for autocomplete |

Generated files are committed to git. Re-run the generator whenever SVG assets change.

### SVG guidelines

- **Single-color icons**: use `stroke="black"` or `fill="black"` -- the generator replaces these with the `color` prop
- **viewBox**: always include `viewBox="0 0 24 24"` (or your icon's dimensions)
- **No embedded styles**: use attributes (`stroke`, `fill`, `stroke-width`) instead of `<style>` tags
