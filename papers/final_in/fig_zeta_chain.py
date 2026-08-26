#!/usr/bin/env python3
"""
fig_zeta_chain.py
=================

The serial chain of the full 3x3 equation for zeta,

    Z = P1 T_R1 T_R2 P2,   final orientation Phi = pi + arg chi,

where chain 2 is walked backwards with forward-type links (rotations
regrouped with the following backward translation):
T_R2 = T(2w + arg chi + pi, -d2)
carries the merged zero-length joint in its rotation parameter, and P2 is
the product of T(-t ln((k+1)/k), -|chi| k^(sigma-1)) for k = m..1.
ONE arrow per factor's net displacement, for sigma = 1/2, T = 6.18
(t ~ 279.85, m = 6):

    O --P1 (blue)--> Sigma1 --T_R1 (red)--> B1
    B1 --T_R2 (orange)--> B1+R2ps --P2 (green)--> zeta

The four arrows are the four terms of zeta = Sigma1 + R1ps + R2ps + Sigma2.
Colors match fig1_spiral_summands.py.

Outputs (into ./figures/):
    fig_zeta_chain.pdf   (vector, used by LaTeX)
    fig_zeta_chain.png   (raster preview)

Run:  python3 fig_zeta_chain.py
"""

import os
import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D

SIGMA = mp.mpf('0.5')
T_INDEX = mp.mpf('6.18')
M = 6

BLUE, RED, GREEN, ORANGE = '#1f77b4', '#d62728', '#2ca02c', '#ff7f0e'
PURPLE = '#7f2fbf'

# Final autoscaled axis limits of fig1_spiral_summands (same sigma, T, m),
# so both figures share exactly the same scale in both directions.  If
# fig1_spiral_summands.py changes, re-read its limits and update these.
FIG2_XLIM = (-2.0494077179085424, 3.103514362562296)
FIG2_YLIM = (-0.18670715592817655, 3.9208502744917073)

OUTDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'figures')
BASENAME = 'fig_zeta_chain'

mp.mp.dps = 50


def I_of_T(T):
    return (2 * T + 1) * mp.pi / (mp.log(T + 1) - mp.log(T))


def chi(s):
    return mp.mpf(2) ** s * mp.pi ** (s - 1) * mp.sin(mp.pi * s / 2) * mp.gamma(1 - s)


def C(z):
    return complex(float(mp.re(z)), float(mp.im(z)))


def compute():
    t = I_of_T(T_INDEX)
    s = mp.mpc(SIGMA, t)
    m = M
    w = t * mp.log(m + 1)
    ch = chi(s)
    psi = mp.arg(ch)

    # joints of P1: cumulative partial sums of n^{-s}
    joints1 = [mp.mpc(0)]
    z = mp.mpc(0)
    for n in range(1, m + 1):
        z += mp.mpf(n) ** (-s)
        joints1.append(z)
    Sigma1 = joints1[-1]

    zeta = mp.zeta(s)
    Sigma2 = ch * mp.nsum(lambda n: mp.mpf(n) ** (s - 1), [1, m])
    R = zeta - Sigma1 - Sigma2

    # Cramer: R = d1 e^{-iw} + d2 e^{i(w+psi)}
    u1, u2 = mp.exp(-1j * w), mp.exp(1j * (w + psi))
    det = mp.re(u1) * mp.im(u2) - mp.re(u2) * mp.im(u1)
    d1 = (mp.re(R) * mp.im(u2) - mp.re(u2) * mp.im(R)) / det
    d2 = (mp.re(u1) * mp.im(R) - mp.re(R) * mp.im(u1)) / det

    B1 = Sigma1 + d1 * u1

    # reversed chain 2: fractional link first, then summands n = m..1
    frac2_end = B1 + d2 * u2              # = B1 + R2ps
    joints2 = [frac2_end]
    z = frac2_end
    for n in range(m, 0, -1):
        z += ch * mp.mpf(n) ** (s - 1)
        joints2.append(z)
    zeta_end = joints2[-1]                # = zeta

    err = mp.fabs(zeta_end - zeta)
    return dict(t=t, m=m, w=w, psi=psi, joints1=joints1, Sigma1=Sigma1,
                B1=B1, frac2_end=frac2_end, joints2=joints2, zeta=zeta,
                zeta_end=zeta_end, d1=d1, d2=d2, err=err)


def arrow(ax, tail, head, color, lw=1.7, ms=11, zorder=4):
    ax.annotate('', xy=(head.real, head.imag), xytext=(tail.real, tail.imag),
                arrowprops=dict(arrowstyle='-|>', color=color, lw=lw,
                                shrinkA=0, shrinkB=0, mutation_scale=ms),
                zorder=zorder)


def seg(ax, tail, head, color, lw=2.2, zorder=4):
    ax.plot([tail.real, head.real], [tail.imag, head.imag], '-', color=color,
            lw=lw, solid_capstyle='round', zorder=zorder)


def make_figure(d):
    fig, ax = plt.subplots(figsize=(7.4, 6.4))

    # one mark per factor: arrows for the two big products, plain segments
    # for the two short fractional links (as in fig1_spiral_summands)
    arrow(ax, C(mp.mpc(0)), C(d['Sigma1']), BLUE, lw=1.6, ms=11, zorder=3)
    seg(ax, C(d['Sigma1']), C(d['B1']), RED, lw=2.2, zorder=5)
    seg(ax, C(d['B1']), C(d['frac2_end']), ORANGE, lw=2.2, zorder=5)
    arrow(ax, C(d['frac2_end']), C(d['zeta']), GREEN, lw=1.6, ms=11, zorder=3)

    bpt = C(d['B1'])

    # key points
    o = C(mp.mpc(0))
    ax.plot([o.real], [o.imag], 'o', color='k', ms=4, zorder=6)
    ax.annotate(r'$O$', (o.real, o.imag), textcoords='offset points',
                xytext=(-14, -4), fontsize=11)
    zp = C(d['zeta'])
    ax.plot([zp.real], [zp.imag], 'o', color=PURPLE, ms=5, zorder=6)
    ax.annotate(r'$\zeta(s)$', (zp.real, zp.imag), textcoords='offset points',
                xytext=(-8, 8), fontsize=11, color=PURPLE, ha='right')

    handles = [
        Line2D([], [], color=BLUE, lw=1.6, label=r'$P_{\Sigma_1}$'),
        Line2D([], [], color=RED, lw=2.2, label=r'$M_{R_{1ps}}$'),
        Line2D([], [], color=ORANGE, lw=2.2, label=r'$M_{R_{2ps}}$'),
        Line2D([], [], color=GREEN, lw=1.6, label=r'$P_{\Sigma_2}$'),
    ]
    ax.legend(handles=handles, loc='lower left', bbox_to_anchor=(0.02, 0.08),
              fontsize=8.5, framealpha=0.92)

    ax.set_xlim(*FIG2_XLIM)
    ax.set_ylim(*FIG2_YLIM)
    ax.set_aspect('equal', adjustable='box')
    ax.grid(True, ls=':', alpha=0.4)
    ax.set_xlabel(r'$\Re$')
    ax.set_ylabel(r'$\Im$')
    ttl = (r'$\sigma=%.2f,\ T\approx%.2f\ (t=I(T)\approx%.2f),\ m=%d$'
           % (float(SIGMA), float(T_INDEX), float(d['t']), d['m']))
    ax.set_title('Forward-kinematic transformation sequence '
                 r'$Z=P_{\Sigma_1}\,M_{R_{1ps}}\,M_{R_{2ps}}\,P_{\Sigma_2}$'
                 + '\n' + ttl, fontsize=11)
    fig.tight_layout()

    # zoom inset: the two fractional links are short (d1 = d2 ~ 0.09).
    # Created after tight_layout so the main axes gets exactly the same
    # layout box (hence the same autoscaled limits) as fig1_spiral_summands.
    s1, fr = C(d['Sigma1']), C(d['frac2_end'])
    axins = ax.inset_axes([0.05, 0.40, 0.34, 0.30])
    ub = (s1 - 0) / abs(s1)                       # unit along blue arrow
    ug = (C(d['zeta']) - fr) / abs(C(d['zeta']) - fr)  # unit along green arrow
    axins.plot([(s1 - 0.06 * ub).real, s1.real],
               [(s1 - 0.06 * ub).imag, s1.imag], color=BLUE, lw=1.6)
    arrow(axins, s1, bpt, RED, lw=2.2, ms=13, zorder=5)
    arrow(axins, bpt, fr, ORANGE, lw=2.2, ms=13, zorder=5)
    axins.plot([fr.real, (fr + 0.06 * ug).real],
               [fr.imag, (fr + 0.06 * ug).imag], color=GREEN, lw=1.6)
    axins.annotate(r'$\Sigma_1$', (s1.real, s1.imag),
                   textcoords='offset points', xytext=(6, -10), fontsize=9)
    axins.annotate(r'$B_1$', (bpt.real, bpt.imag),
                   textcoords='offset points', xytext=(7, -2), fontsize=9)
    xs = [s1.real, bpt.real, fr.real]
    ys = [s1.imag, bpt.imag, fr.imag]
    pad = 0.05
    axins.set_xlim(min(xs) - pad, max(xs) + pad)
    axins.set_ylim(min(ys) - pad, max(ys) + pad)
    axins.set_aspect('equal')
    axins.set_xticks([])
    axins.set_yticks([])
    ax.indicate_inset_zoom(axins, edgecolor='0.45')

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf)
    fig.savefig(png, dpi=200)
    plt.close(fig)
    return pdf, png


def main():
    d = compute()
    print('t = I(T)   =', mp.nstr(d['t'], 8))
    print('d1, d2     =', mp.nstr(d['d1'], 8), mp.nstr(d['d2'], 8))
    print('zeta       =', mp.nstr(d['zeta'], 8))
    print('chain end  =', mp.nstr(d['zeta_end'], 8))
    print('|error|    =', mp.nstr(d['err'], 5))
    pdf, png = make_figure(d)
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
