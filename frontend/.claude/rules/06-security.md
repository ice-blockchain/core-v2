# Security Rules

## Secrets, Credentials & Sensitive Data

### CRITICAL: Never commit secrets, credentials, API keys, or sensitive data.
This includes:
- API keys, secret keys, access tokens, bearer tokens
- Private keys, seeds, mnemonics, passphrases
- Database connection strings with credentials
- JWT secrets, encryption keys, signing keys
- OAuth client secrets
- Webhook secrets
- Any password or credential in any format

Use `.gitignore` aggressively. If accidentally committed, **rotate the secret immediately** — removing from git history alone is NOT enough. The secret is compromised the moment it hits any remote.

### CRITICAL: Never hardcode credentials anywhere.
Not in source code, not in config files, not in scripts, not in CI pipelines, not in Dockerfiles, not in docker-compose files, not in comments, not in tests.

```yaml
# VIOLATION — hardcoded in docker-compose.yml
environment:
  POSTGRES_PASSWORD: mypassword123
  REDIS_PASSWORD: redis_secret

# CORRECT — reference from .env (which is .gitignored)
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  REDIS_PASSWORD: ${REDIS_PASSWORD}
```

```typescript
// VIOLATION — hardcoded in code
const apiKey = 'sk-live-abc123def456';

// CORRECT — from environment
const apiKey = process.env.API_KEY;
```

### CRITICAL: Never read, display, transmit, or log sensitive data.
- Never log API keys, tokens, private keys, seeds, passwords, or full auth headers
- Never include credentials in error messages or stack traces sent to clients
- Never expose credentials in API responses
- Mask sensitive fields in logs: `token: "sk-...f456"` not the full value
- Never echo `.env` contents in CI output

### CRITICAL: Never create scripts that embed or reference credentials.
If a task requires credentials, ask the user to provide or confirm. Never generate placeholder credentials that look real.

### IMPORTANT: All configuration via environment variables.
Use `config/env.ts` (or equivalent). All secrets come from environment, never from files checked into git. Use `.env.example` (with placeholder values only) to document required variables.

### IMPORTANT: Secure storage on device.
Private keys, auth tokens, seeds — use SecureStorage (Keychain on iOS, Keystore on Android). Never use AsyncStorage, SharedPreferences, or plain-text files for sensitive data.

---

## Infrastructure Security — Ports & Network

### CRITICAL: No database, cache, or internal service exposed to public internet.
PostgreSQL, Redis, MongoDB, RabbitMQ, Elasticsearch — these listen on `127.0.0.1` or internal Docker network ONLY. Never `0.0.0.0`.

```yaml
# VIOLATION — exposed to all interfaces (public)
ports:
  - "5432:5432"        # PostgreSQL open to the world
  - "6379:6379"        # Redis open to the world

# CORRECT — bound to localhost only
ports:
  - "127.0.0.1:5432:5432"
  - "127.0.0.1:6379:6379"
```

### CRITICAL: Docker services that are only needed internally use `expose`, not `ports`.
`expose` makes the port available to other containers on the same Docker network. `ports` publishes to the host (and potentially the internet).

```yaml
# CORRECT — internal services use expose
services:
  postgres:
    image: postgres
    expose:
      - "5432"         # available to other containers only
    # NO ports: section

  redis:
    image: redis
    expose:
      - "6379"         # available to other containers only

  api:
    ports:
      - "127.0.0.1:3000:3000"   # only the API is reachable, and only from localhost
```

### CRITICAL: Every port binding must specify a bind address.
Bare `"3000:3000"` defaults to `0.0.0.0` (all interfaces = public). Always prefix with `127.0.0.1:` unless the service genuinely needs to be publicly accessible.

### IMPORTANT: Firewall rules — local-only services stay local.
If a service is only needed for local development:
- Bind to `127.0.0.1` in config
- No inbound firewall rule needed (it's already blocked by not binding publicly)
- If deploying to a server: use firewall (ufw, iptables, security groups) to block external access to internal ports

```bash
# Example: only allow PostgreSQL from localhost
ufw deny 5432
ufw allow from 127.0.0.1 to any port 5432
```

### IMPORTANT: Production databases require authentication.
Never run PostgreSQL, Redis, or any data store without a password in any environment other than local dev behind localhost binding. Even in Docker.

```yaml
# CORRECT
services:
  redis:
    image: redis
    command: redis-server --requirepass ${REDIS_PASSWORD}
    expose:
      - "6379"
```

---

## Input Validation

### CRITICAL: Validate all external input at system boundaries.
- Backend: validate in the controller layer before passing to service.
- Mobile: validate in the action layer before calling packages.
- Never trust client-side validation alone — always validate server-side.

### IMPORTANT: Sanitize all user-generated content.
- No raw HTML rendering.
- Escape user text before display.
- Parameterized queries only — no string concatenation for database queries.
- Never execute or evaluate user-provided strings as code.

---

## Auth & Authorization

### CRITICAL: Auth middleware on every protected route.
`shared/auth/middleware.ts` attaches the authenticated user to the request. Every route that requires auth must use this middleware. No exceptions.

### CRITICAL: Tenant isolation in every read/write.
Every database query must scope to the authenticated user. A user must never be able to read or modify another user's data by manipulating IDs.

### IMPORTANT: Token refresh and expiry.
Auth tokens have expiry. The network client handles token refresh transparently. Actions and screens never manage tokens directly.

---

## Content Safety

### CRITICAL: NSFW detection before media upload.
All user-submitted media goes through NSFW detection before upload. If content is flagged, the upload is blocked and the user is notified.

### IMPORTANT: Content labeling before publishing.
All user-generated text content goes through content labeling for language detection and category classification before being published.

---

## Network Security

### IMPORTANT: All app network calls go through the network package.
The network package enforces: HTTPS only, auth header injection, request signing where required, certificate pinning (if configured).

### STANDARD: Rate limiting on all public endpoints.
Backend services use rate limiting middleware on all public-facing routes.

---

## Audit Checklist (for PRs)

Before approving any PR, verify:
- [ ] No secrets, API keys, or credentials in code, logs, configs, or responses
- [ ] No hardcoded passwords or connection strings
- [ ] Docker/infra services bound to `127.0.0.1` or using `expose` (not public `ports`)
- [ ] `.env` files in `.gitignore`, `.env.example` has placeholder values only
- [ ] Inputs validated and normalized server-side
- [ ] Auth/authz enforced on every endpoint
- [ ] Tenant boundaries in every read/write
- [ ] Secure storage used for sensitive data on device
- [ ] NSFW detection before media submission
- [ ] No `any` on API boundaries
- [ ] External calls have timeout and retry policy
- [ ] State changes atomic where needed
- [ ] Duplicate requests/events handled safely
- [ ] Logs do not contain sensitive data
