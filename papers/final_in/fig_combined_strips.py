#!/usr/bin/env python3
"""
fig_combined_strips.py
======================

Document Figure 9: overlay of Figures 7 and 8.  Same four vertical strips
of the critical strip (sigma 0..1, index T in [2,3], [3,4], [4,5], [5,6]),
showing simultaneously:

  (a) the zeta zeros            (black dots),
  (b) the critical line         (dark-yellow vertical line at 1/2),
  (c) the equal-leg points      (blue:  L1 = L2), and
  (d) the folded-leg points     (red:   theta2 = pi).

A zeta zero requires BOTH conditions at once, so zeros appear exactly where
the red and blue loci cross.  On the critical line the blue locus is the
line itself, so every red crossing of the line is a zero; the figure lets
one check visually that red/blue crossings do not occur anywhere else.

Data sources are those of fig_equal_legs_strips.py and fig_theta2_strips.py
(which also carry the validation runs):
  - zeros:      00 Zeta Zeros.csv
  - equal legs: 10 Zps Equal Leg Lengths [1-20].csv
  - theta2:     12 Zps Leg Angle = PI [1-20].csv

Outputs (into ./figures/):
    fig_combined_strips.pdf   (vector, used by LaTeX)
    fig_combined_strips.png   (raster preview)

Run:  python3 fig_combined_strips.py
"""

import os
import numpy as np
import matplotlib.pyplot as plt

from fig1_spiral_summands import OUTDIR
from fig_equal_legs_strips import (read_points_csv, STRIPS, ZEROS_CSV,
                                   EQLEGS_CSV, BLUE, ZEROCOLOR)
from fig_theta2_strips import THETA2_CSV, RED

BASENAME = 'fig_combined_strips'


def main():
    zx, zeros_idx = read_points_csv(ZEROS_CSV)
    eq_sig, eq_idx = read_points_csv(EQLEGS_CSV)
    th_sig, th_idx = read_points_csv(THETA2_CSV)

    fig, axes = plt.subplots(1, 4, figsize=(7.6, 9.8))
    for ax, (lo, hi) in zip(axes, STRIPS):
        ax.axvline(0.5, color=BLUE, lw=2.2, zorder=2)

        sel = (eq_idx >= lo) & (eq_idx <= hi)
        ax.plot(eq_sig[sel], eq_idx[sel], '.', color=BLUE, ms=1.0,
                rasterized=True, zorder=3)

        tsel = (th_idx >= lo) & (th_idx <= hi)
        ax.plot(th_sig[tsel], th_idx[tsel], '.', color=RED, ms=1.6,
                rasterized=True, zorder=4)

        zsel = (zeros_idx >= lo) & (zeros_idx <= hi)
        ax.plot(zx[zsel], zeros_idx[zsel], 'o', color=ZEROCOLOR, ms=5,
                mec='white', mew=0.5, zorder=5)

        ax.set_xlim(0, 1)
        ax.set_ylim(lo, hi)
        ax.set_xticks([0, 0.5, 1])
        ax.set_yticks(np.arange(lo, hi + 0.001, 0.1))
        ax.grid(True, ls=':', alpha=0.35)
        ax.set_xlabel(r'$\sigma$')
        ax.set_title(r'$%d\leq T\leq %d$' % (lo, hi), fontsize=11)
    axes[0].set_ylabel(r'index $T$')

    fig.suptitle(r'Equal legs ($L_1=L_2$, blue) and folded legs '
                 r'($\vartheta_2=\pi$, red): zeros where they cross',
                 fontsize=12)
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
