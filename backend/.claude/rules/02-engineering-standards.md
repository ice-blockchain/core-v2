# Engineering Standards

These rules are enforced by linters, CI checks, and code review. PRs that violate them will be rejected. If a rule is wrong, propose a change — don't ignore it.

## Severity Levels

| Level | Meaning |
|---|---|
| **CRITICAL** | PR rejected. CI blocks. No exceptions. |
| **IMPORTANT** | Must follow. Exceptions require a PR comment explaining why. |
| **STANDARD** | Expected practice. Flagged in review but won't block if justified. |

---

## File Rules

### CRITICAL: No file exceeds 300 lines
Enforced by ESLint `max-lines`. If a file approaches 300, split by responsibility before it gets there. No exceptions. No eslint-disable overrides.

### CRITICAL: One primary export per file
Each file exports one class, one hook, one function, or one component. File name matches the export.
- CORRECT: `upload-manager.ts` exports `UploadManager`
- VIOLATION: `index.ts` exports `WalletService` + `WalletRepository` + `WalletValidator`

### IMPORTANT: Maximum 3 levels of directory nesting
- CORRECT: `packages/media-upload/src/encryption.ts`
- VIOLATION: `packages/media/core/upload/v2/internal/helpers/encrypt.ts`

### IMPORTANT: Every package has the same internal structure
```
packages/[name]/
  src/
    [module].ts
    [module].test.ts
    types.ts
  index.ts              # Public API (re-exports only)
  package.json
```
No variations. No creativity with folder layout. Predictability is the point.

### STANDARD: `index.ts` is the public API gate
Only re-export what other packages need. Internal files are not exported. Other packages import from `@ion/[name]`, never from `@ion/[name]/src/internal-file`.

### STANDARD: No `utils.ts`, `helpers.ts`, `common.ts`, or `misc.ts`
Name files after what they contain: `pagination.ts`, `date-formatter.ts`, `error-handler.ts`. If you can't name it something specific, the code belongs elsewhere.

---

## Function Rules

### CRITICAL: No function exceeds 30 lines
Enforced by ESLint `max-lines-per-function`. Use the orchestrator pattern:
```typescript
async function processTransaction(input) {
  const validated = validateTransactionInput(input);
  await assertSufficientBalance(validated.userId, validated.amount);
  const tx = await executeTransfer(validated);
  await notifyTransactionComplete(tx);
  return tx;
}
```

### IMPORTANT: 3 or fewer parameters. Use an options object for more.
```typescript
// BAD
function createPost(userId, text, media, tags, visibility, replyTo) {}

// GOOD
function createPost(input: CreatePostInput) {}
```

### IMPORTANT: Early returns for edge cases. Happy path stays unindented.
```typescript
// BAD
function getUser(id) {
  if (id) {
    const user = await db.find(id);
    if (user) {
      if (!user.deleted) {
        return user;
      }
    }
  }
  return null;
}

// GOOD
function getUser(id) {
  if (!id) return null;
  const user = await db.find(id);
  if (!user) return null;
  if (user.deleted) return null;
  return user;
}
```

### STANDARD: Composition over inheritance. Max 1 level of class hierarchy.
No `class A extends B extends C`. Inject shared behavior via constructor or utility functions.

### STANDARD: No magic. No metaprogramming.
No decorators (except framework-required), no `Proxy`, no runtime code generation, no `eval`, no dynamic `import()` for logic. Every behavior must be findable by grep.

---

## Naming Rules

### CRITICAL: Full words only. No abbreviations.
| Correct | Wrong |
|---|---|
| `transaction.service.ts` | `txSvc.ts` |
| `user.controller.ts` | `userCtrl.ts` |
| `getUserBalance()` | `getBal()` |
| `createTransaction()` | `create()` |
| `validateTransferInput()` | `check()` |
| `sendPasswordResetEmail()` | `notify()` |

### CRITICAL: Function names = verb + noun. File names = noun + role.
Functions: `calculateBalance()`, `sendMessage()`, `validateInput()`.
Files: `wallet.service.ts`, `upload-manager.ts`, `retry.ts`.

### IMPORTANT: The grep test
If you search a name and get 5+ results, it's too generic. Good names produce 1-3 results.
- `handleClick` = useless. `handleSendMessageClick` = findable.
- `process()` = useless. `processWithdrawal()` = findable.

### STANDARD: Boolean variables use is/has/should/can prefix.
`isLoading`, `hasPermission`, `shouldRetry`, `canWithdraw`. Not `loading`, `permission`, `retry`.

### STANDARD: Action files use kebab-case matching the function name.
`sendMessage()` lives in `send-message.ts`. `createPost()` lives in `create-post.ts`.

---

## Size Limits Quick Reference

| What | Max | Enforced By |
|---|---|---|
| File length | 300 lines | ESLint max-lines |
| Function length | 30 lines | ESLint max-lines-per-function |
| Function parameters | 3 | ESLint max-params |
| Directory nesting | 3 levels | Code review |
| Class inheritance depth | 1 level | Code review |

---

## Minimal, Scoped Changes Only

- **Read the request carefully** — only modify what was explicitly asked for.
- **Never refactor, rename, or restructure** code that wasn't part of the request.
- **Never change business logic** in functions you weren't asked to touch.
- **Never remove or rewrite working code** to "clean it up" while implementing a feature.
- **If a function works, leave it alone** — don't "improve" detection logic, fallbacks, variable names, or control flow unless specifically asked.
- **Test your changes mentally against the existing flow** — if your edit could break an unrelated feature, stop and flag it.
- **When adding new code, integrate it without altering** the surrounding code's behavior.

---

## Source of Truth: Trust Code, Not Docs

**All documentation might be outdated.** The only source of truth:
1. **Actual codebase** — code as it exists now
2. **Live configuration** — env vars, configs as actually set
3. **Running infrastructure** — how services actually behave

When docs and reality disagree, **trust reality**. Verify by reading actual code, checking live configs, testing actual behavior.

**Workflow:** Read docs for intent -> verify against actual code -> use reality -> update outdated docs.
