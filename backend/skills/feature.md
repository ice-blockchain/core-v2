# /feature

$ARGUMENTS

---

## Mission: Implement Feature — Standard Operating Protocol

Execute in full compliance with all rules in `.claude/rules/`. Each phase is mandatory.

---

## Phase 0: Reconnaissance (Read-Only)

- Scan the relevant parts of the codebase to build a complete mental model.
- **Deduplication scan:** Identify existing actions, utilities, helpers, and patterns relevant to this request. These MUST be reused — never reimplemented.
- Output: concise digest of findings.
- **No mutations permitted during this phase.**

---

## Phase 1: Planning

1. **Restate objectives.** Define success criteria.
2. **Check if an action exists.** Browse `packages/actions/src/[domain]/`. The feature might already have the function you need.
3. **Identify full impact surface.** All files, packages, and workflows affected.
4. **Justify strategy.** Propose the approach. Explain WHY it's the best choice. Align with existing patterns.
5. **DRY analysis.** For every piece of logic you plan to write, confirm no existing implementation covers it. If similar logic exists in 2+ places, consolidate into a shared abstraction first.

---

## Phase 2: Execution

Execute incrementally, following all rules:

- **300 lines max per file. 30 lines max per function.**
- **One action = one file = one function.** If creating a new action:
  - Create `packages/actions/src/[domain]/[verb]-[noun].ts`
  - Follow the exact pattern of existing actions in that domain
  - Define clear input/output types (simple, no package-internal types)
  - Handle errors with `ActionError`
  - Write colocated test: `[verb]-[noun].test.ts`
  - Export from `packages/actions/index.ts`
- **Screens only import from `@ion/actions`.**
- **Read-Write-Reread:** Read every file before and after modification.
- **Zero duplication:** Before writing any function, search for existing implementations. If found, import and reuse. If you're copying logic, STOP — extract to shared module.
- **System-wide ownership:** If you modify a shared component, update ALL its consumers.

---

## Phase 3: Verification

1. Run all relevant quality gates (tests, lint, types).
2. If any gate fails, autonomously diagnose and fix.
3. Test the primary user workflow affected by your changes.

---

## Phase 4: Zero-Trust Self-Audit

1. **Re-verify final state.** All modified files correct. Services running.
2. **Hunt for regressions.** Test a related feature you didn't modify.
3. **Duplication audit.** Grep for similar function signatures and logic. If duplication found, refactor before finalizing.

---

## Phase 5: Final Report

```
Changes: [list of created/modified files]
Verification: [test results, lint results]
Impact: [all affected dependencies verified]
Architecture: [does .claude/architecture.md need updating? If yes, update it.]
Verdict: "System verified. No regressions." OR
         "CRITICAL ISSUE FOUND. [describe + next steps]"
```
