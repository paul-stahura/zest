#!/usr/bin/env python3
"""
fig_joint_angles.py
===================

The joint-angle strip of the Zest joint-angles view, at T = 13000.

The turning angle at joint n, between links n-1 and n, is the continuous joint
angle of (jangle) sampled at an integer joint:

    theta_n = fold( -I(T) ln(n/(n-1)) ),      fold to [-pi, pi],

so the strip holds one dot per joint of the forward chain, n = 2 .. floor(T)+1,
against the full turn on the vertical axis.  Its local frequency, in cycles per
joint, is nu(n) = I(T) / (2 pi n (n-1)).

Three horizontal scales, as in the app:
  * top:    the Farey fractions f = p/q in (0,1] with q <= 7, each at its
            caustic joint n(n-1) = f I(T) / 2 pi, i.e. where nu = 1/f, which is
            n = (1 + sqrt(1 + 2 f I(T) / pi)) / 2  ~  T sqrt(f);
  * bottom: the normalized joint fraction u = (n-1)/floor(T), to 3 decimals,
            so the fold joint n = floor(T)+1 sits at u = 1;
  * below:  the joint index n itself.

At the Farey fraction f = p/q the joints fall into p strands (the denominator
of nu = q/p), each a parabola, because the unwrapped angle is locally
quadratic.  At f = 1 the frequency is one full turn per joint and the angle is
-pi exactly: the fold of the bisector joint.

The strand window also carries the fitted curve: the third-order Taylor model of
phi(n) = -I(T) ln(n/(n-1)) about the caustic joint n_c, one folded arc per
strand j = 0 .. p-1,

    rho_j(delta) = fold( C_j + phi''(n_c) delta^2 / 2 + phi'''(n_c) delta^3 / 6 )

with delta = n - n_c and the per-strand phase constant

    C_j = phi(n_c) + (2 pi q / p) ( round(n_c) + j - n_c ).

The linear term collapses into C_j because along a strand delta advances by p at
a time and (2 pi q / p) p m = 2 pi q m folds away, so the arcs pass exactly
through the dots.

Outputs (into ./figures/):
    fig_joint_angles.pdf   (vector, used by LaTeX)
    fig_joint_angles.png   (raster preview)

Run:  python3 fig_joint_angles.py
"""

import os
from math import gcd

import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import ConnectionPatch

from fig1_spiral_summands import OUTDIR

BASENAME = 'fig_joint_angles'
T = 13000
MAX_DENOM = 7                   # Farey fractions on the top axis
ZOOM_FRAC = 0.9                 # right-end window, in u
STRAND_F = (2, 5)               # Farey fraction of the strand window
STRAND_HALF = 30
LABEL_POS = ((0.5, 0.315), (0.5, 0.885))    # arc labels, tuned for f = 2/5
RED = '#d62728'
BLUE = '#1f77b4'

mp.mp.dps = 40


def I_of(T_int):
    return mp.pi * (2 * T_int + 1) / mp.log(1 + mp.mpf(1) / T_int)


def joint_angles(T_int):
    """theta_n for n = 2 .. T+1, folded to [-pi, pi], plus nu(n)."""
    t = float(I_of(T_int))
    n = np.arange(2, T_int + 2, dtype=np.float64)
    # log1p keeps ln(n/(n-1)) accurate for large n; the product is ~1e9 rad, so
    # the wrapped result still carries ~1e-6 rad, far below a plotted pixel.
    ph = np.mod(-t * np.log1p(1.0 / (n - 1.0)), 2 * np.pi)
    th = np.where(ph > np.pi, ph - 2 * np.pi, ph)
    return n, th, t / (2 * np.pi * n * (n - 1)), t


def exact_theta(T_int, n):
    """One folded joint angle at full precision, for the fold check."""
    w = mp.fmod(-I_of(T_int) * mp.log(mp.mpf(n) / (n - 1)), 2 * mp.pi)
    if w < 0:
        w += 2 * mp.pi
    return float(w - 2 * mp.pi if w > mp.pi else w)


def caustic_joint(f, t):
    """The joint where nu = 1/f, i.e. n(n-1) = f t / 2 pi."""
    return 0.5 * (1.0 + np.sqrt(1.0 + 2.0 * f * t / np.pi))


def caustic_fit(p, q, t):
    """Taylor data of phi(n) = -t ln(n/(n-1)) at the caustic joint of f = p/q.

    Returns the vertex n_c, phi''(n_c), phi'''(n_c), the carrier 2 pi q / p and
    the strand-0 phase constant.  All exact: n_c(n_c-1) = f t / 2 pi holds by
    construction, so no large-T approximation enters.
    """
    nc = caustic_joint(p / q, t)
    w = nc * (nc - 1.0)
    d2 = -t * (2 * nc - 1.0) / w ** 2
    d3 = 2 * t * (3 * nc * nc - 3 * nc + 1.0) / w ** 3
    carrier = 2 * np.pi * q / p
    base = -t * np.log1p(1.0 / (nc - 1.0)) + carrier * (round(nc) - nc)
    return nc, d2, d3, carrier, base


def strand_curve(n, j, fit):
    """Folded arc of strand j at joint positions n (may be non-integer)."""
    nc, d2, d3, carrier, base = fit
    d = n - nc
    raw = base + carrier * j + 0.5 * d2 * d * d + d3 / 6 * d ** 3
    return np.mod(raw + np.pi, 2 * np.pi) - np.pi


def break_folds(y):
    """Insert gaps where a folded curve jumps an edge, so plot() lifts the pen."""
    out = y.copy()
    out[:-1][np.abs(np.diff(y)) > np.pi] = np.nan
    return out


def farey(max_denom):
    """Reduced p/q in (0,1] with q <= max_denom, in increasing order."""
    out = [(p, q) for q in range(1, max_denom + 1)
           for p in range(1, q + 1) if gcd(p, q) == 1]
    return sorted(out, key=lambda pq: pq[0] / pq[1])


def dress(ax, fontsize=8):
    ax.set_ylim(-np.pi, np.pi)
    ax.set_yticks([-np.pi, 0, np.pi])
    ax.set_yticklabels([r'$-\pi$', '0', r'$\pi$'], fontsize=fontsize)
    ax.grid(True, ls=':', alpha=0.3)
    ax.tick_params(labelsize=fontsize)


def main():
    n, th, nu, t = joint_angles(T)
    u = (n - 1.0) / T                       # fold joint n = T+1 sits at u = 1
    print(f'T = {T},  t = I(T) = {t:,.6f}')
    print(f'nu at the fold joint n = T+1: {nu[-1]:.12f}'
          f'   1 + 1/(6T(T+1)) = {1 + 1/(6*T*(T+1)):.12f}')
    print(f'theta at n = T+1: {exact_theta(T, T+1):.15f}  (-pi = {-np.pi:.15f})')
    print('theta at n = T, T-1, T-2:',
          [round(exact_theta(T, T - k), 6) for k in range(3)])

    fig = plt.figure(figsize=(11.6, 5.4))
    gs = fig.add_gridspec(2, 2, height_ratios=[1.0, 1.1], hspace=1.15,
                          wspace=0.14, left=0.055, right=0.985,
                          top=0.80, bottom=0.10)

    ax = fig.add_subplot(gs[0, :])
    ax.plot(u, th, '.', ms=0.7, color='k', rasterized=True)
    # the fold joint: theta = -pi exactly, and the two edges are the same fold,
    # so draw it on the top edge where the strands visibly run into it
    ax.plot([u[-1]], [np.pi], 'o', ms=4.5, mfc='none', mec=RED, mew=1.1,
            clip_on=False, zorder=5)
    ax.set_xlim(0, 1)
    dress(ax)
    ax.set_xticks(np.linspace(0, 1, 11))
    ax.set_xticklabels([f'{v:.3f}' for v in np.linspace(0, 1, 11)], fontsize=8)
    ax.set_xlabel(r'normalized joint fraction $u=(n-1)/\lfloor T\rfloor$',
                  labelpad=1, fontsize=9)
    ax.set_title(rf'joint angles $\theta_n$ at $T={T}.00$'
                 rf' ($t=I(T)={t:,.6f}$)'.replace(',', r'\,')
                 + ', one dot per joint',
                 fontsize=10, pad=52)

    # Farey fractions above the strip, staggered in two rows so the crowded
    # right end stays legible; each sits at its caustic joint.
    fracs = farey(MAX_DENOM)
    tr = ax.get_xaxis_transform()
    for i, (p, q) in enumerate(fracs):
        x = (caustic_joint(p / q, t) - 1) / T
        hi = 0.13 if i % 2 else 0.03
        ax.plot([x, x], [1.0, 1.0 + hi], '-', color='0.45', lw=0.6,
                transform=tr, clip_on=False, zorder=4)
        ax.text(x, 1.02 + hi, rf'$\frac{{{p}}}{{{q}}}$', transform=tr,
                ha='center', va='bottom', fontsize=7.5)
    ax.text(0.5, 1.34, rf'Farey fraction $f=p/q$, $q\leq{MAX_DENOM}$,'
            rf' at its caustic joint', transform=ax.transAxes, ha='center',
            va='bottom', fontsize=8)

    low = ax.secondary_xaxis(-0.62, functions=(lambda v: 1 + v * T,
                                               lambda m: (m - 1) / T))
    low.set_xlabel(r'joint $n$', labelpad=1, fontsize=9, loc='left')
    low.tick_params(labelsize=8)

    strip = ax
    p, q = STRAND_F
    fit = caustic_fit(p, q, t)
    nc = fit[0]
    ax = fig.add_subplot(gs[1, 0])
    sel = (n >= nc - STRAND_HALF) & (n <= nc + STRAND_HALF)
    grid = np.linspace(nc - STRAND_HALF, nc + STRAND_HALF, 1200)
    for j, colour in zip(range(p), (RED, BLUE)):
        ax.plot(grid, break_folds(strand_curve(grid, j, fit)), '-',
                color=colour, lw=0.9, zorder=2)
        # label each arc in the gap left by the other; strand 1 sits half a turn
        # above strand 0, so its own vertex is the pair of arcs at the bottom
        ax.text(*LABEL_POS[j], rf'fitted arc, strand $j={j}$',
                transform=ax.transAxes, ha='center', va='center',
                fontsize=7, color=colour)
    ax.plot(n[sel], th[sel], '.', ms=3.4, color='k', zorder=3)
    ax.set_xlim(nc - STRAND_HALF, nc + STRAND_HALF)
    dress(ax)
    ax.set_xlabel(r'joint $n$', labelpad=1, fontsize=9)
    ax.set_title(rf'$f={p}/{q}$ at $n={nc:.0f}$: {p} parabolic strands,'
                 rf' with the fitted arcs',
                 fontsize=9).set_bbox(dict(fc='white', ec='none', pad=1.5))
    strand_ax = ax

    # the arcs are meant to pass through the dots, not near them
    dev = np.abs(np.mod(strand_curve(n[sel], 0, fit) - th[sel] + np.pi,
                        2 * np.pi) - np.pi)
    dev = np.minimum(dev, np.abs(np.mod(strand_curve(n[sel], 1, fit) - th[sel]
                                        + np.pi, 2 * np.pi) - np.pi))
    print(f'fitted arcs at f={p}/{q}: max |arc - dot| over the window'
          f' = {dev.max():.2e} rad ({np.degrees(dev.max()):.4f} deg)')
    print(f"  n_c = {nc:.4f}, phi'' = {fit[1]:.6e}, phi''' = {fit[2]:.6e},"
          f' carrier = 2 pi q/p = {fit[3]:.6f}')

    ax = fig.add_subplot(gs[1, 1])
    sel = u >= ZOOM_FRAC
    ax.plot(n[sel], th[sel], '.', ms=2.0, color='k')
    ax.plot([n[-1]], [np.pi], 'o', ms=5.0, mfc='none', mec=RED, mew=1.1,
            clip_on=False, zorder=5)
    ax.set_xlim(n[sel][0], n[-1])
    dress(ax)
    ax.set_xlabel(r'joint $n$', labelpad=1, fontsize=9)
    ax.set_title(rf'the run into the fold, $u>{ZOOM_FRAC:.1f}$',
                 fontsize=9).set_bbox(dict(fc='white', ec='none', pad=1.5))
    fold_ax = ax

    # Tie each zoom back to the joint-n scale: a bracket on that scale spanning
    # the window, and a line from each of its ends to the panel below.
    for zoom in (strand_ax, fold_ax):
        lo, hi = zoom.get_xlim()
        for m, corner in ((lo, 0.0), (hi, 1.0)):
            x = (m - 1) / T
            strip.plot([x], [-0.62], marker='|', ms=5, color='0.35',
                       transform=tr, clip_on=False, zorder=4)
            cp = ConnectionPatch(
                xyA=(x, -0.62), coordsA=tr,
                xyB=(corner, 1.0), coordsB=zoom.transAxes,
                lw=0.6, color='0.55', ls=(0, (3, 2)))
            cp.set_clip_on(False)
            # on the strip's own artist list, so the panel titles drawn later
            # stay on top of the lines that pass under them
            strip.add_artist(cp)
        strip.plot([(lo - 1) / T, (hi - 1) / T], [-0.62, -0.62], '-',
                   color='0.35', lw=1.6, transform=tr, clip_on=False, zorder=4)

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf, dpi=400)
    fig.savefig(png, dpi=200)
    plt.close(fig)

    print('caustic joints:', ', '.join(
        f'{p}/{q}: {caustic_joint(p/q, t):.0f}' for p, q in fracs))
    print(f'strand curvature 4 pi nu / n at n={nc:.0f}:'
          f' {4*np.pi*(q/p)/nc:.5f} rad per joint^2')
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
