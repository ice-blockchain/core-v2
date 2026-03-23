# /post-merge

---

## Mission: Post-Merge Architecture Sync

After every merged PR, verify that architecture documentation is up to date.

---

## Checklist

Scan the merged changes and answer each question:

### 1. Package/Service Changes
- [ ] Was a new package added to `ion-app`?
- [ ] Was a package removed?
- [ ] Was a new service added to `ion-backend`?
- [ ] Was a service removed?

### 2. Layer/Dependency Changes
- [ ] Did the dependency graph change? (new import between layers)
- [ ] Was a new layer introduced?
- [ ] Did import rules change?

### 3. Actions Changes
- [ ] Was a new action added to `@ion/actions`?
- [ ] Was an action removed or renamed?
- [ ] Did an action's input/output types change?

### 4. API Contract Changes
- [ ] Was a new endpoint added?
- [ ] Was an endpoint removed or changed?
- [ ] Was `@ion/api-contracts` updated?

### 5. Infrastructure Changes
- [ ] Did the tech stack change? (new database, new queue, new service)
- [ ] Did environment variables change?
- [ ] Did the build/deploy process change?

---

## If ANY answer is YES:

Update these files:

1. **`.claude/architecture.md`** — Update the relevant section (packages list, services list, dependency graph, actions catalog, or infrastructure notes).

2. **`CLAUDE.md`** (root) — Update if the high-level summary, package count, or run commands changed.

3. **`.claude/rules/03-architecture.md`** — Update if layer rules, import rules, or structural patterns changed.

4. **`.claude/rules/04-actions-layer.md`** — Update the actions catalog table if actions were added, removed, or changed.

---

## If ALL answers are NO:

No documentation updates needed. Report: "Architecture docs are current. No updates required."

---

## Output

```
PR: [PR title or number]
Structural changes detected: [yes/no]
Files updated:
  - [list of updated doc files, or "none"]
Status: Architecture docs are current.
```
