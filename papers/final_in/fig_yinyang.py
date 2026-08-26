#!/usr/bin/env python3
"""
fig_yinyang.py
==============

The yin and yang curves in the bisector frame (the anchor figure of the
yin-and-yang section).

Frame: translate the forward joint m to the origin and divide by the
forward bisector link vector, i.e. z -> (z - Sigma1) * ceil(T)^s, so the
forward bisector link is pinned to [0, 1].  As T sweeps one handoff
period [m, m+1], the two ends of the reverse bisector link trace the
teardrop-shaped paths

    Y_in1(T)  = R * ceil(T)^s                  (near end, joint m of the
                                                reverse chain)
    Y_ang1(T) = Y_in1 - chi * ceil(T)^{2s-1}   (far end)

whose pair resembles a yin-yang.  At one chosen T the reverse bisector
link itself is drawn (dark green, matching the earlier bisector-link
figures) together with the in-frame images of R (dashed violet, the
vector from 0 to Y_in1), R1ps (red, the piece of the unit link from 0 to
the crossing) and R2ps (orange, from the crossing to Y_in1).  The black
dot where the dark-green link crosses the real axis is the bisector
point, at the fraction ceil(T)^sigma * d1 along the unit link.  The
forward bisector link is dark blue, also matching the earlier figures.

Parameters: sigma = 1/4, m = 6, snapshot at T = 6.20.

Outputs (into ./figures/):
    fig_yinyang.pdf   (vector, used by LaTeX)
    fig_yinyang.png   (raster preview)

Run:  python3 fig_yinyang.py
"""

import os

import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt

from fig1_spiral_summands import I_of_T, chi, C, OUTDIR

BASENAME = 'fig_yinyang'
SIGMA = mp.mpf('0.25')
M = 6                       # handoff period [M, M+1]
T_SNAP = 6.20               # the reverse bisector link is drawn at this T
N_PATH = 900                # samples along the paths

GREEN = '#2ca02c'           # yin path
YANG = '#d62728'            # yang path (red)
DARKBLUE = '#0b3d6b'        # forward bisector link (as in earlier figures)
DARKGREEN = '#0e5c17'       # reverse bisector link (as in earlier figures)
R_COLOR = '#7f2f8f'         # R vector (violet, as in the earlier figures)
RED = '#d62728'             # R1ps piece
ORANGE = '#ff7f0e'          # R2ps piece

mp.mp.dps = 25


def yin_yang(T):
    """(Y_in1, Y_ang1) at index T (m = floor(T) taken live)."""
    t = I_of_T(mp.mpf(T))
    s = mp.mpc(SIGMA, t)
    m = int(mp.floor(T))
    ch = chi(s)
    S1 = mp.fsum(mp.mpf(n) ** (-s) for n in range(1, m + 1))
    S2 = ch * mp.fsum(mp.mpf(n) ** (s - 1) for n in range(1, m + 1))
    R = mp.zeta(s) - S1 - S2
    M1 = mp.mpf(m + 1)
    yin = R * M1 ** s
    yang = yin - ch * M1 ** (2 * s - 1)
    return C(yin), C(yang)


def crossing(yin, yang):
    """Real-axis crossing of the segment [yin, yang] (a float)."""
    lam = yin.imag / (yin.imag - yang.imag)
    return (yin + lam * (yang - yin)).real


def main():
    eps = 1e-4
    Ts = np.linspace(M + eps, M + 1 - eps, N_PATH)
    pts = [yin_yang(T) for T in Ts]
    yins = np.array([p[0] for p in pts])
    yangs = np.array([p[1] for p in pts])

    yin0, yang0 = yin_yang(T_SNAP)
    c = crossing(yin0, yang0)

    fig, ax = plt.subplots(figsize=(8.8, 8.0))

    # teardrop paths
    ax.plot(yins.real, yins.imag, '-', color=GREEN, lw=1.2, zorder=2,
            label=r'$Y_{in1}$ path, $%d \leq T \leq %d$' % (M, M + 1))
    ax.plot(yangs.real, yangs.imag, '-', color=YANG, lw=1.2, zorder=2,
            label=r'$Y_{ang1}$ path, $%d\leq T\leq %d$' % (M, M + 1))

    # sample dots every 0.1 in T (the snapshot sits on the T = m+0.2 dots,
    # so those are left unlabeled and the next ones, T = m+0.3, are labeled)
    for k in range(1, 10):
        Tk = M + k / 10
        yk, gk = yin_yang(Tk)
        ax.plot([yk.real], [yk.imag], 'o', color=GREEN, ms=3, zorder=3)
        ax.plot([gk.real], [gk.imag], 'o', color=YANG, ms=3, zorder=3)
        if k in (3, 5, 8):
            ax.annotate(r'$T=%.1f$' % Tk, (yk.real, yk.imag),
                        textcoords='offset points', xytext=(6, 5),
                        fontsize=8, color=GREEN)
            ax.annotate(r'$T=%.1f$' % Tk, (gk.real, gk.imag),
                        textcoords='offset points', xytext=(6, -11),
                        fontsize=8, color=YANG)

    # the stationary forward bisector link
    ax.plot([0, 1], [0, 0], '-', color=DARKBLUE, lw=3.0,
            solid_capstyle='round', zorder=4)
    ax.plot([0, 1], [0, 0], 'o', color=DARKBLUE, ms=4, zorder=5)
    ax.annotate('forward bisector link\n(unit length)', (0.85, 0),
                textcoords='offset points', xytext=(0, -26),
                fontsize=9, ha='center')

    # the reverse bisector link at the snapshot T
    ax.plot([yin0.real, yang0.real], [yin0.imag, yang0.imag], '-',
            color=DARKGREEN, lw=2.4, solid_capstyle='round', zorder=6,
            label=r'reverse bisector link at $T=%.2f$' % T_SNAP)
    ax.plot([yin0.real], [yin0.imag], 'o', color=GREEN, ms=6, zorder=7)
    ax.plot([yang0.real], [yang0.imag], 'o', color=YANG, ms=6, zorder=7)
    ax.annotate(r'$Y_{in1}$', (yin0.real, yin0.imag),
                textcoords='offset points', xytext=(10, -14), fontsize=11,
                color=GREEN)
    ax.annotate(r'$Y_{ang1}$', (yang0.real, yang0.imag),
                textcoords='offset points', xytext=(8, -4), fontsize=11,
                color=YANG)

    # in-frame images of R, R1ps, R2ps at the snapshot T
    ax.plot([0, yin0.real], [0, yin0.imag], '--', color=R_COLOR, lw=1.2,
            zorder=5, label=r'$R\,\lceil T\rceil^{\,s}$ (the image of $R$)')
    ax.plot([0, c], [0, 0], '-', color=RED, lw=4.0,
            solid_capstyle='butt', zorder=5,
            label=r'image of $R_{1ps}$:  $[0,\ \lceil T\rceil^{\sigma}d_1]$')
    ax.plot([c, yin0.real], [0, yin0.imag], '-', color=ORANGE, lw=4.0,
            solid_capstyle='round', zorder=7,
            label=r'image of $R_{2ps}$')

    # the bisector point
    ax.plot([c], [0], 'o', color='k', ms=7, zorder=8)
    ax.annotate('bisector point\n' r'$\lceil T\rceil^{\sigma}d_1\approx%.3f$' % c,
                (c, 0), textcoords='offset points', xytext=(8, 18),
                fontsize=9, ha='center')

    ax.set_aspect('equal', adjustable='datalim')
    ax.grid(True, ls=':', alpha=0.35)
    ax.legend(loc='lower left', fontsize=9, framealpha=0.92)
    ax.set_xlabel('Re')
    ax.set_ylabel('Im')
    ax.set_title('The yin and yang curves in the bisector frame  '
                 r'($\sigma=1/4$, $m=%d$)' % M, fontsize=12)
    fig.tight_layout()

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf)
    fig.savefig(png, dpi=200)
    plt.close(fig)

    print('snapshot T=%.2f: crossing = %.6f (fraction of the unit link)'
          % (T_SNAP, c))
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
