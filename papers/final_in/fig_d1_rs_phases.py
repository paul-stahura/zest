#!/usr/bin/env python3
"""
fig_d1_rs_phases.py
===================

The closed form of d1 on the critical line (eq. d1-rs in the paper): the
Riemann-Siegel first term with all phases kept exact through t = I(T) --
nothing is expanded, and there is no zeta input.  With

    t   = I(T)  (exact),   z = sqrt(t/2pi),   N = floor(z),   p^ = z - N,
    w   = t ln(m+1),       m = floor(T),
    theta(t) = t/2 ln(t/2pi) - t/2 - pi/8 + 1/(48t)   (elementary asymptotic;
               replacing it by the exact Riemann-Siegel theta changes nothing
               to 6 decimals even at T = 1),

on the line chi = e^{-2 i theta}, so e^{i theta} R is real and
d1 = e^{i theta} R / (2 cos(w - theta)) exactly.  Substituting the RS first
term for e^{i theta} R gives

    d1(1/2, T) ~ [N = m+1] (m+1)^{-1/2}
                 + (-1)^{N-1} (2pi/t)^{1/4}
                   cos(2 pi (p^2 - p^ - 1/16)) / (2 cos(2 pi p^) cos(w - theta)),

where the bracket is one full link length picked up when the RS main sum
carries one more summand pair than Sigma1, Sigma2 (frac(T) > 1/2, roughly).
Max error 0.006 on [1,2) decaying like T^{-3/2}, flat in q; the error is
purely the RS truncation O(t^{-3/4}).

The figure has two panels: top = exact d1 (blue) vs this formula (black
dashed); bottom = log-scale |error| of the formula, 1 <= T <= 7.

Outputs (into ./figures/):
    fig_d1_rs_phases.pdf   (vector, used by LaTeX)
    fig_d1_rs_phases.png   (raster preview)

Run:  python3 fig_d1_rs_phases.py
"""

import os

import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt

from fig1_spiral_summands import I_of_T, OUTDIR
from fig_d1_critical import d1_critical

BASENAME = 'fig_d1_rs_phases'
T_MIN, T_MAX = 1, 7
# 601 for the same q = 1/4, 3/4 grid reason as the tangent-form figures
SAMPLES_PER_UNIT = 601
BLUE = '#1f77b4'
BLACK = '#000000'

mp.mp.dps = 30


def theta_asymptotic(t):
    """Elementary asymptotic of the Riemann-Siegel theta."""
    return t / 2 * mp.log(t / (2 * mp.pi)) - t / 2 - mp.pi / 8 + 1 / (48 * t)


def d1_rs_phases(T, exact_theta=False):
    """RS first term with exact I(T) phases -- eq. (d1-rs) in the paper."""
    m = int(np.floor(T))
    t = I_of_T(mp.mpf(T))
    z = mp.sqrt(t / (2 * mp.pi))
    N = int(mp.floor(z))
    ph = z - N
    rs = (-1) ** (N - 1) * (2 * mp.pi / t) ** mp.mpf('0.25') \
        * mp.cos(2 * mp.pi * (ph ** 2 - ph - mp.mpf(1) / 16)) \
        / mp.cos(2 * mp.pi * ph)
    w = t * mp.log(m + 1)
    theta = mp.siegeltheta(t) if exact_theta else theta_asymptotic(t)
    d1 = rs / (2 * mp.cos(w - theta))
    if N == m + 1:
        d1 += mp.mpf(m + 1) ** mp.mpf('-0.5')
    return float(d1)


def check_theta_asymptotic():
    """The elementary theta costs nothing: same result to ~1e-6 at T=1."""
    worst = max(abs(d1_rs_phases(T) - d1_rs_phases(T, exact_theta=True))
                for T in np.linspace(1.01, 6.99, 89))
    print('max |d1(asymptotic theta) - d1(exact theta)| = %.1e' % worst)


def main():
    check_theta_asymptotic()

    fig, (ax, ax2) = plt.subplots(2, 1, figsize=(8.6, 6.8), sharex=True,
                                  height_ratios=[2, 1])

    for n in range(T_MIN, T_MAX):
        Ts = np.linspace(n, n + 1, SAMPLES_PER_UNIT, endpoint=False)
        Ts[0] += 1e-9
        exact = np.array([d1_critical(float(T)) for T in Ts])
        rs = np.array([d1_rs_phases(float(T)) for T in Ts])
        ax.plot(Ts, exact, '-', color=BLUE, lw=1.4,
                label=r'exact $d_1(1/2,T)$' if n == T_MIN else None)
        ax.plot(Ts, rs, '--', color=BLACK, lw=1.1,
                label=r'RS first term, exact $I(T)$ phases'
                if n == T_MIN else None)
        ax2.semilogy(Ts, np.abs(exact - rs), '-', color=BLACK, lw=1.0,
                     label=r'$|$error$|$' if n == T_MIN else None)
        print('interval [%d,%d): max|err| = %.6f'
              % (n, n + 1, np.abs(exact - rs).max()))

    for a in (ax, ax2):
        for n in range(T_MIN + 1, T_MAX):
            a.axvline(n, color='0.75', lw=0.7, ls=':')
        a.grid(True, ls=':', alpha=0.4)
        a.set_xlim(T_MIN, T_MAX)
    ax.set_ylabel(r'$d_1$')
    ax.set_title(r'closed form for $d_1$: RS first term with exact $I(T)$ '
                 r'phases (no zeta input)', fontsize=11)
    ax.legend(loc='upper right', fontsize=9)
    ax2.set_ylabel(r'$|$error$|$')
    ax2.set_xlabel(r'index $T$')
    ax2.legend(loc='lower left', fontsize=9)
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
