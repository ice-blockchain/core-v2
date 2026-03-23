# Error Handling Rules

## Mobile: ActionError Boundary

### CRITICAL: Actions translate package errors into user-friendly error types.
Screens never see `RelayConnectionError`, `EncryptionKeyMissingError`, or any package-internal error. Actions catch and translate:

```typescript
// Inside an action
try {
  await IonConnectClient.publishEvent(event);
} catch (error) {
  throw new ActionError(
    'MESSAGE_SEND_FAILED',
    'Could not send message. Check your connection.'
  );
}
```

### ActionError structure:
```typescript
class ActionError extends Error {
  code: string;          // Machine-readable: 'MESSAGE_SEND_FAILED'
  userMessage: string;   // Human-readable: 'Could not send message.'
}
```

Screens catch `ActionError` and display `error.userMessage` to the user.

---

## Backend: AppError Class

### IMPORTANT: All errors use `AppError` from `shared/utils/errors.ts`.
No raw `throw new Error()` in services or controllers. Use `AppError` with status code, error code, and message:

```typescript
throw new AppError(404, 'USER_NOT_FOUND', 'User does not exist');
throw new AppError(403, 'INSUFFICIENT_BALANCE', 'Not enough funds');
throw new AppError(400, 'INVALID_INPUT', 'Amount must be positive');
throw new AppError(409, 'DUPLICATE_TRANSACTION', 'Transaction already processed');
```

The error middleware formats the response. Controllers never format error responses manually.

---

## Universal Rules

### CRITICAL: Never swallow errors silently.
Every `catch` block must either:
1. **Re-throw** (possibly wrapped in a higher-level error)
2. **Return a meaningful fallback** (with logging)
3. **Log via `@ion/diagnostics`**

An empty `catch {}` is always a bug.

```typescript
// VIOLATION
try { await uploadMedia(file); } catch {}

// CORRECT
try {
  await uploadMedia(file);
} catch (error) {
  Logger.error('Media upload failed', { error, fileId: file.id });
  throw new ActionError('UPLOAD_FAILED', 'Could not upload media.');
}
```

### IMPORTANT: Log with context.
Every error log includes enough context to debug without reproducing:
```typescript
Logger.error('Transfer failed', {
  userId: input.userId,
  amount: input.amount,
  coinId: input.coinId,
  error: error.message,
});
```

Never log sensitive data (private keys, passwords, full tokens).
