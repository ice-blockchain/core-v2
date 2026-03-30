# Copilot Review Instructions

## Translation Strings

Do not flag grammar, spelling, or wording issues in user-facing strings (UI copy, labels, descriptions, button text, notification text). All translations come directly from Figma designs and must match the design spec exactly. If the copy looks wrong, it is a design issue, not a code issue.

## Planning Documents

Files matching `*.md` inside `packages/*/` that are not `ARCHITECTURE.md` are planning/spec documents. Do not flag markdownlint issues (MD040, etc.) or implementation drift in these files. They capture original design intent and the code is the source of truth.

## Intentional Patterns

- Empty `catch {}` blocks in development-only config files (e.g., `metro.config.js`) are intentional fallthrough behavior. Do not flag these.
- Screen-level test files follow a lightweight pattern (export checks + style builder tests). The primary test boundary is the action layer. Do not flag screen tests as insufficient.
