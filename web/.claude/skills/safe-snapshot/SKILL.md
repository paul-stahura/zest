---
name: safe-snapshot
description: Snapshot all working changes (tracked + untracked) into a wip commit safely. Scans for secrets, auto-extends .gitignore for build/IDE/OS junk, then commits everything else. Use when user says "save my work", "snapshot", "commit what I have", or before risky operations (rebase, merge, branch switch). Also use to clean up before auto-snapshot hook would refuse.
allowed-tools: Bash, Read, Edit, Glob, Grep
---

# Safe Snapshot

## Purpose

User on this project may not know git. They add files, edit configs, drop assets without realizing what's tracked. This skill takes a clean snapshot of everything safely:

1. Scan all dirty + untracked paths.
2. Auto-extend `.gitignore` for known junk (build artifacts, IDE files, deps, OS cruft).
3. Refuse to commit secret-shaped paths — surface them, never auto-stage.
4. `git add -A` everything else, commit as `wip: <reason>`.
5. Never push.

Complements the auto-snapshot hook (`scripts/auto-snapshot.mjs`) — same logic, but interactive when judgment needed.

## When to use

- User says: "save", "snapshot", "commit what I have", "I'm done for now"
- Before rebase, merge, branch switch, or any operation that risks losing work
- After auto-snapshot hook refused (secrets detected) — investigate, fix, retry
- Before user steps away mid-task

## Process

### 1. Survey state

```bash
git status --porcelain
git ls-files --others --exclude-standard   # untracked
```

Categorize each path:
- **Source / config** — should commit
- **Build artifact / dep / IDE / OS junk** — should ignore (extend `.gitignore`)
- **Secret-shaped** — must NOT commit. Investigate.
- **Unclear** — ask user in plain language ("Is `weird-file.bin` something you want saved?")

### 2. Junk patterns (auto-add to `.gitignore`)

Match these globs/dirs in untracked → add to `.gitignore`:

```
node_modules/
dist/
build/
.next/
.nuxt/
coverage/
__pycache__/
*.pyc
.DS_Store
Thumbs.db
.vscode/
.idea/
*.log
.cache/
tmp/
*.tmp
venv/
.venv/
```

Don't blindly append duplicates — check existing `.gitignore` first.

### 3. Secret patterns (REFUSE)

Filenames matching any of these → stop, do not commit:

- `.env`, `.env.*`, `.env.local`
- `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.keystore`, `*.jks`
- `id_rsa`, `id_ed25519`, `id_ecdsa`, `id_dsa`
- `credentials*`, `secrets*`, `secret*`
- `.aws/`, `.ssh/`
- `*.gpg`, `*.asc`

If matched:
1. Show user the path(s) in plain language: "Found `<path>` — looks like it might have passwords or keys. Want me to add it to the ignore list (it stays on your computer but never gets shared) or is it a normal file I should save?"
2. Act on answer. Default to ignoring if user unclear.

Also do a light content scan on small text files for:
- `-----BEGIN .* PRIVATE KEY-----`
- `AKIA[0-9A-Z]{16}` (AWS access key)
- `xox[baprs]-[0-9a-zA-Z-]+` (Slack token)

If found → flag, don't commit.

### 4. Size check (>10MB)

For each path in `git status --porcelain -- .`, check file size. If any > 10MB, refuse and ask: "`<path>` is `<size>`MB — too big to save in normal git history. Want me to ignore it (set aside in a Git LFS folder later) or check what's in it?"

### 5. Commit

After ignore + secret + size pass:

```bash
# Stage .gitignore additions as a separate commit first (clean history)
git add -- .gitignore
git diff --cached --quiet -- .gitignore || \
  git commit --no-verify -m "chore: ignore <patterns>"

# Stage and commit everything else (scoped to project subdir)
git add -A -- .
git diff --cached --quiet && exit 0
```

**Commit message:** prefer `fixup! <subject of last real commit on branch>` so `wip-squash` auto-merges it. If no real commit yet, fall back to `wip: <short reason>`.

```bash
last_real=$(git log --format=%s origin/main..HEAD | grep -vE '^(fixup!|squash!|wip:)' | head -1)
if [ -n "$last_real" ]; then
  git commit --no-verify -m "fixup! $last_real"
else
  git commit --no-verify -m "wip: <short reason>"
fi
```

Reason examples (when no anchor):
- `wip: snapshot before risky experiment`
- `wip: end-of-session save`
- `wip: <feature> in progress`

Never push. User decides when to push.

After successful commit, clear `.claude/last-snapshot-refused` if present.

### 5. Report

One-line summary:
- Files committed (count)
- `.gitignore` lines added (if any)
- Files refused (if any) + reason

Example: "Saved 7 files. Added `dist/` and `.DS_Store` to ignore list. Refused `.env.local` — looks like passwords; added to ignore instead."

## Plain-language rule

Never say: stage, untracked, working tree, HEAD, index, blob, ref. Translate to: save, new files, your changes, current version, etc.

## Anti-patterns

- Committing `.env`, `.envrc`, `.pem`, `id_rsa` files. Never.
- Adding `*` to `.gitignore` to "fix" warnings. Specific patterns only.
- Auto-committing huge binaries (>10 MB) without flagging. Ask first.
- Force-committing through hooks (`--no-verify`) when not in WIP context. Reserved for auto-snapshot path.
- Pushing. Never auto-push.
- Using `wip:` when a real commit exists ahead of main on the branch — use `fixup!` instead so the merge-time squash autosquashes cleanly.

## Reconciliation context

The user reconciling these snapshots back to main may be a different person from the one creating them (Chris is the git expert; teammates aren't). They run `npm run wip-squash` (or `node scripts/wip-squash.mjs`), which does `git rebase --autosquash`. Every `fixup!` commit auto-merges into its parent real commit; `wip:` commits remain and are listed for manual handling. **Producing `fixup!` instead of `wip:` whenever possible is the single biggest reconciliation win.**
