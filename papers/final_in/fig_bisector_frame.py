#!/usr/bin/env python3
"""
fig_bisector_frame.py
=====================

The two neighboring links in the bisector frame, T = 4 to 5 (so the
bisector link is link m = 4 of the forward chain), 4 x 4 = 16 small
panels.

Frame: translate joint m to the origin, rotate and scale so the
bisector link (joint 4 -> joint 5) lies along the real axis from 0 to
1:  z  ->  (z - J4) / (J5 - J4).  Everything is drawn in that frame:

  - the bisector link (link 4): black, from 0 to 1;
  - link m-1 = link 3: GREEN, attached to the bisector link at joint 4
    (the origin in the frame);
  - link m+1 = link 5: RED, attached at joint 5 (the point 1).

Link lengths scale with the bisector link (which is 1 unit by
construction): |link3|/|link4| = (5/4)^sigma, |link5|/|link4|
= (6/5)^{-sigma} ... i.e. all lengths are relative to link 4.

Panels: T = linspace(4, 5, 16), upper left T = 4, lower right T = 5,
row-major.  As T sweeps one unit each neighbor revolves around the
stationary bisector link approximately twice; at the endpoints (the
handoff instants) a neighbor folds back onto the bisector link
(relative joint angle an odd multiple of pi).

No ticks or numbers around the panels; a small T label sits inside
each panel.

Outputs (into ./figures/):
    fig_bisector_frame.pdf   (vector, used by LaTeX)
    fig_bisector_frame.png   (raster preview)

Run:  python3 fig_bisector_frame.py
"""

import os
import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt

from fig1_spiral_summands import I_of_T, chi, C, OUTDIR

# --------------------------------------------------------------------------
# PARAMETERS  (edit here, then re-run)
# --------------------------------------------------------------------------
SIGMA = mp.mpf('0.5')
M = 4                          # bisector link = link m, T sweeps [m, m+1]
N_PANELS = 16                  # 4 x 4 grid

BASENAME = 'fig_bisector_frame'
GREEN, RED = '#2ca02c', '#d62728'

# small notes drawn at the bottom of selected panels (0-based index)
PANEL_NOTES = {
    1: 'bisector point begins\nby moving to the left',
    3: 'bisector near minimum $d_1$',
    4: 'bisector now moving to right',
    8: 'bisector continuing right',
    11: 'nearing maximum $d_1$, will begin\nto move left at maximum',
    14: 'bisector point moving left',
}

mp.mp.dps = 30


def frame_points(T):
    """Neighbor endpoints in the bisector frame at index T.

    Returns (a, b): a = far end of link m-1 (its other end is 0),
    b = far end of link m+1 (its other end is 1).
    """
    t = I_of_T(mp.mpf(T))
    s = mp.mpc(SIGMA, t)
    # joints J_{m-1} .. J_{m+2} of the forward chain
    J = {}
    z = mp.mpc(0)
    for n in range(1, M + 3):
        z += mp.mpf(n) ** (-s)
        if n >= M - 1:
            J[n] = z
    scale = J[M + 1] - J[M]
    a = (J[M - 1] - J[M]) / scale
    b = (J[M + 2] - J[M]) / scale
    return C(a), C(b)


def bisector_frac(T):
    """Position of the bisector point along the unit bisector link.

    In the frame the bisector point B1 = Sigma1 + d1 e^{-i w} maps to
    d1 (m+1)^sigma on the real axis (the familiar fraction).  d1 is
    computed exactly (zeta + Cramer), with m = M held fixed across the
    whole sweep.
    """
    t = I_of_T(mp.mpf(T))
    s = mp.mpc(SIGMA, t)
    w = t * mp.log(M + 1)
    ch = chi(s)
    psi = mp.arg(ch)
    S1 = mp.fsum(mp.mpf(n) ** (-s) for n in range(1, M + 1))
    S2 = ch * mp.fsum(mp.mpf(n) ** (s - 1) for n in range(1, M + 1))
    R = mp.zeta(s) - S1 - S2
    u1 = mp.exp(-1j * w)
    u2 = mp.exp(1j * (w + psi))
    a, b = mp.re(u1), mp.re(u2)
    c, d = mp.im(u1), mp.im(u2)
    d1 = (mp.re(R) * d - b * mp.im(R)) / (a * d - b * c)
    return float(d1 * mp.mpf(M + 1) ** SIGMA)


def midpoints(T):
    """Midpoints of the two neighbor links in the frame at index T."""
    a, b = frame_points(T)
    return a / 2, (1 + b) / 2


def draw_motion_arrow(ax, T0, T1, which, color, n_sub=40):
    """Dotted arc from the link midpoint at T0 to its position at T1.

    Traces the true motion of the midpoint (a rotation about the pivot
    joint), with an arrowhead at the T1 end.  which: 0 = link m-1,
    1 = link m+1.
    """
    path = [midpoints(T)[which] for T in np.linspace(T0, T1, n_sub)]
    xs = [p.real for p in path]
    ys = [p.imag for p in path]
    ax.plot(xs, ys, ls=':', color=color, lw=1.0, alpha=0.9, zorder=2)
    ax.annotate('', xy=(xs[-1], ys[-1]), xytext=(xs[-2], ys[-2]),
                arrowprops=dict(arrowstyle='-|>', color=color, lw=1.0,
                                shrinkA=0, shrinkB=0),
                annotation_clip=False, zorder=2)


def main():
    Ts = np.linspace(M, M + 1, N_PANELS)
    pts = [frame_points(T) for T in Ts]

    # common limits over all panels, with a small margin
    xs = [0.0, 1.0] + [p.real for ab in pts for p in ab]
    ys = [0.0] + [p.imag for ab in pts for p in ab]
    mrg = 0.15
    xlim = (min(xs) - mrg, max(xs) + mrg)
    ylim = (min(ys) - mrg, max(ys) + mrg)

    panel_aspect = (xlim[1] - xlim[0]) / (ylim[1] - ylim[0])
    width = 12.4
    height = width / panel_aspect + 0.5      # + room for the suptitle
    fig, axes = plt.subplots(4, 4, figsize=(width, height))

    for k, (ax, T, (a, b)) in enumerate(zip(axes.flat, Ts, pts)):
        ax.plot([a.real, 0], [a.imag, 0], '-', color=GREEN, lw=1.6,
                solid_capstyle='round', zorder=3)
        ax.plot([0, 1], [0, 0], '-', color='k', lw=2.2,
                solid_capstyle='round', zorder=2)
        ax.plot([1, b.real], [0, b.imag], '-', color=RED, lw=1.6,
                solid_capstyle='round', zorder=3)
        ax.plot([0, 1], [0, 0], 'o', color='k', ms=3, zorder=4)

        # bisector point on the (unit) bisector link
        ax.plot([bisector_frac(T)], [0], 'o', color='k', ms=4.5, zorder=5)

        # dotted motion arrows: from each link's midpoint to where the
        # next panel depicts it
        if k + 1 < len(Ts):
            draw_motion_arrow(ax, Ts[k], Ts[k + 1], 0, GREEN)
            draw_motion_arrow(ax, Ts[k], Ts[k + 1], 1, RED)

        ax.text(0.04, 0.94, r'$T=%.3g$' % T, transform=ax.transAxes,
                fontsize=9, ha='left', va='top')

        if k == 0:
            ax.text(0.5, 0.18, 'Start when $T=n$', transform=ax.transAxes,
                    fontsize=11, fontweight='bold', ha='center', va='bottom')
            ax.text(0.5, 0.03, 'bisector point simultaneously\n'
                    'on links 3 and 4', transform=ax.transAxes,
                    fontsize=9, ha='center', va='bottom')
        elif k == len(Ts) - 1:
            ax.text(0.5, 0.18, 'End when $T=n+1$', transform=ax.transAxes,
                    fontsize=11, fontweight='bold', ha='center', va='bottom')
            ax.text(0.5, 0.03, 'bisector point simultaneously\n'
                    'on links 4 and 5', transform=ax.transAxes,
                    fontsize=9, ha='center', va='bottom')
        elif k in PANEL_NOTES:
            ax.text(0.5, 0.03, PANEL_NOTES[k], transform=ax.transAxes,
                    fontsize=9, ha='center', va='bottom')

        ax.set_xlim(*xlim)
        ax.set_ylim(*ylim)
        ax.set_aspect('equal', adjustable='box')
        ax.set_xticks([])
        ax.set_yticks([])

    fig.suptitle('The neighboring links in the bisector frame, '
                 r'$T=%d\to%d$ (bisector link = link $%d$)'
                 % (M, M + 1, M), fontsize=13, y=0.995)
    fig.tight_layout(rect=(0, 0, 1, 0.985))

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf)
    fig.savefig(png, dpi=200)
    plt.close(fig)

    # sanity: at integer T the fold angle is an odd multiple of pi
    for T in (M, M + 1):
        t = I_of_T(mp.mpf(T))
        ang3 = float(t * mp.log(mp.mpf(M + 1) / M)) / np.pi
        ang5 = float(t * mp.log(mp.mpf(M + 2) / (M + 1))) / np.pi
        print('T=%d: link%d-link%d angle = %.6f pi, link%d-link%d angle '
              '= %.6f pi' % (T, M - 1, M, ang3, M, M + 1, ang5))
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
