#!/usr/bin/env python3
"""
fig_splits_h.py
===============

The offset h of the projection corollary, drawn.  Every reflection-symmetric
split zeta = B1 + B2 (B2 = chi conj B1) satisfies, on the critical line,

    e^{i theta} B1 = Z/2 + i h,     h real,

so all of the split points lie on one line: the line through zeta/2
perpendicular to the base O -> zeta.  The only thing that distinguishes one
split from another is h, the signed distance from zeta/2 along that line.

Left panel: the whole picture at sigma = 1/2, T = 6.18, with the four splits of
the paper (ps, R/2, ak and the velocity split) and h drawn as a thick stretch
of the line for the R/2 split and for the velocity split.
Right panel: the joint region magnified, with only the first fractional link
R_{1ps} kept, showing how tightly the ps, R/2 and ak split points crowd
together against the reach of the velocity split.

Output (into ./figures/):
    fig_splits_h.pdf   (vector)
    fig_splits_h.png   (raster preview)

Run:  python3 fig_splits_h.py
"""

import os

import math

import mpmath as mp
import matplotlib.pyplot as plt
from matplotlib.patches import Arc

from fig1_spiral_summands import compute, C, xy, OUTDIR, SIGMA, T_INDEX
from check_counting_curve import bisector

BASENAME = 'fig_splits_h'

COL = {'ps': '#d62728', 'rs': '#7f2fbf', 'ak': '#ff7f0e', 'star': '#0aa6a6'}
LAB = {'ps': r'$B_1^{ps}=\Sigma_1+R_{1ps}$',
       'rs': r'$B_1^{rs}=\Sigma_1+R/2$',
       'ak': r'$B_1^{ak}=\Sigma_1+R_{1ak}$',
       'star': r"$B_1^{\ast}=\zeta+\zeta'/(2\theta')$"}
KEYS = ('ps', 'rs', 'ak', 'star')

mp.mp.dps = 30


def main():
    data = compute()
    t, m = data['t'], data['m']
    th = mp.siegeltheta(t)

    z = C(data['zeta'])
    S1 = C(data['Sigma1'])
    R = C(data['R'])
    B = {k: C(bisector(t, k)) for k in KEYS}
    h = {k: float(mp.im(mp.e ** (1j * th) * bisector(t, k))) for k in KEYS}

    mid = z / 2                                  # B1 = zeta/2 + h * perp
    perp = complex(1j * mp.e ** (-1j * th))
    base = z / abs(z)

    fig = plt.figure(figsize=(7.4, 7.6))
    axL = fig.add_subplot(1, 1, 1)

    x1, y1 = xy(data['leg1'])
    axL.plot(x1, y1, '-', color='#1f77b4', lw=0.9, marker='o', ms=2.2,
             alpha=0.35, zorder=2, label=r'forward chain $\to\Sigma_1$')
    A = data['B1'] + data['R2ps']
    leg2, w = [A], A
    for n in range(m, 0, -1):
        w += data['chi'] * (n ** (data['s'] - 1))
        leg2.append(w)
    x2, y2 = xy(leg2)
    axL.plot(x2, y2, '-', color='#2ca02c', lw=0.9, marker='s', ms=2.2,
             alpha=0.35, zorder=2, label=r'reverse chain $\to\zeta$')

    axL.plot([0, z.real], [0, z.imag], ':', color='0.4', lw=1.3, zorder=1,
             label=r'base $O\to\zeta$')
    span = max(abs(v) for v in h.values()) + 0.45
    p0, p1 = mid - 0.5 * perp, mid + span * perp
    axL.plot([p0.real, p1.real], [p0.imag, p1.imag], '--', color='0.35',
             lw=1.1, zorder=1, label=r'the line $\Re(e^{i\theta}B_1)=Z/2$')

    for k in KEYS:
        b = B[k]
        axL.plot([0, b.real, z.real], [0, b.imag, z.imag], '-',
                 color=COL[k], lw=0.9, alpha=0.55, zorder=3)

    # h itself: a thick stretch of the line from zeta/2 out to the split point
    for k, lw_, lab_off in (('star', 7.0, 0.30), ('rs', 4.0, -0.26)):
        q = mid + h[k] * perp
        axL.plot([mid.real, q.real], [mid.imag, q.imag], '-', color=COL[k],
                 lw=lw_, alpha=0.55, solid_capstyle='butt', zorder=4)
        c = mid + 0.5 * h[k] * perp + lab_off * base
        axL.annotate(r'$h_{R/2}=%.3f$' % h[k] if k == 'rs'
                     else r'$h^{\ast}=%.3f$' % h[k],
                     (c.real, c.imag), fontsize=12, color=COL[k], ha='center',
                     va='center', zorder=10,
                     bbox=dict(boxstyle='round,pad=0.2', fc='white',
                               ec=COL[k], lw=0.8, alpha=0.95))

    # right-angle tick at zeta/2, between base and line
    e = 0.13
    corner = mid + e * base + e * perp
    axL.plot([(mid + e * base).real, corner.real, (mid + e * perp).real],
             [(mid + e * base).imag, corner.imag, (mid + e * perp).imag],
             '-', color='0.25', lw=1.0, zorder=6)

    # theta at O, swept clockwise off the positive real axis onto the base line:
    # arg zeta = -theta modulo pi, the base extended through O when Z < 0
    th_deg = float(mp.degrees(mp.fmod(th, mp.pi)))
    rad = 0.55
    far = 0.92 * complex(math.cos(math.radians(-th_deg)),
                         math.sin(math.radians(-th_deg)))
    axL.plot([0, far.real], [0, far.imag], ':', color='0.4', lw=1.3, zorder=1)
    axL.add_patch(Arc((0, 0), 2 * rad, 2 * rad, theta1=-th_deg, theta2=0,
                      color='0.2', lw=1.2, zorder=6))
    tip = rad * complex(math.cos(math.radians(-th_deg)),
                        math.sin(math.radians(-th_deg)))
    tail = rad * complex(math.cos(math.radians(-th_deg + 4.5)),
                         math.sin(math.radians(-th_deg + 4.5)))
    axL.annotate('', xy=(tip.real, tip.imag), xytext=(tail.real, tail.imag),
                 arrowprops=dict(arrowstyle='-|>', color='0.2', lw=1.2,
                                 shrinkA=0, shrinkB=0), zorder=6)
    lab = (rad + 0.32) * complex(math.cos(math.radians(-0.52 * th_deg)),
                                 math.sin(math.radians(-0.52 * th_deg)))
    axL.annotate(r'$\theta=%.2f^\circ$' % th_deg, (lab.real, lab.imag),
                 fontsize=12, color='0.15', ha='center', va='center', zorder=10)

    for k in KEYS:
        b = B[k]
        axL.plot([b.real], [b.imag], '*' if k == 'star' else 'o',
                 color=COL[k], ms=15 if k == 'star' else 6.5, zorder=8,
                 markeredgecolor='k', markeredgewidth=0.5, label=LAB[k])
    for p, lab, dx, dy in [(0j, r'$O$', -14, -6), (z, r'$\zeta$', 6, 6),
                           (S1, r'$\Sigma_1$', 9, -13),
                           (mid, r'$\zeta/2$', -8, -17)]:
        axL.plot([p.real], [p.imag], 'o', color='k', ms=4.5, zorder=9)
        axL.annotate(lab, (p.real, p.imag), textcoords='offset points',
                     xytext=(dx, dy), fontsize=15, zorder=10)

    axL.set_xlim(-1.35, 2.75)
    axL.set_ylim(-1.05, 3.75)
    axL.set_aspect('equal', adjustable='box')
    axL.grid(True, ls=':', alpha=0.4)
    axL.set_xlabel(r'$\Re$')
    axL.set_ylabel(r'$\Im$')
    axL.legend(loc='upper center', bbox_to_anchor=(0.5, -0.095), ncol=2,
               fontsize=8.4, framealpha=0.93)
    axL.set_title(r'The splits and the offset $h$, measured from $\zeta/2$ '
                  'along\nthe line perpendicular to the base:  '
                  r'$\sigma=%.2f$, $T=%.2f$ ($t=%.2f$, $m=%d$)'
                  % (float(SIGMA), float(T_INDEX), float(t), m), fontsize=11)

    fig.subplots_adjust(left=0.105, right=0.98, top=0.90, bottom=0.215)

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf)
    fig.savefig(png, dpi=200)
    plt.close(fig)
    for k in KEYS:
        print('%-5s h = %+.6f   B1 = %+.6f%+.6fi   |B1| = %.6f = %.6f'
              % (k, h[k], B[k].real, B[k].imag, abs(B[k]), abs(z - B[k])))
    print('h_ak - h_ps = %.4f   h_ps - h_star = %.4f'
          % (h['ak'] - h['ps'], h['ps'] - h['star']))
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
