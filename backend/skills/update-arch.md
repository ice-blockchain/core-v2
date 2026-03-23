# /update-arch

---

## Mission: Update Architecture Documentation

Walk through the living architecture document and sync it with the current state of the codebase.

---

## Steps

### 1. Scan Current State
- Read `packages/` directory to get the current list of packages
- Read `services/` directory (if backend) to get the current list of services
- Read `packages/actions/src/` to get the current actions catalog
- Read `package.json` workspace config for any changes

### 2. Compare Against `.claude/architecture.md`
- Identify additions (new packages, services, actions)
- Identify removals (deleted packages, services, actions)
- Identify changes (renamed, moved, restructured)

### 3. Update Files
For each discrepancy found:

1. **`.claude/architecture.md`** — Update the living state document
2. **`CLAUDE.md`** — Update if the summary changed
3. **`.claude/rules/03-architecture.md`** — Update if structural rules changed
4. **`.claude/rules/04-actions-layer.md`** — Update if actions catalog changed

### 4. Verify
- Confirm all package names in docs match actual directory names
- Confirm all actions listed in docs exist as files
- Confirm layer assignments are correct
- Confirm import rules table is still accurate

---

## Output

```
Scanned: [date]
Packages: [count] (added: X, removed: Y)
Services: [count] (added: X, removed: Y)
Actions: [count] (added: X, removed: Y)
Files updated:
  - [list]
Status: Architecture docs synced with codebase.
```
