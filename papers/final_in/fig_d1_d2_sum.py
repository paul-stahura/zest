#!/usr/bin/env python3
"""
fig_d1_d2_sum.py
================

d1, d2 and their sum for sigma = 0.1, 1 <= T <= 7: the poles cancel.

Individually d1 (red) and d2 (green) have genuine narrow poles twice per
unit interval of T (where sin(2w + psi) = 0 and the two bisector links
are parallel), but the poles are equal and opposite: the sum collapses,
by the sum-to-product identity

    d1 + d2 = |R| cos(arg R - psi/2) / cos(w + psi/2),

to a quotient whose singularities are all removable, so d1 + d2 (blue)
is smooth across every pole.  The black dashed curve is the closed form
above, indistinguishable from the blue sum.

Outputs (into ./figures/):
    fig_d1_d2_sum.pdf   (vector, used by LaTeX)
    fig_d1_d2_sum.png   (raster preview)

Run:  python3 fig_d1_d2_sum.py
"""

import os

import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt

from fig1_spiral_summands import I_of_T, chi, OUTDIR

BASENAME = 'fig_d1_d2_sum'
SIGMA = mp.mpf('0.1')
T_MIN, T_MAX = 1, 7
SAMPLES_PER_UNIT = 601        # odd count: never lands exactly on a pole
YLIM = (-1.0, 2.0)
RED = '#d62728'               # d1
GREEN = '#2ca02c'             # d2
BLUE = '#1f77b4'              # d1 + d2

mp.mp.dps = 25


def values(T):
    """(d1, d2, closed-form sum) at index T, sigma = SIGMA."""
    t = I_of_T(mp.mpf(T))
    s = mp.mpc(SIGMA, t)
    m = int(mp.floor(T))
    w = t * mp.log(m + 1)
    ch = chi(s)
    psi = mp.arg(ch)
    S1 = mp.fsum(mp.mpf(n) ** (-s) for n in range(1, m + 1))
    S2 = ch * mp.fsum(mp.mpf(n) ** (s - 1) for n in range(1, m + 1))
    R = mp.zeta(s) - S1 - S2
    phi = mp.arg(R)
    den = mp.sin(2 * w + psi)
    d1 = abs(R) * mp.sin(w - phi + psi) / den
    d2 = abs(R) * mp.sin(w + phi) / den
    closed = abs(R) * mp.cos(phi - psi / 2) / mp.cos(w + psi / 2)
    return float(d1), float(d2), float(closed)


def main():
    fig, ax = plt.subplots(figsize=(9.2, 4.6))

    worst = 0.0
    for n in range(T_MIN, T_MAX):
        Ts = np.linspace(n, n + 1, SAMPLES_PER_UNIT, endpoint=False)
        Ts[0] += 1e-9
        vals = np.array([values(float(T)) for T in Ts])
        ax.plot(Ts, vals[:, 0], '-', color=RED, lw=1.0,
                label=r'$d_1$' if n == T_MIN else None)
        ax.plot(Ts, vals[:, 1], '-', color=GREEN, lw=1.0,
                label=r'$d_2$' if n == T_MIN else None)
        ax.plot(Ts, vals[:, 0] + vals[:, 1], '-', color=BLUE, lw=1.8,
                label=r'$d_1+d_2$' if n == T_MIN else None)
        ax.plot(Ts, vals[:, 2], '--', color='k', lw=1.0,
                label=r'$|R|\cos(\arg R-\psi/2)\,/\cos(\omega+\psi/2)$'
                if n == T_MIN else None)
        worst = max(worst, np.abs(vals[:, 0] + vals[:, 1]
                                  - vals[:, 2]).max())

    for n in range(T_MIN + 1, T_MAX):
        ax.axvline(n, color='0.75', lw=0.7, ls=':')
    ax.axhline(0, color='0.6', lw=0.7)
    ax.grid(True, ls=':', alpha=0.4)
    ax.set_xlim(T_MIN, T_MAX)
    ax.set_ylim(*YLIM)
    ax.set_xlabel(r'index $T$')
    ax.set_ylabel(r'$d_1,\ d_2,\ d_1+d_2$')
    ax.set_title(r'$d_1$, $d_2$ and their sum at $\sigma=0.1$: '
                 'the poles cancel', fontsize=11)
    ax.legend(loc='upper right', fontsize=9, framealpha=0.92)
    fig.tight_layout()

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf)
    fig.savefig(png, dpi=200)
    plt.close(fig)

    print('max |(d1+d2) - closed form| on the grid = %.3e' % worst)
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
