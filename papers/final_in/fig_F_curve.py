#!/usr/bin/env python3
"""
fig_F_curve.py
==============

The trace of Siegel's desired-term function (the paper's eq:siegel-conj)

    Fbar(t) = (e^{-pi i t^2} - e^{-pi i t}) / (2 i sin(pi t))

in the complex plane for -1.5 <= t <= 1.5.  All the apparent poles at
integer t are removable, with Fbar -> 1/2 - n as t -> n (black squares
at +1.5, +1/2, -1/2).  The curve forms two congruent teardrop lobes,
point-symmetric through 1/2.

The curiosity: at EVERY half-integer t = k + 1/2 the exponent
t^2 = k(k+1) + 1/4 has k(k+1) even, so e^{-pi i t^2} = e^{-i pi/4}
always, and the whole expression collapses to just two values,

    Fbar(k + 1/2) = 1/2 - (-1)^k (1/2) e^{i pi/4},

i.e. 1/2 + (1/2)e^{i pi/4} ~ 0.854 + 0.354i for odd k (t = ..., -0.5,
1.5, 3.5, ...) and 1/2 - (1/2)e^{i pi/4} ~ 0.146 - 0.354i for even k
(t = ..., -1.5, 0.5, 2.5, ...).  The curve returns to each of the two
points every Delta t = 2, forever; they are the meeting points of the
lobes (green diamonds).

Outputs (into ./figures/):
    fig_F_curve.pdf   (vector, used by LaTeX)
    fig_F_curve.png   (raster preview)

Run:  python3 fig_F_curve.py
"""

import os

import numpy as np
import matplotlib.pyplot as plt

from fig1_spiral_summands import OUTDIR

BASENAME = 'fig_F_curve'
BLUE, RED, GREEN = '#1f77b4', '#d62728', '#2ca02c'


def Fbar(t):
    return (np.exp(-1j * np.pi * t ** 2) - np.exp(-1j * np.pi * t)) \
        / (2j * np.sin(np.pi * t))


def main():
    eps = 1e-6
    t = np.linspace(-1.5 + eps, 1.5 - eps, 6000)
    F = Fbar(t)

    fig, ax = plt.subplots(figsize=(8.6, 7.4))
    ax.plot(F.real, F.imag, '-', color=BLUE, lw=1.4, zorder=2)

    # dots every 0.1 in t (skipping the integers)
    for tk in np.arange(-1.4, 1.45, 0.1):
        if abs(tk - round(tk)) < 1e-9:
            continue
        Fk = Fbar(tk)
        ax.plot([Fk.real], [Fk.imag], 'o', color=RED, ms=3, zorder=3)

    # removable points at the integers: Fbar -> 1/2 - n
    for n in (-1, 0, 1):
        lim = 0.5 - n
        ax.plot([lim], [0], 's', color='k', ms=6, zorder=4)
        ax.annotate(r'$t\to%d$: $%+.1f$' % (n, lim), (lim, 0),
                    textcoords='offset points', xytext=(6, 8), fontsize=9)

    # the two half-integer meeting points
    zo = Fbar(1.5)      # odd k:  1/2 + (1/2)e^{i pi/4}
    ze = Fbar(0.5)      # even k: 1/2 - (1/2)e^{i pi/4}
    ax.plot([zo.real], [zo.imag], 'D', color=GREEN, ms=6, zorder=5)
    ax.plot([ze.real], [ze.imag], 'D', color=GREEN, ms=6, zorder=5)
    ax.annotate('$t=\\dots,-0.5,\\ 1.5,\\ 3.5,\\dots$\n'
                r'$\frac{1}{2}+\frac{1}{2} e^{i\pi/4}$',
                (zo.real, zo.imag), textcoords='offset points',
                xytext=(12, 6), fontsize=9, color=GREEN)
    ax.annotate('$t=\\dots,-1.5,\\ 0.5,\\ 2.5,\\dots$\n'
                r'$\frac{1}{2}-\frac{1}{2} e^{i\pi/4}$',
                (ze.real, ze.imag), textcoords='offset points',
                xytext=(-12, -34), fontsize=9, color=GREEN, ha='right')

    ax.set_aspect('equal', adjustable='datalim')
    ax.grid(True, ls=':', alpha=0.4)
    ax.set_xlabel('Re')
    ax.set_ylabel('Im')
    ax.set_title(r'$\overline{F(t)}$ in the complex plane, '
                 r'$-1.5\leq t\leq 1.5$  (dots every $0.1$ in $t$)',
                 fontsize=12)
    fig.tight_layout()

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf)
    fig.savefig(png, dpi=200)
    plt.close(fig)

    print('odd-k point :', zo)
    print('even-k point:', ze)
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
