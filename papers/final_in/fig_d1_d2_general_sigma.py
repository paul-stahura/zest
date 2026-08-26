#!/usr/bin/env python3
"""
fig_d1_d2_general_sigma.py
==========================

The general-sigma first-term approximation of BOTH fractional weights d1
and d2 (eq. R-general in the paper), drawn against the exact values at
sigma = 0.3 and sigma = 0.7, 1 <= T <= 7.

Siegel's saddle-point first term for the remainder at general
s = sigma + i t splits into one piece per chain:

    R(s) ~ (-1)^{N-1} (C0(p^)/2) [ a^{-sigma} e^{-i th~}
                                   + chi(s) a^{sigma-1} e^{+i th~} ],

a = sqrt(t/2pi), N = floor(a), p^ = a - N,
C0(p^) = cos(2pi(p^2 - p^ - 1/16)) / cos(2pi p^),
th~(t) = t/2 ln(t/2pi) - t/2 - pi/8   (elementary phase).

When N = m+1 the extra summand pair (m+1)^{-s} + chi (m+1)^{s-1} is added
(the RS main sums carry one more term than Sigma1, Sigma2).  The paper's
Cramer solve with exact w = t ln(m+1) and psi = arg chi then yields d1 AND
d2 simultaneously -- everything zeta-free (chi is Gamma factors).  At
sigma = 1/2 the bracket collapses to 2 e^{-i theta} and this reduces
exactly to eq. d1-rs.

Accuracy (validated here and printed): max |error| away from the pole
windows (|q - 1/4|, |q - 3/4| > 0.06) decays like T^{-sigma-1}; d1 itself
scales like T^{-sigma}, so the relative error is O(1/T) uniformly in
sigma.  Off the line the exact d1, d2 have genuine narrow poles at the
parallel-link heights q ~ 1/4, 3/4; the first-term approximation smooths
through those spikes (locally large error there).

Axes: x in [1,7], y in [0, 0.7].  The pole spikes leave the frame.
Colors: d1 red, d2 green (matching the R1ps / leg-2 colors of the earlier
figures); the dashed approximations use the same color as their exact
counterparts.

Outputs (into ./figures/):
    fig_d1_d2_general_sigma.pdf   (vector, used by LaTeX)
    fig_d1_d2_general_sigma.png   (raster preview)

Run:  python3 fig_d1_d2_general_sigma.py
"""

import os

import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt

from fig1_spiral_summands import I_of_T, chi, OUTDIR

BASENAME = 'fig_d1_d2_general_sigma'
SIGMAS = (0.3, 0.7)
T_MIN, T_MAX = 1, 7
# 301 samples/unit: grid never lands exactly on q = 1/4, 3/4 (poles)
SAMPLES_PER_UNIT = 301
YLIM = (0.0, 0.7)
RED = '#d62728'              # d1 (the R1ps color of the earlier figures)
GREEN = '#2ca02c'            # d2 (sum-2 side, the leg-2 color)

mp.mp.dps = 25


def cramer(R, w, psi):
    """Solve R = d1 e^{-iw} + d2 e^{i(w+psi)} for real d1, d2."""
    u1 = mp.exp(-1j * w)
    u2 = mp.exp(1j * (w + psi))
    a, b = mp.re(u1), mp.re(u2)
    c, d = mp.im(u1), mp.im(u2)
    det = a * d - b * c
    d1 = (mp.re(R) * d - b * mp.im(R)) / det
    d2 = (a * mp.im(R) - mp.re(R) * c) / det
    return float(d1), float(d2)


def exact_d1_d2(sigma, T):
    """Exact d1, d2 via mpmath zeta (as in the other figure scripts)."""
    t = I_of_T(mp.mpf(T))
    s = mp.mpc(sigma, t)
    m = int(mp.floor(T))
    w = t * mp.log(m + 1)
    ch = chi(s)
    psi = mp.arg(ch)
    S1 = mp.fsum(mp.mpf(n) ** (-s) for n in range(1, m + 1))
    S2 = ch * mp.fsum(mp.mpf(n) ** (s - 1) for n in range(1, m + 1))
    R = mp.zeta(s) - S1 - S2
    return cramer(R, w, psi)


def approx_d1_d2(sigma, T):
    """General-sigma first term (eq. R-general) + Cramer.  No zeta input."""
    t = I_of_T(mp.mpf(T))
    s = mp.mpc(sigma, t)
    m = int(mp.floor(T))
    w = t * mp.log(m + 1)
    ch = chi(s)
    psi = mp.arg(ch)

    a = mp.sqrt(t / (2 * mp.pi))
    N = int(mp.floor(a))
    ph = a - N
    C0 = mp.cos(2 * mp.pi * (ph ** 2 - ph - mp.mpf(1) / 16)) \
        / mp.cos(2 * mp.pi * ph)
    th = t / 2 * mp.log(t / (2 * mp.pi)) - t / 2 - mp.pi / 8
    U = mp.exp(-1j * th)
    R = (-1) ** (N - 1) * (C0 / 2) \
        * (a ** (-sigma) * U + ch * a ** (sigma - 1) * mp.conj(U))
    if N == m + 1:
        R += mp.mpf(m + 1) ** (-s) + ch * mp.mpf(m + 1) ** (s - 1)
    return cramer(R, w, psi)


def away_from_poles(q):
    return abs(q - 0.25) > 0.06 and abs(q - 0.75) > 0.06


def main():
    fig, axes = plt.subplots(2, 1, figsize=(8.6, 9.1), sharex=True)

    for ax, sigma in zip(axes, SIGMAS):
        worst1 = worst2 = 0.0
        for n in range(T_MIN, T_MAX):
            Ts = np.linspace(n, n + 1, SAMPLES_PER_UNIT, endpoint=False)
            Ts[0] += 1e-9
            ex = np.array([exact_d1_d2(sigma, float(T)) for T in Ts])
            ap = np.array([approx_d1_d2(sigma, float(T)) for T in Ts])
            ax.plot(Ts, ex[:, 0], '-', color=RED, lw=1.4,
                    label=r'exact $d_1$' if n == T_MIN else None)
            ax.plot(Ts, ex[:, 1], '-', color=GREEN, lw=1.4,
                    label=r'exact $d_2$' if n == T_MIN else None)
            ax.plot(Ts, ap[:, 0], '--', color=RED, lw=1.0,
                    label=r'approx. $d_1$' if n == T_MIN else None)
            ax.plot(Ts, ap[:, 1], '--', color=GREEN, lw=1.0,
                    label=r'approx. $d_2$' if n == T_MIN else None)
            sel = np.array([away_from_poles(float(T) - n) for T in Ts])
            worst1 = max(worst1, np.abs(ex[sel, 0] - ap[sel, 0]).max())
            worst2 = max(worst2, np.abs(ex[sel, 1] - ap[sel, 1]).max())
        print('sigma=%.1f: max|err| away from poles over [%d,%d): '
              'd1 = %.6f, d2 = %.6f'
              % (sigma, T_MIN, T_MAX, worst1, worst2))

        for n in range(T_MIN + 1, T_MAX):
            ax.axvline(n, color='0.75', lw=0.7, ls=':')
        ax.grid(True, ls=':', alpha=0.4)
        ax.set_xlim(T_MIN, T_MAX)
        ax.set_ylim(*YLIM)
        ax.set_ylabel(r'$d_1,\ d_2$')
        ax.set_title(r'$\sigma=%.1f$' % sigma, fontsize=11)
        ax.legend(loc='upper right', fontsize=9)

    axes[1].set_xlabel(r'index $T$')
    fig.suptitle(r'$d_1$ and $d_2$ across the strip: first-term '
                 r'approximation (no zeta input)', fontsize=11)
    fig.tight_layout()

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf)
    fig.savefig(png, dpi=200)
    plt.close(fig)
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
