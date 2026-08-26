---
name: create-layer
description: Plan a new layer (visualization stacked onto an existing workspace's scene) for the zest web project. Interviews user, drafts a development plan, spawns parallel subagents to explore implementation options, optionally runs experiments, and produces a final plan document. Use when the user wants to add a visualization that derives from an existing workspace's data (e.g., yin/yang overlay, teardrop markers on the spiral). Read `.Codex/glossary.md` and `AGENTS.md` first to ground terminology.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent
---

# /create-layer — Plan a new layer

A **layer** stacks onto an existing workspace's scene. Shares camera, coord space, and pan/zoom with other layers in that workspace. Typically reads from the host workspace's geometry (joints, bisector, ζ endpoint, etc.). For standalone investigations with their own tab, use `/create-workspace` instead.

## Pre-flight

Before interview, read these files:
- `AGENTS.md` — project conventions, including git branching workflow
- `.Codex/glossary.md` — project terminology (T/index, R/rank, layer, workspace, link, joint, bisector, etc.)
- `src/shared/visualization/contracts.ts` — toolbox + viz contracts
- `src/features/main-workspace/spiralWorkspaceLayer.ts` — full-featured layer reference (~533 lines)
- `src/features/main-workspace/axisWorkspaceLayer.ts` — minimal layer reference (~100 lines)
- `src/features/main-workspace/mainWorkspaceModel.ts` — how layers are composed by host workspace

## Phase 1 — Git + host workspace (self-managed, silent)

**Never ask user about branches.** User is not git-savvy. Per `.Codex/process.md` § Git workflow: handle silently when safe, never use git terminology with user.

Self-managed flow:
1. Determine host workspace from interview (Phase 2). Default `main-workspace` unless interview says otherwise. Do NOT mention branch state when asking.
2. After layer name is decided, silently create branch `chriscow/<host-workspace>-<layer-name>` off `main` and check it out.
3. If currently on a non-main feature branch with uncommitted work: per process.md rules, run `safe-snapshot` first. Then switch.
4. Never narrate branch operations to user. Defer all git mechanics to `.Codex/process.md`.

## Phase 2 — Interview

Be **terse**. Infer when possible. Ask only non-obvious questions. Make first guesses and ask user to confirm/correct.

Ask in this order:

### Identity + host
1. **What is this layer for?** (one sentence — purpose)
2. **Layer name?** Becomes class name (`<Name>WorkspaceLayer`) and filename. Suggest from purpose.
3. **Host workspace?** Confirm/select (default from Phase 1).

### Data dependency
4. **What does this layer read from the host?** Examples for main-workspace: joints array, bisector midpoint, ζ endpoint, current σ/T values, raw partial-sum geometry, imported point sets. Skill reads host's getter API and offers a list to pick from.
5. **Should it auto-rebuild when host parameters change, or only on demand?** (e.g., spiral rebuilds on every σ/index change. A heatmap might only rebuild on explicit user action.)

### Visual
6. **What is displayed?** Describe geometry — points, lines, mesh, sprites, glyphs.
7. **Default visibility?** On or off when first added.
8. **Toolbox section:** title + order. Skill suggests order based on existing values (5=anim, 6=core params, 8=zeta params, 20=overlays). Default 15 for new layers.

### Controls
9. **What controls does the layer expose?** Skill makes first guess (toggle/number/select/color). Confirm. Ask ranges + range-editability only for non-obvious numeric controls.

### Data (only if relevant)
10. **Does the layer generate exportable data?** If yes: CSV default, save to `data/scans/<host-workspace-id>/<layer-name>-<timestamp>.csv`.

### Performance (only if relevant from earlier answers)
11. **Roughly how many display elements at once?** Order of magnitude.
12. **Recompute cost?** Cheap (per-frame ok) or expensive (debounce/throttle/manual rebuild)?

### Animation (only if relevant)
13. **Does the layer animate independently of the host's animation?** Most layers piggyback on host's index/sigma changes — answer is usually "no, derives from host." Only ask further if user says yes.

### Rendering needs
14. Layer **always inherits** host workspace's renderer (shared 2D ortho). Confirm: layer does not need its own camera, scene, or controller.
15. If user wants something incompatible with host's renderer: flag as risk; layer may need to become a workspace instead.

## Phase 3 — Draft plan

Write a markdown plan summarizing the interview. Sections:
- **Purpose** — one sentence
- **Identity** — name, class name, filename, host workspace, branch
- **Data dependency** — what host data is read, rebuild trigger
- **Display** — what user sees
- **Controls** — each: kind, label, default, range, editable-range
- **Performance** — element count, recompute cost
- **Animation** — typically "inherits host"; flag if not
- **Rendering** — "inherits host" (default)
- **State persistence** — control values saved via host workspace's serialized state
- **Open questions / risks**

Show plan to user. **Wait for explicit positive acknowledgement** ("yes", "looks good", "ship it", etc.) before proceeding. If user wants edits, revise and re-show. Loop until ack.

## Phase 4 — Identify technical risks

From the approved plan, list distinct technical risks. Each risk = one area where implementation choice is non-obvious. Examples for layers:
- Rebuild trigger: rebuild on every host event vs throttle vs debounce vs manual
- Data sharing: how to read host geometry without coupling tightly (event listener? getter? snapshot?)
- Render perf: lots of small objects vs single batched mesh vs InstancedMesh
- Coord transform: layer-specific transform applied where (CPU pre-transform vs THREE matrix vs shader)

If zero non-obvious risks: skip to Phase 6 with single implementation note.

## Phase 5 — Spawn parallel subagents

For each identified risk, spawn one subagent (general-purpose) in parallel via the Agent tool.

Each subagent prompt should:
- State the layer context (1-2 sentences) + host workspace + the specific risk
- Reference relevant existing code (paths from `src/`)
- Ask agent to propose 2-3 implementation approaches with pros/cons, complexity, risk level
- Direct agent to write report to `/tmp/zest-create-layer-<timestamp>/risk-<n>-<topic>.md` (NOT in project)
- Tell agent: do not write code, do not modify project files

After all agents complete, read each report. Skill picks winning approach per risk:
- Simplicity (prefer reuse, prefer existing patterns)
- Coupling: layer should not modify host workspace's public API beyond adding new getters if essential
- Performance fit
- Risk level

Show user a decision summary: for each risk, chosen approach + 1-line rationale + path to subagent report.

## Phase 6 — Experiments (only if needed)

If a Phase 5 decision rests on unverified assumptions, write up to 1 round of TypeScript experiments.

- Scripts to `/tmp/zest-create-layer-<timestamp>/experiments/`
- Run via `npx tsx --tsconfig tsconfig.json <script.ts>`
- May import from project `src/` (read-only)
- Each experiment ends with printed numeric/binary conclusion

After 1 round:
- Clear results: update plan, proceed
- Inconclusive: ask user before more rounds

## Phase 7 — Final plan document

Write to `docs/plans/<host-workspace-id>-<layer-name>-plan.md` (project-tracked):

```markdown
# <Layer Name> — Implementation Plan

## Status
Approved <date>. Branch: `<branch-name>`. Host: `<host-workspace>`.

## Purpose
<one sentence>

## Identity
- Layer name: `<name>`
- Class name: `<Name>WorkspaceLayer`
- File: `src/features/<host-workspace>/<name>WorkspaceLayer.ts`
- Host workspace: `<host-workspace-id>`

## Data dependency
- Reads from host: <list>
- Rebuild trigger: <event / on-demand / animation-frame>

## Display
<what user sees>

## Controls
| ID | Kind | Label | Default | Range | Range editable | Notes |
|---|---|---|---|---|---|---|
...

## Performance
<element count, recompute cost>

## Animation
<usually "inherits host"; describe if independent>

## Rendering
Inherits host workspace's controller. <note any escalation>

## State persistence
List of fields to add to host workspace's serialized state schema.

## Implementation approach
For each risk in Phase 4:
- Risk
- Chosen approach
- Why
- Reference to subagent report

## Evidence
<from Phase 6 if run>

## Open questions

## Implementation steps
1. Create branch
2. Add file `src/features/<host>/<name>WorkspaceLayer.ts`
3. Update host workspace model: import, instantiate, add to `aggregateToolboxSections`, add to dispose
4. Update host's serialized state types + validation schema
5. Add tests
6. Manual verification checklist
```

## Phase 8 — Hand off

Tell user:
- Plan written to `docs/plans/<...>-plan.md`
- Branch info
- Temp dir cleanup note
- Implementation hint: "implement the plan in `docs/plans/<...>-plan.md`"

End skill.

## Rules

- **Never modify project code in this skill** — output is plan only.
- **Subagent reports + experiments → temp dir only.**
- **Plan doc → project (`docs/plans/`)** — tracked.
- **Defer git rules to AGENTS.md** — do not duplicate.
- **Layer inherits host renderer by default.** If user needs a different renderer, the answer may be "this should be a workspace, not a layer" — escalate to user.
- **Be terse.** Infer over asking.
- **Always require explicit user approval** before Phase 5.
- **Hard cap: 1 experiment round.** User must consent to more.
