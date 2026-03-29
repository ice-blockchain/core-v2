# Environment Variables to Add

## New Variables for Identity Client

| Variable (mobile `.env`) | Variable (web `.env`) | Description |
|---|---|---|
| `IDENTITY_API_URL` | `VITE_IDENTITY_API_URL` | Identity API base URL |
| `IDENTITY_APP_ID` | `VITE_IDENTITY_APP_ID` | App ID sent as X-Client-ID header |

## Values per Environment

### Identity API URL

| Environment | Value |
|---|---|
| Staging | `https://staging.api.identity.io` |
| Testnet | `https://testnet.api.identity.io` |
| Production | `https://api.identity.io` |

### Identity App ID

Source: `frontend/docs/identity-client-config.md`

| Environment | iOS | Android |
|---|---|---|
| Staging | `ap-4b208e64-063c-48a2-a431-96536006c459` | `ap-46466ab6-97af-44cf-836f-0dc99ac8489b` |
| Testnet | `ap-d9c7fb9d-4fd0-4a56-a2be-9f5f873f6f03` | `ap-a53213c2-1a86-45f3-a0d9-2cc9ffc3f4c7` |
| Production | `ap-01983d3c-ad40-7ba0-8d99-df1df39d873e` | `ap-01983d3b-a244-7ece-8dfd-fff883e35a25` |

## Files to Update

### In `core-v2-secrets/frontend/`

Each `{env}/mobile/.env` and `{env}/web/.env` needs the two new variables added.

**Example: `staging/mobile/.env`**
```
APP_ENV=staging
API_BASE_URL=https://api.staging.ion.app
RELAY_URL=wss://relay.staging.ion.app
LOG_LEVEL=debug
IDENTITY_API_URL=https://staging.api.identity.io
IDENTITY_APP_ID=ap-4b208e64-063c-48a2-a431-96536006c459
```

**Example: `staging/web/.env`**
```
VITE_APP_ENV=staging
VITE_API_BASE_URL=https://api.staging.ion.app
VITE_RELAY_URL=wss://relay.staging.ion.app
VITE_LOG_LEVEL=debug
VITE_IDENTITY_API_URL=https://staging.api.identity.io
VITE_IDENTITY_APP_ID=ap-4b208e64-063c-48a2-a431-96536006c459
```

### In `core-v2/frontend/`

Same files (`apps/mobile/.env`, `apps/web/.env`) need the same additions.

## Existing Variables (no changes needed)

| Variable | Staging | Testnet | Production |
|---|---|---|---|
| `APP_ENV` | staging | testnet | production |
| `API_BASE_URL` | https://api.staging.ion.app | https://api.testnet.ion.app | https://api.ion.app |
| `RELAY_URL` | wss://relay.staging.ion.app | wss://relay.testnet.ion.app | wss://relay.ion.app |
| `LOG_LEVEL` | debug | info | warn |
