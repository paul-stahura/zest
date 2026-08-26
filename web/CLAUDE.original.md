# CLAUDE.md — web project

## What this is

Web port of a Unity project that visualizes the Riemann ζ function via partial-sum spirals on the critical strip. The Unity reference lives in the parent directory (`../`) — see `../Assets/app/` for the C# source. We port behavior from Unity → TypeScript/THREE.js incrementally; the Unity codebase is the source of truth for math correctness, visual layout, and feature definitions.

When in doubt about behavior, check the Unity source first. Filenames usually mirror (e.g., `SpiralCalculator.cs` → `spiralWorkspaceLayer.ts`).

## Architecture: visualizations host their own UI

Each visualization is a self-contained module that:

1. Owns its scene state (THREE.Group, geometry, materials, lifecycle).
2. Exposes a `getToolSections(ctx)` method returning the toolbox controls it needs (sliders, toggles, selects, actions). The host workspace aggregates sections via `aggregateToolboxSections`.
3. Provides setters/getters for its own state so the workspace model can serialize it.

A visualization is responsible for **its own UI**, including toggles to turn its sub-features on/off. The workspace model only orchestrates — it doesn't know what knobs each viz exposes. Existing example: `src/features/main-workspace/spiralWorkspaceLayer.ts`.

When adding a new visualization:
- Create a layer class under `src/features/<workspace>/<name>WorkspaceLayer.ts`
- Implement `initialize`, `dispose`, `getToolSections`, state getters/setters
- Wire it up in the workspace model alongside existing layers
- Add a top-level toggle (in the workspace) for showing/hiding the viz itself

## Math

Two ζ approximation methods exist:

- **EMS** (Euler-Maclaurin): classical, slow O(\|s\|), inaccurate at very high t. Kept for comparison.
- **ZAK** (Kuznetsov 2025, arXiv:2503.09519): default. Fast, accurate to ~10⁻¹⁰ on the critical line. See `src/shared/math/zakCalculator.ts`.

`indexToImag(index, usePolyImag)` maps the spiral index parameter to imaginary part `t`. Shared between methods.

## Glossary

**Always read `.claude/glossary.md` at session start.** It defines project-specific terms (e.g., "zeta spiral", "index"/`T`, "rank"/`R`, "link", "bisector", "i-function", "r-function").

**Prefer the user's terms when communicating.** When a concept has a glossary entry, use that term over generic alternatives — e.g., say "rank" not "real-part driver", "T" not "spiral index parameter", "bisector link" not "middle segment". This maximizes shared understanding and reduces translation overhead. Code identifiers may differ (e.g., `indexToImag`) — match existing code, but in prose use glossary terms.

Update glossary when encountering or coining new terms.

## Tests

```bash
npx vitest run                # all unit tests
npx tsx --tsconfig tsconfig.json scripts/benchmark.ts   # accuracy + perf
```

Math changes must keep `src/shared/math/zakCalculator.test.ts` passing (mpmath-verified reference values).

## Typescript Standards
- You MUST read [Code Standards](./.claude/code-standards.md) before writing any code.
- You MUST read [Testing](./.claude/testing.md) before writing any tests.