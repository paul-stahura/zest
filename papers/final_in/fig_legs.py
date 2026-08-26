#!/usr/bin/env python3
"""
fig_legs.py
===========

Companion to fig_full_spirals.py for Section 8.1: the same two-panel
full-spiral picture (sigma = 1/2 left, sigma = 0.673 right, T = 14.3085),
with the two LEGS drawn on top as thick dark-yellow segments:

    leg 1:  origin  ->  bisector point  (= B1 = Sigma1 + R1ps)
    leg 2:  bisector point  ->  zeta    (= zeta - B1)

On the critical line (left panel) the two legs have equal length, so the
bisector point sits at the apex of an isosceles triangle over the base
O -> zeta; off the line (right panel) the legs are unequal.

All geometry (chains, bisector point, dotted bisector line, labels) is
reused from fig_full_spirals.py, so the two figures stay consistent.

Outputs (into ./figures/):
    fig_legs.pdf   (vector, used by LaTeX)
    fig_legs.png   (raster preview)

Run:  python3 fig_legs.py
"""

import os
import cmath
import math
import mpmath as mp
import matplotlib.pyplot as plt
from matplotlib.patches import Arc

from fig1_spiral_summands import C, OUTDIR
from fig_full_spirals import compute, draw_panel, SIGMA_L, SIGMA_R, T_INDEX

BASENAME = 'fig_legs'
DARKYELLOW = '#b8860b'
ANGLECOLOR = '#333333'


def add_legs(ax, data, show_legend):
    bpt = C(data['B1'])
    zpt = C(data['zeta'])
    ax.plot([0, bpt.real], [0, bpt.imag], '-', color=DARKYELLOW,
            lw=3.2, solid_capstyle='round', zorder=4,
            label=r'legs $B_1$ and $\zeta-B_1$')
    ax.plot([bpt.real, zpt.real], [bpt.imag, zpt.imag], '-',
            color=DARKYELLOW, lw=3.2, solid_capstyle='round', zorder=4)
    if show_legend:
        ax.legend(loc='upper left', fontsize=8.5, framealpha=0.92)


def angle_arc(ax, center, ang_from, ang_to, radius, label):
    """Arc marking the angle swept from ang_from to ang_to (radians, signed
    shortest way), with the label placed at the mid-angle."""
    delta = (ang_to - ang_from + math.pi) % (2 * math.pi) - math.pi
    a, b = (ang_from, ang_from + delta) if delta >= 0 else \
           (ang_from + delta, ang_from)
    ax.add_patch(Arc(center, 2 * radius, 2 * radius,
                     theta1=math.degrees(a), theta2=math.degrees(b),
                     color=ANGLECOLOR, lw=1.4, zorder=6))
    mid = ang_from + delta / 2
    ax.annotate(label,
                xy=(center[0] + 1.45 * radius * math.cos(mid),
                    center[1] + 1.45 * radius * math.sin(mid)),
                ha='center', va='center', fontsize=11, color=ANGLECOLOR,
                zorder=6)


def add_angles(ax, data):
    """Mark theta1 (at O, from the +real axis to Leg 1) and theta2 (at B1,
    from the extension of Leg 1 to Leg 2), as defined in Section 8.2."""
    bpt = C(data['B1'])
    zpt = C(data['zeta'])
    th1 = cmath.phase(bpt)                 # arg B1
    th_leg2 = cmath.phase(zpt - bpt)       # arg (zeta - B1)
    r = 0.20 * min(abs(bpt), abs(zpt - bpt))

    # theta1 at the origin, measured from the positive real axis
    ax.plot([0, 1.6 * r], [0, 0], '-', color=ANGLECOLOR, lw=0.9, zorder=6)
    angle_arc(ax, (0, 0), 0.0, th1, r, r'$\vartheta_1$')

    # theta2 at the bisector point, measured from the extension of Leg 1
    ext = bpt + 1.6 * r * cmath.exp(1j * th1)
    ax.plot([bpt.real, ext.real], [bpt.imag, ext.imag], '--',
            color=ANGLECOLOR, lw=0.9, zorder=6)
    angle_arc(ax, (bpt.real, bpt.imag), th1, th_leg2, r, r'$\vartheta_2$')


def main():
    data_left = compute(SIGMA_L)
    data_right = compute(SIGMA_R)

    fig, (axL, axR) = plt.subplots(1, 2, figsize=(13.4, 7.0))
    draw_panel(axL, data_left, show_legend=False)
    draw_panel(axR, data_right, show_legend=False)
    add_legs(axL, data_left, show_legend=True)
    add_legs(axR, data_right, show_legend=False)
    add_angles(axL, data_left)
    add_angles(axR, data_right)
    ttl = ('The two legs: origin to bisector point, bisector point to '
           r'$\zeta$' + '\n'
           + r'$T=%.4f\ (t=I(T)\approx%.2f),\ m=%d$'
           % (float(T_INDEX), float(data_left['t']), data_left['m']))
    fig.suptitle(ttl, fontsize=12)
    fig.tight_layout(rect=(0, 0, 1, 0.93))

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf)
    fig.savefig(png, dpi=200)
    plt.close(fig)

    for tag, data in (('left', data_left), ('right', data_right)):
        B1 = data['B1']
        leg2 = data['zeta'] - B1
        print('--- %s panel: sigma = %s ---' % (tag, mp.nstr(data['sigma'], 6)))
        print('B1 (bisector point) =', mp.nstr(B1, 8))
        print('|leg1| = |B1|       =', mp.nstr(mp.fabs(B1), 8))
        print('|leg2| = |zeta-B1|  =', mp.nstr(mp.fabs(leg2), 8))
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
