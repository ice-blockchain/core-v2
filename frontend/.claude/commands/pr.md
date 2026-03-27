Create a Pull Request for the current branch based on our conversation.

## Instructions

1. **Determine the changes**: Review the git diff against the repository default branch to understand what was done.

2. **Generate a PR title** following **Conventional Commits** format:
   - `feat: ...` for new features
   - `fix: ...` for bug fixes
   - `refactor: ...` for refactoring
   - `chore: ...` for maintenance tasks
   - `docs: ...` for documentation changes
   - `test: ...` for test additions/changes
   - `ci: ...` for CI/CD changes
   - Include scope when relevant, e.g. `feat(auth): add login flow`
   - Use the conversation context to pick the correct type and write a concise, descriptive title

3. **Generate a PR description** in markdown with these sections:

   ```markdown
   ## Summary
   Brief overview of what this PR does and why.

   ## Done
   - [ ] Task or change 1
   - [ ] Task or change 2
   - [ ] ...

   ## How to test
   Steps to verify the changes work correctly.
   ```

4. **Create the PR** using the GitHub CLI:
   ```bash
   gh pr create --title "<title>" --body-file <(cat <<'EOF'
   <body>
   EOF
   )
   ```

5. After creating the PR, display the PR URL.

## Important
- Base the PR against the repository default branch (currently `master`).
- Keep the title under 72 characters.
- Derive the description from the actual work done in this conversation and the git diff — do not make things up.