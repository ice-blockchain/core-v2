# Git & PR Rules

## Branching

### STANDARD: Branch naming: `type/short-description`
```
feature/tip-user-action
fix/upload-retry-on-timeout
refactor/extract-relay-manager
```
Types: `feature/`, `fix/`, `refactor/`, `chore/`, `docs/`.

---

## Commits

### IMPORTANT: Imperative mood. Explain WHY, not what.
```
# BAD
"updated wallet service"
"fix bug"
"changes"

# GOOD
"reject withdrawals when daily limit exceeded"
"switch upload queue to FIFO to prevent message reordering"
"add retry with backoff to relay connections for flaky networks"
```

### CRITICAL: Never commit secrets.
If you accidentally commit a secret, rotate it immediately. Removing from history is not enough.

### STANDARD: No emojis in commit messages.
Concise, technically descriptive. Proper technical terminology.

---

## Pull Requests

### CRITICAL: One PR = one concern.
A PR either adds a feature, fixes a bug, or refactors code. Never all three. If a refactor is needed to add a feature, submit the refactor first as a separate PR.

### CRITICAL: No PR merged without passing CI.
All of these must pass:
- Linting (including boundary enforcement)
- Type checking
- Tests
- No `eslint-disable` for rules in the engineering standards
- No `@ts-ignore` without a linked issue explaining why

### IMPORTANT: PR description includes:
- **What:** One-sentence summary of the change.
- **Why:** Why this change is needed.
- **Screenshots/video:** Required for any UI change. Side-by-side with Figma.
- **Testing:** What was tested and how.

### IMPORTANT: Review AI-generated code with the same rigor as human code.
"Claude wrote it" is not a justification for skipping review. You are responsible for every line in your PR, regardless of who or what wrote it.

---

## Post-Merge

### CRITICAL: Update architecture docs if structure changed.
If your PR adds a new package, removes a package, adds a service, changes layer dependencies, or modifies the actions catalog — update these files in the same PR or a follow-up PR:
- `.claude/architecture.md`
- `CLAUDE.md` (if the summary needs updating)

This is enforced by the `/post-merge` skill.
