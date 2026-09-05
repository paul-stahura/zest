#!/usr/bin/env python3
"""
fig_yinyang_asym.py -- the yin curve against the *reflected* yang curve,
at three values of sigma, over the common limit teardrop.

Point reflection through the midpoint of the unit segment, z -> 1 - z,
exchanges its two ends; under it the yang family lands on top of the yin
family.  Plotting Yin(s) and 1 - Yang(s) over T = 0 to 10 therefore
superimposes the two lobes, and both families pile up on the single limit
teardrop traced by Yin_inf (dashed blue), since 1 - Yang_inf(x) =
Yin_inf(1 - x).

One row of panels per sigma: 0.05, 1/2, 0.95, all on the same scale.
Left panel of each row: all seven periods, each unit interval of T in
its own color (the palette of figs 1 and 2, gray for the first period).
Right panel: the boxed window magnified.

The first period is drawn again as a dotted purple line: on 0 < T < 1
both partial sums are empty and the frame factor M^s equals 1, so there
Yin(s) is zeta(sigma + i I(T)) itself.

Outputs figures/fig_yinyang_asym.png.  Run:  python3 fig_yinyang_asym.py
"""

import os

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.legend_handler import HandlerTuple
from matplotlib.lines import Line2D
from matplotlib.patches import ConnectionPatch, Rectangle
from mpmath import mp, mpc, mpf, pi, log, sin, gamma, zeta

mp.dps = 20

SIGMAS = ('0.05', '0.5', '0.95')
M_MAX = 7                   # periods [0,1], ..., [6,7]
NPTS = 320                  # samples per period
EPS = 1e-6

ZOOM = (1.36, 1.60, -0.34, 0.16)
VIEW = (-0.25, 1.75, -0.85, 0.5)

# one color per unit interval [m, m+1]: gray for the first period, then
# the palette of figs 1 and 2 for [1,7]
PERIOD_COLORS = ['0.6', 'gold', '#1f77b4', 'C2', 'C3', 'C4', 'C5']
COBALT = 'b'                # the limit teardrop, the blue of Figure 4
PURPLE = '#7f2fbf'          # zeta on the first period


def I(T):
    return pi*(2*T + 1)/log(1/T + 1)


def chi(s):
    return 2**s * pi**(s - 1) * sin(pi*s/2) * gamma(1 - s)


def period(sigma, m):
    """Yin and reflected yang, 1 - Yang, over the period [m, m+1]."""
    yin, refl = [], []
    for T in np.linspace(m + EPS, m + 1 - EPS, NPTS):
        t = I(mpf(T))
        s = mpc(sigma, t)
        ch = chi(s)
        S1 = sum(mpf(n)**(-s) for n in range(1, m + 1))
        S2 = ch*sum(mpf(n)**(s - 1) for n in range(1, m + 1))
        R = zeta(s) - S1 - S2
        M1 = mpf(m + 1)
        y = R*M1**s
        yin.append(complex(y))
        refl.append(1.0 - complex(y - ch*M1**(2*s - 1)))
    return np.array(yin), np.array(refl)


def all_periods(sigma_str):
    cache = f'/tmp/fig_yinyang_asym_cache_s{sigma_str.replace(".", "p")}.npz'
    if os.path.exists(cache):
        d = np.load(cache)
        if len(d['yin']) >= M_MAX:
            return d['yin'][:M_MAX], d['refl'][:M_MAX]
    sigma = mpf(sigma_str)
    yin, refl = [], []
    for m in range(M_MAX):
        a, b = period(sigma, m)
        yin.append(a)
        refl.append(b)
        print(f'  sigma={sigma_str}, period [{m},{m+1}] done')
    yin, refl = np.array(yin), np.array(refl)
    np.savez(cache, yin=yin, refl=refl)
    return yin, refl


# the limit teardrop of section 6.4 (also the trace of 1 - Yang_inf)
def Psi(x):
    return np.cos(2*np.pi*(x**2 - x - 1/16)) / np.cos(2*np.pi*x)


def YinInf(x):
    return 1 - Psi(x)*np.exp(-2j*np.pi*(x**2 - 1/16))


data = {sig: all_periods(sig) for sig in SIGMAS}

xg = np.linspace(EPS, 1 - EPS, 4001)
xg = xg[(np.abs(xg - 0.25) > 1e-4) & (np.abs(xg - 0.75) > 1e-4)]
zi_inf = YinInf(xg)

fig, axs = plt.subplots(len(SIGMAS), 2, figsize=(7.0, 8.1),
                        gridspec_kw={'width_ratios': [2.0, 1.0]})

x0, x1, y0, y1 = ZOOM
for row, sig in enumerate(SIGMAS):
    yin, refl = data[sig]
    ax, axz = axs[row]

    for a in (ax, axz):
        for m in range(M_MAX):
            color = PERIOD_COLORS[m]
            a.plot(yin[m].real, yin[m].imag, '-', color=color, lw=0.55,
                   zorder=2)
            a.plot(refl[m].real, refl[m].imag, '-', color=color, lw=0.55,
                   zorder=2)
        # On [0,1] both partial sums are empty and the frame factor M^s
        # is 1, so the yin arc of the first period is zeta itself.
        a.plot(yin[0].real, yin[0].imag, ls=(0, (1, 1.4)), lw=1.2,
               color=PURPLE, zorder=3)
        a.plot(zi_inf.real, zi_inf.imag, '--', color=COBALT, lw=1.1,
               alpha=0.9, zorder=4)
        a.plot([0, 1], [0, 0], '-', color='k', lw=2.0,
               solid_capstyle='round', zorder=5)
        a.plot([0, 1], [0, 0], 'o', color='k', ms=3.0, zorder=6)
        a.grid(True, ls=':', alpha=0.35)
        a.tick_params(labelsize=8)
        a.set_aspect('equal', adjustable='box')

    label = r'$\sigma=1/2$' if sig == '0.5' else rf'$\sigma={sig}$'
    ax.text(0.985, 0.955, label, transform=ax.transAxes, fontsize=9,
            ha='right', va='top',
            bbox=dict(fc='white', ec='0.7', lw=0.5, pad=2.0), zorder=8)
    ax.set_ylabel('Im', fontsize=9)
    ax.set_xlim(VIEW[0], VIEW[1])
    ax.set_ylim(VIEW[2], VIEW[3])
    axz.set_xlim(x0, x1)
    axz.set_ylim(y0, y1)

    # one legend line per row
    sample = tuple(Line2D([], [], color=c, lw=1.2)
                   for c in PERIOD_COLORS[1:4])
    row_entries = [
        (sample,
         r'$\mathrm{Yin}$ and $1-\mathrm{Yang}$, one color'
         '\nper unit interval of $T$'),
        (Line2D([], [], color=PURPLE, lw=1.2, ls=(0, (1, 1.4))),
         r'note: $\zeta(s)=\mathrm{Yin}(s)$, $0<T<1$'),
        (Line2D([], [], color=COBALT, lw=1.2, ls='--'),
         r'$\mathrm{Yin}_{\infty}$, the common limit'),
    ]
    handle, text = row_entries[row]
    ax.legend([handle], [text], loc='upper left', fontsize=8,
              framealpha=0.92,
              handler_map={tuple: HandlerTuple(ndivide=None)})
    if row == 0:
        axz.set_title('area magnified', fontsize=9)
    if row == len(SIGMAS) - 1:
        ax.set_xlabel('Re', fontsize=9)
        axz.set_xlabel('Re', fontsize=9)

    ax.add_patch(Rectangle((x0, y0), x1 - x0, y1 - y0, fill=False,
                           ec='0.35', lw=0.8, zorder=7))
    for corner, frac in ((y1, 1.0), (y0, 0.0)):
        fig.add_artist(ConnectionPatch(
            xyA=(x1, corner), coordsA=ax.transData,
            xyB=(0.0, frac), coordsB=axz.transAxes,
            color='0.45', lw=0.7, ls=(0, (3, 2))))

fig.suptitle(r'$\mathrm{Yin}$ and $\mathrm{Yang}$ orbits are not'
             ' symmetrical', fontsize=12)
fig.subplots_adjust(left=0.085, right=0.985, top=0.935, bottom=0.055,
                    wspace=0.18, hspace=0.16)

fig.savefig('figures/fig_yinyang_asym.png', dpi=220)
print('wrote figures/fig_yinyang_asym.png')
