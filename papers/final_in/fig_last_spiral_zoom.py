#!/usr/bin/env python3
"""
fig_last_spiral_zoom.py
=======================

Zoomed views of the LAST spiral -- spiral number 0, the one centered on
zeta -- of the forward chain at T = 41.73, sigma = 1/2.

3 x 2 panel set (a full page), all centered on zeta, zooming in
progressively: panel 1 (upper left) the most zoomed out, panel 6
(lower right) the most zoomed in; panels numbered left to right
starting at the top.  The zoom levels (window half-widths) are the
HALF_WIDTHS tuple below -- edit and re-run to adjust.

At this height t = I(T) ~ 11204.74, so the chain carries
floor(I(T)/pi) + 1 = 3567 links; the last link (number 3566, links
0-based) is the one on which the center of spiral 0 lies,
eq. LN with S_n = 0.  Near the center each link turns by ~pi, so the
links sweep back and forth across zeta: the joints settle onto a tight
ring of radius ~ half a link length (l = 3567^{-1/2} ~ 0.0167,
ring radius ~ 0.0084) and the "spiral" at coarse scale is a dense
annulus.

Each panel shows:
  1) zeta as a dot, labeled with its value,
  2) the last link highlighted as a thicker black line,
  3) an annotation "link number 3566" with an arrow to the highlighted
     link.

Outputs (into ./figures/):
    fig_last_spiral_zoom.pdf   (vector, used by LaTeX)
    fig_last_spiral_zoom.png   (raster preview)

Run:  python3 fig_last_spiral_zoom.py
"""

import math
import os
import mpmath as mp
import matplotlib.pyplot as plt
from matplotlib.ticker import FormatStrFormatter

from fig1_spiral_summands import I_of_T, C, xy, OUTDIR

# --------------------------------------------------------------------------
# PARAMETERS  (edit here, then re-run)
# --------------------------------------------------------------------------
SIGMA = mp.mpf('0.5')
T_INDEX = mp.mpf('41.73')

# zoom window half-widths around zeta; panels numbered 1..6 left to
# right starting at the top (3 rows x 2 columns)
HALF_WIDTHS = (0.135, 0.012, 0.006, 0.002, 0.002 / 3, 0.002 / 12)

BASENAME = 'fig_last_spiral_zoom'
BLUE, PURPLE = '#1f77b4', '#7f2fbf'

mp.mp.dps = 30


def compute():
    t = I_of_T(T_INDEX)
    s = mp.mpc(SIGMA, t)

    # last link = the link nearest the spiral-0 center (number I(T)/pi,
    # links 0-based), so the chain gets n_last + 2 joints.
    n_last = int(mp.floor(t / mp.pi))

    zeta = mp.zeta(s)

    fwd = [mp.mpc(0)]
    z = mp.mpc(0)
    for n in range(1, n_last + 2):
        z += mp.mpf(n) ** (-s)
        fwd.append(z)

    return dict(t=t, s=s, n_last=n_last, fwd=fwd, zeta=zeta)


def draw_panel(ax, data, half_width):
    zeta_pt = C(data['zeta'])
    n_last = data['n_last']
    fwd = data['fwd']

    # keep only the tail of the chain that can enter the window
    # (joints outside ~2x the window are clipped away anyway); the floor
    # of 0.05 keeps the crossing links for windows tighter than the
    # joint ring (radius ~ half a link length)
    threshold = max(6 * half_width, 0.05)
    tail_start = next(k for k in range(len(fwd))
                      if abs(C(fwd[k]) - zeta_pt) < threshold)

    xt, yt = xy(fwd[tail_start:])
    ax.plot(xt, yt, '-', color=BLUE, lw=0.3, alpha=0.5, zorder=2)

    # --- (2) the last link, thicker and black ---
    p0, p1 = C(fwd[n_last]), C(fwd[n_last + 1])
    ax.plot([p0.real, p1.real], [p0.imag, p1.imag], '-', color='k',
            lw=2.2, solid_capstyle='round', zorder=5)

    # --- (1) zeta dot + value ---
    ax.plot([zeta_pt.real], [zeta_pt.imag], 'o', color=PURPLE, ms=3,
            zorder=6)
    zlab = (r'$\zeta \approx %.3f %s %.3f\,i$'
            % (float(mp.re(data['zeta'])),
               '+' if float(mp.im(data['zeta'])) >= 0 else '-',
               abs(float(mp.im(data['zeta'])))))
    ax.annotate(zlab, (zeta_pt.real, zeta_pt.imag), color=PURPLE,
                xytext=(0.05, 0.92), textcoords='axes fraction',
                fontsize=15, ha='left', va='center', zorder=7,
                annotation_clip=False,
                bbox=dict(fc='white', ec='none', alpha=0.85, pad=1.5),
                arrowprops=dict(arrowstyle='-', color=PURPLE, lw=0.8,
                                shrinkB=3))

    # --- (3) arrow to the highlighted link ---
    # aim at a point on the link a bit off zeta but always inside the
    # window (the link's midpoint sits almost on zeta, which would make
    # the arrow ambiguous; a fixed fraction can fall outside tight zooms)
    direction = (p1 - p0) / abs(p1 - p0)
    # closest point of the link to zeta
    proj = ((zeta_pt - p0) * direction.conjugate()).real
    closest = p0 + proj * direction
    aim = closest + direction * min(0.6 * half_width,
                                    abs(p1 - closest) * 0.5)
    ax.annotate('link number %d' % n_last,
                xy=(aim.real, aim.imag),
                xytext=(0.95, 0.06), textcoords='axes fraction',
                fontsize=15, ha='right', va='center', zorder=7,
                annotation_clip=False,
                bbox=dict(fc='white', ec='none', alpha=0.85, pad=1.5),
                arrowprops=dict(arrowstyle='->', color='k', lw=1.0,
                                shrinkB=4))

    xc, yc = zeta_pt.real, zeta_pt.imag
    ax.set_xlim(xc - half_width, xc + half_width)
    ax.set_ylim(yc - half_width, yc + half_width)
    ax.set_aspect('equal', adjustable='box')
    ax.grid(False)
    ax.set_xlabel(r'$\Re$')
    ax.set_ylabel(r'$\Im$')

    # two tick labels per axis, ~1/4 in from each edge, plain formatting
    # (no offset notation), decimals adapted to the window size
    dec = max(2, int(math.ceil(-math.log10(half_width))) + 1)
    fmt = FormatStrFormatter('%%.%df' % dec)
    ax.set_xticks([xc - half_width / 2, xc + half_width / 2])
    ax.set_yticks([yc - half_width / 2, yc + half_width / 2])
    ax.xaxis.set_major_formatter(fmt)
    ax.yaxis.set_major_formatter(fmt)


def make_figure(data):
    fig, axes = plt.subplots(3, 2, figsize=(12.4, 17.8))

    for ax, hw in zip(axes.flat, HALF_WIDTHS):
        draw_panel(ax, data, hw)

    fig.suptitle('The last spiral, centered on 'r'$\zeta$', fontsize=13,
                 y=0.998)
    fig.tight_layout(rect=(0, 0, 1, 0.995))

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf)
    fig.savefig(png, dpi=200)
    plt.close(fig)
    return pdf, png


def main():
    data = compute()
    print('t = I(T)       =', mp.nstr(data['t'], 12))
    print('I(T)/pi        =', mp.nstr(data['t'] / mp.pi, 12))
    print('last link      =', data['n_last'], '(0-based);',
          data['n_last'] + 1, 'links in the chain')
    print('zeta(s)        =', mp.nstr(data['zeta'], 10))
    print('last link len  =', mp.nstr(mp.mpf(data['n_last'] + 1)**(-SIGMA), 6))
    print('half-widths    =', HALF_WIDTHS)
    pdf, png = make_figure(data)
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
