# 2FA Flow Reference

## 1. Identity Client Flows That Trigger 2FA

Two flows:

| Flow | Trigger Point | Exception |
|---|---|---|
| **Login** | `verifyUserLoginFlow()` returns `TwoFARequiredException` | Transitions to `twoFAOptions` step |
| **Recovery** | `initRecovery()` returns `TwoFARequiredException` | Transitions to `twoFAOptions` step |

SMS option is filtered out during the recovery flow.

---

## 2. How 2FA is Triggered

When a user has 2FA enabled in account settings, identity client flows (login, recovery) can receive a `TwoFARequiredException` from the backend. The exception contains:

- `twoFAOptionsCount: number` — how many 2FA methods the user must select

The app catches this via error listener and transitions to the 2FA options screen.

Related exceptions:
- `InvalidTwoFaCodeException` — wrong code entered
- `TwoFaMethodNotConfiguredException` — selected method not set up for the account

---

## 3. UI Flow

### Screen 1: Options Selection

- **Title:** "2FA Verification" (`two_fa_title`)
- **Description:** "Please enter your confirmation code below" (`two_fa_desc`)
- **Icon:** Wallet protection icon (36pt)

**Content:** N dropdown selectors where N = `twoFAOptionsCount` from the exception. Each dropdown shows available types:

| TwoFaType | Display Name |
|---|---|
| `auth` | "Authenticator code" |
| `email` | "Email code" |
| `sms` | "SMS code" (hidden during recovery) |

**States:**

| State | Condition | Confirm Button |
|---|---|---|
| **Initial** | All dropdowns empty | Disabled |
| **Partial** | Some selected; already-selected options greyed out in other dropdowns | Disabled |
| **Ready** | All N options selected | Enabled |

**Actions:**
- **Back** — returns to previous step
- **Confirm** — validates selections, transitions to code input screen

---

### Screen 2: Code Input

- **Title:** "2FA Verification" (`two_fa_title`) — same as options screen
- **Description:** "Please enter your confirmation code below" (`two_fa_desc`) — same as options screen

**Content:** One code input field per selected method. Each field has:
- Label (type display name)
- Icon prefix (type-specific)
- Numeric keyboard
- **Send/Retry button** — only for `email` and `sms` types (not `auth`)

#### Send Button States

| State | Condition | Display |
|---|---|---|
| **Send** | `countdown === 0` AND not yet sent | "Send" button |
| **Sending** | Request in progress | Loading spinner |
| **Countdown** | After send, counting down from 60s | "{N} seconds" (muted text) |
| **Retry** | Countdown finished (`countdown === 0`) | "Retry" button |

- Countdown: 60 seconds, decrements every 1s
- "Send" calls `requestRecoveryTwoFaCode()` (recovery) or `requestTwoFaCode()` (setup)
- Authenticator type has no Send/Retry — user gets the code from their authenticator app

#### Confirm Button States

| State | Condition |
|---|---|
| **Disabled + spinner** | Submitting codes to backend |
| **Enabled** | All fields have values |

Submits a `Map<TwoFaType, string>` (type to code) to the backend.

---

### Error States

#### Invalid Code (`InvalidTwoFaCodeException`)
Bottom sheet (`TwoFaTryAgainPage`):
- **Icon:** Error key icon
- **Title:** "2FA Verification error" (`two_fa_failure_title`)
- **Description:** "Please ensure all codes are correct and try again" (`two_fa_failure_desc`)
- **Button:** "Try again" — dismisses sheet, user re-enters codes

#### Method Not Configured (`TwoFaMethodNotConfiguredException`)
Same bottom sheet with:
- **Description:** "This 2FA method is not configured for this account" (`two_fa_failure_method_not_configured_desc`)

---

## 4. Navigation Summary

```
Login / Recovery step
  -> BE throws TwoFARequiredException(count=N)
  -> Options Screen (select N methods)
    -> [Confirm]
    -> Input Screen (enter codes, Send/Retry for email + sms)
      -> [Confirm]
      -> Success -> continue auth flow
      -> Error -> TwoFaTryAgainPage bottom sheet -> back to input
```
