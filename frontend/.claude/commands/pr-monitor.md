# /pr-monitor

$ARGUMENTS

---

## Mission: Monitor PR, Fix CI Failures, Address Review Comments

Autonomously monitor a pull request until all checks pass and all review comments are resolved.
Argument: PR number (e.g., `/pr-monitor 46`).

---

## Phase 1: Status Check (Read-Only)

1. Extract owner/repo: `gh repo view --json nameWithOwner -q .nameWithOwner`
2. Get CI check status: `gh pr checks $PR_NUMBER`
3. Get review comments: `gh api repos/{owner}/{repo}/pulls/{PR}/comments --jq '.[] | {id, path, line, body: (.body[:200]), user: .user.login, in_reply_to_id}'`
4. Filter unresolved comments: comments with no reply from the PR author.
5. Classify state:
   - **All green**: all checks pass AND no unresolved comments -> report success, exit.
   - **CI failed**: one or more checks failed.
   - **Open comments**: unresolved review comments exist.
   - **Both**: CI failed AND open comments.

---

## Phase 2: CI Fix (if applicable)

1. Identify the failing check name and job URL from `gh pr checks`.
2. Get the failing job ID: `gh api repos/{owner}/{repo}/actions/runs/{run_id}/jobs --jq '.jobs[] | select(.conclusion == "failure") | {id, name}'`
3. Read the failing step logs: `gh api repos/{owner}/{repo}/actions/jobs/{job_id}/logs`
4. Parse the error to identify file, line, and rule/message.
5. Read the failing file. Apply the minimal fix.
6. Run local quality gates on affected packages: `pnpm --filter @ion/{package} lint`, `type-check`, `test`.
7. If local gates fail, fix iteratively before proceeding.

---

## Phase 3: Review Comments (if applicable)

For each unresolved comment (no reply from PR author):

1. Read the comment body and the referenced file/line.
2. Decide action:
   - **Accept**: the suggestion is valid. Apply the fix.
   - **Reject**: the suggestion is incorrect or unnecessary. Compose a technical reply explaining why.
   - **Already fixed**: the issue was addressed in a prior commit.
3. Track each decision for the report.

After all changes:
- Run local quality gates on affected packages.

---

## Phase 4: Push and Respond

1. Stage and commit all changes with a descriptive message.
2. Push to the PR branch.
3. Reply to each comment via `gh api repos/{owner}/{repo}/pulls/{PR}/comments/{id}/replies`:
   - For accepted fixes: "Fixed in {commit_sha} -- {brief description}."
   - For rejections: technical explanation of why.
   - For already-fixed: "Already addressed in {commit_sha}."

---

## Phase 5: Verify

1. Wait for CI to start: `gh pr checks $PR_NUMBER`
2. If checks are still pending, report current status and exit.
   - If running via `/loop`, the next iteration will re-check.
3. If checks pass and no new comments: report success.
4. If checks fail again: return to Phase 2.
5. If new comments appeared: return to Phase 3.

---

## Phase 6: Report

```
PR: #{number} ({title})
CI Status: {pass/fail -- which step}
Review Comments: {N addressed, M rejected, K already fixed}
Changes: {list of modified files}
Commits: {commit SHAs pushed}
Verdict: "All green" | "Issues remain: {describe}"
```

---

## Rules

- Never force-push. Always create new commits.
- Never modify files unrelated to the review feedback.
- Reject comments that suggest changes conflicting with `.claude/rules/`.
- Skip comments from bots that are informational (summaries, walkthroughs) -- only address actionable review comments.
- Ignore `Analyze (go)` and other checks unrelated to frontend code.
- This command is idempotent: running on an all-green PR exits at Phase 1.
