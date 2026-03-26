# AI Collaboration Rules

## CLAUDE.md is Infrastructure

### CRITICAL: Both repos have a `CLAUDE.md` at the root.
It describes the architecture, conventions, key patterns, and how to run/test. Claude reads it at the start of every conversation. When the architecture changes, `CLAUDE.md` is updated in the same PR.

### CRITICAL: `.claude/architecture.md` is updated per structural PR.
If a PR adds a package, removes a service, changes layer dependencies, or modifies the actions catalog — `.claude/architecture.md` must be updated.

---

## Search-Friendly Code

### CRITICAL: If Claude can't find it by searching, it's named wrong.
Claude finds code by grepping names. If `grep "balance"` doesn't lead to the balance logic, something is misnamed. If `grep "sendMessage"` returns 50 results, the names aren't specific enough.

### How Claude navigates your code:
1. Reads `CLAUDE.md` first (loaded at conversation start)
2. Searches by name (Grep for content, Glob for file patterns)
3. Reads targeted files
4. Follows the import trail

### What makes navigation fast vs slow:
| Fast (1-2 searches) | Slow (5-10 searches) |
|---|---|
| `services/wallet/balance.service.ts` | `src/utils/helpers2.ts` |
| `calculateBalance()` | `processData()` |
| Predictable file name | Generic file name |

---

## AI Code Review

### IMPORTANT: Review AI-generated code with the same rigor as human code.
AI code must pass the same rules, same linting, same tests, same review process. "Claude wrote it" is not a justification for skipping review. You are responsible for every line in your PR.

### IMPORTANT: When adding a new action, follow the existing pattern exactly.
Before writing a new action, read 2-3 existing actions in the same domain. Match the structure: input type, validation, orchestration steps, error handling, return type. Consistency is what lets AI (and humans) predict the codebase.

---

## Research-First Protocol

For complex work (features, bugs, refactors), follow this protocol:

### Phase 1: Discovery (Read-Only)
1. Read relevant docs and CLAUDE.md
2. Map the system: data flow, dependencies, integration points
3. Search for existing implementations that solve similar problems
4. Study existing patterns before building new

### Phase 2: Verification
5. Verify understanding by explaining the system flow
6. Check for blockers: ambiguous requirements? Multiple valid approaches? Missing info?
7. If blockers exist, ask. If not, proceed to execution.

### Phase 3: Execution
8. Execute autonomously. Default to action. Complete entire task chain.
9. Read-Write-Reread: read every file before and after modification.

### When to proceed autonomously:
- Research leads to clear implementation path
- Error discovered with understood root cause
- Task A complete, discovered related task B

### When to stop and ask:
- Ambiguous requirements
- Multiple valid architectural choices
- Security/risk concerns (production impact, data loss)
- Missing critical info only user can provide

---

## Context Window Management

- Read only directly relevant files
- Grep with specific patterns before reading entire files
- Start narrow, expand as needed
- Use `head_limit` on search results (20-50 max)
- Don't retry the exact same search if it returns nothing — try different terms
