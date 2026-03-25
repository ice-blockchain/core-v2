# @ion/permissions

Foundation layer package providing unified permission management across iOS, Android, and Web. Handles checking, requesting, and observing OS/browser-level permissions for camera, photos, microphone, notifications, and cloud storage.

## Setup

```typescript
import { Permissions } from "@ion/permissions";

// Track all 5 permission types (default)
Permissions.initialize();

// Or track a subset
Permissions.initialize({ types: [PermissionType.Camera, PermissionType.Microphone] });
```

### App resume (mobile)

```typescript
import { AppState } from "react-native";

AppState.addEventListener("change", (state) => {
  if (state === "active") {
    Permissions.refreshAll(); // Re-check after returning from OS settings
  }
});
```

## API

### Check and request

```typescript
import { Permissions, PermissionType, PermissionStatus } from "@ion/permissions";

// Check current status (reads from OS/browser, updates cache)
const result = await Permissions.check(PermissionType.Camera);

// Request permission (shows OS/browser prompt)
const result = await Permissions.request(PermissionType.Camera);

// Full deny-to-granted lifecycle in one call
const result = await Permissions.ensurePermission(PermissionType.Camera);

// Check all tracked types
const all = await Permissions.checkAll();
```

### ensurePermission flow

`ensurePermission()` handles the full lifecycle of obtaining a permission:

| Current status | Action taken |
|---|---|
| Granted / Limited | Returns immediately |
| Denied / Unknown | Calls `request()` to show prompt |
| PermanentlyDenied | Calls `openSettings()`, awaits resume, re-checks |
| Restricted / NotAvailable | Returns as-is (nothing can be done) |

### Boolean helpers (sync, reads from cache)

```typescript
Permissions.isGranted(PermissionType.Camera);          // true if Granted
Permissions.isLimited(PermissionType.Photos);           // true if Limited (iOS selected photos)
Permissions.isDenied(PermissionType.Microphone);        // true if Denied
Permissions.isPermanentlyDenied(PermissionType.Camera); // true if blocked in settings
```

### Settings redirect

```typescript
// Mobile: opens app settings in OS settings
// Web: no-op (browsers have no settings redirect API)
await Permissions.openSettings();
```

### Subscribe to changes

```typescript
const unsubscribe = Permissions.subscribe((result) => {
  if (result.type === PermissionType.Notifications) {
    updateNotificationBadge(result.status);
  }
});
```

## React hook

```typescript
import { usePermission, PermissionType } from "@ion/permissions";

function CameraButton() {
  const camera = usePermission(PermissionType.Camera);

  if (camera.isPermanentlyDenied) {
    return <SettingsRedirectButton />;
  }

  return <Button onPress={camera.request} disabled={camera.isGranted} />;
}
```

### Hook return value

| Field | Type | Description |
|---|---|---|
| `status` | `PermissionStatus` | Current permission status |
| `isGranted` | `boolean` | `status === Granted` |
| `isLimited` | `boolean` | `status === Limited` |
| `isPermanentlyDenied` | `boolean` | `status === PermanentlyDenied` |
| `request` | `() => Promise<PermissionResult>` | Request permission from OS/browser |
| `check` | `() => Promise<PermissionResult>` | Re-check current status |
| `ensure` | `() => Promise<PermissionResult>` | Full deny-to-granted lifecycle |

## Permission types

| Type | Mobile | Web |
|---|---|---|
| Camera | OS camera permission | `getUserMedia({ video })` prompt |
| Photos | Photo library access (iOS: can be Limited) | Always Granted (file input, no permission needed) |
| Microphone | OS microphone permission | `getUserMedia({ audio })` prompt |
| Notifications | Push notification permission | `Notification.requestPermission()` |
| Cloud | iCloud (iOS) / Granted (Android, uses OAuth) | NotAvailable (OAuth, not a browser permission) |

## Status values

| Status | Meaning | Platform |
|---|---|---|
| Granted | Full access | All |
| Denied | User denied, can ask again | All |
| Limited | Partial access (selected photos) | iOS |
| PermanentlyDenied | Blocked, must change in settings | Mobile (web: browser denied) |
| Restricted | OS-level restriction (parental controls) | iOS |
| Provisional | Quiet notifications | iOS |
| Unknown | Not yet checked | All |
| NotAvailable | Not supported on this platform | All |

## Usage in actions (error handling pattern)

```typescript
import { Permissions, PermissionType, PermissionStatus } from "@ion/permissions";

async function startRecording(): Promise<void> {
  const result = await Permissions.ensurePermission(PermissionType.Camera);
  if (result.status !== PermissionStatus.Granted) {
    throw new ActionError("CAMERA_DENIED", "Camera access is required to record.");
  }
  // proceed with camera
}
```

## Cross-platform implementation

Platform-specific code lives in `src/platform/` using file extension resolution:

- `*.native.ts` — React Native (resolved by Metro)
- `*.web.ts` — Browser (resolved by Vite)
- `*.ts` — Stub for TypeScript compilation

Shared code (types, store, hook, orchestrator) has no platform dependencies.

## Running checks

```bash
pnpm --filter @ion/permissions lint
pnpm --filter @ion/permissions type-check
pnpm --filter @ion/permissions test
```
