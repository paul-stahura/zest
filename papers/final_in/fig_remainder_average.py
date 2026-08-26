#!/usr/bin/env python3
"""
fig_remainder_average.py
========================

Document Figure 1 (in section "Decomposing the remainder"): three complex-plane
trajectories, side by side, so the two fractional-summand remainders can be
compared with Siegel's remainder.  As the index T sweeps a short interval
(default sigma = 1/2, 1 < T < 2, so m = floor(T) = 1) each of

    R_{1ps}(sigma,T),   R(sigma,T),   R_{2ps}(sigma,T)

traces a spiral in the complex plane.  We plot, in a single Argand plane,

    green  (left)   :  R_{1ps}(sigma,T) - 1     (shifted left  by 1)
    violet (middle) :  (1/2) R(sigma,T)
    red    (right)  :  R_{2ps}(sigma,T) + 1     (shifted right by 1)

The "-1" / "+1" are *complex* horizontal offsets that separate the three
spirals so their shapes can be compared: R_{1ps} and R_{2ps} are near mirror
images, and their average is the middle curve (1/2)R, since R_{1ps}+R_{2ps}=R.

Every point is computed from the definitions with mpmath: for each T we form
Sigma1, Sigma2 = chi*sum, zeta, R = zeta - Sigma1 - Sigma2, then solve
R = d1 e^{-i w} + d2 e^{i(w+psi)} (Cramer) for the real weights d1, d2, giving
R_{1ps} = d1 e^{-i w}, R_{2ps} = d2 e^{i(w+psi)}.

Output (into ./figures/):
    fig_remainder_average.pdf   (vector, used by LaTeX)
    fig_remainder_average.png   (raster preview)

Run:  python3 fig_remainder_average.py
Edit the PARAMETERS block to change sigma, the T-window, or the sampling.
"""

import os
import numpy as np
import matplotlib.pyplot as plt
import mpmath as mp

from fig1_spiral_summands import chi, I_of_T, OUTDIR

BASENAME = 'fig_remainder_average'

# ---- PARAMETERS (edit here) ----------------------------------------------
SIGMA = mp.mpf('0.5')
T_MIN, T_MAX = 2.0, 3.0
N = 1600                 # samples along the T-sweep (smoothness of the spiral)
SHIFT = 1.0              # complex real-axis offset separating the three panels

COL_R1 = '#2e8b2e'       # green  (R1ps - 1)
COL_R = '#5a4fcf'        # violet ((1/2) R)
COL_R2 = '#cc2b2b'       # red    (R2ps + 1)

mp.mp.dps = 30


def decompose(sigma, T):
    """Return (R1ps, R2ps, R, recon_err) at index T (all complex)."""
    m = int(mp.floor(T))
    t = I_of_T(mp.mpf(T))
    s = mp.mpc(sigma, t)
    Sigma1 = mp.fsum([mp.mpf(n) ** (-s) for n in range(1, m + 1)])
    ch = chi(s)
    Sigma2 = ch * mp.fsum([mp.mpf(n) ** (s - 1) for n in range(1, m + 1)])
    zeta = mp.zeta(s)
    R = zeta - Sigma1 - Sigma2
    w = t * mp.log(m + 1)
    psi = mp.arg(ch)
    u1 = mp.exp(-1j * w)
    u2 = mp.exp(1j * (w + psi))
    a, b = mp.re(u1), mp.re(u2)
    c, d = mp.im(u1), mp.im(u2)
    det = a * d - b * c
    d1 = (mp.re(R) * d - b * mp.im(R)) / det
    d2 = (a * mp.im(R) - mp.re(R) * c) / det
    R1ps = d1 * u1
    R2ps = d2 * u2
    return complex(R1ps), complex(R2ps), complex(R), mp.fabs(R1ps + R2ps - R)


def main():
    Ts = np.linspace(T_MIN, T_MAX, N + 2)[1:-1]   # open interval (avoid ends)
    R1 = np.empty(len(Ts), dtype=complex)
    R2 = np.empty(len(Ts), dtype=complex)
    RR = np.empty(len(Ts), dtype=complex)
    max_err = mp.mpf(0)
    for i, T in enumerate(Ts):
        r1, r2, r, err = decompose(SIGMA, T)
        R1[i], R2[i], RR[i] = r1, r2, r
        max_err = max(max_err, err)

    left = R1 - SHIFT          # complex shift left by 1
    mid = 0.5 * RR
    right = R2 + SHIFT         # complex shift right by 1

    fig, ax = plt.subplots(figsize=(9.6, 3.8))

    ax.plot(left.real, left.imag, color=COL_R1, lw=1.1)
    ax.plot(mid.real, mid.imag, color=COL_R, lw=1.1)
    ax.plot(right.real, right.imag, color=COL_R2, lw=1.1)

    # subtle centered labels beneath each spiral
    ax.text(-SHIFT, -0.64, r'$R_{1ps}-1$', color=COL_R1,
            ha='center', va='top', fontsize=12)
    ax.text(0.0, -0.64, r'$\frac{1}{2}\,R$', color=COL_R,
            ha='center', va='top', fontsize=12)
    ax.text(SHIFT, -0.64, r'$R_{2ps}+1$', color=COL_R2,
            ha='center', va='top', fontsize=12)

    ax.axhline(0, color='0.6', lw=0.6, zorder=0)
    ax.axvline(0, color='0.6', lw=0.6, zorder=0)
    ax.set_xlim(-1.75, 1.75)
    ax.set_ylim(-0.72, 0.72)
    ax.set_aspect('equal', adjustable='box')
    ax.grid(True, ls=':', alpha=0.45)
    ax.set_xlabel(r'$\Re$')
    ax.set_ylabel(r'$\Im$')
    ax.set_title(r'$R_{1ps}$, $\frac{1}{2}R$, $R_{2ps}$ in the complex plane'
                 r'  ($\sigma=\frac{1}{2}$, $%g<T<%g$)' % (T_MIN, T_MAX),
                 fontsize=12)
    fig.tight_layout()

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf)
    fig.savefig(png, dpi=200)
    plt.close(fig)

    print('samples          =', len(Ts))
    print('max reconstruction error |R1ps+R2ps-R| =', mp.nstr(max_err, 5))
    print('|R1ps| range     = [%.3f, %.3f]' % (np.abs(R1).min(), np.abs(R1).max()))
    print('|R2ps| range     = [%.3f, %.3f]' % (np.abs(R2).min(), np.abs(R2).max()))
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
