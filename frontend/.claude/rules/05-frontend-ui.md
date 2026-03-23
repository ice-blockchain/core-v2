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
- **Use `StyleSheet.create()`** for all styles. No inline style objects. No CSS-in-JS libraries.
- **No magic numbers.** Extract repeated values into theme constants:
```typescript
// BAD
paddingHorizontal: 16,
marginBottom: 8,
borderRadius: 12,

// GOOD
paddingHorizontal: spacing.md,
marginBottom: spacing.xs,
borderRadius: radii.md,
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
