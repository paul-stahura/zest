---
name: merge-working-branch-to-main
description: End-to-end "get my working branch ready to merge into main" workflow for Paul (not git-savvy). Cleans the working tree, commits and pushes everything safely, pulls main, and does a test rebase on a throwaway branch to detect conflicts before touching the real branch. Use when Paul says "merge my branch into main", "get ready to merge", "/merge-working-branch-to-main", or wants to know if his branch is clean to combine with main.
allowed-tools: Bash, Read, Edit, AskUserQuestion
---

# Merge working branch to main (test rebase pre-flight)

## Purpose

Paul is not git-savvy. He wants to know whether his current working branch is
**safe to merge into `main`** before doing the actual merge. This skill walks
the whole pre-flight:

1. Make sure his working branch is clean and pushed.
2. Make sure `main` is fresh and clean locally.
3. Do a **test rebase** on a temporary disposable branch — never touching his
   real working branch.
4. If the test rebase finishes cleanly, tell Paul "yes, you're good to merge".
5. If the test rebase hits non-obvious conflicts, tell Paul **in plain English**
   that he needs help, surface the affected files, and leave both branches
   untouched.

**Hard guarantee:** this skill **never modifies the working branch** or
`main` in ways Paul wouldn't expect. Force-pushes are forbidden. The user's
work is preserved on every code path.

## When to use

- User asks: "/merge-working-branch-to-main"
- User asks: "merge my branch into main", "is my branch ready to merge",
  "can I combine this with main?", "get this ready to merge", "test the merge"
- Before announcing a feature complete, when Paul wants the safety check
- Whenever the user references the goal of putting current work onto `main`

Translate Paul's words. Never use "rebase", "conflict", "merge", "push", "pull"
in messages back to him.

## Steps

### Step 1 — Read the lay of the land

```bash
git rev-parse --abbrev-ref HEAD                 # current branch
git status --porcelain                          # dirty?
git log --oneline @{u}..HEAD 2>/dev/null        # unpushed commits
git log --oneline ..@{u} 2>/dev/null            # behind upstream
```

Refuse to proceed (with plain-English explanation) if:

- HEAD is detached
- Current branch IS `main` — say "you're already on main; nothing to merge from"
- No upstream is set — set one or tell the user

### Step 2 — Handle dirty tree (uncommitted edits and untracked files)

If `git status --porcelain` is non-empty, inspect each file. Categorise:

**A. Clearly part of current work** (files in directories we've been editing,
matching extensions of the codebase, sensible sizes < 1 MB):
- Stage and commit silently. Message: `wip: tidy up before merge check`.

**B. Ambiguous** (any of):
- Files outside `src/`, `scripts/`, `public/`, `.claude/`, etc.
- Large files (> 1 MB)
- Binary files (`.bin`, `.dmg`, `.zip`, `.pkg`, `.so`, etc.)
- Files in separate-project directories
- Files matching secret patterns (`.env`, `*.key`, `id_rsa*`, `*.pem`, `credentials*`)

For each ambiguous file, **interview Paul** using `AskUserQuestion`:

> "I see a file `<name>`. It looks like `<reason it's ambiguous>`. Want me to
> save it as part of this work, or leave it on the side for later?"

Options:
- **"Save with this work"** — stage and commit it.
- **"Leave it on the side"** — leave uncommitted; do not delete.
- **"I don't know"** — treat the same as "Leave it on the side". Add an
  entry to `.claude/uncommitted-on-purpose.md` (create if missing) noting
  the filename and date so future sessions don't pester him about it.

Never auto-stage a file matching the secret patterns above. If a secret-shaped
file is present, surface it explicitly and ask before committing — the safe
default is to *not* commit it. Suggest adding to `.gitignore`.

### Step 3 — Push the working branch

After Step 2 the tree is clean. Verify, then:

```bash
git push                                        # never --force
```

If push fails because upstream has changes the local branch doesn't, the
working branch and its remote have diverged. **Stop.** Tell Paul:

> "The version of your branch saved online doesn't match what's on your
> machine. I can't tell which one you want to keep. Let me know whether
> your local version is the right one and we'll go from there."

Do not force-push under any circumstances.

### Step 4 — Refresh `main`

Save the current branch name, then:

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
```

If `main` is not fast-forwardable (which is extremely unlikely on a trunk
branch), **stop**:

> "The `main` branch online has changes that don't line up with the copy on
> your machine. I'd rather not touch it without you knowing. We'll need to
> sort that out before merging."

Switch back to working branch and exit cleanly.

### Step 5 — Test rebase on a throwaway branch

Switch back to working branch first to know what we're testing from:

```bash
WORK=$(cat <work-branch-saved-from-step-1>)
git checkout "$WORK"
TEST="merge-check/$(date +%Y%m%d-%H%M%S)"
git checkout -b "$TEST"
```

Now attempt the rebase:

```bash
git rebase main
```

Possible outcomes:

**A. Clean.** Rebase finishes without prompts. The test branch is now
`main + WORK's commits` with linear history. Tell Paul:

> "Good news — your branch lines up cleanly with the latest `main`. Want me
> to combine it into `main` for you now?"

Use `AskUserQuestion` with two options:
- **"Yes, combine it into `main`"** — proceed to Step 5.5 below.
- **"Not yet, just leave it tested"** — clean up the throwaway and stop.

Either way, first show `git log --oneline main..HEAD` so Paul can see what
would go in.

Then clean up: switch back to `$WORK`, delete the test branch:
```bash
git checkout "$WORK"
git branch -D "$TEST"
```

### Step 5.5 — Real merge into `main` (only if Paul confirmed)

Reached only when (1) the test rebase in Step 5A was clean, and (2) Paul
chose "Yes, combine it into `main`".

Goal: linear history, no merge commits. `main` fast-forwards to the tip of
the working branch.

```bash
git checkout main
git pull --ff-only origin main          # safety: re-check main is fresh
git merge --ff-only "$WORK"             # fast-forward only; refuse if not
git push origin main
git checkout "$WORK"
```

If `git merge --ff-only` fails (extremely unlikely after a clean test
rebase, but possible if main moved during Step 4–5), **stop**:

> "While I was finishing up, the `main` branch online changed. Your work
> is still safe. We'll need to re-run the check before combining."

Don't force-push. Don't fall back to a non-fast-forward merge.

On success, tell Paul in plain English:

> "Done — your work is now part of `main`, saved online."

Optionally surface the new `main` tip's commit list so Paul can confirm:
```bash
git log --oneline -10 main
```

**B. Conflict.** `git rebase main` exits with conflict markers. Capture
the conflicting files:

```bash
git diff --name-only --diff-filter=U
```

**Classify each conflict before deciding what to do:**

**B1. Trivially safe to auto-fix.** Conflicts limited to:
- Whitespace-only / line-ending / final-newline differences.
- Import-order or import-list additions where both sides only *add*
  imports (no removals, no semantic disagreement on a single line).
- `package.json` / `package-lock.json` version bumps where keeping the
  newer side is uncontroversial.
- `.gitignore` entries where both sides are pure additions.
- Generated files in folders Paul never edits by hand (e.g., `dist/`,
  build artifacts) — take Paul's side, then optionally regenerate.

For each B1 file, decide a side or merge the additive sets, stage with
`git add <file>`, and `git rebase --continue`. Repeat until clean or the
next conflict is non-trivial (then escalate to B2). If everything
resolves cleanly, treat it like **A** above (go to Step 5.5 after
confirming with Paul):

> "There were a few small line-ups to sort out — I handled them. Your
> branch now lines up cleanly with `main`. Want me to combine it in?"

**B2. Anything else — stop.** Semantic logic, math, file-wide changes,
deletions colliding with edits, conflicts spanning multiple unrelated
files, `.ts` business logic with overlapping diffs — these need Paul (or
a more specialised skill) to judge intent.

Abort the test rebase and clean up:
```bash
git rebase --abort
git checkout "$WORK"
git branch -D "$TEST"
```

Then tell Paul:

> "Your work and the latest `main` made changes to the same parts of these
> files:
>   • `<file 1>`
>   • `<file 2>`
>   …
> I can't tell automatically which version you want. You'll need a hand
> sorting these out. Both your branch and `main` are still in their
> original state — I didn't change anything."

### Step 6 — Final state

Regardless of outcome:

- The temporary test branch is **deleted** — never leave it around.
- Paul's working branch is checked out at the end.

Outcome-specific:

- **Merged into `main` (Step 5.5 succeeded):** local `main` and `origin/main`
  both point at the working branch's tip. Tell Paul: "done — combined and
  saved online."
- **Tested clean but Paul declined merge:** working branch and `main` both
  unchanged from start (plus any consented Step 2 commits). Tell Paul:
  "you're good to combine whenever you're ready."
- **Conflicts in Step 5B that couldn't be auto-fixed:** working branch and
  `main` both unchanged from start. Tell Paul: "you need help, here's why."

## Hard rules (lifted from process.md)

- Never `--force` / `--force-with-lease` push without explicit Paul OK
- Never `reset --hard`, `branch -D` of his real branch, or discard work
- Dirty tree → never rebase the real branch; only the throwaway test branch
- Conflict → stop, surface in plain English
- Never use git jargon ("rebase", "conflict", "merge", "push", "pull",
  "HEAD", "upstream", "fast-forward", "branch") in user-facing messages
- Untracked file that looks like a secret → never auto-commit; surface
  explicitly

## Plain-English phrase bank

Use these instead of git terms when talking to Paul:

| Don't say | Say |
|-----------|-----|
| rebase / merge | "line up your work with the latest `main`" |
| conflict | "your work and the saved-online version both changed the same parts" |
| push | "save online" |
| pull | "get the latest" |
| commit | "save" |
| branch | "your working version" (or just omit) |
| `main` | "`main`" — OK to use, it's a name |
| diverged | "don't line up" |
| HEAD | (never use; refer to "your current work") |

## File-handling defaults during Step 2 interview

Common ambiguous files in this repo:

| Pattern | Default if unclear |
|---------|--------------------|
| `*.csv` in `public/critical-strip-points/` | Save (data we use) |
| `*.png` screenshot in `public/` | Ask Paul |
| `*.py` in `scripts/` | Save (utility scripts) |
| `*.tex`, `*.pdf` in `~/Downloads/` (outside repo) | Don't auto-stage |
| `node_modules/`, `dist/`, `build/` | Already gitignored; ignore |
| `.env*`, `*.key`, `*.pem`, `credentials*` | **Refuse**, surface as secret-shaped |
| Large binaries (> 5 MB) | Ask Paul; default to "leave on the side" |

## Notes on the `.claude/uncommitted-on-purpose.md` log

When Paul says "I don't know" for a file, record it so we don't keep asking:

```
- 2026-06-09: `Screenshot 2026-06-09 at 10.00.00 AM.png` — Paul unsure;
  left uncommitted. Will not re-prompt.
```

Future sessions can check this list before nagging him.
