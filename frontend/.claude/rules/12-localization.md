# Localization Rules

### CRITICAL: No raw strings in UI components.
Every user-visible string must go through `translate()` from `@ion/localization`.
No hardcoded text in JSX: no `<Text>Submit</Text>`, no `label="Cancel"`.
The only exception is punctuation or symbols that are language-independent.

### STANDARD: Translation keys use camelCase describing the UI element.
`getStartedTitle`, `continueButton`, `passwordRuleLength` — not generic names
like `title1`, `button`, `message`.
