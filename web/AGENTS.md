# AGENTS.md — web project

## What this is

Web port of Unity project. Visualize Riemann ζ function via partial-sum spirals on critical strip. Unity reference in parent dir (`../`) — see `../Assets/app/` for C# source. Port Unity → TypeScript/THREE.js incrementally. Unity codebase = source of truth for math, layout, features.

When unsure of behavior, check Unity source first. Filenames mirror (e.g., `SpiralCalculator.cs` → `spiralWorkspaceLayer.ts`).

## People and operating model

Chris and Paul are the only active users of this project. Paul is the scientist:
he drives the mathematical investigation, is not a traditional software
engineer, and works as a vibe coder. Protect his workflow.

Paul runs the web app the same way Chris does: local Vite via `npm run dev`.
Do not assume there is a broader public-user deployment path unless Chris says
so. Changes to local dev startup can directly disrupt Paul even when they look
like internal tooling.

## Architecture: layers vs workspaces

Two kinds of visualization modules:

- **layer** — stacks onto shared spiral scene. Reads partial-sum geometry (joints, bisector, ζ endpoint). Lives inside an existing workspace. Examples: yin/yang overlay, teardrop markers, axis grid. Composes with other layers in same scene + camera.
- **workspace** — own top-level tab. Own camera, own scene, own toolbox. Independent of partial-sum spiral. May be unrelated to spiral entirely (e.g., zeros explorer, prime grid). Pan/zoom rendering shared via common controller.

Decision rule: if it derives from partial-sum data and shares spiral coords → **layer**. If standalone investigation with own coordinate space and own controls → **workspace**.

Each viz = self-contained module:

1. Own scene state (THREE.Group, geometry, materials, lifecycle).
2. Expose `getToolSections(ctx)` returning toolbox controls (sliders, toggles, selects, actions). Host workspace aggregates via `aggregateToolboxSections`.
3. Provide setters/getters for own state so workspace model serialize it.

Viz own **its own UI**, including toggles for sub-features. Workspace model only orchestrate — no knowledge of viz knobs. Example: `src/features/main-workspace/spiralWorkspaceLayer.ts`.

New viz:
- Create layer class at `src/features/<workspace>/<name>WorkspaceLayer.ts`
- Implement `initialize`, `dispose`, `getToolSections`, state getters/setters
- Wire into workspace model beside existing layers
- Add top-level toggle (in workspace) for show/hide viz

## Math

Two ζ approximation methods:

- **EMS** (Euler-Maclaurin): classical, slow O(\|s\|), inaccurate at high t. Kept for comparison.
- **ZAK** (Kuznetsov 2025, arXiv:2503.09519): default. Fast, accurate ~10⁻¹⁰ on critical line. See `src/shared/math/zakCalculator.ts`.

`indexToImag(index, usePolyImag)` map spiral index param to imaginary part `t`. Shared between methods.

## Glossary

**Always read `.claude/glossary.md` at session start.** Defines project terms (e.g., "zeta spiral", "index"/`T`, "rank"/`R`, "link", "bisector", "i-function", "r-function").

**Prefer user's terms.** When concept has glossary entry, use that term over generic — e.g., "rank" not "real-part driver", "T" not "spiral index parameter", "bisector link" not "middle segment". Maximize shared understanding, cut translation overhead. Code identifiers may differ (e.g., `indexToImag`) — match existing code, but prose use glossary terms.

Update glossary when meeting or coining new terms.

## Tests

```bash
npx vitest run                # all unit tests
npx tsx --tsconfig tsconfig.json scripts/benchmark.ts   # accuracy + perf
```

Math changes must keep `src/shared/math/zakCalculator.test.ts` passing (mpmath-verified reference values).

## Setup (teammates)

Requires Node >= 20 (LTS) and Python 3 with `mpmath` (only needed for the benchmark/accuracy scripts). Cross-platform: works on macOS/Linux (`make setup`) and Windows (`npm run setup`).

```bash
make setup        # npm install + version checks
make dev          # vite dev server
make check        # lint + typecheck + test (CI gate)
```

`pip3 install --user mpmath` if benchmarks complain about missing mpmath.

All make targets: `make help`.

## Lint

ESLint config in `.eslintrc.cjs`. Rule set ported from `~/gladly/glados`, trimmed to Vite-applicable rules.

- `make lint` — error on any violation
- `make lint-fix` — auto-fix what's fixable
- Coefficient files (zakCalculator, zetaEms) have `no-loss-of-precision` disabled because literals come from published references with documentation digits beyond JS double precision.
- Custom rule `local-rules/import-extensions` forbids file extensions on local imports (Vite resolves them).

## Process
- MUST read [Process](./.claude/process.md) at session start. Defines the scientific approach required for every problem: hypothesize, run experiments, gather evidence, no hedging. Also defines git workflow for non-git-savvy teammates.

## Git / Snapshots
- Two of three teammates are not git-savvy. Never ask in git terms. See `.claude/process.md` § "Git workflow".
- Stop + SessionEnd hooks run `scripts/auto-snapshot.mjs` (cross-platform Node) — auto-commits WIP every 30 min as `fixup!` (or `wip:` fallback).
- For interactive saves before risky ops, use the **`safe-snapshot`** skill.
- Reconcile branch into main with `npm run wip-squash` (runs `git rebase --autosquash`).
- Check `.claude/last-snapshot-refused` at session start — if present, the last snapshot was refused (secrets / large file). Resolve with `safe-snapshot` skill.

## Typescript Standards
- MUST read [Code Standards](./.claude/code-standards.md) before writing code.
- MUST read [Testing](./.claude/testing.md) before writing tests.
