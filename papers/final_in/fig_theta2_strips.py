#!/usr/bin/env python3
"""
fig_theta2_strips.py
====================

Document Figure 8: companion to fig_equal_legs_strips.py (same four
vertical strips of the critical strip, sigma 0..1, index T in [2,3],
[3,4], [4,5], [5,6]).  Each strip shows:

  (a) the zeta zeros            (black dots, all on sigma = 1/2),
  (b) the critical line         (dark-yellow vertical line at 1/2), and
  (c) the folded-leg points     (small red dots): points (sigma, T) where
      theta2 = pi, i.e. Leg 2 (zeta - B1) folds straight back onto Leg 1
      (B1), so a zeta zero is possible.  A zero additionally requires
      L1 = L2, which holds automatically on the critical line -- so the
      zeros are exactly where this red locus crosses the yellow line.

Data sources (Zest app exports, both in index coordinates):
  - zeros:  Assets/Resources/CriticalStripPoints/00 Zeta Zeros.csv
  - theta2: Assets/Resources/CriticalStripPoints/
            12 Zps Leg Angle = PI [1-20].csv
    (sigma sampled on a 0.025 grid; for each sigma the T with theta2 = pi)

A validation step recomputes theta2 = arg((zeta-B1)/B1) with mpmath at a
few sampled rows of the CSV and aborts if |theta2| does not come out pi.

Outputs (into ./figures/):
    fig_theta2_strips.pdf   (vector, used by LaTeX)
    fig_theta2_strips.png   (raster preview)

Run:  python3 fig_theta2_strips.py
"""

import os
import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt

from fig1_spiral_summands import I_of_T, chi, OUTDIR

BASENAME = 'fig_theta2_strips'
STRIPS = [(2, 3), (3, 4), (4, 5), (5, 6)]

ZEST_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__),
                                         '..', '..', '..'))
POINTS_DIR = os.path.join(ZEST_ROOT, 'Assets', 'Resources',
                          'CriticalStripPoints')
ZEROS_CSV = os.path.join(POINTS_DIR, '00 Zeta Zeros.csv')
THETA2_CSV = os.path.join(POINTS_DIR, '12 Zps Leg Angle = PI [1-20].csv')

BLUE = '#1f77b4'          # critical line
ZEROCOLOR = 'k'           # zeta zeros (black)
RED = '#d62728'

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


def theta2(sig, T):
    """theta2 at (sigma, T): arg((zeta - B1) / B1), B1 = Sigma1 + R1ps."""
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
    return float(mp.arg((zeta - B1) / B1))


def validate(th_sig, th_idx, n_samples=8, tol=2e-2):
    """Check sampled CSV rows really satisfy |theta2| = pi."""
    sel = np.where((th_idx >= 2.0) & (th_idx <= 6.0))[0]
    picks = sel[np.linspace(0, len(sel) - 1, n_samples).astype(int)]
    worst = 0.0
    for i in picks:
        diff = abs(abs(theta2(float(th_sig[i]), float(th_idx[i]))) - np.pi)
        worst = max(worst, diff)
        print('validate sigma=%.6f T=%.6f  ||theta2|-pi| = %.2e'
              % (th_sig[i], th_idx[i], diff))
    if worst > tol:
        raise SystemExit('validation failed: CSV points do not satisfy '
                         'theta2=pi (worst %.2e)' % worst)
    print('validation OK (worst ||theta2|-pi| = %.2e)' % worst)


def main():
    zx, zeros_idx = read_points_csv(ZEROS_CSV)
    th_sig, th_idx = read_points_csv(THETA2_CSV)
    validate(th_sig, th_idx)

    fig, axes = plt.subplots(1, 4, figsize=(7.6, 9.8))
    for ax, (lo, hi) in zip(axes, STRIPS):
        ax.axvline(0.5, color=BLUE, lw=2.2, zorder=2)

        sel = (th_idx >= lo) & (th_idx <= hi)
        ax.plot(th_sig[sel], th_idx[sel], '.', color=RED, ms=1.6,
                rasterized=True, zorder=3)

        zsel = (zeros_idx >= lo) & (zeros_idx <= hi)
        ax.plot(zx[zsel], zeros_idx[zsel], 'o', color=ZEROCOLOR, ms=5,
                mec='white', mew=0.5, zorder=4)
        print('strip %d-%d: %d zeros, %d theta2=pi points'
              % (lo, hi, int(zsel.sum()), int(sel.sum())))

        ax.set_xlim(0, 1)
        ax.set_ylim(lo, hi)
        ax.set_xticks([0, 0.5, 1])
        ax.set_yticks(np.arange(lo, hi + 0.001, 0.1))
        ax.grid(True, ls=':', alpha=0.35)
        ax.set_xlabel(r'$\sigma$')
        ax.set_title(r'$%d\leq T\leq %d$' % (lo, hi), fontsize=11)
    axes[0].set_ylabel(r'index $T$')

    fig.suptitle(r'Folded-leg points ($\vartheta_2=\pi$), zeta zeros (dots), '
                 'and the critical line', fontsize=12)
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
