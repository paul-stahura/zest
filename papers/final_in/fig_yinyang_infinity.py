#!/usr/bin/env python3
"""
fig_yinyang_infinity.py
=======================

Convergence of the yin and yang curves to the limit curve Y_inf,
regardless of sigma.

    Y_inf(u) = 1 - Psi(u) e^{-2 pi i (u^2 - 1/16)},
    Psi(u)   = cos(2 pi (u^2 - u - 1/16)) / cos(2 pi u),

with Psi the Riemann-Siegel correction function -- the same universal
function as the C0 of the paper's d1 approximation section.  As T ->
infinity with q = frac(T) held fixed, Y_in1(sigma, T) -> Y_inf(q) at
rate O(1/T) uniformly in sigma; the yang endpoint traces the same curve
half a period behind, Y_ang1(T) ~ Y_in1(T - 1/2).

Top panel:    sigma = 0.2, the yin paths for every handoff period
              0 < T < 8 (the first one, 0 < T < 1, IS the iconic zeta
              trajectory: both partial sums are empty there, so
              Y_in1 = zeta -- overlaid with spaced brown dots), with
              Y_inf dashed black on top.
Bottom panel: sigma = 0.9, yin paths for the periods starting at
              T = 1, 2, 4, 8, 16, 32 (light -> dark green), with Y_inf
              dashed black: by T ~ 32 the path is visually
              indistinguishable from the limit curve even this far from
              the critical line.

The two panels are stacked vertically and share identical box sizes
(same x-span and y-span, equal aspect), so the limit curve appears at
the same scale in both.

Outputs (into ./figures/):
    fig_yinyang_infinity.pdf   (vector, used by LaTeX)
    fig_yinyang_infinity.png   (raster preview)

Run:  python3 fig_yinyang_infinity.py   (takes a minute or two)
"""

import os

import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt

from fig1_spiral_summands import I_of_T, chi, C, OUTDIR

BASENAME = 'fig_yinyang_infinity'
N_PATH = 360
GREEN = '#2ca02c'
BROWN = '#8c564b'

mp.mp.dps = 20


def yin(sigma, T):
    t = I_of_T(mp.mpf(T))
    s = mp.mpc(sigma, t)
    m = int(mp.floor(T))
    ch = chi(s)
    S1 = mp.fsum(mp.mpf(n) ** (-s) for n in range(1, m + 1))
    S2 = ch * mp.fsum(mp.mpf(n) ** (s - 1) for n in range(1, m + 1))
    R = mp.zeta(s) - S1 - S2
    return C(R * mp.mpf(m + 1) ** s)


def psi_fn(u):
    return mp.cos(2 * mp.pi * (u ** 2 - u - mp.mpf(1) / 16)) \
        / mp.cos(2 * mp.pi * u)


def y_inf_curve(n=801):
    us = np.linspace(0, 1, n) + 1.234e-4      # dodge u = 1/4, 3/4 exactly
    return np.array([C(1 - psi_fn(mp.mpf(u))
                        * mp.exp(-2j * mp.pi * (mp.mpf(u) ** 2
                                                - mp.mpf(1) / 16)))
                     for u in us])


def yin_path(sigma, m, n=N_PATH):
    eps = 1e-4
    Ts = np.linspace(m + eps, m + 1 - eps, n)
    return np.array([yin(sigma, float(T)) for T in Ts])


def main():
    fig, axes = plt.subplots(2, 1, figsize=(8.8, 10.6))
    limit = y_inf_curve()

    # ---- top: sigma = 0.2, all periods 0 < T < 8 ------------------------
    ax = axes[0]
    for m in range(0, 8):
        path = yin_path(0.2, m)
        ax.plot(path.real, path.imag, '-', color=GREEN, lw=0.9,
                alpha=0.85, zorder=2,
                label=r'$m=0,\dots,7$' if m == 0 else None)
        if m == 0:
            # the m = 0 path is zeta itself: mark it with spaced brown
            # dots so the thin green line stays visible underneath
            ax.plot(path.real[::5], path.imag[::5], 'o', color=BROWN,
                    ms=2.6, ls='none', zorder=3,
                    label=r'$m=0$:  $Y_{in1}=\zeta(\sigma+it)$,  $0<T<1$')
    ax.plot(limit.real, limit.imag, '--', color='k', lw=2.4, zorder=4,
            label=r'$Y_{\inf}$')
    ax.set_title(r'$\sigma=0.2$:  yin paths for $0<T<8$', fontsize=11)

    # ---- bottom: sigma = 0.9, periods m = 0, 1, 2, 4, 8, 16, 32 -----------
    ax = axes[1]
    ms_right = (0, 1, 2, 4, 8, 16, 32)
    cmap = plt.get_cmap('Greens')
    for i, m in enumerate(ms_right):
        path = yin_path(0.9, m)
        col = cmap(0.35 + 0.6 * i / (len(ms_right) - 1))
        ax.plot(path.real, path.imag, '-', color=col, lw=1.1,
                zorder=2, label=r'$m=%d$' % m)
        if m == 0:
            # as on the left: the m = 0 orbit is zeta itself
            ax.plot(path.real[::5], path.imag[::5], 'o', color=BROWN,
                    ms=2.6, ls='none', zorder=3,
                    label=r'$m=0$:  $\zeta(\sigma+it)$')
    ax.plot(limit.real, limit.imag, '--', color='k', lw=2.4, zorder=4,
            label=r'$Y_{\inf}$')
    ax.set_title(r'$\sigma=0.9$:  yin paths for $m=0,1,2,4,8,16,32$',
                 fontsize=11)

    for ax in axes:
        ax.plot([0, 1], [0, 0], '-', color='k', lw=2.2,
                solid_capstyle='round', zorder=5)
        ax.plot([0, 1], [0, 0], 'o', color='k', ms=3.5, zorder=6)
        ax.grid(True, ls=':', alpha=0.35)
        ax.set_xlabel('Re')
        ax.set_ylabel('Im')
    axes[0].legend(loc='upper left', fontsize=9, framealpha=0.92)
    axes[1].legend(loc='lower left', fontsize=9, framealpha=0.92)

    # identical box sizes for the two panels: take the top panel's data
    # bounds (padded) and the bottom panel's teardrop clip window (sigma =
    # 0.9 is close to the pole of zeta at s = 1, so the m = 0 orbit dives
    # to about -2.7i and would otherwise squash the convergence detail),
    # then give both panels the larger of the two spans, each centered on
    # its own region of interest
    pad = 0.08
    db = axes[0].dataLim
    top = (db.x0 - pad, db.x1 + pad, db.y0 - pad, db.y1 + pad)
    bot = (-0.75, 1.85, -1.0, 0.6)
    w = max(top[1] - top[0], bot[1] - bot[0])
    h = max(top[3] - top[2], bot[3] - bot[2])
    for ax, (x0, x1, y0, y1) in zip(axes, (top, bot)):
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        ax.set_aspect('equal', adjustable='box')
        ax.set_xlim(cx - w / 2, cx + w / 2)
        ax.set_ylim(cy - h / 2, cy + h / 2)

    fig.suptitle('Convergence of the yin curves to '
                 r'$Y_{\inf}(q)=1-\Psi(q)\,e^{-2\pi i(q^2-1/16)}$,'
                 r'  $q=\mathrm{frac}(T)$', fontsize=12)
    fig.tight_layout(rect=(0, 0, 1, 0.97))

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf)
    fig.savefig(png, dpi=200)
    plt.close(fig)

    # measured convergence rate (printed for the caption/text)
    for sigma in (0.2, 0.5, 0.9):
        for m in (10, 40):
            errs = []
            for k in range(1, 20):
                q = k / 20
                if abs(q - 0.25) < 0.001 or abs(q - 0.75) < 0.001:
                    continue
                y = yin(sigma, m + q)
                lim = C(1 - psi_fn(mp.mpf(q))
                        * mp.exp(-2j * mp.pi * (mp.mpf(q) ** 2
                                                - mp.mpf(1) / 16)))
                errs.append(abs(y - lim))
            print('sigma=%.1f, T~%d: max |Y_in1 - Y_inf(q)| = %.5f'
                  % (sigma, m, max(errs)))
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
