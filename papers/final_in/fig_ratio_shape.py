#!/usr/bin/env python3
"""
fig_ratio_shape.py
==================

The shape of the pole-split after dividing by R.  On the critical line
Re(R_1ps/R) = 1/2 identically, so the whole split is carried by the single
real number Im(R_1ps/R), and this figure plots that number against the
fractional part of T.

Top panel: four heights, floor(T) = 6, 20, 60, 200, computed the long way
(R = zeta - S1 - S2, then the Cramer solution for d1, then d1 e^{-i w} / R),
against the closed-form limit

    Im(R_1ps/R)  ->  (1/2) tan( 2 pi (x - 1/4)(x - 3/4) ),      x = frac(T),

which is the second tangent factor of the limit waveform d(x) of the d1
limit theorem.  Its value at the integers is (1 + sqrt 2)/2 and at x = 1/2
is (1 - sqrt 2)/2, so the curve swings by exactly sqrt 2.  It vanishes at
the two parallel-link instants, where R_1ps = R_2ps = R/2.

Bottom panel: distance from that limit, which falls off like 1/T.

Outputs (into ./figures/):
    fig_ratio_shape.pdf   (vector, used by LaTeX)
    fig_ratio_shape.png   (raster preview)

Run:  python3 fig_ratio_shape.py      (about 30 s)
"""

import os
import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt

from fig1_spiral_summands import I_of_T, chi, OUTDIR

BASENAME = 'fig_ratio_shape'
HEIGHTS = [(6, '#bdd7e7'), (20, '#6baed6'), (60, '#2171b5'), (200, '#08306b')]
ORANGE, RED = '#d95f02', '#d62728'
ROOT2 = float(mp.sqrt(2))

mp.mp.dps = 40


def ratio(T):
    """R_1ps / R at (sigma = 1/2, index T), by the route of Section 4."""
    T = mp.mpf(T)
    t = I_of_T(T)
    s = mp.mpc('0.5', t)
    m = int(mp.floor(T))
    w = t * mp.log(m + 1)
    ch = chi(s)
    psi = mp.arg(ch)

    S1 = mp.fsum(mp.mpf(n) ** (-s) for n in range(1, m + 1))
    S2 = ch * mp.fsum(mp.mpf(n) ** (s - 1) for n in range(1, m + 1))
    R = mp.zeta(s) - S1 - S2

    u1, u2 = mp.exp(-1j * w), mp.exp(1j * (w + psi))
    a, b = mp.re(u1), mp.re(u2)
    c, d = mp.im(u1), mp.im(u2)
    d1 = (mp.re(R) * d - b * mp.im(R)) / (a * d - b * c)
    return d1 * u1 / R, mp.sin(2 * w + psi), -mp.tan(w - mp.siegeltheta(t)) / 2


def limit_curve(x):
    """(1/2) tan(2 pi (x - 1/4)(x - 3/4)), the T -> infinity shape."""
    x = np.asarray(x, dtype=float)
    return 0.5 * np.tan(2 * np.pi * (x - 0.25) * (x - 0.75))


def parallel_instant(N, lo, hi):
    """Where sin(2 omega + arg chi) vanishes inside (N + lo, N + hi)."""
    a, b = mp.mpf(N) + mp.mpf(lo), mp.mpf(N) + mp.mpf(hi)
    fa = ratio(a)[1]
    for _ in range(70):
        c = (a + b) / 2
        if fa * ratio(c)[1] <= 0:
            b = c
        else:
            a, fa = c, ratio(c)[1]
    return (a + b) / 2


def main():
    edge = np.logspace(-5, np.log10(0.02), 26)
    xs = np.unique(np.concatenate([edge, np.linspace(0.02, 0.98, 190),
                                   1 - edge]))
    lim = limit_curve(xs)
    print('%d sample points per height, %d in all'
          % (len(xs), len(xs) * len(HEIGHTS)))

    curves, worst_re, worst_tan = {}, 0.0, 0.0
    for N, _ in HEIGHTS:
        vals = []
        for x in xs:
            z, _, tan_form = ratio(N + x)
            vals.append(float(mp.im(z)))
            worst_re = max(worst_re, float(abs(mp.re(z) - mp.mpf(1) / 2)))
            worst_tan = max(worst_tan, float(abs(mp.im(z) - tan_form)))
        curves[N] = np.array(vals)
        gap = np.abs(curves[N] - lim).max()
        print('floor(T) = %3d: Im in [%+.6f, %+.6f], worst distance from the '
              'limit %.2e' % (N, curves[N].min(), curves[N].max(), gap))
    print('max |Re - 1/2| = %.2e,  max |Im + tan(w - theta)/2| = %.2e'
          % (worst_re, worst_tan))

    roots = [float(parallel_instant(200, 0.2, 0.3) % 1),
             float(parallel_instant(200, 0.7, 0.8) % 1)]
    print('parallel-link instants at floor(T) = 200: {T} = %.6f, %.6f'
          % tuple(roots))

    fig, (ax, bx) = plt.subplots(2, 1, figsize=(8.4, 6.9),
                                 gridspec_kw=dict(height_ratios=[2.0, 1],
                                                  hspace=0.36))

    # ---- top: the shape itself ------------------------------------------
    for lev, lab, va in (((1 + ROOT2) / 2, r'$(1+\sqrt{2})/2$', 'bottom'),
                         ((1 - ROOT2) / 2, r'$(1-\sqrt{2})/2$', 'top')):
        ax.axhline(lev, color='0.6', lw=0.7, ls=':', zorder=2)
        ax.text(0.985, lev, lab, color='0.35', fontsize=8.5, ha='right',
                va=va, zorder=7)
    ax.plot(xs, lim, '-', color=ORANGE, lw=5.5, alpha=0.40, zorder=3,
            solid_capstyle='round',
            label=r'$\frac{1}{2}\tan(2\pi(x-\frac{1}{4})(x-\frac{3}{4}))$')
    for N, col in HEIGHTS:
        ax.plot(xs, curves[N], '-', color=col, lw=1.4, zorder=4,
                label=rf'$\lfloor T\rfloor={N}$')
    for q in roots:
        ax.plot(q, 0, 'o', ms=6.0, mfc='white', mec=RED, mew=1.4, zorder=6)
    ax.annotate('parallel-link instants: '
                r'$R_{1ps}=R_{2ps}=R/2$, the ratio is real',
                xy=(roots[0] + 0.006, 0.012), xytext=(0.30, 0.46),
                fontsize=8.5, color=RED, ha='left',
                arrowprops=dict(arrowstyle='->', lw=0.8, color=RED))
    ax.axhline(0, color='0.78', lw=0.7, zorder=1)
    ax.set_xlim(0, 1)
    ax.set_ylim(-0.40, 1.35)
    ax.set_xlabel(r'fractional part $x=\{T\}$', fontsize=9.5)
    ax.set_ylabel(r'$\mathrm{Im}\,(R_{1ps}/R)$', fontsize=9.5)
    ax.set_title(r'The whole split in one real number: '
                 r'$R_{1ps}/R = 1/2 + i\,\mathrm{Im}(R_{1ps}/R)$ '
                 r'on $\sigma=1/2$', fontsize=11)
    ax.grid(True, ls=':', alpha=0.4)
    ax.legend(fontsize=8.5, loc='center', bbox_to_anchor=(0.5, 0.82), ncol=5,
              columnspacing=1.1, handlelength=1.6)

    # ---- bottom: convergence --------------------------------------------
    for N, col in HEIGHTS:
        bx.semilogy(xs, np.abs(curves[N] - lim), '-', color=col, lw=1.3,
                    label=rf'$\lfloor T\rfloor={N}$')
    bx.set_xlim(0, 1)
    bx.set_ylim(1e-6, 3e-2)
    bx.set_xlabel(r'fractional part $x=\{T\}$', fontsize=9.5)
    bx.set_ylabel('distance from\nthe limit', fontsize=9)
    bx.set_title(r'the leftover height dependence, $O(1/T)$ away from '
                 r'$x=1/2$ and $O(1/T^{2})$ at it', fontsize=9.5)
    bx.grid(True, which='both', ls=':', alpha=0.35)
    bx.legend(fontsize=8, loc='lower center', ncol=4, columnspacing=1.1,
              handlelength=1.6)

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf, bbox_inches='tight')
    fig.savefig(png, dpi=200, bbox_inches='tight')
    plt.close(fig)
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
