# Select Languages Screen — Implementation Plan

## Figma Reference

- File: `3TnZngoFeklOVC8TexlR1D`
- Node: `21643:120323` ("Log In / Register / SMS / choose country 1")
- [Figma Link](https://www.figma.com/design/3TnZngoFeklOVC8TexlR1D/%F0%9F%A7%8A-ICE-Cloud?node-id=21643-120323&m=dev)

---

## Design Specs (from Figma)

### Layout

- `BottomSheet` with `onBack`, NO title in header (title is hidden/opacity 0 in the sheet header)
- Headline: "Select languages" — `headline1` (Bold 28px)
- Subtitle: "You'll be shown content in the selected language" — `body2` (Regular 13px), `tertiaryText`
- `SearchBar` — height 42px, `primaryBackground` bg, 16px radius (already in `@ion/ui`)

### Vertical Spacing (user-confirmed, pixel-perfect)

```
Sheet Header bottom
  | 16px
"Select languages" (headline1)
  | 8px
"You'll be shown content..." (body2, tertiaryText)
  | 34px
SearchBar
  | 12px
Language row 1
  | 12px
Language row 2
  | 12px
...
```

- Continue button floats on top of the list (absolutely positioned)
- Continue button bottom padding: 10px (after safe area insets)

### CheckboxRow

- Background: `tertiaryBackground` (#fafbff) — **NOT `primaryBackground` as prompt says**
- Border radius: 12px
- Padding: horizontal 16px, vertical 10px (effective height ~44px with 24px checkbox)
- Content: Flag (21x15px) + 16px gap + language name (`subtitle2` / Medium 15px, `primaryText`) + flex spacer + checkbox icon (24x24px)
- Checkbox: `Icon name="checkbox-on"` (green filled) / `Icon name="checkbox-off"` (gray outline)
- Full-width `Pressable` tap target

### Continue Button

- `Button` in `bottomButton` slot
- Label: "Continue"
- Height: 56px (default)
- Hidden when no languages selected

### Flags

**Flag emojis** — matching the existing Flutter app approach. Figma shows SVG flags but the production app uses emoji flags, so we use emojis.

### Language List

Source: Flutter app enum at `flutter-app/lib/app/features/core/model/language.dart`

67 languages total. Each entry has:
- `name`: English name (e.g. "French")
- `localName`: Optional native name (e.g. "français")
- `flag`: Emoji flag (e.g. "🇫🇷")
- `isoCode`: ISO 639 code (e.g. "fr")
- Display: English name only (matching Figma)

Hardcoded in `fetchLanguages` stub for now. Full list ported from the Flutter enum.

### Resolved Decisions

| Question | Decision | Reason |
|----------|----------|--------|
| Flag rendering | Emoji flags | Matches Flutter app, zero assets, cross-platform |
| Language list | Hardcoded 67 languages from Flutter enum | Single source of truth across apps |
| Row background | `tertiaryBackground` | Matches Figma (source of visual truth) |

---

## Files to Create

### `packages/onboarding-ui/`

| File | Purpose |
|------|---------|
| `src/screens/SelectLanguagesScreen.tsx` | Screen component (BottomSheet + SearchBar + list + Button) |
| `src/screens/select-languages-hooks.ts` | `useLanguageSelection` hook (state, filtering, sorting, save) |
| `src/screens/select-languages-styles.ts` | Style builder functions |
| `src/components/CheckboxRow.tsx` | Reusable row: flag + name + checkbox |

### `packages/onboarding/` (action stubs)

| File | Purpose |
|------|---------|
| `src/fetch-languages.ts` | Stub: returns hardcoded language list (TODO: replace with API) |
| `src/save-selected-languages.ts` | Stub: no-op with delay (TODO: replace with API) |

### Files to Modify

| File | Change |
|------|--------|
| `packages/onboarding-ui/src/index.ts` | Add `SelectLanguagesScreen` export |
| `packages/onboarding/src/index.ts` | Add `fetchLanguages`, `saveSelectedLanguages` exports |
| `packages/onboarding/src/types.ts` | Add `Language`, `FetchLanguagesResult`, `SaveSelectedLanguagesInput` types |

---

## Component Architecture

```
SelectLanguagesScreen
  BottomSheet (isVisible, onClose, onBack, bottomButton)
    View (content)
      Text headline1 — "Select languages"
      Text body2 tertiaryText — subtitle
    View (list section, 34px gap from title)
      SearchBar (value, onChangeText)
      ScrollView (12px gap)
        CheckboxRow[] (filtered + sorted)
    bottomButton slot:
      Button "Continue" (hidden if 0 selected)
```

### Hook: `useLanguageSelection`

```
State:
  - languages: Language[]        (fetched on mount)
  - selectedIds: Set<string>     (toggled by tap)
  - searchQuery: string          (bound to SearchBar)
  - isLoading: boolean           (during fetch)
  - isSaving: boolean            (during save)

Derived:
  - filteredLanguages: Language[] (search filter + selected-first sort)
  - hasSelection: boolean        (selectedIds.size > 0)

Actions:
  - toggleLanguage(code: string)
  - setSearchQuery(text: string)
  - handleSave() -> calls saveSelectedLanguages then onContinue
```

### CheckboxRow Props

```typescript
interface CheckboxRowProps {
  flag: string;           // emoji or component depending on approach
  name: string;
  isSelected: boolean;
  onPress: () => void;
  testID?: string;
}
```

---

## Implementation Order

1. Types in `packages/onboarding/src/types.ts`
2. Action stubs: `fetch-languages.ts`, `save-selected-languages.ts`
3. Update `packages/onboarding/src/index.ts`
4. `CheckboxRow.tsx` component
5. `select-languages-styles.ts`
6. `select-languages-hooks.ts`
7. `SelectLanguagesScreen.tsx`
8. Update `packages/onboarding-ui/src/index.ts`
