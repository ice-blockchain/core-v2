# Testing Rules

## Test Framework

### CRITICAL: Use Vitest for all new and updated tests.
Vitest is the standard test runner for this repo. New tests, and any tests you touch or create in a PR, must use Vitest and `vi` for mocking (`vi.fn()`, `vi.spyOn()`, `vi.mock()`), not `jest`. Some legacy packages still have Jest-based `test` scripts — do not add new Jest tests or expand Jest usage there; instead, migrate those tests to Vitest when you modify them.

---

## Test Location

### CRITICAL: Tests are colocated with source. Always.
`wallet.service.ts` has `wallet.service.test.ts` right next to it. Not in a separate `__tests__/` directory. Not in a `test/` folder at the repo root.

```
packages/media-upload/src/
  upload-manager.ts
  upload-manager.test.ts      # RIGHT HERE
  encryption.ts
  encryption.test.ts          # RIGHT HERE
```

---

## Test Coverage

### CRITICAL: Every action has a test. Every service has a test.
Actions are the primary test boundary on mobile. Services are the primary test boundary on backend. If it has business logic, it has a test file. No PR is merged without tests for new logic.

### IMPORTANT: Test the behavior, not the implementation.
Test what `sendMessage()` returns and its side effects — not which internal methods it calls. Tests that mirror the implementation break on every refactor and provide no safety net.

```typescript
// BAD — tests implementation
it('should call IonConnectClient.publishEvent', () => {
  await sendMessage(input);
  expect(IonConnectClient.publishEvent).toHaveBeenCalled();
});

// GOOD — tests behavior
it('sends a text message and returns the message ID', async () => {
  const result = await sendMessage({ conversationId: 'abc', text: 'hello' });
  expect(result.messageId).toBeDefined();
  expect(result.status).toBe('sent');
});
```

---

## Test Naming

### STANDARD: Test names describe the scenario, not the function.
```typescript
// BAD
it('should call sendMessage')
it('test createPost')

// GOOD
it('sends a text-only message to an existing conversation')
it('rejects a post with NSFW content before uploading')
it('queues the upload when offline and retries on reconnect')
it('returns insufficient balance error when wallet is empty')
```

---

## Test Boundaries

| Repo | Primary Test Target | What Tests Validate |
|---|---|---|
| **ion-app** | Actions (`@ion/actions`) | Business logic orchestration, error translation, input/output contracts |
| **ion-app** | Package internals | Unit logic within each package (encryption, compression, parsing) |
| **ion-backend** | Services | Business rules, validation, orchestration |
| **ion-backend** | Repositories | Database queries return correct data |

Screens are NOT the primary test target. If the actions work correctly, screen tests are UI-only (snapshot or interaction tests).

---

## Quality Standards

### CRITICAL: Run all three checks before pushing the code to remote branch:
Every package change must pass all three in order:
1. **Lint:** `pnpm --filter @ion/[name] lint` — catches style, import, and size violations
2. **Type check:** `pnpm --filter @ion/[name] type-check` — catches type errors
3. **Tests:** `pnpm --filter @ion/[name] test` — catches behavioral regressions

Do not skip lint. Lint errors (max-lines-per-function, consistent-type-imports, no-var-requires) are CI blockers and must be fixed before tests are meaningful.

### Before submitting a PR, verify:
- Does it actually work? (Not just build — does it function correctly?)
- Did I test the integration points?
- Are there edge cases I haven't considered?
- Will this perform okay? (No N+1 queries, no memory leaks)
- Did I clean up? (No temp files, debug code, console.logs)
