#!/usr/bin/env python3
"""
fig_yinyang_asym.py
===================

The yin curve against the *reflected* yang curve, at three values of sigma.

Point reflection through the midpoint of the pinned link, z -> 1 - z, is
the symmetry a yin-yang picture suggests: it exchanges the two ends of the
forward bisector link.  Plotting Y_in1 (green) against 1 - Y_ang1 (red)
over T = 0 to 10 therefore superimposes the two lobes.  They nearly
coincide and converge to a common limit teardrop, but they do not
coincide: the pair is not symmetric at any finite T.

One row of panels per sigma: 0.05, 1/2, 0.95, all on the same scale.
Left panel of each row: all ten periods.  Right panel: the boxed window
magnified, where the two families separate visibly.

The first period is drawn again as a dotted purple line: on 0 < T < 1 both
partial sums are empty and the frame factor (m+1)^s equals 1, so there
Y_in1 is zeta(sigma + i I(T)) itself.

Outputs (into ./figures/): fig_yinyang_asym.pdf, .png

Run:  python3 fig_yinyang_asym.py
"""

import os

import matplotlib.pyplot as plt
import mpmath as mp
import numpy as np
from matplotlib.patches import ConnectionPatch, Rectangle

from fig1_spiral_summands import I_of_T, chi, OUTDIR

BASENAME = 'fig_yinyang_asym'
SIGMAS = ('0.05', '0.5', '0.95')
M_MAX = 10                  # periods [0,1], ..., [9,10]
NPTS = 320                  # samples per period
EPS = 1e-6

ZOOM = (1.36, 1.60, -0.34, 0.16)
VIEW = (-0.25, 1.75, -0.85, 0.5)

GREEN = '#2ca02c'
RED = '#d62728'
DARKBLUE = '#0b3d6b'
PURPLE = '#7f2fbf'

mp.mp.dps = 25


def period(sigma, m):
    """Yin and reflected yang over the period [m, m+1]."""
    yin, refl = [], []
    for T in np.linspace(m + EPS, m + 1 - EPS, NPTS):
        t = I_of_T(mp.mpf(T))
        s = mp.mpc(sigma, t)
        ch = chi(s)
        S1 = mp.fsum(mp.mpf(n) ** (-s) for n in range(1, m + 1))
        S2 = ch * mp.fsum(mp.mpf(n) ** (s - 1) for n in range(1, m + 1))
        R = mp.zeta(s) - S1 - S2
        M1 = mp.mpf(m + 1)
        y = R * M1 ** s
        yin.append(complex(y))
        refl.append(1.0 - complex(y - ch * M1 ** (2 * s - 1)))
    return np.array(yin), np.array(refl)


def all_periods(sigma_str):
    cache = f'/tmp/{BASENAME}_cache_s{sigma_str.replace(".", "p")}.npz'
    if os.path.exists(cache):
        d = np.load(cache)
        return d['yin'], d['refl']
    sigma = mp.mpf(sigma_str)
    yin = np.array([period(sigma, m)[0] for m in range(M_MAX)])
    refl = np.array([period(sigma, m)[1] for m in range(M_MAX)])
    np.savez(cache, yin=yin, refl=refl)
    return yin, refl


def separation(a, b):
    """Largest distance from a point of either curve to the other curve."""
    d = np.abs(a[:, None] - b[None, :])
    return max(d.min(axis=1).max(), d.min(axis=0).max())


def main():
    data = {}
    for sig in SIGMAS:
        data[sig] = all_periods(sig)
        print(f"sigma = {sig}")
        for m in range(M_MAX):
            print(f"  m={m:>2}: t = {float(I_of_T(mp.mpf(m + EPS))):8.2f}"
                  f" .. {float(I_of_T(mp.mpf(m + 1 - EPS))):8.2f},"
                  f" separation {separation(*[c[m] for c in data[sig]]):.4f}")

    fig, axs = plt.subplots(len(SIGMAS), 2, figsize=(7.0, 8.1),
                            gridspec_kw={'width_ratios': [2.0, 1.0]})

    x0, x1, y0, y1 = ZOOM
    for row, sig in enumerate(SIGMAS):
        yin, refl = data[sig]
        ax, axz = axs[row]

        for a in (ax, axz):
            for m in range(M_MAX):
                first = m == 0 and row == 0
                a.plot(yin[m].real, yin[m].imag, '-', color=GREEN, lw=0.55,
                       zorder=2, label=r'$Y_{in1}$' if first else None)
                a.plot(refl[m].real, refl[m].imag, '-', color=RED, lw=0.55,
                       zorder=2, label=r'$1-Y_{ang1}$' if first else None)
            # On [0,1] both partial sums are empty and the frame factor
            # (m+1)^s is 1, so the yin arc of the first period is zeta itself.
            a.plot(yin[0].real, yin[0].imag, ls=(0, (1, 1.4)), lw=1.2,
                   color=PURPLE, zorder=3,
                   label=r'$\zeta(\sigma+it)$, $0<T<1$' if row == 0 else None)
            a.plot([0, 1], [0, 0], '-', color=DARKBLUE, lw=2.0,
                   solid_capstyle='round', zorder=4)
            a.plot([0, 1], [0, 0], 'o', color=DARKBLUE, ms=3.0, zorder=5)
            a.grid(True, ls=':', alpha=0.35)
            a.tick_params(labelsize=8)
            a.set_aspect('equal', adjustable='box')

        label = r'$\sigma=1/2$' if sig == '0.5' else rf'$\sigma={sig}$'
        ax.text(0.985, 0.955, label, transform=ax.transAxes, fontsize=9,
                ha='right', va='top',
                bbox=dict(fc='white', ec='0.7', lw=0.5, pad=2.0), zorder=7)
        ax.set_ylabel('Im', fontsize=9)
        ax.set_xlim(VIEW[0], VIEW[1])
        ax.set_ylim(VIEW[2], VIEW[3])
        axz.set_xlim(x0, x1)
        axz.set_ylim(y0, y1)

        if row == 0:
            ax.legend(loc='upper left', fontsize=9, framealpha=0.92)
            axz.set_title('area magnified', fontsize=9)
            ax.annotate('forward\nbisector link', (0.92, 0),
                        textcoords='offset points', xytext=(0, -22),
                        fontsize=8, ha='center', va='center')
        if row == len(SIGMAS) - 1:
            ax.set_xlabel('Re', fontsize=9)
            axz.set_xlabel('Re', fontsize=9)

        ax.add_patch(Rectangle((x0, y0), x1 - x0, y1 - y0, fill=False,
                               ec='0.35', lw=0.8, zorder=6))
        for corner, frac in ((y1, 1.0), (y0, 0.0)):
            fig.add_artist(ConnectionPatch(
                xyA=(x1, corner), coordsA=ax.transData,
                xyB=(0.0, frac), coordsB=axz.transAxes,
                color='0.45', lw=0.7, ls=(0, (3, 2))))

    fig.subplots_adjust(left=0.085, right=0.985, top=0.965, bottom=0.055,
                        wspace=0.18, hspace=0.16)

    os.makedirs(OUTDIR, exist_ok=True)
    for ext in ('pdf', 'png'):
        path = os.path.join(OUTDIR, f'{BASENAME}.{ext}')
        fig.savefig(path, dpi=200 if ext == 'png' else None)
        print('wrote', path)
    plt.close(fig)


if __name__ == '__main__':
    main()
