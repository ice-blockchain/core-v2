# ION

## Project
ION is a mobile-first social + crypto platform.

## Architecture & Stack
Architecture details, tech stack, packages, services, and migration status are documented in `.claude/architecture.md`. That file is the living source of truth — always check it for the current state.

**After every PR that changes structure** (new package, new service, changed dependencies, new action), `.claude/architecture.md` and this file MUST be updated. Run `/post-merge` to check. This is non-negotiable.

---

## Developer Rules

### Size Limits (CI will block violations)

| What | Max | Enforced By |
|---|---|---|
| File length | 250 lines | ESLint `max-lines` |
| Function length | 30 lines | ESLint `max-lines-per-function` |
| Function parameters | 3 | ESLint `max-params` — use options object beyond 3 |
| Directory nesting | 3 levels | Code review |
| Class inheritance | 1 level | Code review — composition over inheritance |

### The Orchestrator Pattern
When a function is too long, don't just split — compose:
```typescript
async function processTransaction(input) {
  const validated = validateTransactionInput(input);
  await assertSufficientBalance(validated.userId, validated.amount);
  const tx = await executeTransfer(validated);
  await notifyTransactionComplete(tx);
  return tx;
}
```
Each sub-function is a named, testable unit. The orchestrator reads like a recipe.

### Folder Structure — Package
```
packages/[name]/
  src/
    [module].ts              # One primary export per file
    [module].test.ts         # Colocated test, right next to source
    types.ts                 # Package-specific types
  index.ts                   # Public API gate — re-exports only
  package.json
```
- `index.ts` only exports what other packages need. Internals stay hidden.
- Other packages import from `@ion/[name]`, never `@ion/[name]/src/internal`.

### Folder Structure — Backend Service
```
services/[name]/
  routes.ts                  # URL mapping + middleware assignment ONLY
  controller.ts              # Parse request, call service, format response — NO logic
  service.ts                 # ALL business logic lives here
  repository.ts              # Database queries ONLY — no business logic
  types.ts                   # Service-specific types
  validators.ts              # Input validation schemas
  [name].test.ts             # Colocated test
```

### Naming
- **Full words only.** `transaction.service.ts` not `txSvc.ts`. `getUserBalance()` not `getBal()`.
- **Functions: verb + noun.** `calculateBalance()`, `sendMessage()`, `validateInput()`.
- **Files: noun + role.** `wallet.service.ts`, `upload-manager.ts`, `retry.ts`.
- **Booleans: prefix with is/has/should/can.** `isLoading`, `hasPermission`, `canWithdraw`.
- **Actions: kebab-case matching function.** `sendMessage()` → `send-message.ts`.
- **No generic names.** No `utils.ts`, `helpers.ts`, `common.ts`, `misc.ts`.
- **The grep test:** if you search a name and get 5+ results, it's too generic.

### One File = One Export
Each file exports one class, one hook, one function, or one component. The file name matches the export. `UploadManager` lives in `upload-manager.ts`. Not 3 classes in one file.

### Dependencies Flow Downward Only
Never import from a higher layer. Never import sideways. If you need cross-layer communication, lift it to the layer above.

### Tests
- Colocated: `foo.ts` + `foo.test.ts` in same directory. Always.
- Every action has a test. Every service has a test.
- Test behavior, not implementation. Name tests by scenario, not function.
- No PR merged without tests for new logic.

### Error Handling
- Never swallow errors silently. Every `catch` re-throws, returns a fallback, or logs. No empty `catch {}`.
- Mobile: actions catch package errors and throw `ActionError` with code + user message.
- Backend: use `AppError` from `shared/utils/errors.ts` with status code + error code.

### Code Style
- No `any` on API boundaries. String type for monetary amounts.
- No magic, no metaprogramming, no decorators (except framework-required), no `eval`.
- Composition over inheritance. No class hierarchies deeper than 1 level.
- Early returns for edge cases. Happy path stays unindented.
- Read the request carefully — only modify what was explicitly asked for.
- Never refactor, rename, or restructure code that wasn't part of the request.

### Security
- Never commit secrets, credentials, or `.env` files. Rotate immediately if you do.
- Validate all input at system boundaries (controller layer on backend, action layer on mobile).
- Auth middleware on every protected route. Tenant isolation in every read/write.
- NSFW detection before media upload.

### Git & PRs
- One PR = one concern. Feature, fix, or refactor — never mixed.
- Commit messages: imperative mood, explain WHY not what.
- No PR merged without passing CI (lint, types, tests, boundaries).
- Branch naming: `feature/`, `fix/`, `refactor/` + short description.

---

## Slash Commands
- `/fix-bug` — 6-phase root cause analysis and remediation protocol
- `/feature` — structured feature implementation with DRY analysis
- `/security-audit` — adversarial security review across 6 categories
- `/post-merge` — check if architecture docs need updating after merge
- `/update-arch` — sync architecture docs with current codebase state

## Detailed Rules
Full rules with code examples, severity levels, and violation cases: `.claude/rules/`
