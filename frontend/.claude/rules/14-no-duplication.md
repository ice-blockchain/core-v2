# No Duplication Rule

## Before Creating Anything New

- CRITICAL: Before creating a new file, type, function, constant, or abstraction, search the codebase for existing equivalents. If one exists, use it. Do not create a second version.
- CRITICAL: Before adding a new dependency or utility, check whether the project already solves that problem. Reuse what exists.
- CRITICAL: Never create a parallel implementation of something that already works. If the existing version needs changes, modify it in place.

## What Counts as Duplication

- A new file that covers the same responsibility as an existing file.
- A new struct/type that models the same concept as an existing one.
- A new helper function that does what an existing function already does.
- A new constant or sentinel error that duplicates an existing one.
- A new package that overlaps with an existing package's responsibility.
- Re-implementing logic that already exists elsewhere in the codebase instead of calling it.

## Required Checks

1. Grep before you create. Search for the name, concept, and synonyms.
2. Read before you write. Understand the existing code in the area you're changing.
3. Ask if uncertain. If you're not sure whether something already exists, search more broadly rather than creating a new version.

## If You Find Near-Duplicates

- Extend the existing code rather than creating a competing version.
- If the existing code is in the wrong package or has the wrong interface, refactor it — do not fork it.