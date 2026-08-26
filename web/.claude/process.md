# Process — Scientific Approach

File define how approach every problem. Non-negotiable. Default = scientific reasoning, not pattern-match or guess.

## Core principle

Treat every problem as scientific investigation. Form hypotheses, design experiments, gather evidence, act. No intuition-only solutions. No hedging for cover — state what know, what don't, how close gap.

## The loop

1. **Observe.** State problem concrete. Quote exact errors. Cite file paths + line numbers. Separate symptoms from cause-claims.
2. **Hypothesize.** List likely explanations, rank by prior probability. For each, state what must be true.
3. **Predict.** For each hypothesis, predict observation that confirm or rule out. No testable prediction = useless. Discard or refine.
4. **Experiment.** Run cheapest experiment that discriminate between hypotheses. Options:
   - **Code experiment** — minimal repro, targeted log, unit test, REPL check.
   - **Web research** — authoritative source (spec, primary docs, paper, source code). Cite URLs.
   - **Thought experiment** — trace execution by hand, work math, reason from first principles. Show work.
   - **Read the code** — grep, read implementation, follow call chain. Often cheapest.
5. **Evaluate.** State what evidence show. Update or discard hypotheses. None survive → back to step 2.
6. **Act.** Propose fix only when hypothesis backed by evidence. Tie fix to evidence: "Cause is X, shown by Y, so fix is Z."

## Rules

- **Every claim needs evidence.** Assert behavior → cite code, test result, spec, experiment. "I think" / "probably" without backing not allowed.
- **No hedging as cover.** No soften wrong answers with qualifiers. Have evidence or don't. If don't, say so: "I don't know — here's how we find out."
- **Uncertainty fine; vagueness not.** "I'm not sure whether X uses double or float precision — I'll grep the type" good. "It might be a precision issue, hard to say" not.
- **Distinguish confidence levels.**
  - **Verified** — ran experiment / read code / cited spec.
  - **Inferred** — strong reasoning from verified facts, not directly observed.
  - **Hypothesis** — plausible, untested. Needs experiment.
  Label claims when distinction matters.
- **State what change your mind.** Proposing solution → name observation that invalidate. Forces falsifiability, prevents motivated reasoning.
- **Cheapest experiment first.** 20 lines of code beats 5-minute build. Grep beats web search. Pick highest information-per-second.
- **Negative results count.** Experiment rules out hypothesis → report it. Eliminating wrong answers = progress.
- **Reproduce before fixing.** Bugs: reproduce failure with concrete trigger before changing code. Fix without repro = guess.
- **Verify after fixing.** Re-run repro. Run adjacent tests. No "fixed" claim until observed.

## When to ask for evidence from the user

Ask user when:
- Behavior depends on environment, data, or state you cannot observe.
- Design decision hinges on intent or priorities only user knows.
- Experiment destructive or expensive, confirmation cheaper.

No ask user to do work you can do. Read code first.

## Git workflow (Claude handles, user not git-savvy)

User not familiar with git. Never ask in git terms. Handle silently when safe. SessionStart hook runs `git fetch origin` already — status fresh on entry.

### Branch model (flat, no chains)

- `main` = trunk.
- Feature branches off `main` only. Never branch off another feature branch.
- Branch deep > 1 level → flatten: rebase onto `main`, abandon parent branch.
- Prefer **rebase** onto `main` over merge. Linear history.
- Merge into `main` only at end, fast-forward when possible.

### At session start (or before non-trivial work)

1. Check `.claude/last-snapshot-refused` — exists? Read it, surface to user in plain language ("Last time I tried to save your work, I noticed `<file>` and stopped — it might have passwords. Want to ignore it or include it?"). Use safe-snapshot skill to resolve.
2. Check `git status` + `git log --oneline @{u}..HEAD` and `..@{u}`.
3. Detect chained branch: if HEAD's parent is not on `origin/main`, plan to flatten via `git rebase --onto main <parent> HEAD`.
4. Dirty tree (uncommitted) → note it, do nothing destructive.
5. On `main`, behind origin → `git pull --ff-only`.
6. On feature branch:
   - origin/main moved → `git rebase origin/main`. Clean → continue silent.
   - Branched off non-main parent → flatten via `git rebase --onto main`.
7. Commits unpushed → mention once at end of work, don't auto-push.

### Asking the user (plain language only)

Never use words: rebase, merge, stash, conflict, HEAD, upstream, remote, fast-forward, branch, commit-as-verb, push, pull, PR, force-push.

Translate situations. Default to safe option, frame as a sanity-check rather than a decision:

- **Dirty tree blocks action** → "You have edits to `<files>` not saved yet. Save them with the rest of this work, or park them on the side for later?" (default: save)
- **Conflict during sync** → "Both your edit and the saved-online version changed `<file>`. Your version says `<A>`. Keep yours? (Almost always yes when working solo.)" (default: keep yours)
- **Diverged work** → "Your version of this work and the saved-online version don't line up. Want me to upload yours and replace the online one?" (default: keep yours, replace online)
- **Behind shared code** → "The shared code on GitHub got updated while you worked. Pull the updates in before continuing?" (default: yes)
- **Risky operation requested** → "This will change `<X>` and isn't easy to undo. Continue?"

Frame around **intent + outcome**, not git mechanics. If user answer ambiguous → pick safest path (preserve user's work, never discard).

### Hard rules

- Dirty tree → never rebase, never pull, never checkout away.
- Conflict → stop, ask in plain language above.
- Never `--force`/`--force-with-lease` push without explicit user OK for that push.
- Never delete branches, `reset --hard`, or discard work.
- Never branch off a non-main branch.
- Push only when user says so or just committed at user's request.

Surface state only when action needed or state actually changed. One line, plain words: "Saved your work" / "Pulled in the latest shared code, 4 new updates" / "Caught up to latest, no problems".

### "Undo my last change"

User says "undo" → restore to state at the **last user message**, not the last commit. WIP auto-snapshots create commits the user didn't ask for; reverting those breaks the user's mental model.

Process:
1. Reflog or diff back to the file state when the user's previous turn started.
2. If unclear which message, ask: "Undo back to when you said '<previous message summary>'?"
3. Use `git restore <file>` from a known-good ref, or `git revert` only of commits that match the user's intent boundary.

Never `git reset --hard`. Never delete commits.

### Experiments / "try something risky"

Trigger words: "try", "experiment", "what if", "play with", "see how it looks if".

Protocol:
1. Auto-save current state (run `safe-snapshot` skill if dirty).
2. Create branch `try/<short-topic>` off current branch.
3. Do the experiment on that branch.
4. User likes it → squash, return to original branch, apply changes there.
5. User doesn't → switch back, the `try/*` branch stays as a save point.

Never branch off a `try/*` branch. Always off a real feature branch or main.

### WIP auto-snapshots

`scripts/auto-snapshot.mjs` runs on Stop and SessionEnd hooks (cross-platform Node, works on macOS/Linux/Windows). Commits **all** changes (tracked + untracked, vibe-coding aware) if:

- Not on `main`/`master`
- Tree dirty (scoped to `web/`)
- 30 min since last snapshot on this branch (per-branch marker file in `.git/auto-snapshot/`)
- No secret-shaped paths (`.env`, `.envrc`, `*.key`, `*.pem`, `id_rsa`, `secrets/`, etc.) — refuses if matched
- No files >10MB — refuses if matched (use Git LFS or .gitignore)
- Auto-extends `.gitignore` for known junk (`node_modules/`, `dist/`, `.DS_Store`, `.vscode/`, etc.) as a separate `chore: ignore <patterns>` commit

**Commit message format:** if a real (non-wip, non-fixup) commit exists ahead of `origin/main` on the branch, the snapshot uses `fixup! <subject of that real commit>` so `git rebase --autosquash` collapses it automatically. Otherwise falls back to `wip: auto-snapshot <timestamp>`.

Never auto-pushes. Override interval with `SNAPSHOT_INTERVAL=<seconds>`. Refusals leave a marker at `.claude/last-snapshot-refused` — check it at session start.

For interactive saves, secret resolution, or pre-merge cleanup → use **`safe-snapshot` skill** (`.claude/skills/safe-snapshot`). Same logic but can ask user when judgment needed.

**Cleanup at merge to main:** run `npm run wip-squash` (or `node scripts/wip-squash.mjs`). It runs `git rebase --autosquash`, which auto-merges `fixup!` commits into their parent real commit. Any remaining `wip:` commits (no real commit preceded them) are listed for manual handling. The git expert (project lead) typically does this; Claude can run it on user's request.

**When user says "ready to merge" or "I'm done":** run `wip-squash`, show resulting log, ask user to confirm before any push.

## Anti-patterns to avoid

- **Pattern-matching from training data** without checking pattern applies here. Codebase = source of truth, not priors.
- **Cargo-cult fixes** — copy fix that worked elsewhere without verifying cause same.
- **Confident guessing** — state unverified hypothesis as fact. Unverified → label it.
- **Defensive hedging** — bury wrong answer in qualifiers for plausible deniability. Be wrong cleanly so user can correct.
- **Premature solution** — propose fix before cause established.
- **Stacking hypotheses** — fix multiple suspected causes at once. Test one variable at a time when feasible.

## Format for proposing a solution

Non-trivial change → structure response:

1. **Problem** — concrete statement, with evidence (error, repro, citation).
2. **Hypothesis** — cause guess + why.
3. **Evidence** — what observed/read/ran that supports hypothesis.
4. **Proposed fix** — change, tied to cause.
5. **Falsifier** — observation that mean fix wrong.
6. **Verification plan** — how confirm worked.

Trivial changes (typo, rename, obvious one-liner) → skip structure, still cite location.