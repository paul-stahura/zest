# Leg-equality four-panel figure — reproduction guide

This document explains the **mean leg-imbalance strip** figure
(`leg_equality_four_panel.pdf` / `.png`) so another agent can regenerate it,
change zoom windows, or build variants.

---

## What the figure shows

Four **equal-height skinny vertical panels** side by side (left → right):

| Panel | \(T\) range | Role |
|------|-------------|------|
| 1 | \(4.65 \le T \le 4.80\) | Zoom |
| 2 | \(9.42 \le T \le 9.46\) | Zoom |
| 3 | \(17.2 \le T \le 17.6\) | Zoom |
| 4 | \(0 \le T \le 20\) | Full strip |

Each panel is a heatmap with:

- **horizontal axis:** \(\sigma \in [0,1]\) (real part of \(s=\sigma+it\))
- **vertical axis:** spiral index \(T\) (not the usual imaginary \(t\); \(t=I(T)\))
- **color:** mean leg imbalance \(\bar\delta\) (log scale)
  - **dark purple** → nearly equal legs / near bisector
  - **cream/yellow** → unequal legs

**Overlays (current convention):**

- Green dots = zeta zeros, plotted at \(\sigma=\tfrac12\) (critical line)
- **No champions**
- White dashed vertical line at \(\sigma=\tfrac12\)
- Gray rectangles on panel 4 mark the three zoom \(T\)-bands
- Diagonal gray connectors from each zoom panel’s top/bottom to the matching band on panel 4; lines are **clipped to gutters** so they do not paint over intervening panels

**Outputs:**

- `papers/my main paper/rewrite_v7/figures/leg_equality_four_panel.pdf`
- `papers/my main paper/rewrite_v7/figures/leg_equality_four_panel.png`

---

## Math / metric

At each sample \((\sigma,T)\) compute three remainder splits, then average their
normalized length imbalances.

### Partial sums

- \(\Sigma_1\) = forward partial sum of the zeta spiral at \((\sigma,T)\)  
  → `calcForwardSum(sigma, T)`
- \(\Sigma_2\) = inverse / reflected partial sum  
  → `calcInverseSum(sigma, T)`

Implementation: `web/src/shared/math/sumRemainders.ts`.

### Remainder vectors (three splits)

| Split | \(R_1\) | \(R_2\) | Functions |
|------|---------|---------|-----------|
| Rps (Riemann–Siegel style) | `calcRps1` | `calcRps2` | PS remainders |
| R/2 | `calcRHalf` | same vector for both legs | half-remainder |
| Rak (Kuznetsov / \(I_1\)) | `calcRak1` | `calcRak2` | AK remainders |

“Legs” for a split:

\[
L_1 = |\Sigma_1 + R_1|,\qquad L_2 = |\Sigma_2 + R_2|.
\]

### Per-split imbalance

\[
\delta = \frac{|L_1 - L_2|}{L_1 + L_2 + \varepsilon},\qquad \varepsilon=10^{-18}.
\]

### Plotted quantity

\[
\bar\delta = \frac{\delta_{\mathrm{Rps}} + \delta_{R/2} + \delta_{\mathrm{Rak}}}{3}.
\]

On \(\sigma=\tfrac12\), the geometry forces \(L_1\approx L_2\) (bisector), so
\(\bar\delta\approx 0\) → dark purple vertical band.

Color mapping in plots: `LogNorm` on \(\max(\bar\delta, 10^{-16})\), with
shared clim from percentiles of the full \(T\in[0,20]\) grid
(≈ 0.5th … 50th percentile).

---

## Index \(T\) vs imaginary \(t\)

The strip’s vertical coordinate is the **spiral index** \(T\), related to the
usual critical-line height by the zeta index map (elsewhere in the project):

\[
t = I(T) = \frac{\pi(2T+1)}{\ln(1+1/T)}.
\]

Zeros CSV stores **index** \(T\) in the second column (`real,index`), so they
plot directly against the strip’s \(T\) axis.

Zeros file:

`Assets/Resources/CriticalStripPoints/00 Zeta Zeros.csv`

---

## Data files (precomputed grids)

All live under `papers/my main paper/rewrite_v7/`:

| Stem | \(T\) | \(N_T\) | \(N_\sigma\) | Files |
|------|-------|---------|--------------|-------|
| `leg_equality_strip_0_20` | 0–20 | 2000 | 10000 | `*_meand.bin`, `*_sigma.bin`, `*.json` |
| `leg_equality_strip_4p65_4p80` | 4.65–4.80 | 500 | 2500 | same |
| `leg_equality_strip_9p42_9p46` | 9.42–9.46 | 500 | 2500 | same |
| `leg_equality_strip_17p2_17p6` | 17.2–17.6 | 500 | 2500 | same |

### Binary layout

- `*_meand.bin` — `float64`, row-major **\(T \times \sigma\)**  
  shape `(nT, nSigma)`, length `nT * nSigma`
- `*_sigma.bin` — `float64` abscissae, length `nSigma`  
  uniform on \([0,1]\), with the sample nearest \(\tfrac12\) **pinned exactly to 0.5**
- `*.json` — metadata (`tMin`, `tMax`, `nT`, `nSigma`, metric string, stats)

Example load:

```python
import json, numpy as np
meta = json.loads(open("leg_equality_strip_0_20.json").read())
mean_d = np.fromfile("leg_equality_strip_0_20_meand.bin", dtype=np.float64)
mean_d = mean_d.reshape(meta["nT"], meta["nSigma"])
sigmas = np.fromfile("leg_equality_strip_0_20_sigma.bin", dtype=np.float64)
```

Rough cost: ~20 µs/probe on a laptop → full 0–20 grid (~20M probes) ≈ 5–7 min;
a zoom grid (500×2500 ≈ 1.25M) ≈ 25–30 s.

---

## Programs — where they are and how to run them

Repo root: zest project. Working directory for compute scripts: `web/`.

### 1. Compute a grid (TypeScript / vite-node)

Uses the same remainder math as the web app.

| Script | Writes stem |
|--------|-------------|
| `web/scripts/remainder-leg-equality-heatmap.mjs` | `leg_equality_strip_0_20` |
| `web/scripts/remainder-leg-equality-heatmap-zoom.mjs` | `leg_equality_strip_9p42_9p46` |
| `web/scripts/remainder-leg-equality-heatmap-zoom-4p65.mjs` | `leg_equality_strip_4p65_4p80` |
| `web/scripts/remainder-leg-equality-heatmap-zoom-17p2.mjs` | `leg_equality_strip_17p2_17p6` |

Run from `web/`:

```bash
cd web
npx vite-node scripts/remainder-leg-equality-heatmap.mjs
npx vite-node scripts/remainder-leg-equality-heatmap-zoom-4p65.mjs
npx vite-node scripts/remainder-leg-equality-heatmap-zoom.mjs
npx vite-node scripts/remainder-leg-equality-heatmap-zoom-17p2.mjs
```

Progress: stderr every ~25–100 \(T\)-rows; zoom scripts also write
`papers/my main paper/rewrite_v7/<stem>_progress.txt` (overwrite each tick /
`DONE` at end).

**To make a new zoom window:** copy one of the `*-zoom*.mjs` files, change
`T_MIN`, `T_MAX`, `STEM`, optionally `N_T` / `N_SIGMA`, run it, then add the
stem to the panel list in the plot script (below).

Core probe (all compute scripts share this logic):

```js
δ = |L1−L2| / (L1+L2+ε)   for each of {Rps, R/2, Rak}
return mean of the three δ
```

with \(L_1=|\Sigma_1+R_1|\), \(L_2=|\Sigma_2+R_2|\) (for R/2 both legs use the
same `calcRHalf` vector).

### 2. Plot a single strip (optional)

| Script | Purpose |
|--------|---------|
| `papers/my main paper/rewrite_v7/plot_leg_equality_strip.py` | Full 0–20 (older style: champions @ σ=0, zeros @ σ=1) |
| `papers/my main paper/rewrite_v7/plot_leg_equality_strip_zoom.py` | 9.42–9.46 one-page |
| `papers/my main paper/rewrite_v7/plot_leg_equality_strip_4p65.py` | 4.65–4.80; zeros @ ½; no champions |
| `papers/my main paper/rewrite_v7/plot_leg_equality_strip_17p2.py` | 17.2–17.6; zeros @ ½; no champions |

```bash
cd "papers/my main paper/rewrite_v7"
python3 plot_leg_equality_strip_4p65.py
```

### 3. Assemble the four-panel figure (what you usually want)

**Script:** `papers/my main paper/rewrite_v7/plot_leg_equality_four_panel.py`

```bash
cd "papers/my main paper/rewrite_v7"
python3 plot_leg_equality_four_panel.py
# outputs figures/leg_equality_four_panel.{pdf,png}
```

Dependencies: `numpy`, `matplotlib` (and a working Agg backend).

**Panel list** (edit to change zooms / order):

```python
PANELS = [
    ("leg_equality_strip_4p65_4p80", r"$4.65 \leq T \leq 4.80$"),
    ("leg_equality_strip_9p42_9p46", r"$9.42 \leq T \leq 9.46$"),
    ("leg_equality_strip_17p2_17p6", r"$17.2 \leq T \leq 17.6$"),
    ("leg_equality_strip_0_20", r"$0 \leq T \leq 20$"),
]
```

Last panel is treated as the “full” strip for connectors and shared color scale.

**Connector implementation notes (important):**

- Lines are drawn on a full-figure background axes in figure coordinates.
- Segments that would cross **intervening** panel bboxes are removed, so lines
  only appear in the white gutters (visually “behind” the strips).
- Each zoom also gets a `Rectangle` outline on the full panel at its
  `[t_lo, t_hi]` band.

**Style constants:**

- Colormap: dark purple → cream (`#1a0033` … `#fff8dc`)
- Zeros: green `#00c853` at \(\sigma=0.5\)
- Figure size ≈ 11×10.5 in, four equal width columns, `wspace≈0.55`

---

## End-to-end recipe (from scratch)

```bash
# 1) Compute grids (only if .bin/.json missing or ranges changed)
cd web
npx vite-node scripts/remainder-leg-equality-heatmap.mjs          # ~5–7 min
npx vite-node scripts/remainder-leg-equality-heatmap-zoom-4p65.mjs  # ~30 s
npx vite-node scripts/remainder-leg-equality-heatmap-zoom.mjs       # ~30 s
npx vite-node scripts/remainder-leg-equality-heatmap-zoom-17p2.mjs  # ~30 s

# 2) Compose figure
cd "../papers/my main paper/rewrite_v7"
python3 plot_leg_equality_four_panel.py
```

If PDF save hits a filesystem timeout (seen on some synced folders), save to
`/tmp` by temporarily pointing `OUT_PDF` / `OUT_PNG` in the plot script, then
`cp` into `figures/`.

---

## How to change things safely

| Goal | What to edit |
|------|----------------|
| Different zoom \(T\) windows | New `*-zoom*.mjs` with new `T_MIN`/`T_MAX`/`STEM`; add stem to `PANELS` |
| Denser zoom | Raise `N_T`, `N_SIGMA` in the zoom `.mjs` |
| Denser full strip | Raise `N_T`/`N_SIGMA` in `remainder-leg-equality-heatmap.mjs` (costly) |
| Put zeros at \(\sigma=1\) again | In `plot_leg_equality_four_panel.py`, plot zeros at `x=1` instead of `0.5` |
| Add champions | Load `web/public/critical-strip-points/champions_149_with_precise_T.csv` (column = index \(T\)); plot at e.g. \(\sigma=0\) |
| Shared color scale | Already from full strip percentiles; change percentile cuts in `main()` |
| Panel order / titles | `PANELS` list in `plot_leg_equality_four_panel.py` |

---

## Related code (do not reinvent)

| Piece | Path |
|------|------|
| Forward / inverse sums + Rps / Rak / R½ | `web/src/shared/math/sumRemainders.ts` |
| Web spiral / remainder UI (same math) | `web/src/features/main-workspace/remainderWorkspaceLayer.ts` |
| Unity equal-legs search (related, not used for this figure) | `Assets/app/critical-strip/Editor/EqualLegsFinder.cs` |
| Older multi-strip equal-legs paper figs | `fig_equal_legs_strips.py`, `fig_combined_strips.py` |

---

## Sanity checks after a rebuild

1. On every panel, a dark vertical band sits on \(\sigma=\tfrac12\).
2. Zoom panels show the same local structures as the outlined bands on panel 4.
3. Connector lines appear only in gutters, not across heatmap faces.
4. Green zeros lie on \(\sigma=\tfrac12\); count rises with \(T\) (many more in 17.2–17.6 than in 4.65–4.80).
5. `*.json` `stats.elapsedMs` and `meanDeltaMean` look plausible (mean \(\bar\delta\) often ~0.2–0.4).

---

## Quick file map

```
web/scripts/
  remainder-leg-equality-heatmap.mjs              # T=0..20 compute
  remainder-leg-equality-heatmap-zoom.mjs         # T=9.42..9.46
  remainder-leg-equality-heatmap-zoom-4p65.mjs    # T=4.65..4.80
  remainder-leg-equality-heatmap-zoom-17p2.mjs    # T=17.2..17.6
web/src/shared/math/sumRemainders.ts              # Σ1, Σ2, Rps, Rak, R/2

papers/my main paper/rewrite_v7/
  LEG_EQUALITY_FOUR_PANEL.md                      # this file
  plot_leg_equality_four_panel.py                 # ★ compose 4-panel figure
  plot_leg_equality_strip*.py                     # single-panel variants
  leg_equality_strip_*_{meand,sigma}.bin          # grids
  leg_equality_strip_*.json                       # metadata
  figures/leg_equality_four_panel.{pdf,png}       # final figure

Assets/Resources/CriticalStripPoints/00 Zeta Zeros.csv
```
