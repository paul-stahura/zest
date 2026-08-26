#!/usr/bin/env python3
"""
fig_h_p_continuous.py
=====================

Companion to fig_d1_critical.py: the two exactly-continuous coordinates of
the bisector point on the critical line (sigma = 1/2), 1 <= T <= 7, drawn in
a single panel so they can be compared directly.

    h(T) = sum_{k=2}^{floor(T)} (-1)^k k^{-sigma}  +  (-1)^{floor(T)+1} d1(T)

is the position of the bisector point along the folded chain measured in one
fixed unit (the first link).  The fold relation at each integer handoff,
d1+ = n^{-sigma} - d1-, is exact in the plane, so h has no jumps at all --
but it flattens toward the constant 1 - eta(sigma) (eta = Dirichlet eta)
because d1 itself decays like T^{-sigma}.

    p(T) = T^{sigma} * ( h(T) - (1 - eta(sigma)) )

re-zooms h with the *smooth* factor T^{sigma} instead of the step function
ceil(T)^{sigma}, so it stays exactly continuous while keeping a bounded,
non-flattening oscillation.  Distributing T^{sigma} and substituting h, the
partial sum cancels the head of the series 1 - eta(sigma), leaving only its
tail, so the red curve is computed from the equivalent *local* form

    p(T) = (-1)^{floor(T)+1} T^{sigma} ( d1(T) - Phi(-1, sigma, floor(T)+1) )

with Phi the Lerch transcendent (mpmath.lerchphi): the deviation of d1 from
the alternating sum of all remaining link lengths.

The script also verifies continuity numerically (h and p at n -+ 1e-6) and
that the local form of p agrees with the h-based definition.

Outputs (into ./figures/):
    fig_h_p_continuous.pdf   (vector, used by LaTeX)
    fig_h_p_continuous.png   (raster preview)

Run:  python3 fig_h_p_continuous.py
"""

import os
import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt

from fig1_spiral_summands import OUTDIR
from fig_d1_critical import d1_critical

BASENAME = 'fig_h_p_continuous'
T_MIN, T_MAX = 1, 7
# 601 (not 600) so the sample grid never hits q = 1/4, 3/4 exactly, where the
# tangent waveform is an analytic pole*zero limit that floats evaluate as 0
SAMPLES_PER_UNIT = 601
SIGMA = 0.5
BLUE = '#1f77b4'
RED = '#d62728'
BLACK = '#000000'

mp.mp.dps = 25

# 1 - eta(sigma): the limit of the alternating sum 2^-s - 3^-s + 4^-s - ...
H_LIMIT = float(1 - mp.altzeta(SIGMA))


def alt_partial(n):
    """sum_{k=2}^{n} (-1)^k k^{-SIGMA}  (empty sum for n < 2)."""
    return float(mp.fsum((-1) ** k * mp.mpf(k) ** (-SIGMA)
                         for k in range(2, n + 1)))


def h_of_T(T):
    n = int(np.floor(T))
    return alt_partial(n) + (-1) ** (n + 1) * d1_critical(T)


def alt_tail(n):
    """Phi(-1, SIGMA, n+1) = (n+1)^-s - (n+2)^-s + ... (alternating tail)."""
    return float(mp.lerchphi(-1, SIGMA, n + 1))


def p_of_T(T):
    """Simplified local form: (-1)^{floor(T)+1} T^s (d1 - Lerch tail)."""
    n = int(np.floor(T))
    return (-1) ** (n + 1) * T ** SIGMA * (d1_critical(T) - alt_tail(n))


def p_tangent(T):
    """Critical-line tangent waveform (Riemann-Siegel first term for R),
    eq. (p-tangent) in the paper text (not drawn in the figure):
    p(T) ~ (-1)^floor(T) (1/2) tan(2 pi q) tan(2 pi (q-1/4)(q-3/4)),
    q = frac(T).  Error decays like 1/T."""
    n = int(np.floor(T))
    q = T - n
    return ((-1) ** n * 0.5 * np.tan(2 * np.pi * q)
            * np.tan(2 * np.pi * (q - 0.25) * (q - 0.75)))


def check_continuity():
    eps = 1e-6
    print('continuity check (values at n -+ %.0e):' % eps)
    for n in range(T_MIN + 1, T_MAX):
        hm, hp = h_of_T(n - eps), h_of_T(n + eps)
        pm, pp = p_of_T(n - eps), p_of_T(n + eps)
        print('  T=%d:  h: %.8f | %.8f  (gap %.1e)   '
              'p: %.8f | %.8f  (gap %.1e)'
              % (n, hm, hp, abs(hp - hm), pm, pp, abs(pp - pm)))
    # local form of p vs its h-based definition
    worst = max(abs(p_of_T(T) - T ** SIGMA * (h_of_T(T) - H_LIMIT))
                for T in np.linspace(T_MIN + 0.01, T_MAX - 0.01, 97))
    print('max |p_local - T^s (h - (1-eta))| = %.1e' % worst)
    assert worst < 1e-12, 'simplified p disagrees with definition'


def main():
    check_continuity()

    fig, ax = plt.subplots(figsize=(8.6, 4.6))

    for n in range(T_MIN, T_MAX):
        Ts = np.linspace(n, n + 1, SAMPLES_PER_UNIT, endpoint=False)
        Ts[0] += 1e-9
        d1s = np.array([d1_critical(float(T)) for T in Ts])
        hs = alt_partial(n) + (-1) ** (n + 1) * d1s
        ps = (-1) ** (n + 1) * Ts ** SIGMA * (d1s - alt_tail(n))
        ax.plot(Ts, hs, '-', color=BLUE, lw=1.2,
                label=r'$h(T)$' if n == T_MIN else None)
        ax.plot(Ts, ps, '-', color=RED, lw=1.2,
                label=r'$p(T)=(-1)^{\lfloor T\rfloor+1}\,T^{\sigma}\,'
                      r'(d_1(T)-\Phi(-1,\sigma,\lfloor T\rfloor+1))$'
                if n == T_MIN else None)

    ax.axhline(H_LIMIT, color=BLUE, lw=0.8, ls='--', alpha=0.6)
    ax.annotate(r'$1-\eta(1/2)\approx %.4f$' % H_LIMIT,
                xy=(T_MAX - 0.05, H_LIMIT), ha='right', va='bottom',
                fontsize=9, color=BLUE)
    ax.axhline(0.0, color='0.6', lw=0.8)

    for n in range(T_MIN + 1, T_MAX):
        ax.axvline(n, color='0.75', lw=0.7, ls=':')
    ax.grid(True, ls=':', alpha=0.4)
    ax.set_xlim(T_MIN, T_MAX)
    ax.set_xlabel(r'index $T$')
    ax.set_title(r'exactly continuous coordinates of the point $B_1$ '
                 r'($\sigma=1/2$): flattening $h$ vs. non-flattening $p$',
                 fontsize=11)
    ax.legend(loc='lower right', fontsize=10)
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
