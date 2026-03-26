---
paths:
  - "apps/mobile/**/*.tsx"
  - "apps/mobile/**/*.ts"
  - "packages/media-viewer/**/*"
---

# Frontend & UI Rules

## Core Principle: Pixel-Perfect Figma Implementation

The design team provides Figma files. Your job is to match them exactly. Not approximately. Not "close enough." Pixel-perfect.

---

## Figma Rules

### CRITICAL: Match Figma 1:1.
Every spacing value, font size, color, border radius, shadow, and alignment must match the Figma spec exactly. If Figma says 16px padding, it's 16px — not 14, not 18, not "about 16."

### CRITICAL: Use exact design tokens from Figma.
Colors, typography, spacing — all come from the design system. Never hardcode a color value. Use the token:
```typescript
// BAD
backgroundColor: '#6366F1'

// GOOD
backgroundColor: colors.primary500
```

### CRITICAL: No creative interpretation.
If a design decision looks wrong, flag it to the design team. Do not "fix" it yourself. Implement what's in Figma, then file a design issue if you think it should change.

### IMPORTANT: Verify against Figma before submitting PR.
Screenshot your implementation. Compare side-by-side with Figma. Every PR that touches UI must include a screenshot or video in the PR description.

### IMPORTANT: Handle all states shown in Figma.
Every screen/component typically has: default, loading, empty, error, and edge-case states. If Figma shows them, implement all of them. If Figma doesn't show a state, ask the design team before inventing one.

---

## React Native Conventions

### Styling

#### CRITICAL: All numeric sizes must be scaled via Theme. Never use raw pixel values.
Designs are created for 375pt width. Every size — font sizes, paddings, margins, widths, heights, gaps, border radii — must go through the Theme scaling system so the UI looks identical on all devices. The Theme scales values by `screenWidth / 375` and rounds to half-pixel precision.

Access the theme via `useTheme()` from `@ion/ui`. It provides:
- **`theme.spacing`** — pre-scaled spacing tokens (`xxs`, `xs`, `sm`, `md`, `lg`, `xl`, `xxl`, `xxxl`)
- **`theme.typography`** — pre-scaled typography variants (font size, line height, weight, family)
- **`theme.radii`** — pre-scaled border radius tokens (`small`, `medium`, `large`)
- **`theme.scale.scaleSize(n)`** — scale any ad-hoc size value
- **`theme.scale.scaleFont(n)`** — scale any ad-hoc font size
- **`theme.scale.scaleRadius(n)`** — scale any ad-hoc border radius

Since `useTheme()` is a hook, styles that depend on scaled values must be built inside the component using `useMemo`. Use `StyleSheet.create()` at module level only for styles with no numeric size values.

```typescript
// VIOLATION — raw pixel values, breaks on non-375pt screens
const styles = StyleSheet.create({
  container: { padding: 16, marginBottom: 24 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
});

// CORRECT — scaled via theme inside the component
function ProfileCard() {
  const theme = useTheme();

  const containerStyle = useMemo(() => ({
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  }), [theme]);

  const avatarStyle = useMemo(() => ({
    width: theme.scale.scaleSize(48),
    height: theme.scale.scaleSize(48),
    borderRadius: theme.scale.scaleRadius(24),
  }), [theme]);

  return (
    <View style={containerStyle}>
      <Image style={avatarStyle} />
    </View>
  );
}

// OK — module-level StyleSheet for layout-only styles (no size values)
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fill: { flex: 1 },
});
```

The only exceptions are `0`, `1` (hairline borders), and `flex` values — these do not need scaling.

- **No CSS-in-JS libraries.**
- **No magic numbers.** Use theme tokens or scale functions:
```typescript
// BAD — raw values
paddingHorizontal: 16,
marginBottom: 8,
borderRadius: 12,

// GOOD — theme tokens (already scaled)
paddingHorizontal: theme.spacing.md,
marginBottom: theme.spacing.xs,
borderRadius: theme.radii.medium,
```

### Components
- One component per file. File name matches component name in PascalCase: `MessageBubble.tsx`.
- Components are **pure UI.** They receive data and callbacks via props. They do not call actions directly — the screen does.
```typescript
// Screen (calls action, passes data)
function ChatScreen() {
  const messages = useMessages(conversationId);
  const handleSend = (text) => sendMessage({ conversationId, text });
  return <ChatView messages={messages} onSend={handleSend} />;
}

// Component (pure UI, receives props)
function ChatView({ messages, onSend }: ChatViewProps) {
  // renders UI only, no business logic
}
```

### Hooks
- File name: `use-[name].ts` (kebab-case).
- One hook per file. Hook name: `useCamelCase`.
- Hooks handle data fetching (React Query), local UI state (Zustand), or composition.

### State Management
| Type | Tool | Example |
|---|---|---|
| Server state | React Query | Fetched data, cache, mutations |
| Client state | Zustand | UI preferences, temporary selections |
| Form state | React Hook Form or local state | Input values, validation |
| Navigation state | React Navigation | Current screen, params |

Never mix these. Server state goes through React Query, always. Local UI state uses Zustand stores or `useState`. No Redux. No Context for global state.

### Navigation
- React Navigation for all routing.
- Screen components live in `apps/mobile/src/screens/[feature]/`.
- Navigation types are strongly typed — no `any` in navigation params.

---

## Performance Rules

### IMPORTANT: No unnecessary re-renders.
- Use `React.memo()` for list items and expensive components.
- Use `useCallback()` for functions passed as props.
- Use `useMemo()` for expensive computations.
- Never create objects or arrays inline in JSX props.

### IMPORTANT: FlatList for all lists.
Never use `ScrollView` with `.map()` for lists. Always use `FlatList` or `SectionList` with proper `keyExtractor` and `getItemLayout` when possible.

### STANDARD: Image optimization.
- Use `@ion/media-viewer` components (ImageViewer, VideoPlayer).
- Always provide width/height to prevent layout shifts.
- Use blurhash placeholders for loading states.

---

## Accessibility

### IMPORTANT: All interactive elements have accessibility labels.
```typescript
<TouchableOpacity
  accessibilityLabel="Send message"
  accessibilityRole="button"
>
```

### STANDARD: Support dynamic font sizes.
Use relative units where possible. Test with system font size set to largest.

---

## Responsive Design

### IMPORTANT: Test on both iOS and Android.
Every UI PR must be tested on both platforms. Note any platform-specific behavior in the PR description.

### STANDARD: Safe areas.
Always use `SafeAreaView` or `useSafeAreaInsets()` for screens. Never hardcode status bar or navigation bar heights.
