#!/usr/bin/env python3
"""
fig_incremental_change.py
=========================

How the joint-angle strip of fig_joint_angles.py moves when the index advances.

Advancing T by dT changes every joint angle by

    d theta_n = -I'(T) dT ln(n/(n-1)),

so in cycles the drift rate of joint n is

    mu(n) = I'(T) ln(n/(n-1)) / 2 pi  ~  (2T+1)/(n - 1/2)  ~  2/u,

with u = (n-1)/floor(T).  Three readings of that:

  * mu(n) = 3 means the dot laps the strip three times, falling from +pi to -pi
    and reappearing, while T advances by one;
  * at the bisector joint n = floor(T)+1 it is exactly 2 cycles per unit index,
    which is the "revolves twice per unit T" fact the i-function is built on;
  * to the left it grows like 1/u, so the strip does not translate, it shears.

Three panels: the whole strip at T = 13000; its first half twice over, gray at
T = 13000 and red at T = 13000.02, with 50 joints spaced evenly across the
panel circled in both colors and an arrow along the path traveled, wrapping
at the lower edge because the drift is downward at every joint, and sweeping the
whole strip from pi to -pi where the travel passes a full turn; and mu itself on
a log axis.

Outputs (into ./figures/):
    fig_incremental_change.pdf   (vector, used by LaTeX)
    fig_incremental_change.png   (raster preview)

Run:  python3 fig_incremental_change.py
"""

import os

import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.patches import ConnectionPatch, FancyArrowPatch

from fig1_spiral_summands import OUTDIR
from fig_joint_angles import I_of, caustic_joint, dress, farey

BASENAME = 'fig_incremental_change'
T0 = 13000
DT = 0.02
ZOOM_U = 0.5                    # the middle panel covers u in [0, ZOOM_U]
N_MARK = 50                     # circled joints, spaced evenly in u
MAX_DENOM = 7                   # Farey fractions above each strip
GREY = '0.55'
RED = '#d62728'
BLUE = '#3b7fd4'

mp.mp.dps = 40


def angles(T_val):
    """Folded joint angles of the chain at index T_val, and t = I(T_val)."""
    m = int(mp.floor(T_val))
    t = float(I_of(T_val))
    n = np.arange(2, m + 2, dtype=np.float64)
    ph = np.mod(-t * np.log1p(1.0 / (n - 1.0)), 2 * np.pi)
    return n, np.where(ph > np.pi, ph - 2 * np.pi, ph), t


def I_prime(T_val):
    """dI/dT, by exact differentiation of I(T) = pi (2T+1) / ln(1 + 1/T)."""
    T = mp.mpf(T_val)
    L = mp.log(1 + 1 / T)
    return float(mp.pi * (2 * L + (2 * T + 1) / (T * (T + 1))) / L ** 2)


def fold(x):
    return np.mod(x + np.pi, 2 * np.pi) - np.pi


def travel(a, drift):
    """The path from angle a down by |drift| mod one turn, wrapping at -pi.

    Every joint drifts the same way, downward, so the path is drawn downward and
    reduced to one turn: pieces of it, in order, as (y_start, y_end) pairs.
    """
    step = -np.mod(-drift, 2 * np.pi)           # in (-2 pi, 0]
    end = a + step
    if end >= -np.pi:
        return [(a, end)]
    return [(a, -np.pi), (np.pi, end + 2 * np.pi)]


def farey_axis(ax, t, m, u_max, stagger, fontsize=7.5):
    """Farey fractions above a strip, each at its caustic joint."""
    tr = ax.get_xaxis_transform()
    for i, (p, q) in enumerate(farey(MAX_DENOM)):
        x = (caustic_joint(p / q, t) - 1) / m
        if x > u_max:
            continue
        hi = stagger if i % 2 else 0.0
        ax.plot([x, x], [1.0, 1.06 + hi], '-', color='0.45', lw=0.6,
                transform=tr, clip_on=False, zorder=4)
        ax.text(x, 1.08 + hi, rf'$\frac{{{p}}}{{{q}}}$', transform=tr,
                ha='center', va='bottom', fontsize=fontsize)


def main():
    n, th0, t0 = angles(mp.mpf(T0))
    _, th1, t1 = angles(mp.mpf(T0) + mp.mpf('0.02'))
    m = int(T0)
    u = (n - 1.0) / m
    ip = I_prime(T0)
    drift = -(t1 - t0) * np.log1p(1.0 / (n - 1.0))      # true, unwrapped
    mu = ip * np.log1p(1.0 / (n - 1.0)) / (2 * np.pi)   # cycles per unit index

    print(f'T = {T0} -> {T0 + DT},  I(T) = {t0:,.6f} -> {t1:,.6f}'
          f'   dI = {t1 - t0:.6f}')
    print(f"I'(T) = {ip:,.6f}   4 pi T + 2 pi = {4 * np.pi * T0 + 2 * np.pi:,.6f}")
    nu_fold = t0 / (2 * np.pi * n[-1] * (n[-1] - 1))
    print(f'drift at the bisector joint: mu = {mu[-1]:.9f} cycles per unit index'
          f'   nu = {nu_fold:.9f} cycles per joint'
          f'   mu - nu = {mu[-1] - nu_fold:.9f}'
          f'   (the moving fold: d/dT of pi(2T+1) is 1 cycle)')
    for uu in (1.0, 0.5, 0.25, 0.1, 0.08, 0.04):
        k = int(np.argmin(np.abs(u - uu)))
        print(f'  u = {u[k]:.4f} (n = {int(n[k]):5d}): mu = {mu[k]:8.3f} cycles/unit'
              f'   1/mu = {1 / mu[k]:.6f}'
              f'   drift over dT = {np.degrees(drift[k]):10.2f} deg')
    print(f'  n = 2: mu = {mu[0]:,.1f} cycles/unit, 2/u = {2 / u[0]:,.1f},'
          f' drift over dT = {drift[0]:.1f} rad = {drift[0] / (2 * np.pi):.1f} turns')
    print(f'half a turn per step at u = {2 * DT / 0.5:.4f}'
          f' (n = {1 + 2 * DT / 0.5 * m:.0f}),'
          f' a full turn at u = {2 * DT:.4f} (n = {1 + 2 * DT * m:.0f})')

    fig = plt.figure(figsize=(11.6, 7.0))
    x0, w = 0.055, 0.930
    top = fig.add_axes([x0, 0.735, w, 0.130])
    mid = fig.add_axes([x0, 0.320, w, 0.260])
    spd = fig.add_axes([x0, 0.075, w, 0.090])

    # ── the whole strip ──────────────────────────────────────────────────────
    top.plot(u, th0, '.', ms=0.7, color='k', rasterized=True)
    top.set_xlim(0, 1)
    dress(top)
    top.set_xlabel(r'normalized joint fraction $u=(n-1)/\lfloor T\rfloor$',
                   labelpad=1, fontsize=9)
    top.set_title(rf'the whole strip at $T={T0}$, as in the previous figure;'
                  rf' the shaded half is magnified below', fontsize=10, pad=44)
    top.axvspan(0, ZOOM_U, color=RED, alpha=0.07, zorder=0)
    farey_axis(top, t0, m, 1.0, 0.38)

    # ── the same half at both indices, with the travel of 50 joints ──────────
    sel = u <= ZOOM_U
    mid.plot(u[sel], th0[sel], '.', ms=0.9, color=GREY, rasterized=True,
             zorder=1)
    mid.plot(u[sel], th1[sel], '.', ms=0.9, color=RED, rasterized=True,
             zorder=2)

    targets = np.linspace(ZOOM_U / N_MARK, ZOOM_U, N_MARK)
    picks = np.unique([int(np.argmin(np.abs(u - x))) for x in targets])
    wrapped = 0
    for k in picks:
        if abs(drift[k]) > 2 * np.pi:
            # a whole turn or more: sweep the strip rather than draw a residue
            wrapped += 1
            pieces = [(np.pi, -np.pi)]
        else:
            pieces = travel(th0[k], drift[k])
            assert abs(fold(pieces[-1][1] - th1[k])) < 1e-6
        for j, (ya, yb) in enumerate(pieces):
            if j < len(pieces) - 1:              # runs off the lower edge
                mid.plot([u[k], u[k]], [ya, yb], '-', color='0.25', lw=0.8,
                         zorder=3)
            else:                                # ends at the red dot
                mid.add_patch(FancyArrowPatch(
                    (u[k], ya), (u[k], yb), arrowstyle='-|>',
                    mutation_scale=8, shrinkA=0, shrinkB=3.5, lw=0.8,
                    color='0.25', zorder=3))
        mid.plot([u[k]], [th0[k]], 'o', ms=6.0, mfc='none', mec='0.35',
                 mew=1.2, zorder=4)
        mid.plot([u[k]], [th1[k]], 'o', ms=6.0, mfc='none', mec=RED, mew=1.2,
                 zorder=4)
    print(f'{len(picks)} joints circled, {wrapped} of them past a full turn'
          f' (drawn as a full sweep from pi to -pi)')

    mid.set_xlim(0, ZOOM_U)
    dress(mid)
    mid.set_xlabel(r'normalized joint fraction $u=(n-1)/\lfloor T\rfloor$'
                   r'   (first half of the strip)', labelpad=2, fontsize=9)
    mid.set_title(rf'the same joints at $T={T0}$ (gray) and $T={T0}.02$ (red):'
                  rf' each drifts down by $\approx 2\,\Delta T/u$ cycles',
                  fontsize=10, pad=26)
    farey_axis(mid, t0, m, ZOOM_U, 0.0)

    low = mid.secondary_xaxis(-0.22, functions=(lambda v: 1 + v * m,
                                                 lambda k: (k - 1) / m))
    low.set_xlabel(r'joint $n$', labelpad=1, fontsize=9, loc='left')
    low.tick_params(labelsize=8)

    handles = [Line2D([], [], ls='none', marker='o', mfc='none', mec='0.35',
                      ms=6, label=rf'joint at $T={T0}$'),
               Line2D([], [], ls='none', marker='o', mfc='none', mec=RED,
                      ms=6, label=rf'the same joint at $T={T0}.02$'),
               Line2D([], [], ls='-', color='0.25', lw=0.8,
                      label='travel, wrapping at the lower edge')]
    mid.legend(handles=handles, fontsize=7, loc='lower center', ncol=3,
               handlelength=1.8, columnspacing=1.2, borderpad=0.35,
               framealpha=0.92)

    # ── the speed overlay itself ─────────────────────────────────────────────
    ug = np.linspace(1.0 / m, ZOOM_U, 3000)
    ng = 1.0 + ug * m
    spd.semilogy(ug, ip * np.log1p(1.0 / (ng - 1.0)) / (2 * np.pi), '-',
                 color=BLUE, lw=1.3, label=r'$\mu(n)$, exact')
    spd.semilogy(ug, 2.0 / ug, '--', color='0.55', lw=0.8, label=r'$2/u$')
    spd.axhline(1.0 / DT, ls=(0, (4, 2)), color=RED, lw=0.8,
                label=rf'one turn per $\Delta T={DT}$')
    spd.axvline(2 * DT, ls=(0, (1, 2)), color=RED, lw=0.8)
    mid.axvline(2 * DT, ls=(0, (1, 2)), color=RED, lw=0.8, zorder=5)
    spd.set_xlim(0, ZOOM_U)
    spd.set_ylim(3, 3e4)
    spd.set_yticks([10, 1e2, 1e3, 1e4])
    spd.grid(True, which='both', ls=':', alpha=0.3)
    spd.tick_params(labelsize=8)
    spd.set_xlabel(r'normalized joint fraction $u$', labelpad=1, fontsize=9)
    spd.set_ylabel('cycles per\nunit index', fontsize=8, labelpad=2)
    spd.set_title(r'the speed overlay $\mu(n)=I^{\prime}(T)\log(n/(n-1))/2\pi$,'
                  r' log scale: $\mu=4$ at $u=1/2$, and $\mu=2$ at the fold,'
                  r' off panel to the right', fontsize=9, pad=5)
    spd.legend(fontsize=7, loc='upper right', ncol=3, handlelength=1.8,
               columnspacing=1.2, borderpad=0.3, framealpha=0.92)

    # tie the middle panel back to the stretch of the top strip it magnifies
    for x_top, corner in ((0.0, 0.0), (ZOOM_U, 1.0)):
        cp = ConnectionPatch(xyA=(x_top, 0.0), coordsA=top.get_xaxis_transform(),
                             xyB=(corner, 1.0), coordsB=mid.transAxes,
                             lw=0.6, color='0.55', ls=(0, (3, 2)))
        cp.set_clip_on(False)
        top.add_artist(cp)

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf, dpi=400)
    fig.savefig(png, dpi=200)
    plt.close(fig)
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
