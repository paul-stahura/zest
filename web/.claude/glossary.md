# Project Glossary

User-facing terms for math/visual concepts. When user say term, this what mean. Update when new term appear.

## Math / ζ-related

### zeta spiral
Partial-sum viz of Riemann ζ. Each "link" add one term `n^(-s)` to running partial sum `Σ_{n=1}^{j} n^(-s)`. Spiral path trace cumulative sums in complex plane. Also: "partial sums display", "spiral".

### index
Fractional parameter drive viz. Integer part = N, count of partial-sum terms. Maps to imag coord `t` via `indexToImag(index)`. Riemann-Siegel: N = ⌊√(t/2π)⌋, so `index` ≈ that N. Also "the index", "spiral index". Code: `index` field in `SpiralWorkspaceLayer`.

### T / big-t
Synonym for `index`. User say "T" or "big-t" = spiral index (not imag coord `t`). Distinct from little-t.

### rank / R
Real-part driver. Parallel to `index`/`T` but for real axis: `R` maps to `σ` via r-function, mirror how `T` maps to `t` via i-function. Capital `R` = symbol; "rank" = spoken name. Avoid Σ-summation clash from "big-sigma".

### i-function
Convert `T` (index) to little-t (imag coord). Implemented as `indexToImag` in `src/shared/math/zetaEms.ts`.

### r-function
Convert `R` (rank) to little-sigma (real coord). Sigma-window remap used by sigma controls.

### link
One segment of spiral connecting `joints[j-1]` to `joints[j]`. Link j add term `j^(-s)` to partial sum.

### joint
Vertex on spiral — cumulative partial sum at integer step. `joints[j] = Σ_{n=1}^{j} n^(-s)`.

### bisector / bisector link
Middle link of spiral path. Link from `joints[middleIndex]` to `joints[middleIndex+1]` where `middleIndex = floor(index)`. "Bisector midpoint" = geometric center of this link.

### sigma (σ)
Real part of `s = σ + it`. Critical line σ = 0.5.

### t (or imag)
Imag part of `s = σ + it`. Computed from `index` via `indexToImag`.

### zeta endpoint / ζ(s)
Point in complex plane = value of ζ at current `s`. Visually, "destination" spiral approximate.

### inverse links
Portion of ZAK spiral past zeta endpoint, sum to `χ(s)·Σ n^(-(1-s))`. Built reverse to match functional-equation symmetry.

### remainder / remainder link
Single link for `R(s) = -½·(-1)^N · (I₁ + χ·I₂)`, high-order correction in Kuznetsov approx. Bridge forward partial sum to start of inverse extension.

## Methods

### EMS
Euler-Maclaurin summation. Classical zeta approx. See `src/shared/math/zetaEms.ts`.

### ZAK
Kuznetsov 2025 Gauss-quadrature approx. Faster + more accurate than EMS. See `src/shared/math/zakCalculator.ts`. Name from Unity predecessor; "Kushtinov" in old comments was misspell.

### chi / χ(s)
Factor in Riemann functional eq: `ζ(s) = χ(s)·ζ(1-s)`. On critical line `|χ(s)| = 1`.

## Champion search / |Z| record hunt

### resonance / resonant height
A height `t` where many primes' phases line up near zero at once, so the Euler-product terms reinforce instead of cancel → large `|ζ|`. This is what a champion *is*. The LLL candidate search's first filter is the **resonance screen**. Resonance is the *cause*; a high Euler product is the *effect*.

### Euler product proxy / EP / E₁₀₀₀₇
Truncated Euler product over primes up to a cutoff (`E₁₀₀₀₇` = up to prime 10007 ≈ `1e4`; also `E(1e5)`, `E(1e6)`). The "10007" is a cutoff *value*, not a count — it's the smallest prime past 10⁴ (10⁴ itself isn't prime), and there are π(10007)=1229 primes ≤ it. Same thing as `E(1e4)`. A no-|Z| magnitude estimate of `|ζ(½+it)|` — the measured *effect* of resonance, and the primary magnitude predictor in the detector. "Strongly resonant out to prime 10007" ⇔ "high E₁₀₀₀₇".

### anchoring
Resonance of just the *smallest* primes (≤7): `E(p≤7)/ceiling`, ceiling `= ∏_{p≤7}(1−p^{−1/2})^{−1} = 23.49`. Paul's validated small-prime tell — separates champions (median ≈0.84) from ordinary heights (≈0.04). Necessary, but does not *order* magnitudes among resonant heights.

### tail-growth / tail rising vs. falling
How the Euler product changes as you fold in each *next decade* of primes (the next 10×): the ratio `E(10^{k+1}) / E(10^k)`, e.g. `E(1e5)/E(1e4)`. **Rising (UP, >1):** the next decade keeps growing the product → the resonance is *sustained* into larger primes → champion signature (`|ζ|` keeps climbing toward its true value). **Falling (DOWN, <1):** the next decade shrinks it → `E₁₀₀₀₇` *overshot* (a small/mid-prime fluke the larger primes don't sustain) → near-miss / **overshoot** fingerprint, true `|ζ|` below the proxy. The decisive refinement after EP.

### bearing
Last-link origin angle (mod 180°) read at the nearby Gram point; ≈45° (≈47° empirically) flags champions. Hypersensitive — meaningful only at the Gram point, never the raw candidate height.

### Gram point
Height where the Riemann–Siegel theta phase is a multiple of π. The `|ζ|` peak in a candidate's neighbourhood sits at or just *below* the lower bracketing Gram point `g_n` (not at the candidate), so `|Z|` scans bracket `g_n…g_{n+1}` (and below).

### gap joints / caustics
Consistent vertical "gaps" in the joint-angle graph (validated across champions 2026-06-23). The joint-to-joint change in the folded angle is ≈ `t/n²`; where that hits a whole `2π·k` the dots pile onto a caustic curve, leaving a gap. Gap *k* is centred at link **n_k = √(t / 2πk) = N/√k** (N = √(t/2π) = bisector link), i.e. at graph-x **1/√k** — a champion-independent position. App toggle "highlight gap joints (blue)" marks the rightmost 9 (k=1…9; k=1 = bisector) as blue dots (spiral) / blue circles (angle graph). Reproduction: `~/Downloads/champion_joint_gaps.py`.

### sweep
Paul's term (2026-06-23) for **finding candidates**: the LLL/resonance candidate-generation pass over a height band (e.g. `overnight5_master.sh` over `[8e31,3.2e32]`), ranking by the no-|Z| detector. Cheap, laptop-side. Distinct from a [[scan]].

### scan
Paul's term (2026-06-23) for **computing |Z| for one candidate**: the distributed Hiary `O(t^{1/3})` evaluation over the candidate's Gram-interval window. Expensive (~3,451 CPU-h at t~10³²), so it runs on distributed compute rather than a laptop. One sweep produces many candidates; each promising candidate gets one scan.

## Visual / UI

### workspace
Top-level scene with own camera, layers, toolbox. Currently: `main-workspace`.

### layer
Viz module stack onto existing workspace scene. Share camera, coord space, pan/zoom with other layers. Usually derive from partial-sum geometry (joints, bisector, ζ endpoint). Own scene group, state, toolbox controls. Examples: `SpiralWorkspaceLayer`, `AxisWorkspaceLayer`. Future: yin/yang overlay, teardrop markers.

### workspace
Top-level tab. Own camera, scene, toolbox, serialized state. Independent of partial-sum spiral — may be unrelated investigation (zeros explorer, prime grid). Pan/zoom render shared via common controller. Currently: `main-workspace`.

### layer vs workspace (decision rule)
Derive from partial-sum data + share spiral coords → **layer**. Standalone investigation with own coord space + own controls + own tab → **workspace**.

### toolbox
Right-side panel of UI controls. Each layer contribute own sections via `getToolSections`.

### follow bisector
Camera mode pan + rotate view to track bisector link as index animate. Bisector stay centered, oriented horizontal.