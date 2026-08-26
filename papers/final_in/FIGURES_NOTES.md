# Figure notes — rewrite_v7

> **Document order.** In the compiled paper the figures appear as:
> Figure 1 = remainder-average curves (§4, `fig_remainder_average.py`);
> Figure 2 = fractional-summand spiral (§6, `fig1_spiral_summands.py`);
> Figure 3 = joint-region zoom (§6, `fig2_remainder_zoom.py`).
> The script filenames are descriptive, not numbered by document order.

## Remainder-average curves (document Figure 1)

**File:** `fig_remainder_average.py` → `figures/fig_remainder_average.pdf` (+ `.png`)
**Used in:** §4 "Decomposing the remainder", label `fig:remainder-average`,
illustrating that `R1ps + R2ps = R`.

Replicates Figure 1 of the earlier paper
`Riemann_zeta_function_remainders_and_other_observations_6`
(image `Screenshot 2025-07-11 at 10.10.58 PM.png`).

### What it shows
Three **complex-plane trajectories** (Argand plots), side by side, over a short
window (`sigma = 1/2`, `2 < T < 3`, so `m = floor(T) = 2`). As `T` sweeps, each
of `R1ps`, `R`, `R2ps` traces a spiral; they are drawn in one plane but shifted
along the real axis so the shapes can be compared:

- **Green (left)** — `R1ps - 1`  (complex shift left by 1)
- **Violet (centre)** — `(1/2) R`
- **Red (right)** — `R2ps + 1`  (complex shift right by 1)

The `-1` / `+1` are **complex** horizontal offsets (they move the whole spiral
left/right in the plane), *not* vertical offsets of a real-valued curve. Since
`R1ps + R2ps = R`, the centre spiral is the average of the outer two; and on the
critical line `d1 = d2`, so `|R1ps| = |R2ps|` and the green/red spirals are
mirror images.

### How the numbers are computed (exact, mpmath, dps=30)
For each `T`: `t = I(T)`, `s = sigma + i t`, `Sigma1`, `Sigma2 = chi*sum`,
`zeta = mp.zeta(s)`, `R = zeta - Sigma1 - Sigma2`; then solve
`R = d1 e^{-i w} + d2 e^{i(w+psi)}` (`w = t ln(m+1)`, `psi = arg chi`) by Cramer
for real `d1,d2`, giving `R1ps = d1 e^{-i w}`, `R2ps = d2 e^{i(w+psi)}`.
Reuses `chi`, `I_of_T`, `OUTDIR` from `fig1_spiral_summands.py`.

### Sanity check printed by the script
- `max |R1ps + R2ps - R| ≈ 1.9e-29` across the window ✓
- `|R1ps|` and `|R2ps|` both range over `[0.172, 0.555]` (identical, as required
  by `d1 = d2` on the critical line).

### Regenerate / edit
Edit the `PARAMETERS` block (`SIGMA`, `T_MIN/T_MAX`, `N`, `SHIFT`, colors) at the
top of `fig_remainder_average.py`, then:

    python3 fig_remainder_average.py

Requires: `python3`, `mpmath`, `numpy`, `matplotlib`.

## Figure 1 — Fractional-summand picture (spiral)

**File:** `fig1_spiral_summands.py` → `figures/fig1_spiral_summands.pdf` (+ `.png`)
**Used in:** §6 "Summands as links and joints", label `fig:spiral-summands`,
illustrating the four pieces of eq. (24) `\eqref{eq:zeta-clean}`.

### What it shows
Spiral (Euler-like) representation of

    zeta(s) = Sigma1 + R1ps + Sigma2 + R2ps

in the complex plane, for `s = sigma + i t`, `sigma = 0.5`, `T ≈ 6.18`,
`t = I(T) ≈ 279.85`, `m = floor(T) = 6`.

- **Blue** — leg 1: partial-sum spiral `Sigma1 = sum_{n=1..m} n^{-s}`, drawn as
  cumulative links from the origin `O` to `Sigma1`.
- **Red** — `R1ps = d1 e^{-i w}` (`w = omega = t ln(m+1)`), a short segment
  lying along the (m+1)st link direction, reaching the bisector point
  `B1 = Sigma1 + R1ps`.
- **Green** — leg 2: partial-sum spiral `Sigma2 = chi(s) sum_{n=1..m} n^{s-1}`,
  laid tip-to-tail starting at `B1`.
- **Orange** — `R2ps = d2 e^{i(w + arg chi)}`, the fractional link closing onto
  `zeta(s)`.
- **Dashed** vectors: the *full* (m+1)st summand of each leg, so R1ps / R2ps are
  visibly a shortened ("fractional") version of it.
- **Thin faint blue underlay** (lw 0.6, 50% opacity, lowest zorder): the entire
  sum-1 chain continued past `m` out to link `floor(I(T)/pi) = 89`, winding
  into its spiral near `zeta`.
- **Dotted grey**: the two leg chords `O → B1` and `B1 → zeta`.

### How the numbers are computed (exact, mpmath, dps=50)
1. `chi(s) = 2^s pi^{s-1} sin(pi s/2) Gamma(1-s)` (functional-equation factor).
2. `Sigma1`, `Sigma2` by direct summation; `zeta = mp.zeta(s)`.
3. `R = zeta - Sigma1 - Sigma2` (Siegel remainder).
4. Decompose `R = d1 e^{-i w} + d2 e^{i(w+psi)}`, `psi = arg chi`, by solving the
   2×2 real linear system (Cramer). Cross-checked against the closed-form sine
   expressions `d1,d2 = |R| sin(...)/sin(2w+psi)` — they agree.

### Sanity checks printed by the script (current parameters)
- `|chi| = 1` (critical line) ✓
- `d1 = d2 = 0.0874976...` (critical-line corollary d1=d2) ✓
- reconstruction error `|Sigma1+R1ps+Sigma2+R2ps - zeta| = 0` ✓

### Regenerate / edit
Edit the `PARAMETERS` block at the top of `fig1_spiral_summands.py`
(`SIGMA`, `T_INDEX`, `M`; set `USE_I_OF_T=False` and `T_EXPLICIT` to pin `t`
directly), then:

    python3 fig1_spiral_summands.py

Requires: `python3`, `mpmath`, `numpy`, `matplotlib`.

## Full spirals, two panels (document Figure 9)

**File:** `fig_full_spirals.py` → `figures/fig_full_spirals.pdf` (+ `.png`)
**Used in:** §9 intro (full-page float `[p]` on the page right after the
`eq:LN` paragraph, followed by the last-spiral zoom page, then
`\clearpage` so §9.1 starts fresh), label `fig:full-spirals`.

### What it shows
Vertically stacked panels (2 x 1, 8.8 x 13.8 in) of BOTH chains drawn at
length at `T = 14.3085` (`t = I(T) ≈ 1377.33`, `m = 14`): **top**
`sigma = 1/2`, **bottom** `sigma = 0.673`. Forward chain (blue) from the origin winding into a spiral
near `zeta`; reverse chain (green) from `zeta` winding into spirals near the
forward chain's joints. Each chain is drawn out to link `floor(I(T)/pi) = 438`
(the link nearest its spiral center), i.e. **439 links per spiral**,
independent of sigma. Labeled in each panel: `O`, `zeta` (with coordinate),
the bisector point `B1 = Sigma1 + R1ps` (red), and `zeta/2` (open circle,
arrowed label). A dotted gold **bisector line** through `B1` and `zeta/2`
(via `ax.axline`) is the symmetry axis of the whole configuration on the top
panel; the symmetry is lost on the bottom.

### Sanity checks printed by the script
- left:  `d1 = d2 = 0.0740610` (critical line), `|R1ps+R2ps-R| ≈ 2e-52`
- right: `d1 = 0.0470821`, `d2 = 0.0458432`, `|R1ps+R2ps-R| ≈ 4e-52`

### Regenerate / edit
Edit `SIGMA_L`, `SIGMA_R`, `T_INDEX` at the top, then:

    python3 fig_full_spirals.py

Imports `I_of_T`, `chi`, `C`, `xy`, `OUTDIR` from `fig1_spiral_summands.py`.

## Zoom on the last spiral at zeta (document Figure 10)

**File:** `fig_last_spiral_zoom.py` → `figures/fig_last_spiral_zoom.pdf` (+ `.png`)
**Used in:** §9 intro, full-page float `[p]` right after the full-spirals
figure, label `fig:last-spiral-zoom`.

### What it shows
3 x 2 panel set (full page), all windows centered on `zeta`, zooming in
progressively at `T = 41.73` (`t = I(T) ≈ 11204.74`), `sigma = 1/2`,
`zeta ≈ -4.796 - 7.853i`. Panels are referred to as 1..6, left to right
starting at the top (no on-figure labels); window half-widths are the
`HALF_WIDTHS` tuple: `(0.135, 0.012, 0.006, 0.002, 0.002/3, 0.002/12)`.
The chain carries `floor(I(T)/pi) + 1 = 3567` links; the **last link,
number 3566** (eq. LN with `S_n = 0`), is drawn as a thicker black line
in every panel, with a "link number 3566" arrow. `zeta` is a small
purple dot labeled with its value.

Near the spiral center each link turns by ~pi, so links sweep back and
forth across `zeta`: joints settle onto a ring of radius ~ half a link
length (link length `3567^{-1/2} ≈ 0.0167`, ring radius `≈ 0.0084`).
Panels 1-3 show the dense annulus, panels 4-5 the lens-shaped clearing
enveloped by the near-diameter links, and panel 6 shows that `zeta` is
NOT on the last link (the last link is only the link closest to it).

### Styling
No grid lines; exactly two tick labels per axis, placed 1/4 in from
each edge (`center ± half_width/2`), plain decimal formatting (no
matplotlib offset notation), decimals adapted to the window size.

### Regenerate / edit
Edit `SIGMA`, `T_INDEX`, `HALF_WIDTHS` at the top, then:

    python3 fig_last_spiral_zoom.py

Imports `I_of_T`, `C`, `xy`, `OUTDIR` from `fig1_spiral_summands.py`.

## Neighboring links in the bisector frame (document Figure 16)

**File:** `fig_bisector_frame.py` → `figures/fig_bisector_frame.pdf` (+ `.png`)
**Used in:** §9.4 (origin of I(T)), full-page float `[p]` right after the
paragraph ending "...with its own two neighbors", label
`fig:bisector-frame`.

### What it shows
4 x 4 = 16 small panels, `T = linspace(4, 5, 16)` (upper left `T = 4`,
lower right `T = 5`, row-major), `sigma = 1/2`.  Each panel is drawn in
the bisector frame: `z -> (z - J4)/(J5 - J4)` so the bisector link
(link `m = 4` of the forward chain) lies on the real axis from 0 to 1
(black).  Link 3 (GREEN) attaches at the origin (joint 4), link 5 (RED)
at 1 (joint 5); all lengths relative to the unit bisector link.  Each
neighbor revolves ~twice per unit of T.  At `T = 4` the green link is
folded onto the bisector link (angle `9 pi`); at `T = 5` the red one
(angle `11 pi`) -- the handoff instants.  Each neighbor carries a dotted
motion arrow in its own color: the true arc of the link's midpoint from
this panel's T to the next panel's T (arrowhead at the destination; no
arrows in the last panel).  A black dot on the bisector link marks the
bisector point at the fraction `ceil(T)^sigma d1` (d1 computed exactly
via zeta + Cramer, m = 4 held fixed for the whole sweep).  Panel 1 is
labeled "Start / bisector point simultaneously on links 3 and 4",
panel 16 "End / ... on links 4 and 5".  No ticks/numbers on panel
edges; a small `T = ...` label inside each panel.

### Regenerate / edit
Edit `SIGMA`, `M`, `N_PANELS` at the top, then:

    python3 fig_bisector_frame.py

Imports `I_of_T`, `C`, `OUTDIR` from `fig1_spiral_summands.py`.

## The two legs, two panels (document Figure 11)

**File:** `fig_legs.py` → `figures/fig_legs.pdf` (+ `.png`)
**Used in:** §9.2 (Legs), placed `[H]` after the paragraph ending "legs are
then (usually) unequal", label `fig:legs`.

### What it shows
Identical to document Figure 9 (it imports `compute()` and `draw_panel()`
from `fig_full_spirals.py`), plus the two **legs** drawn on top as thick
dark-yellow (`#b8860b`) segments: `O → B1` (bisector point) and `B1 → zeta`.
Left panel `sigma = 1/2`: equal legs `|B1| = |zeta - B1| ≈ 3.5773` (isosceles
triangle over the base `O → zeta`, dotted bisector line as symmetry axis).
Right panel `sigma = 0.673`: unequal legs `≈ 2.8990` and `≈ 1.7970`.
Both panels mark the angles of §9.2: `theta1` at `O` (arc from the positive
real axis to Leg 1, with a short solid axis stub) and `theta2` at the
bisector point (arc from the dashed extension of Leg 1 to Leg 2). Arc radius
is `0.20 * min(|leg1|, |leg2|)`; labels sit at the mid-angle.

### Regenerate / edit
Panels/parameters follow `fig_full_spirals.py` (`SIGMA_L`, `SIGMA_R`,
`T_INDEX`); edit there, then:

    python3 fig_legs.py

## Equal-leg strips (document Figure 12)

**File:** `fig_equal_legs_strips.py` → `figures/fig_equal_legs_strips.pdf` (+ `.png`)
**Used in:** §9.2 after the "Consequences for zeta zeros" paragraph, full-page
float `[p]`, label `fig:equal-legs-strips`.

### What it shows
Four vertical strips of the critical strip (`0 <= sigma <= 1`, index `T`
vertical): windows `[2,3]`, `[3,4]`, `[4,5]`, `[5,6]`. In each: the critical
line at `sigma = 1/2` (blue), the zeta zeros (black dots, index
coords), and the equal-leg points `L1 = L2` (blue dots), where
`|B1| = |zeta - B1|`, `B1 = Sigma1 + R1ps`.

### Data
- Zeros: `Assets/Resources/CriticalStripPoints/00 Zeta Zeros.csv` (index coords).
- Equal legs: `Assets/Resources/CriticalStripPoints/10 Zps Equal Leg Lengths
  [1-20].csv`. **Not** `90 R Equal Legs.csv` --- that set measures the legs
  through the midpoint `Sigma1 + R/2` (verified numerically), which is a
  different locus. The script validates sampled CSV rows against an mpmath
  recomputation of `L1 - L2` (worst ~4e-6) and aborts on mismatch.
- The sparse strip `2..3` is real: for most `T` there, `L1 - L2 > 0` for all
  `sigma > 1/2` (checked directly), so the off-line locus only appears in
  narrow bands (near `T ≈ 2.26` and `2.76`).

### Regenerate / edit
Edit `STRIPS` or the CSV paths at the top, then:

    python3 fig_equal_legs_strips.py

## Folded-leg strips, theta2 = pi (document Figure 13)

**File:** `fig_theta2_strips.py` → `figures/fig_theta2_strips.pdf` (+ `.png`)
**Used in:** §9.2 right after the equal-leg strips, full-page float `[p]`,
label `fig:theta2-strips`.

### What it shows
Same four strips as the equal-leg figure (`0 <= sigma <= 1`, `T` in `[2,3]..[5,6]`),
critical line (blue) and zeta zeros (black), plus the **folded-leg
points** (red): `theta2 = pi`, where Leg 2 (`zeta - B1`) folds back onto
Leg 1 (`B1`). Zeros = crossings of the red locus with the critical line
(there `L1 = L2` holds automatically).

### Data
- Zeros: `00 Zeta Zeros.csv`; folded legs: `12 Zps Leg Angle = PI [1-20].csv`
  (sigma on a 0.025 grid). Validation recomputes
  `theta2 = arg((zeta-B1)/B1)` with mpmath at sampled rows
  (worst ~7e-3 from the coarse sigma grid) and aborts on mismatch.

### Regenerate / edit
    python3 fig_theta2_strips.py

## Combined strips, overlay (document Figure 14)

**File:** `fig_combined_strips.py` → `figures/fig_combined_strips.pdf` (+ `.png`)
**Used in:** §9.2 right after the folded-leg strips, full-page float `[p]`,
label `fig:combined-strips`.

### What it shows
Overlay of the equal-leg and folded-leg strip figures: equal-leg locus
`L1 = L2` (blue), folded-leg locus `theta2 = pi` (red), critical line
(blue), zeta zeros (black). Zeros occur exactly where red meets
blue; on the critical line blue is the whole line, and off it red and blue
interleave without touching (a crossing off the line would violate RH).

### Data / regenerate
Reuses the CSVs and helpers of `fig_equal_legs_strips.py` and
`fig_theta2_strips.py` (validations live there). Then:

    python3 fig_combined_strips.py

## Pole-height / strip-line magnifications (document Figure 15)

**File:** `fig_pole_heights_zoom.py` → `figures/fig_pole_heights_zoom.pdf` (+ `.png`)
**Used in:** §9.3 "The strip lines at ≈0.25 and ≈0.75 are not flat",
label `fig:pole-heights-zoom`.

### What it shows
Two side-by-side magnifications of the critical strip in the same style as
Figure 14 (equal legs blue, folded legs red, critical line blue, zeros
black). Loci are recomputed at N=100 values of sigma (not the coarse Zest
CSVs). Left: `2.75 ≤ T ≤ 2.76`. Right: `5.25 ≤ T ≤ 5.26`. A dashed
horizontal guide marks `floor(T) ± 1/4` at the bottom of each window;
both strip lines sit just above the guide and bow slightly across sigma
(more visibly at 2.75; flatter at 5.25).

### Regenerate / edit
Edit `WINDOWS` `(T_lo, T_hi)` and `N_SIGMA` at the top. Full locus
recompute (several minutes), or axis-only replot from the cached
`figures/fig_pole_heights_zoom_data.npz`:

    python3 fig_pole_heights_zoom.py
    python3 fig_pole_heights_zoom.py --plot-only

## PS / AK / R/2 legs and angles (document Figure 16)

**File:** `fig_ps_ak_r2_legs_angles.py` → `figures/fig_ps_ak_r2_legs_angles.pdf` (+ `.png`)
**Used in:** §9.4 "PS, AK and R/2 Legs and Angles", full-page float `[p]`,
label `fig:ps-ak-r2`.

### What it shows
Side-by-side magnification of the critical strip for `4.65 ≤ T ≤ 4.80`.

Left (equal legs `L1 = L2`):
- blue: PS, `B1 = Sigma1 + R1ps`
- green: AK, `B1 = Sigma1 + R1ak`
- purple: R/2, `B1 = Sigma1 + (R1ak + R2ak)/2`

Right (folded legs `theta2 = pi`):
- red: PS (Zest CSV)
- orange: AK (recomputed; `B1 = Sigma1 + R1ak`)
- hollow purple: R/2 (recomputed; `B1 = Sigma1 + (R1ak+R2ak)/2`)

Critical line blue vertical; zeta zeros black. Nesting order of the
equal-leg ovals is not fixed. Folded curves on the right use the paper
definition `theta2 = arg((zeta-B1)/B1)`. The Zest file
`04 Zak Leg Angle = PI` is **not** used for orange: it tracks the
angle-0 collinear locus, not `theta2 = pi`.

### Data / regenerate
Equal-leg CSVs: `10 Zps Equal Leg Lengths [1-20].csv`,
`91 Rak Equal Legs.csv`, `90 R Equal Legs.csv`.
PS folded CSV: `12 Zps Leg Angle = PI [1-20].csv`.
AK and R/2 folded loci recomputed via Kuznetsov's `I1` (~5 min):

    python3 fig_ps_ak_r2_legs_angles.py
    python3 fig_ps_ak_r2_legs_angles.py --plot-only

## PS / AK / R/2 oval near T = 9.441 (document Figure 17)

**File:** same script → `figures/fig_ps_ak_r2_oval_9441.pdf` (+ `.png`)
**Used in:** §9.4 after Figure 16, full-page float `[p]`,
label `fig:ps-ak-r2-oval-9441`.

### What it shows
Same layout and colors as Figure 16, windowed to
`9.415 ≤ T ≤ 9.465`: two neighboring PS equal-leg ovals (around
`T ≈ 9.431` and `T ≈ 9.451`) with a gap between them. The zero at
`T ≈ 9.440` sits in that gap, not inside either oval. (An earlier
clustering that merged the two ovals via the critical line incorrectly
called this “one oval enclosing three zeros.”)

### Data / regenerate

    python3 fig_ps_ak_r2_legs_angles.py \
        --out fig_ps_ak_r2_oval_9441 --t-lo 9.415 --t-hi 9.465
    python3 fig_ps_ak_r2_legs_angles.py \
        --out fig_ps_ak_r2_oval_9441 --t-lo 9.415 --t-hi 9.465 --plot-only

## d1 on the critical line (document Figure 5)

**File:** `fig_d1_critical.py` → `figures/fig_d1_critical.pdf` (+ `.png`)
**Used in:** §8 "The positive real function d1", `[H]` right after "…a
pleasant consequence of the decomposition, not its motivation."
Label `fig:d1-critical`.

### What it shows
Two panels, shared T axis (`1 <= T <= 7`, sigma = 1/2 where `d1 = d2`).
- Top: `d1(1/2, T)`. One oscillation per unit of `T`; jump discontinuities
  at integer `T` (where `m = floor(T)` increments and the fractional
  summands hand off to the next link); amplitude decays slowly with `T`.
  Range e.g. `[0.17, 0.56]` on `[1,2)` down to `[0.09, 0.29]` on `[6,7)`.
- Bottom: the normalized distance from joint `ceil(T)^sigma * d1`
  (= `sqrt(ceil(T)) d1` at sigma = 1/2), replicating Figure 8 of the earlier
  paper (whose |R| sin(...)/sin(...) expression is exactly d1) but only for
  sigma = 1/2. Normalization by the link length `ceil(T)^{-sigma}` makes the
  curve nearly periodic: every unit interval sweeps `~[0.23, 0.78]`, and the
  integer-T jumps almost vanish.
Each unit interval is sampled (600 pts) and drawn separately so the jumps
are not bridged.

### Regenerate / edit
Edit `T_MIN/T_MAX/SAMPLES_PER_UNIT` at the top, then:

    python3 fig_d1_critical.py

## Exactly continuous coordinates h and p (document Figure 6)

**File:** `fig_h_p_continuous.py` → `figures/fig_h_p_continuous.pdf` (+ `.png`)
**Used in:** §8 "The positive real function d1", `[H]` at the end of the
"Removing the jumps exactly" paragraph (right after `fig:d1-critical`,
before the "Approximation of d1 when sigma = 1/2" paragraph).
Label `fig:h-p-continuous`.

### What it shows
One panel, `1 <= T <= 7`, sigma = 1/2, two curves:
- **Blue** `h(T) = sum_{k=2}^{floor(T)} (-1)^k k^{-sigma}
  + (-1)^{floor(T)+1} d1(T)`: the bisector point's position along the folded
  chain in a fixed unit (the first link). Exactly continuous at integer `T`
  (the fold relation `d1+ = n^{-sigma} - d1-` is exact) --- only kinks, no
  jumps --- but it flattens toward `1 - eta(1/2) ≈ 0.3951` (dashed line;
  eta = Dirichlet eta, `mp.altzeta`), swing `~0.40` on `[1,2)` down to
  `~0.24` by `[6,7)`.
- **Red** `p(T) = T^sigma (h(T) - (1 - eta(sigma)))`: same coordinate
  re-zoomed *smoothly* by `T^sigma` (not the step function `ceil(T)^sigma`,
  which is what caused the residual jumps in the d1 figure's bottom panel).
  Equally continuous, but the amplitude holds steady (`~0.53` peak to peak).
  Computed via the equivalent simplified *local* form (the partial sum in h
  cancels the head of `1 - eta`, leaving the alternating tail):
  `p(T) = (-1)^{floor(T)+1} T^sigma (d1(T) - Phi(-1, sigma, floor(T)+1))`,
  `Phi` = Lerch transcendent (`mp.lerchphi`); the tail is ~half the
  bisector-link length, so `p ~ (-1)^{floor(T)+1}(ceil(T)^sigma d1 - 1/2)`.
The figure sits right after the `p` definition; the derivations (Lerch
form, half-link asymptotic, and the exact-phase closed form for d1, eq.
d1-rs) follow it under the paragraph "Approximation of d1 when
sigma = 1/2". The critical-line tangent waveform
`p(T) ~ (-1)^{floor(T)} (1/2) tan(2 pi q) tan(2 pi (q-1/4)(q-3/4))` is no
longer in the paper (removed with the "universal shape" paragraph) and is
NOT drawn in the figure, but `p_tangent()` remains in the script.
Its Fourier series is pure odd cosines: `sum_{k odd} a_k cos(pi k T)`,
`a_1 = 0.2722, a_3 = -0.0750, a_5 = -0.0348, a_7 = -0.0254, ...`.
SAMPLES_PER_UNIT = 601 (not 600) so the grid never lands exactly on
q = 1/4, 3/4, where floats would evaluate the tangent pole*zero limit as 0.

### Sanity checks printed by the script
- Continuity at each integer `n = 2..6`: `h` and `p` evaluated at `n -+ 1e-6`
  differ by `~1e-7` (slope times offset), i.e. no jump.
- The local form of `p` agrees with `T^sigma (h - (1-eta))` to `~2e-16`
  (asserted).

### Regenerate / edit
Imports `d1_critical` from `fig_d1_critical.py`; edit `T_MIN/T_MAX` at the
top, then:

    python3 fig_h_p_continuous.py

## Closed form for d1, RS exact phases (document Figure 7)

**File:** `fig_d1_rs_phases.py` → `figures/fig_d1_rs_phases.pdf` (+ `.png`)
**Used in:** §8 "The positive real function d1", `[H]` right after eq.
`\eqref{eq:d1-rs}` is derived, closing the section. Label
`fig:d1-rs-phases`.

### What it shows
Two panels, `1 <= T <= 7`, sigma = 1/2. Top: exact `d1` (blue) vs the
closed form eq. `\eqref{eq:d1-rs}` (black dashed), visually
indistinguishable. Bottom: log-scale |error| of the closed form.

The derivation keeps `t = I(T)` exact throughout (nothing is expanded):
`z = sqrt(t/2pi)`, `N = floor(z)`, `p^ = z-N`, `w = t ln(m+1)`, and on the
line `chi = e^{-2 i theta}` so `d1 = e^{i theta} R / (2 cos(w - theta))`
exactly; the RS first term substitutes for `e^{i theta} R`:

    d1 ~ [N=m+1](m+1)^{-1/2}
         + (-1)^{N-1} (2pi/t)^{1/4}
           cos(2pi(p^2 - p^ - 1/16)) / (2 cos(2pi p^) cos(w - theta)).

The Iverson bracket adds one full link length when the RS main sum has one
more summand pair than Sigma1/Sigma2 (roughly frac(T) > 1/2). theta uses
the elementary asymptotic `t/2 ln(t/2pi) - t/2 - pi/8 + 1/(48t)`; the
script checks it against `mp.siegeltheta` (agree to ~4e-7). Max error:
0.006 on [1,2), 0.002 on [3,4), 0.0009 on [6,7), 0.0002 on [20,21) --
decaying like `T^{-3/2}`, flat in q. Remaining error is the RS truncation
`O(t^{-3/4})`. (History: an earlier tangent-based d1 closed form, its
figure `fig_d1_closed_form.py`, and a "universal shape" paragraph that
expanded `I(T) = 2 pi (T^2+T+1/6) + O(1/T)` into a period-2 tangent
waveform for p -- `p ~ (-1)^floor(T) (1/2) tan(2 pi q) tan(2 pi
(q-1/4)(q-3/4))`, Fourier cosines `a_1 = 0.2722, a_3 = -0.0750, ...` --
were removed when the section was restructured to keep I(T) exact from
the start.)

### Regenerate / edit
Imports `d1_critical` from `fig_d1_critical.py`; edit `T_MIN/T_MAX` at the
top, then:

    python3 fig_d1_rs_phases.py

## d1 and d2 across the strip (document Figure 8)

**File:** `fig_d1_d2_general_sigma.py` → `figures/fig_d1_d2_general_sigma.pdf` (+ `.png`)
**Used in:** the §8 paragraph "Approximation of d1 and d2 when 0 < sigma < 1", `[H]` at
the end of the section. Label `fig:d1-d2-general`.

### What it shows
Two panels (sigma = 0.3 top, sigma = 0.7 bottom), `1 <= T <= 7`: exact
`d1` (red, the R1ps color) and `d2` (green, the leg-2 color) against the
general-sigma first-term approximation (dashed, same color as its exact
counterpart), eq. `\eqref{eq:R-general}`:

    R(s) ~ (-1)^{N-1} (C0(p^)/2) [ a^{-sigma} e^{-i th~}
                                   + chi(s) a^{sigma-1} e^{+i th~} ],

`a = sqrt(t/2pi)`, `t = I(T)` exact, `N = floor(a)`, `p^ = a - N`,
`th~ = t/2 ln(t/2pi) - t/2 - pi/8`; plus the extra summand pair
`(m+1)^{-s} + chi (m+1)^{s-1}` when `N = m+1`; then the Cramer solve with
exact `w`, `psi = arg chi` gives d1 AND d2 -- no zeta input.  At
sigma = 1/2 it reduces exactly to eq. d1-rs (verified digit for digit).

Axes are pinned to `x in [1,7]`, `y in (0, 0.7)`; the figure is 2-panel
portrait (8.6 x 9.1 in).
The narrow spikes that leave the frame near frac(T) ~ 1/4, 3/4 are the
genuine off-line poles of d1/d2 (parallel links); the approximation
smooths through them, so the error is locally large there.  Away from
those windows (validated in the script): max err ~0.034 (d1) / 0.031 (d2)
at sigma 0.3, ~0.024 / 0.027 at sigma 0.7, over [1,7).  Error decays like
`T^{-sigma-1}` absolute, `O(1/T)` relative, uniformly in sigma.
SAMPLES_PER_UNIT = 301 (never lands on q = 1/4, 3/4 exactly).

### Regenerate / edit
Edit `SIGMAS` / `T_MIN/T_MAX` / `YLIM` at the top, then:

    python3 fig_d1_d2_general_sigma.py

## Kuznetsov comparison (document Figure 4)

**File:** `fig4_kuznetsov_zoom.py` → `figures/fig4_kuznetsov_zoom.pdf` (+ `.png`)
**Used in:** §7 "Other remainders: Kuznetsov", label `fig:kuznetsov-zoom`.

### What it shows
A replica of the joint-region zoom (same window as `fig2_remainder_zoom.py`)
that overlays Kuznetsov's approximate half-remainders on the exact ones:

- **Red** `R1ps`, **orange** `R2ps` (solid) — exact fractional summands,
  bending to one side of the resultant.
- **Purple** — the straight resultant `R = R1ps + R2ps` (no brace / no "R"
  label, per request).
- **Orange dashed** — `R1ak` then `R2ak` (both orange), a second route from
  `Sigma1` to the same endpoint, bending to the other side.
- Faint blue/green context legs, the two crossing links with `link m in sum1`
  / `link m in sum2` labels, and the `joint m` / `joint m+1` callouts, all as
  in Figure 3.

### Kuznetsov remainders (arXiv:2503.09519, l = 8 coefficients)
Coefficients `OMEGA0, OMEGA1[.], LAMBDA[.]` are inlined in the script. With
`m_half = floor(T) + 1/2` and `s = sigma + i I(T)`:

    I1(s)   = exp(-s ln m_half) * ( OMEGA0
              + sum_k OMEGA1[k] ( exp(-2 pi m_half L[k] - s ln(1 + i L[k]/m_half))
                                + exp(+2 pi m_half L[k] - s ln(1 - i L[k]/m_half)) ) )
    R1ak    = -1/2 (-1)^m I1(s)
    R2ak    = -1/2 (-1)^m chi(s) conj( I1((1-sigma) + i I(T)) )     [ I2 = conj I1(1-sigma) ]

### Sanity check printed by the script
- `|R1ak + R2ak - R| ≈ 5.8e-15` at `sigma=0.5, T=6.18` (Kuznetsov is essentially
  exact in this range), so the dashed path lands on `Sigma1 + R`.

### Regenerate / edit
Uses `compute()`, `C`, `xy`, `SIGMA`, `T_INDEX` from `fig1_spiral_summands.py`
(so it tracks the same point). Then:

    python3 fig4_kuznetsov_zoom.py

Requires: `python3`, `mpmath`, `numpy`, `matplotlib`.

## The two bisector links, rotated to the forward-link frame (document Figure 17)

**File:** `fig_yinyang_spirals.py` → `figures/fig_yinyang_spirals.pdf` (+ `.png`)
**Used in:** §11 "The yin and yang curves" (intro, right after "makes an
unexpected appearance"), label `fig:yinyang-spirals`.

### What it shows
Two side-by-side panels at σ = 1/4, T = 6.18 (t = I(T) ≈ 279.85, m = 6),
the same σ and m as the bisector-frame Figure 19 (`fig_yinyang.py`).
Both panels are drawn in the coordinate frame of the **forward bisector
link**: everything is translated (joint m → origin) and rotated so that link
lies along the positive x-axis, with **no scaling** — the link runs from 0
to 7^(-1/4) ≈ 0.615 and all other lengths are true.

- **Left:** the full forward chain (blue, starting at the world origin O,
  which the frame map moves off (0,0)) and reverse chain (green, ending at
  ζ), each drawn out to link ⌊I(T)/π⌋ = 89 (90 links per chain). Link 6 of
  each chain — the forward and reverse bisector links — is overdrawn thick
  (dark blue / dark green); the red dot at their crossing is the bisector
  point, at (d1, 0). A gray rectangle marks the zoom window.
- **Right:** zoom into that window, with the two thick links, the bisector
  point, and text labels for each.

### Regenerate / edit
Edit `SIGMA`, `T_INDEX` at the top, then:

    python3 fig_yinyang_spirals.py

## The reverse bisector link sweeping T = 6 to 7 (document Figure 18)

**File:** `fig_bisector_sweep.py` → `figures/fig_bisector_sweep.pdf` (+ `.png`)
**Used in:** §11 "The yin and yang curves" (intro, right after Figure 17),
label `fig:bisector-sweep`.

### What it shows
One panel, σ = 1/4, in the same unscaled forward-bisector-link frame as
Figure 17 (joint m = 6 at the origin, link along the +x axis, lengths true):

- The **stationary forward bisector link** — one thick dark-blue segment from
  0 to 7^(-1/4) ≈ 0.615 on the x-axis.
- The **reverse bisector link at 16 equally spaced T in [6, 7]**, all in the
  same dark green and the same thickness as the forward link, each labeled on
  its outer end with the fractional part of T (two decimals; the T = 7
  position, labeled 1.00, nearly coincides with the T = 6 one so its label is
  pushed further out). It revolves fully around the stationary link.
- **Red dotted arrows** — from the middle of each position to the middle of
  the next one in the series (all but the last), tracing the motion; the
  curvature flips sign for the positions with frac(T) > 1/2.
- **Green / red end dots** — the two ends of the revolving link, colored
  consistently (green = joint-m end, red = joint-(m+1) end; they trace the
  yin and yang curves of the fig_yinyang.py figure, in the same colors).
- **Red dots on the axis** — the bisector point at each instant: the
  crossing of that position with the x-axis, at (d1, 0).

### Regenerate / edit
Edit `SIGMA`, `M`, `N_SNAP` at the top, then:

    python3 fig_bisector_sweep.py

## Yin and yang curves in the bisector frame (document Figure 19)

**File:** `fig_yinyang.py` → `figures/fig_yinyang.pdf` (+ `.png`)
**Used in:** §11 "The yin and yang curves" (intro), label `fig:yinyang`.

### What it shows
sigma = 1/4, m = 6 (handoff period 6 <= T <= 7), snapshot at T = 6.20.
Frame map: z -> (z - Sigma1) * ceil(T)^s pins the forward bisector link
to [0,1] (dark blue, thick, matching the earlier bisector-link figures).

- **Green** — yin path `Y_in1 = R ceil(T)^s` (near end of the reverse
  bisector link), dots every 0.1 in T; labels at T = m+0.3, m+0.5, m+0.8
  (the m+0.2 dots are the snapshot endpoints, left unlabeled).
- **Red** — yang path `Y_ang1 = Y_in1 - chi ceil(T)^{2s-1}` (far end).
- **Dark green** — the reverse bisector link itself at T = 6.20.
- **Dashed violet** — in-frame image of R (the vector 0 -> Y_in1).
- **Red thick** on the axis `[0, ceil(T)^sigma d1]` — image of R1ps;
  **orange** chord from the crossing to Y_in1 — image of R2ps (drawn
  over the dark-green link so it stays visible).
- **Black dot** — the bisector point (crossing ≈ 0.237 at T = 6.20).

### Regenerate / edit
Edit `SIGMA`, `M`, `T_SNAP` at the top, then:

    python3 fig_yinyang.py

## d1, d2 and their sum: the poles cancel (document Figure 20)

**File:** `fig_d1_d2_sum.py` → `figures/fig_d1_d2_sum.pdf` (+ `.png`)
**Used in:** §11.3 (derivation of R2ps), label `fig:d1-d2-sum`.

### What it shows
sigma = 0.1, 1 <= T <= 7: d1 (red), d2 (green), d1 + d2 (blue), and the
closed form `|R| cos(arg R - psi/2) / cos(w + psi/2)` (black dashed).
The individual weights have genuine narrow poles twice per unit of T
(sin(2w+psi) = 0, the parallel-link heights of §9); in the sum they are
equal and opposite and cancel — the blue curve is smooth everywhere and
sits exactly on the black dashed closed form (max grid deviation ~4e-16,
printed by the script).

### Regenerate / edit

    python3 fig_d1_d2_sum.py

## The trace of F-bar in the complex plane (document Figure 21)

**File:** `fig_F_curve.py` → `figures/fig_F_curve.pdf` (+ `.png`)
**Used in:** §11.4 (comparison to Siegel's integral result), right after
eq:siegel-conj (the paper's eq. 82), label `fig:F-curve`.

### What it shows
Fbar(t) = (e^{-pi i t^2} - e^{-pi i t}) / (2 i sin(pi t)) traced in the
complex plane for -1.5 <= t <= 1.5, red dots every 0.1 in t: two congruent
teardrop lobes, point-symmetric through 1/2.

- Integer t are removable singularities, Fbar -> 1/2 - n (black squares at
  +1.5, +0.5, -0.5).
- **Curiosity** (in the caption): at every half-integer t = k + 1/2,
  e^{-pi i t^2} = e^{-i pi/4} (k(k+1) always even), so
  Fbar(k+1/2) = 1/2 - (-1)^k (1/2) e^{i pi/4} — only two values (green
  diamonds), each revisited every Delta t = 2 forever; they are the meeting
  points of the lobes.

### Regenerate / edit

    python3 fig_F_curve.py

## Convergence of the yin curves to Y_inf (document Figure 22)

**File:** `fig_yinyang_infinity.py` → `figures/fig_yinyang_infinity.pdf` (+ `.png`)
**Used in:** §11.5 (the limit curve / C0 connection), label
`fig:yinyang-infinity`.

### What it shows
Two panels stacked vertically with identical box sizes (both get the
larger of the two x/y spans, equal aspect), both with
`Y_inf(q) = 1 - Psi(q) e^{-2 pi i (q^2 - 1/16)}` dashed black (Psi = the
Riemann-Siegel correction function = the paper's C0) and the unit
bisector link in black:

- **Top**, sigma = 0.2: yin paths (all green) of every handoff period
  0 < T < 8, m = 0..7; the m = 0 path is zeta(sigma + i t) itself (both
  partial sums empty for 0 < T < 1), overlaid with spaced brown dots so
  the green line underneath stays visible.
- **Bottom**, sigma = 0.9: yin paths for m = 0, 1, 2, 4, 8, 16, 32 (light ->
  dark green); by T ~ 32 the path is visually on top of Y_inf. The m = 0
  path is zeta itself again (brown dots); sigma = 0.9 is near the pole of
  zeta at s = 1, so it dives to about -2.7i and the window is clipped to
  the teardrop region.

The script prints the measured convergence: max |Y_in1 - Y_inf(q)| over
a q-grid ≈ 0.028 / 0.015 / 0.027 at T~10 and 0.0076 / 0.0042 / 0.0075 at
T~40 for sigma = 0.2 / 0.5 / 0.9 — O(1/T), independent of sigma.
Parameterization: q = frac(T) (NOT p^ = frac(sqrt(t/2pi)); the two
differ by 1/2 mod 1).  The yang path traces the same limit half a period
behind: Y_ang1(T) ~ Y_in1(T - 1/2).

### Regenerate / edit
Takes a minute or two (m = 40 needs zeta at t ~ 10^4):

    python3 fig_yinyang_infinity.py

## Verification script (not a figure)

**File:** `verify_yinyang.py`
Numerical verification of every identity in §11: frame images, the
crossing-formula simplification chain, the "other forms" of R1ps and
R2ps, the reverse-frame normalization (exact fraction is
`d2 ceil(T)^{1-sigma}/|chi|`, matching Table 1 — the original paper's
table said `ceil(T)^sigma d2`, which is only the asymptotic form), the
d1 + d2 pole-cancellation identity, the Y_inf convergence, and the area
constant 1.0341672002955850005 (eq. area-value).

    python3 verify_yinyang.py
