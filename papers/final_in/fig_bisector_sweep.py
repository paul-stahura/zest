#!/usr/bin/env python3
"""
fig_bisector_sweep.py
=====================

The two bisector links in the frame of the forward bisector link as T
sweeps from 6 to 7 (sigma = 1/4, matching fig_yinyang_spirals.py).

The frame translates joint m = 6 (Sigma1) to the origin and rotates so
the forward bisector link lies along the positive x-axis; NO scaling is
applied, so the forward link is the single stationary segment from 0 to
7^(-1/4) ~ 0.615.  The reverse bisector link is NOT stationary: it is
drawn at 16 equally spaced values of T in [6, 7], all in the same dark
green and at the same thickness as the forward link, each labeled on
its outside with the fractional part of T (two decimals).  Red dotted
arrows run from the middle of each position to the middle of the next
one in the series (all but the last), tracing the motion.  Where each
position crosses the x-axis is the bisector point at that instant (red
dot, at (d1, 0)); near the parallel instants (fractional part of T
about 1/4 and 3/4) there is no crossing and the dot is absent.

Outputs (into ./figures/):
    fig_bisector_sweep.pdf   (vector, used by LaTeX)
    fig_bisector_sweep.png   (raster preview)

Run:  python3 fig_bisector_sweep.py
"""

import os

import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt

from fig1_spiral_summands import I_of_T, chi, C, OUTDIR

BASENAME = 'fig_bisector_sweep'
SIGMA = mp.mpf('0.25')
M = 6
N_SNAP = 16

DARKBLUE, DARKGREEN, RED = '#0b3d6b', '#0e5c17', '#d62728'
GREEN = '#2ca02c'

mp.mp.dps = 30


def snapshot(T):
    """Reverse bisector link endpoints (frame coords) and d1 at index T."""
    t = I_of_T(T)
    s = mp.mpc(SIGMA, t)
    w = t * mp.log(M + 1)
    ch = chi(s)
    psi = mp.arg(ch)

    Sigma1 = mp.nsum(lambda n: n ** (-s), [1, M]) if M >= 1 else mp.mpc(0)
    Sigma2 = ch * mp.nsum(lambda n: n ** (s - 1), [1, M])
    R = mp.zeta(s) - Sigma1 - Sigma2

    # frame: translate Sigma1 to 0, rotate the forward link (direction
    # e^{-iw}) onto the +x axis; lengths are unchanged
    rot = mp.exp(1j * w)
    ra = R * rot                                  # joint m of reverse chain
    rb = (R - ch * mp.mpf(M + 1) ** (s - 1)) * rot  # joint m+1

    # d1 from the Cramer solve (bisector point = (d1, 0) in this frame)
    u1 = mp.exp(-1j * w)
    u2 = mp.exp(1j * (w + psi))
    det = mp.re(u1) * mp.im(u2) - mp.re(u2) * mp.im(u1)
    d1 = (mp.re(R) * mp.im(u2) - mp.re(u2) * mp.im(R)) / det

    return C(ra), C(rb), float(d1)


def main():
    fwd_len = float(mp.mpf(M + 1) ** (-SIGMA))
    Ts = np.linspace(6.0, 7.0, N_SNAP)

    fig, ax = plt.subplots(figsize=(8.6, 7.0))

    # center of the stationary link, used to decide the "outside" of each
    # revolving position for the fractional-part labels
    ccx, ccy = fwd_len / 2, 0.0

    mids = []
    for k, T in enumerate(Ts):
        ra, rb, d1 = snapshot(mp.mpf(T))
        ax.plot([ra.real, rb.real], [ra.imag, rb.imag], '-', color=DARKGREEN,
                lw=3.6, solid_capstyle='round', zorder=3)
        # consistent end markers: green on the joint-m end (which traces the
        # yin curve), red on the joint-(m+1) end (which traces the yang curve)
        ax.plot([ra.real], [ra.imag], 'o', color=GREEN, ms=4.5,
                mec='white', mew=0.4, zorder=5)
        ax.plot([rb.real], [rb.imag], 'o', color=RED, ms=4.5,
                mec='white', mew=0.4, zorder=5)
        mx, my = (ra.real + rb.real) / 2, (ra.imag + rb.imag) / 2
        mids.append((mx, my))

        # fractional part of T, printed just beyond the outer end of the
        # link (the endpoint farther from the stationary link's center)
        if ((ra.real - ccx) ** 2 + (ra.imag - ccy) ** 2 >
                (rb.real - ccx) ** 2 + (rb.imag - ccy) ** 2):
            outer, inner = ra, rb
        else:
            outer, inner = rb, ra
        ux, uy = outer.real - inner.real, outer.imag - inner.imag
        norm = max((ux * ux + uy * uy) ** 0.5, 1e-9)
        ux, uy = ux / norm, uy / norm
        # the T=7 link nearly coincides with the T=6 link: push its label
        # further out so 0.00 and 1.00 sit side by side, both readable
        dist = 12 if k < N_SNAP - 1 else 30
        ax.annotate('%.2f' % (T - 6.0), (outer.real, outer.imag),
                    color=DARKGREEN, textcoords='offset points',
                    xytext=(dist * ux, dist * uy), fontsize=9,
                    ha='center', va='center', zorder=6)

        # bisector point: the crossing with the x-axis, when it is on the
        # drawn segment (no crossing near the parallel instants)
        if min(ra.imag, rb.imag) <= 0 <= max(ra.imag, rb.imag):
            ax.plot([d1], [0], 'o', color=RED, ms=4, zorder=5)
        print('T = %.4f   d1 = %8.4f   ends (%.3f,%.3f)->(%.3f,%.3f)'
              % (T, d1, ra.real, ra.imag, rb.real, rb.imag))

    # red dotted motion arrows: middle of each link to the middle of the
    # next depiction in the series (all except the last).  The curvature
    # is flipped for the positions with fractional part of T above 1/2.
    for k in range(N_SNAP - 1):
        rad = 0.15 if (Ts[k] - 6.0) <= 0.5 else -0.15
        ax.annotate('', xy=mids[k + 1], xytext=mids[k],
                    arrowprops=dict(arrowstyle='-|>', color=RED,
                                    ls=':', lw=1.1, shrinkA=2, shrinkB=2,
                                    connectionstyle='arc3,rad=%.2f' % rad,
                                    mutation_scale=12),
                    zorder=4)

    # the stationary forward bisector link
    ax.plot([0, fwd_len], [0, 0], '-', color=DARKBLUE, lw=3.6,
            solid_capstyle='round', zorder=4)
    ax.annotate('forward bisector\nlink (stationary)', (fwd_len, 0),
                color=DARKBLUE, textcoords='offset points',
                xytext=(10, 0), fontsize=10, ha='left', va='center',
                zorder=6,
                bbox=dict(fc='white', ec='none', alpha=0.85, pad=1.5))

    ax.text(0.02, 0.02,
            'reverse bisector link (green): 16 positions,\n'
            'labeled with the fractional part of $T$\n'
            'red dotted arrows: motion to the next position\n'
            'red dots on the axis: the bisector point at each instant\n'
            'green / red end dots: the same end of the link throughout',
            transform=ax.transAxes, ha='left', va='bottom', fontsize=10,
            bbox=dict(fc='white', ec='0.6', alpha=0.9, pad=4))

    ax.set_aspect('equal', adjustable='datalim')
    ax.grid(True, ls=':', alpha=0.4)
    ax.set_xlabel('bisector-frame $x$')
    ax.set_ylabel('bisector-frame $y$')
    ax.set_title(r'The reverse bisector link revolving around the forward'
                 '\n'
                 r'bisector link: $\sigma=1/4$, $T=6\to7$, sixteen positions',
                 fontsize=12)
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
