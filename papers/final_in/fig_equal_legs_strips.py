#!/usr/bin/env python3
"""
fig_equal_legs_strips.py
========================

Document Figure 7: four full-height vertical strips of the critical strip
(sigma from 0 to 1, index T vertical), windows T in [2,3], [3,4], [4,5],
[5,6].  Each strip shows:

  (a) the zeta zeros              (black dots, all on sigma = 1/2),
  (b) the critical line           (dark-yellow vertical line at 1/2), and
  (c) the equal-leg points        (small blue dots): points (sigma, T) where
      L1 = L2, i.e. |B1| = |zeta - B1| with B1 = Sigma1 + R1ps the bisector
      point.

Data sources (Zest app exports, both in index coordinates):
  - zeros:      Assets/Resources/CriticalStripPoints/00 Zeta Zeros.csv
  - equal legs: Assets/Resources/CriticalStripPoints/
                10 Zps Equal Leg Lengths [1-20].csv
    NOTE: this is the point set matching L1 = L2 with B1 = Sigma1 + R1ps
    (verified numerically below).  The similarly named "90 R Equal Legs.csv"
    is a different locus: legs measured through the midpoint Sigma1 + R/2.

A validation step recomputes L1 - L2 with mpmath at a few sampled rows of
the CSV and aborts if the locus does not match the paper's definition.

Outputs (into ./figures/):
    fig_equal_legs_strips.pdf   (vector, used by LaTeX)
    fig_equal_legs_strips.png   (raster preview)

Run:  python3 fig_equal_legs_strips.py
"""

import os
import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt

from fig1_spiral_summands import I_of_T, chi, OUTDIR

BASENAME = 'fig_equal_legs_strips'
STRIPS = [(2, 3), (3, 4), (4, 5), (5, 6)]

ZEST_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__),
                                         '..', '..', '..'))
POINTS_DIR = os.path.join(ZEST_ROOT, 'Assets', 'Resources',
                          'CriticalStripPoints')
ZEROS_CSV = os.path.join(POINTS_DIR, '00 Zeta Zeros.csv')
EQLEGS_CSV = os.path.join(POINTS_DIR, '10 Zps Equal Leg Lengths [1-20].csv')

BLUE = '#1f77b4'          # critical line and equal-leg locus
ZEROCOLOR = 'k'           # zeta zeros (black)

mp.mp.dps = 25


def read_points_csv(path):
    """Read a Zest point-set CSV (skip #-comments); return (col1, col2)."""
    xs, ys = [], []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            a, b = line.split(',')
            xs.append(float(a))
            ys.append(float(b))
    return np.array(xs), np.array(ys)


def leg_diff(sig, T):
    """L1 - L2 at (sigma, T): |B1| - |zeta - B1|, B1 = Sigma1 + R1ps."""
    t = I_of_T(T)
    s = mp.mpc(sig, t)
    m = int(mp.floor(T))
    w = t * mp.log(m + 1)
    ch = chi(s)
    psi = mp.arg(ch)

    S1 = mp.fsum(mp.mpf(n) ** (-s) for n in range(1, m + 1))
    S2 = ch * mp.fsum(mp.mpf(n) ** (s - 1) for n in range(1, m + 1))
    zeta = mp.zeta(s)
    R = zeta - S1 - S2

    u1 = mp.exp(-1j * w)
    u2 = mp.exp(1j * (w + psi))
    a, b = mp.re(u1), mp.re(u2)
    c, d = mp.im(u1), mp.im(u2)
    det = a * d - b * c
    d1 = (mp.re(R) * d - b * mp.im(R)) / det
    B1 = S1 + d1 * u1
    return float(mp.fabs(B1) - mp.fabs(zeta - B1))


def validate(eq_sig, eq_idx, n_samples=8, tol=1e-4):
    """Check sampled CSV rows really satisfy L1 = L2 (paper's definition)."""
    sel = np.where((eq_idx >= 2.0) & (eq_idx <= 6.0)
                   & (np.abs(eq_sig - 0.5) > 0.01))[0]
    picks = sel[np.linspace(0, len(sel) - 1, n_samples).astype(int)]
    worst = 0.0
    for i in picks:
        diff = abs(leg_diff(float(eq_sig[i]), float(eq_idx[i])))
        worst = max(worst, diff)
        print('validate sigma=%.6f T=%.6f  |L1-L2| = %.2e'
              % (eq_sig[i], eq_idx[i], diff))
    if worst > tol:
        raise SystemExit('validation failed: CSV points do not satisfy '
                         'L1=L2 (worst %.2e)' % worst)
    print('validation OK (worst |L1-L2| = %.2e)' % worst)


def main():
    zx, zeros_idx = read_points_csv(ZEROS_CSV)
    eq_sig, eq_idx = read_points_csv(EQLEGS_CSV)
    validate(eq_sig, eq_idx)

    fig, axes = plt.subplots(1, 4, figsize=(7.6, 9.8))
    for ax, (lo, hi) in zip(axes, STRIPS):
        ax.axvline(0.5, color=BLUE, lw=2.2, zorder=2)

        sel = (eq_idx >= lo) & (eq_idx <= hi)
        ax.plot(eq_sig[sel], eq_idx[sel], '.', color=BLUE, ms=1.0,
                rasterized=True, zorder=3)

        zsel = (zeros_idx >= lo) & (zeros_idx <= hi)
        ax.plot(zx[zsel], zeros_idx[zsel], 'o', color=ZEROCOLOR, ms=5,
                mec='white', mew=0.5, zorder=4)
        print('strip %d-%d: %d zeros, %d equal-leg points'
              % (lo, hi, int(zsel.sum()), int(sel.sum())))

        ax.set_xlim(0, 1)
        ax.set_ylim(lo, hi)
        ax.set_xticks([0, 0.5, 1])
        ax.set_yticks(np.arange(lo, hi + 0.001, 0.1))
        ax.grid(True, ls=':', alpha=0.35)
        ax.set_xlabel(r'$\sigma$')
        ax.set_title(r'$%d\leq T\leq %d$' % (lo, hi), fontsize=11)
    axes[0].set_ylabel(r'index $T$')

    fig.suptitle('Equal-leg points ($L_1=L_2$), zeta zeros (dots), and the '
                 'critical line', fontsize=12)
    fig.tight_layout(rect=(0, 0, 1, 0.96))

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf, dpi=300)
    fig.savefig(png, dpi=200)
    plt.close(fig)
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
