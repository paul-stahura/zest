#!/usr/bin/env python3
"""
fig_full_spirals.py
===================

Full-spiral overview figure for Section 8 (the geometry behind the result):
BOTH chains drawn at length, well past the partial sums, so the reader sees
the Euler-like spirals and where they cross.  Two panels stacked vertically:

    top    panel:  sigma = 1/2    (critical line)
    bottom panel:  sigma = 0.673
    both at       T = 14.3085  =>  t = I(T),  m = floor(T) = 14.

In each panel:
- Forward chain (Sigma1 side, blue): joints  sum_{n<=k} n^{-s},  k = 0..N.
  Anchored at the origin; winds into a spiral whose center is near zeta.
- Reverse chain (Sigma2 side, green): joints  zeta - chi sum_{n<=k} n^{s-1},
  k = 0..N.  Anchored at zeta; winds into a spiral near the origin.
- Each chain is drawn out to link floor(I(T)/pi) -- the link nearest its
  spiral center (links are numbered from 0, link k = (k+1)st summand), i.e.
  N = floor(I(T)/pi) + 1 summands = the same number of links per spiral.
  N does not depend on sigma, so both panels have the same link count.
- Labeled: the origin O, zeta (with its coordinate), the bisector point
  B1 = Sigma1 + R1ps (computed exactly via the Cramer d1, as in the other
  figure scripts), and zeta/2 (open circle).
- A dotted bisector line through the bisector point and zeta/2 (drawn with
  ax.axline so it does not disturb the autoscaled data limits).  On the
  critical line (left) it is the symmetry axis of the whole configuration.

Outputs (into ./figures/):
    fig_full_spirals.pdf   (vector, used by LaTeX)
    fig_full_spirals.png   (raster preview)

Run:  python3 fig_full_spirals.py
"""

import os
import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt

from fig1_spiral_summands import I_of_T, chi, C, xy, OUTDIR

# --------------------------------------------------------------------------
# PARAMETERS  (edit here, then re-run)
# --------------------------------------------------------------------------
SIGMA_L = mp.mpf('0.5')          # left panel (critical line)
SIGMA_R = mp.mpf('0.673')        # right panel
T_INDEX = mp.mpf('14.3085')

BASENAME = 'fig_full_spirals'
BLUE, GREEN, PURPLE, GOLD = '#1f77b4', '#2ca02c', '#7f2fbf', '#b8860b'

mp.mp.dps = 50


def compute(sigma):
    t = I_of_T(T_INDEX)
    s = mp.mpc(sigma, t)
    m = int(mp.floor(T_INDEX))
    w = t * mp.log(m + 1)
    ch = chi(s)
    psi = mp.arg(ch)

    # last link drawn = the link nearest the spiral center (number I(T)/pi,
    # links 0-based), so each chain gets N = floor(I(T)/pi)+1 summands.
    L_center = t / mp.pi                  # = I(T)/pi
    n_links = int(mp.floor(L_center)) + 1

    zeta = mp.zeta(s)

    # forward chain joints: sum_{n<=k} n^{-s}, k = 0..n_links
    fwd = [mp.mpc(0)]
    z = mp.mpc(0)
    for n in range(1, n_links + 1):
        z += mp.mpf(n) ** (-s)
        fwd.append(z)
    Sigma1 = fwd[m]                       # joint m of the forward chain

    # reverse chain joints: zeta - chi sum_{n<=k} n^{s-1}, k = 0..n_links
    rev = [zeta]
    z = zeta
    for n in range(1, n_links + 1):
        z -= ch * mp.mpf(n) ** (s - 1)
        rev.append(z)
    Sigma2 = zeta - rev[m]                # chi * sum_{n<=m} n^{s-1}

    R = zeta - Sigma1 - Sigma2

    # R = d1 e^{-iw} + d2 e^{i(w+psi)}, real d1,d2 (Cramer)
    u1 = mp.exp(-1j * w)
    u2 = mp.exp(1j * (w + psi))
    a, b = mp.re(u1), mp.re(u2)
    c, d = mp.im(u1), mp.im(u2)
    det = a * d - b * c
    d1 = (mp.re(R) * d - b * mp.im(R)) / det
    d2 = (a * mp.im(R) - mp.re(R) * c) / det
    R1ps, R2ps = d1 * u1, d2 * u2
    B1 = Sigma1 + R1ps                    # bisector point

    return dict(sigma=sigma, t=t, s=s, m=m, chi=ch, n_links=n_links,
                L_center=L_center, fwd=fwd, rev=rev, Sigma1=Sigma1,
                Sigma2=Sigma2, zeta=zeta, R=R, d1=d1, d2=d2,
                R1ps=R1ps, R2ps=R2ps, B1=B1)


def draw_panel(ax, data, show_legend):
    xf, yf = xy(data['fwd'])
    ax.plot(xf, yf, '-', color=BLUE, lw=0.8, alpha=0.95,
            label=r'forward chain ($\Sigma_1$ side)', zorder=2)
    xr, yr = xy(data['rev'])
    ax.plot(xr, yr, '-', color=GREEN, lw=0.8, alpha=0.95,
            label=r'reverse chain ($\Sigma_2$ side)', zorder=2)

    # --- dotted bisector line through the bisector point and zeta/2 ---
    bpt = C(data['B1'])
    half = C(data['zeta'] / 2)
    ax.axline((bpt.real, bpt.imag), (half.real, half.imag), ls=':',
              color=GOLD, lw=1.4,
              label=r'bisector line (through $\zeta/2$)', zorder=1)

    # --- labeled points ---
    zeta_pt = C(data['zeta'])

    ax.plot([0], [0], 'o', color='k', ms=5, zorder=5)
    ax.annotate(r'$O$', (0, 0), textcoords='offset points',
                xytext=(-22, -16), fontsize=13, zorder=6)

    ax.plot([zeta_pt.real], [zeta_pt.imag], 'o', color=PURPLE, ms=5, zorder=5)
    zlab = (r'$\zeta \approx %.3f %s %.3f\,i$'
            % (float(mp.re(data['zeta'])),
               '+' if float(mp.im(data['zeta'])) >= 0 else '-',
               abs(float(mp.im(data['zeta'])))))
    ax.annotate(zlab, (zeta_pt.real, zeta_pt.imag), color=PURPLE,
                textcoords='offset points', xytext=(10, 8), fontsize=10,
                zorder=6)

    ax.plot([half.real], [half.imag], 'o', mfc='none', mec=PURPLE, ms=5,
            zorder=5)
    ax.annotate(r'$\zeta/2$', (half.real, half.imag), color=PURPLE,
                textcoords='offset points', xytext=(7, -4), fontsize=10,
                ha='left', va='center', zorder=6)

    ax.plot([bpt.real], [bpt.imag], 'o', color='#d62728', ms=5, zorder=5)
    ax.annotate('bisector point', (bpt.real, bpt.imag), color='#d62728',
                textcoords='offset points', xytext=(10, -4), fontsize=10,
                zorder=6)

    ax.set_aspect('equal', adjustable='datalim')
    ax.grid(True, ls=':', alpha=0.4)
    ax.set_xlabel(r'$\Re$')
    ax.set_ylabel(r'$\Im$')
    ax.set_title(r'$\sigma=%g$' % float(data['sigma']), fontsize=12)
    if show_legend:
        ax.legend(loc='upper left', fontsize=8.5, framealpha=0.92)


def make_figure(data_left, data_right):
    fig, (axL, axR) = plt.subplots(2, 1, figsize=(8.8, 13.8))
    draw_panel(axL, data_left, show_legend=True)
    draw_panel(axR, data_right, show_legend=False)
    fig.suptitle('Forward and reverse spirals', fontsize=12, y=0.998)
    fig.tight_layout(rect=(0, 0, 1, 0.99))

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf)
    fig.savefig(png, dpi=200)
    plt.close(fig)
    return pdf, png


def main():
    data_left = compute(SIGMA_L)
    data_right = compute(SIGMA_R)
    for tag, data in (('left', data_left), ('right', data_right)):
        print('--- %s panel: sigma = %s ---' % (tag, mp.nstr(data['sigma'], 6)))
        print('s              =', data['s'])
        print('t = I(T)       =', mp.nstr(data['t'], 10))
        print('I(T)/pi        =', mp.nstr(data['L_center'], 10),
              ' -> last link drawn =', data['n_links'] - 1,
              ' (', data['n_links'], 'links per spiral )')
        print('zeta(s)        =', mp.nstr(data['zeta'], 10))
        print('R              =', mp.nstr(data['R'], 8))
        print('d1, d2         =', mp.nstr(data['d1'], 8), ',',
              mp.nstr(data['d2'], 8), '(both should be real positive)')
        print('B1 = S1+R1ps   =', mp.nstr(data['B1'], 8))
        print('|R1ps+R2ps-R|  =',
              mp.nstr(mp.fabs(data['R1ps'] + data['R2ps'] - data['R']), 5))
    pdf, png = make_figure(data_left, data_right)
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
