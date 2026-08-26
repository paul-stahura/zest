---
name: create-workspace
description: Plan a new workspace (top-level tab) for the zest web project. Interviews user, drafts a development plan, spawns parallel subagents to explore implementation options, optionally runs experiments, and produces a final plan document. Use when the user wants to add a new top-level visualization tab unrelated to the partial-sum spiral. Read `.claude/glossary.md` and `CLAUDE.md` first to ground terminology.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent
---

# /create-workspace — Plan a new workspace

A **workspace** is a top-level tab with its own camera, scene, toolbox, and serialized state. Independent of the partial-sum spiral. Use this skill when the user wants a standalone investigation (zeros explorer, prime grid, etc.). For visualizations layered onto an existing spiral scene, use `/create-layer` instead.

## Pre-flight

Before interview, read these files:
- `CLAUDE.md` — project conventions, including git branching workflow
- `.claude/glossary.md` — project terminology (T/index, R/rank, layer, workspace, etc.)
- `src/shared/visualization/contracts.ts` — workspace interface contract
- `src/features/main-workspace/mainWorkspaceModel.ts` — reference workspace implementation
- `src/features/placeholder-viz/placeholderModel.ts` — minimal workspace example

## Phase 1 — Git (self-managed, silent)

**Never ask user about branches.** User is not git-savvy. Per `.claude/process.md` § Git workflow: handle silently when safe, never use git terminology with user.

Self-managed flow:
1. After workspace ID is decided (Phase 2), silently create branch `chriscow/<workspace-id>` off `main` and check it out.
2. If currently on a non-main feature branch with uncommitted work or unpushed commits: per process.md, do not switch away. Pick branch from current state — assume user is continuing related work. If clearly unrelated, ask in plain language: "You have unsaved work on something else — finish that first, or save it aside and start the new workspace?" (default: save aside).
3. If on `main` and dirty: run `safe-snapshot` skill first.
4. Defer all git mechanics to `.claude/process.md`. Never narrate branch operations to user.

End user-visible message at most: "Started on a fresh branch for this." (only if user would otherwise notice — usually just stay silent).

## Phase 2 — Interview

Be **terse**. Infer when possible. Ask only non-obvious questions. Make first guesses and ask user to confirm/correct rather than asking open-ended questions when defaults are clear.

Ask in this order:

### Identity
1. **What is this workspace for?** (one sentence — purpose)
2. **Workspace ID and title?** ID becomes URL slug + filename prefix; title is tab label. Suggest reasonable defaults from purpose.

### Functionality
3. **What is displayed?** Describe geometry shown to user.
4. **What inputs drive it?** List parameters/controls. Skill makes first guess at control kinds (toggle/number/select/color/action). Confirm with user.
5. **For each numeric control, ask ranges only if non-obvious.** Also ask: should the range be user-editable (like sigma window) or fixed?

### Data (only ask if relevant)
6. **Will the workspace generate data the user wants to save?** If yes: assume CSV by default; ask only if other formats needed. Save to `data/scans/<workspace-id>/<name>-<timestamp>.csv`.
7. **Will the workspace combine multiple datasets visually?** If yes: ask how (toggle/blend/color-code/side-by-side) — implementation specific to this workspace.

### Performance (ask only if relevant from earlier answers)
8. **How many points displayed at once?** Order of magnitude: 1k / 100k / 1M / 10M+.
9. **Acceptable latency** — instant, <1s, few seconds, minutes ok? (only if computation is heavy)
10. **Will user move controls while computation runs?** (only if latency > instant)

### Animation (gated)
11. **Does anything animate over time?** If no, skip 12-15.
12. **What is the time variable?** T/index, R/rank, custom param, wall-clock.
13. **Need play/pause/speed/scrub controls?**
14. **Need camera tracking during animation?**
15. **Persist animation state across reload?** (Note: state always persists for resume per project default; this is about whether *anim is auto-running* on resume.)

### Rendering needs (only ask if hints from earlier suggest non-default)
16. **Likely defaults to 2D orthographic with shared pan/zoom controller.** Only ask further if interview revealed:
    - Polar/circular layout → may need non-Euclidean coord remap (still 2D ortho underneath, but custom coord transform)
    - >1M points → may need GPU instancing
    - Visual effects (glow, blur) → may need post-processing

If any hints triggered, confirm with one user-level question: "Will the layout be polar/circular?" or "Will you display more than ~1M points at once?" Map answers to technical implications later.

### State
17. **State always persists across sessions** (project default). Confirm what counts as state: control values, current view (pan/zoom), selections.

## Phase 3 — Draft plan

Write a markdown plan summarizing the interview. Sections:
- **Purpose** — one sentence
- **Identity** — ID, title, route path, branch name
- **Display** — what user sees
- **Controls** — each control: kind, label, default, range (if numeric), editable-range flag
- **Data flow** — inputs (files, controls) → outputs (display, exported files)
- **Performance expectations** — point counts, latency budget, interactivity
- **Animation** — variables, controls, camera tracking (or "none")
- **Rendering** — "shared 2D ortho" or specific escalation reason
- **State persistence** — what is saved
- **Open questions / risks** — anything user couldn't answer or that has technical uncertainty

Show plan to user. **Wait for explicit positive acknowledgement** ("yes", "looks good", "ship it", "approved", etc.) before proceeding. If user wants edits, revise and re-show. Loop until ack.

## Phase 4 — Identify technical risks

From the approved plan, list distinct technical risks. Each risk = one area where implementation choice is non-obvious. Examples:
- Performance: 1M-point rendering — instancing vs LOD vs viewport culling
- Coord space: polar layout — transform in shader vs CPU pre-transform
- Data combination: visual merge — overlay vs blend vs side-by-side
- Animation: variable-driven rebuild — debounce vs throttle vs frame-budget

If zero non-obvious risks: skip to Phase 6 with single straightforward implementation note.

## Phase 5 — Spawn parallel subagents

For each identified risk, spawn one subagent (general-purpose) in parallel via the Agent tool.

Each subagent prompt should:
- State the workspace context (1-2 sentences) and the specific risk
- Reference relevant existing code (paths from `src/`)
- Ask agent to propose 2-3 implementation approaches with pros/cons, complexity estimate, and risk level
- Direct agent to write report to `/tmp/zest-create-workspace-<timestamp>/risk-<n>-<topic>.md` (NOT in project)
- Tell agent: do not write code, do not modify project files

After all agents complete, read each report. Skill picks winning approach per risk based on:
- Simplicity (prefer reuse over new code)
- Project fit (matches existing patterns in `src/features/`)
- Risk level
- Performance fit for stated requirements

Show user a decision summary: for each risk, chosen approach + 1-line rationale + path to subagent report (in case user wants to read details).

## Phase 6 — Experiments (only if needed)

If after Phase 5 any decision rests on unverified assumptions (e.g., "GPU instancing should handle 2M points at 60fps — but unverified"), write up to 1 round of TypeScript experiments to gather evidence.

- Write scripts to `/tmp/zest-create-workspace-<timestamp>/experiments/`
- Use `npx tsx --tsconfig tsconfig.json <script.ts>` to run
- Scripts may import from project `src/` (read-only) but must not modify project
- Each experiment ends with printed numeric/binary conclusion

After 1 round:
- If results clear: update plan with evidence, proceed
- If results inconclusive: ask user "evidence still ambiguous — run more experiments [describe], or ship plan with flagged uncertainty?"
- Do not loop without user consent

## Phase 7 — Final plan document

Write the final plan to `docs/plans/<workspace-id>-plan.md` (project-tracked). Include:

```markdown
# <Workspace Title> — Implementation Plan

## Status
Approved <date>. Branch: `<branch-name>`.

## Purpose
<one sentence>

## Identity
- ID: `<id>`
- Title: `<title>`
- Route path: `/<id>`
- Files to create: <list>

## Display
<what user sees>

## Controls
| ID | Kind | Label | Default | Range | Range editable | Notes |
|---|---|---|---|---|---|---|
...

## Data flow
- Inputs: ...
- Outputs: ...
- Storage path: `data/scans/<id>/...` (if applicable)

## Performance
<points, latency, interactivity>

## Animation
<gated section, omit if none>

## Rendering
<shared controller / escalation>

## State persistence
<list of fields>

## Implementation approach
For each risk identified in Phase 4, list:
- Risk
- Chosen approach (one paragraph)
- Why (1-line rationale)
- Reference to subagent report path (in temp dir, will be deleted)

## Evidence (if Phase 6 ran)
<summary of experiment results>

## Open questions
<anything still unresolved>

## Implementation steps
High-level order of operations to build this. Not code — just sequence:
1. Create branch
2. Scaffold files (list)
3. Wire route
4. Implement <core piece>
5. Add controls to toolbox
6. Add tests
7. Manual verification checklist
```

## Phase 8 — Hand off

Tell user:
- Plan written to `docs/plans/<workspace-id>-plan.md`
- Branch ready (or instructions to create it)
- Subagent reports + experiments are in temp dir, will be cleaned up
- To implement: ask Claude in a new turn "implement the plan in `docs/plans/<workspace-id>-plan.md`"

End skill.

## Rules

- **Never modify project code in this skill** — output is plan only.
- **Subagent reports + experiments → temp dir only** — never in project.
- **Plan doc → project (`docs/plans/`)** — tracked.
- **Defer git rules to CLAUDE.md** — do not duplicate.
- **Be terse.** Infer over asking. User said: "don't burden user with details unless not clear."
- **Always require explicit user approval** before Phase 5.
- **Hard cap: 1 experiment round.** User must consent to more.
