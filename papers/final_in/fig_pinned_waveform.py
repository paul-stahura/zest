#!/usr/bin/env python3
"""
fig_pinned_waveform.py
======================

Companion to fig_h_p_continuous.py: flip alternate arches of p(T) and pin
their ends to zero, so the unit intervals glue into one waveform.

Flipping is free -- it deletes the alternating sign from the local form of p:

    P(T) = (-1)^m p(T) = T^s ( Phi(-1, s, m+1) - d1(T) ),     m = floor(T)

but the ends of each piece are not zero.  They are exactly -eps_m and
+eps_{m+1}, where

    eps_n = n^s ( Phi(-1, s, n) - d1(n^-) )  ~  0.127 n^{-2}

is the shortfall of the fold fraction from the alternating-tail center, so P
jumps by 2 eps_n at each integer.  Subtracting the chord of the two endpoint
values pins both ends exactly (x = T - m):

    W(T) = P(T) + (1-x) eps_m - x eps_{m+1}

W is continuous, vanishes at every integer, and converges like 1/T to the
tangent waveform  Wlim(q) = 1/2 tan(2 pi q) tan(2 pi (q-1/4)(q-3/4)), the
T -> infinity form of the Riemann-Siegel first term.  Continuity is exact but
C^1 is not: the one-sided slopes at an integer differ by O(1/T), both
approaching Wlim'(0) = Wlim'(1) = pi tan(3 pi / 8).  The cubic Hermite
correction that matches the slopes too (dashed green) removes the corner
exactly at the cost of inflating each arch.

Outputs (into ./figures/):
    fig_pinned_waveform.pdf   (vector, used by LaTeX)
    fig_pinned_waveform.png   (raster preview)

Run:  python3 fig_pinned_waveform.py
"""

import os
import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt

from fig1_spiral_summands import OUTDIR
from fig_d1_critical import d1_critical

BASENAME = 'fig_pinned_waveform'
T_MIN, T_MAX = 1, 7
SAMPLES_PER_UNIT = 200
SIGMA = 0.5
EPS = 1e-9                      # offset used for the one-sided limits
H = 1e-5                        # step of the one-sided slopes
PALE = '#9ecae1'
RED = '#d62728'
GREEN = '#117733'

mp.mp.dps = 30

_eps, _tail = {}, {}


def tail(m):
    """Phi(-1, SIGMA, m+1), the alternating tail from link m onwards."""
    if m not in _tail:
        _tail[m] = float(mp.lerchphi(-1, SIGMA, m + 1))
    return _tail[m]


def P_of(T, m):
    """Flipped coordinate on [m, m+1]: p with the alternating sign removed."""
    return T ** SIGMA * (tail(m) - d1_critical(T))


def eps_of(n):
    """Shortfall of the fold fraction from the alternating-tail center."""
    if n not in _eps:
        d = mp.mpf(d1_critical(n - EPS))
        _eps[n] = float(mp.mpf(n) ** SIGMA * (mp.lerchphi(-1, SIGMA, n) - d))
    return _eps[n]


def half_slope_jump(n):
    """(P'(n^-) - P'(n^+)) / 2, the Hermite end slope."""
    sl = (P_of(n - EPS, n - 1) - P_of(n - EPS - H, n - 1)) / H
    sr = (P_of(n + EPS + H, n) - P_of(n + EPS, n)) / H
    return 0.5 * (sl - sr), sl, sr


def hermite(x, y0, y1, m0, m1):
    return ((2 * x ** 3 - 3 * x ** 2 + 1) * y0
            + (x ** 3 - 2 * x ** 2 + x) * m0
            + (-2 * x ** 3 + 3 * x ** 2) * y1
            + (x ** 3 - x ** 2) * m1)


def w_limit(q):
    """Tangent waveform: the T -> infinity shape of a pinned arch."""
    return (0.5 * np.tan(2 * np.pi * q)
            * np.tan(2 * np.pi * (q - 0.25) * (q - 0.75)))


def main():
    fig, axes = plt.subplots(2, 1, figsize=(6.5, 7.6),
                             gridspec_kw={'height_ratios': [1.05, 1]})

    print('interval   max|W - Wlim|   ends of W        one-sided slopes')
    for m in range(T_MIN, T_MAX):
        q = np.linspace(0, 1, SAMPLES_PER_UNIT)
        q[0], q[-1] = EPS, 1 - EPS
        Ts = m + q
        Pr = np.array([P_of(float(T), m) for T in Ts])
        chord = -(1 - q) * eps_of(m) + q * eps_of(m + 1)
        d_lo = half_slope_jump(m)[0] if m > T_MIN else 0.0
        d_hi, sl, sr = half_slope_jump(m + 1)
        herm = hermite(q, -eps_of(m), eps_of(m + 1), -d_lo, d_hi)

        first = (m == T_MIN)
        axes[0].plot(Ts, Pr, '-', lw=2.6, color=PALE,
                     label=r'$P(T)=(-1)^{m}p(T)$, unpinned' if first else None)
        axes[0].plot(Ts, Pr - chord, '-', lw=1.1, color=RED,
                     label=r'$\mathcal{W}(T)$, chord pinned' if first else None)
        axes[0].plot(Ts, Pr - herm, '--', lw=1.0, color=GREEN,
                     label=r'Hermite pinned' if first else None)
        axes[1].plot(q, Pr - chord, '-', lw=1.0, label=rf'$[{m},{m+1}]$')

        away = (np.abs(q - 0.25) > 0.02) & (np.abs(q - 0.75) > 0.02)
        dev = np.max(np.abs((Pr - chord) - w_limit(q))[away])
        print(f'[{m},{m+1}]     {dev:.5f}      {Pr[0]-chord[0]:+.1e}'
              f' {Pr[-1]-chord[-1]:+.1e}    {sl:7.4f} / {sr:7.4f}')

    q = np.linspace(0, 1, 1500)
    axes[1].plot(q, w_limit(q), 'k--', lw=1.4, label='tangent limit')
    axes[1].set_ylim(-0.35, 0.35)
    axes[1].set_xlim(0, 1)
    axes[1].set_xlabel(r'$q=\{T\}$', fontsize=9)
    axes[1].set_title('the pinned arches overlaid, against the tangent limit',
                      fontsize=9)
    axes[1].legend(fontsize=7, ncol=4, loc='lower center')

    axes[0].axhline(0, color='0.6', lw=0.8)
    for n in range(T_MIN, T_MAX + 1):
        axes[0].axvline(n, color='0.8', lw=0.7, ls=':')
    axes[0].set_xlim(T_MIN, T_MAX)
    axes[0].set_xlabel(r'index $T$', fontsize=9)
    axes[0].set_title(r'flipped arches, unpinned and pinned to $0$'
                      r' at every integer', fontsize=9)
    axes[0].legend(fontsize=7.5, loc='lower center')

    # inset: the 2 eps_n mismatch of the unpinned flip at T = 2
    ax = axes[0].inset_axes([0.125, 0.545, 0.20, 0.36])
    q = np.linspace(-0.06, 0.06, 61)
    lo, hi = q < 0, q > 0
    Pl = np.array([P_of(float(2 + u), 1) for u in q[lo]])
    Ph = np.array([P_of(float(2 + u), 2) for u in q[hi]])
    ax.plot(2 + q[lo], Pl, '-', color=PALE, lw=2.6)
    ax.plot(2 + q[hi], Ph, '-', color=PALE, lw=2.6)
    xl, xh = 1 + q[lo], q[hi]
    ax.plot(2 + q[lo], Pl - (-(1 - xl) * eps_of(1) + xl * eps_of(2)), '-',
            color=RED, lw=1.1)
    ax.plot(2 + q[hi], Ph - (-(1 - xh) * eps_of(2) + xh * eps_of(3)), '-',
            color=RED, lw=1.1)
    ax.axhline(0, color='0.6', lw=0.6)
    ax.set_title(r'$T=2$: jump $2\varepsilon_2$', fontsize=7, pad=2,
                 backgroundcolor='white')
    ax.tick_params(labelsize=6)

    for a in axes:
        a.grid(True, ls=':', alpha=0.35)
        a.tick_params(labelsize=8)
    fig.tight_layout()

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf)
    fig.savefig(png, dpi=200)
    plt.close(fig)

    print('\neps_n:', ', '.join(f'{n}: {eps_of(n):.3e}'
                                for n in range(2, T_MAX + 1)))
    print('Wlim\'(0) = pi tan(3 pi/8) =', np.pi * np.tan(3 * np.pi / 8))
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
