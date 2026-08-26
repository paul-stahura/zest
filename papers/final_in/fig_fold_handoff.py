#!/usr/bin/env python3
"""
fig_fold_handoff.py
===================

The geometry behind the fold relation d1(n+) = n^-s - d1(n-) and behind the
two quantities the pinned waveform is built from: the alternating-tail center
and the shortfall eps_n.

At T = 6.99 the outgoing link 6 (summand 7) and the incoming link 7
(summand 8) make 172.8 degrees; at T = 7 the turn is exactly 180 degrees,
because the index map forces t log((n+1)/n) = pi (2n+1) = pi (mod 2 pi).  The
links therefore lie on top of one another at the handoff, and the bisector
point B1 -- one point, which never jumps -- is on both of them at once.  All
that changes is the joint the distance is measured from and the length of the
link it is measured in.

Panel (a) draws the two links, the two midpoints, B1 and d1.
Panel (b) reads link 6 as [0,1] and shows the alternating-tail center, the
position of B1, and the gap between them that becomes W after the chord is
subtracted.
Panel (c) magnifies the handoff, where B1 has swung back to within eps_7 of
the center.

Outputs (into ./figures/):
    fig_fold_handoff.pdf   (vector, used by LaTeX)
    fig_fold_handoff.png   (raster preview)

Run:  python3 fig_fold_handoff.py
"""

import os
import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import ConnectionPatch, Rectangle

from fig1_spiral_summands import I_of_T, OUTDIR
from fig_d1_critical import d1_critical

BASENAME = 'fig_fold_handoff'
T = 6.99
SIGMA = 0.5
EPS = 1e-9                      # offset used for the one-sided limits
ZOOM_LO, ZOOM_HI = 0.452, 0.602  # panel (b) window, as a fraction of link 6
LINK6, LINK7, BPT, ORANGE = '#117733', '#d62728', '#1f77b4', '#e08214'

mp.mp.dps = 30


def eps_of(n):
    """Shortfall of the fold fraction from the alternating-tail center."""
    d = mp.mpf(d1_critical(n - EPS))
    return float(mp.mpf(n) ** SIGMA * (mp.lerchphi(-1, SIGMA, n) - d))


def main():
    m = int(T)
    x = T - m
    t = float(I_of_T(T))
    s = mp.mpc(SIGMA, t)
    omega = t * np.log(m + 1)

    joints = [mp.mpc(0)]
    for n in range(1, m + 3):
        joints.append(joints[-1] + mp.mpf(n) ** (-s))

    d1 = d1_critical(T)
    L6 = float((m + 1) ** -SIGMA)
    tail7 = float(mp.lerchphi(-1, SIGMA, m + 1))
    eps6, eps7 = eps_of(m), eps_of(m + 1)

    d1hat = (m + 1) ** SIGMA * d1
    c_frac = (m + 1) ** SIGMA * tail7
    P = T ** SIGMA * (tail7 - d1)
    W = P + (1 - x) * eps6 - x * eps7
    d1hat_at_7 = c_frac - eps7

    rot = mp.exp(1j * omega)                 # put link 6 along +x
    J6, J7, J8 = [complex(joints[k] * rot) for k in (m, m + 1, m + 2)]
    J6, J7, J8 = J6 - J6, J7 - J6, J8 - J6
    mid6, mid7 = (J6 + J7) / 2, (J7 + J8) / 2
    fold = abs(np.degrees(np.angle((J8 - J7) / (J7 - J6))))

    # Explicit axes rectangles: panel (a) is drawn to scale, so its height is
    # fixed by the width and by the y range it has to cover.  Keeping the
    # whole figure under about 4 inches lets it float as a top float instead
    # of being pushed onto a page of its own, away from the text.
    fw, fh = 6.5, 3.95
    left, width = 0.055, 0.93
    span_x, span_y = 0.520, 0.130
    h_a = (width * fw) * span_y / span_x
    fig = plt.figure(figsize=(fw, fh))
    ax = fig.add_axes([left, (fh - 0.42 - h_a) / fh, width, h_a / fh])
    b1 = fig.add_axes([left, 0.599 / fh, 3.35 / fw, 0.90 / fh])
    b2 = fig.add_axes([4.1575 / fw, 0.599 / fh, 2.245 / fw, 0.90 / fh])

    # Panels (a)-(c) are schematics rather than plots, so they carry no axes
    # frames; one border round the whole figure keeps it looking like the
    # framed plots elsewhere in the paper.
    fig.add_artist(Rectangle((0.005, 0.007), 0.990, 0.986,
                             transform=fig.transFigure, fill=False,
                             ec='black', lw=0.8, zorder=10))

    # ---- (a) the two links, all but folded back ---------------------------
    ax.annotate('', xy=(J7.real, J7.imag), xytext=(J6.real, J6.imag),
                arrowprops=dict(arrowstyle='-|>', lw=2.2, color=LINK6))
    ax.annotate('', xy=(J8.real, J8.imag), xytext=(J7.real, J7.imag),
                arrowprops=dict(arrowstyle='-|>', lw=2.2, color=LINK7))
    ax.text(0.085, 0.008, 'link 6', color=LINK6, fontsize=9, ha='center',
            va='bottom')
    ax.text(0.255, -0.024, 'link 7', color=LINK7, fontsize=9, ha='center',
            va='top')
    for pt, lab, dx, dy, va in ((J6, 'joint 6', -0.030, -0.005, 'top'),
                                (J7, 'joint 7', 0.032, -0.005, 'top'),
                                (J8, 'joint 8', -0.032, 0.004, 'bottom')):
        ax.plot(pt.real, pt.imag, 'o', ms=5, mfc='white', mec='0.25', mew=1.2,
                zorder=6)
        ax.text(pt.real + dx, pt.imag + dy, lab, fontsize=8, ha='center',
                va=va)
    ax.plot(mid6.real, mid6.imag, '|', ms=11, mew=1.8, color=LINK6, zorder=6,
            label='midpoint of link 6')
    ax.plot(mid7.real, mid7.imag, '|', ms=11, mew=1.8, color=LINK7, zorder=6,
            label='midpoint of link 7')
    ax.plot(tail7, 0, 'v', ms=6.5, color=ORANGE, zorder=7,
            label='alternating-tail center')
    ax.plot(d1, 0, 'o', ms=7, color=BPT, zorder=8, label=r'$B_1$')
    ax.annotate('', xy=(d1, -0.058), xytext=(0, -0.058),
                arrowprops=dict(arrowstyle='<|-|>', lw=1.0, color=BPT))
    for xv in (0, d1):
        ax.plot([xv, xv], [0, -0.058], lw=0.6, ls=':', color=BPT)
    ax.text(d1 / 2, -0.063,
            rf'$d_1={d1:.4f}$, i.e. $\hat d_1={d1hat:.3f}$ of the link',
            fontsize=8, ha='center', va='top', color=BPT,
            bbox=dict(boxstyle='round,pad=0.18', fc='white', ec='none'))
    box_lo, box_hi, box_bot = ZOOM_LO * L6, ZOOM_HI * L6, -0.008
    ax.add_patch(Rectangle((box_lo, box_bot), box_hi - box_lo, 0.016,
                           fill=False, ec='0.4', lw=0.9, ls='--', zorder=9))
    # Leaders from the box down to the panel that magnifies it.  They sit at
    # zorder 1 so the d1 label, which they pass under, masks them.
    for x_box, x_panel in ((box_lo, 0.0), (box_hi, 1.0)):
        ax.add_artist(ConnectionPatch(
            xyA=(x_box, box_bot), coordsA=ax.transData,
            xyB=(x_panel, 1.0), coordsB=b1.transAxes,
            color='0.6', lw=0.7, ls=(0, (3, 3)), zorder=1, clip_on=False))
    ax.legend(loc='upper right', fontsize=7.2, frameon=True, framealpha=0.95,
              borderpad=0.45, handletextpad=0.8, labelspacing=0.35, ncol=2,
              columnspacing=1.2)
    ax.set_title(rf'(a) links 6 and 7 at $T={T}$, all but folded back: the'
                 rf' turn is ${fold:.1f}^\circ$ here, exactly $180^\circ$'
                 rf' at $T=7$', fontsize=9)
    ax.set_aspect('equal')
    ax.set_xlim(-0.075, 0.445)
    ax.set_ylim(-0.084, 0.046)
    ax.axhline(0, color='0.88', lw=0.6, zorder=0)
    ax.set_xticks([])
    ax.set_yticks([])
    for sp in ax.spines.values():
        sp.set_visible(False)

    def rail(a, lo, hi):
        a.axhline(0, color=LINK6, lw=2.6, solid_capstyle='butt', zorder=1)
        a.set_xlim(lo, hi)
        a.set_ylim(-1.7, 1.25)
        a.set_yticks([])
        a.tick_params(labelsize=7.5)
        a.grid(True, axis='x', ls=':', alpha=0.45)
        for sp in a.spines.values():
            sp.set_visible(True)
            sp.set_color('0.55')
            sp.set_linewidth(0.6)

    # ---- (b) the boxed stretch: the gap that becomes W --------------------
    rail(b1, ZOOM_LO, ZOOM_HI)
    b1.plot([0.5], [0], '|', ms=16, mew=1.8, color=LINK6, zorder=4)
    b1.text(0.4885, -0.26, 'midpoint', fontsize=7.5, ha='center', va='top',
            color=LINK6)
    b1.plot([c_frac], [0], 'v', ms=7, color=ORANGE, zorder=5)
    b1.text(c_frac, 0.30, rf'center {c_frac:.4f}', fontsize=7.5, ha='center',
            va='bottom', color=ORANGE)
    b1.plot([d1hat], [0], 'o', ms=7, color=BPT, zorder=6)
    b1.text(d1hat, 0.30, rf'$B_1$ at $T={T}$' '\n' rf'$\hat d_1={d1hat:.4f}$',
            fontsize=7.5, ha='center', va='bottom', color=BPT)
    b1.annotate('', xy=(c_frac, -0.32), xytext=(d1hat, -0.32),
                arrowprops=dict(arrowstyle='<|-|>', lw=1.1, color='0.2'))
    b1.text(0.5 * (c_frac + d1hat), -0.48,
            rf'gap $P={P:+.4f}$' '\n' rf'$\mathcal{{W}}={W:+.4f}$',
            fontsize=7.5, ha='center', va='top')
    b1.set_xlabel('fraction along link 6', fontsize=7.5, labelpad=2)
    b1.set_title('(b) the boxed stretch, link 6 read as $[0,1]$', fontsize=8.5)

    # ---- (c) the handoff: eps_7 -------------------------------------------
    rail(b2, 0.4985, 0.5232)
    b2.plot([0.5], [0], '|', ms=16, mew=1.8, color=LINK6, zorder=4)
    b2.text(0.4993, -0.30, 'midpoint\n0.5000', fontsize=7.5, ha='left',
            va='top', color=LINK6)
    b2.plot([c_frac], [0], 'v', ms=7, color=ORANGE, zorder=5)
    b2.text(c_frac, 0.34, 'center\n' rf'${c_frac:.4f}$', fontsize=7.5,
            ha='center', va='bottom', color=ORANGE)
    b2.plot([d1hat_at_7], [0], 'o', ms=7, mfc='white', mec=BPT, mew=1.5,
            zorder=6)
    b2.annotate(rf'$B_1$ at $T=7^-$' '\n' rf'${d1hat_at_7:.4f}$',
                xy=(d1hat_at_7, 0.20), xytext=(0.5088, 0.42), fontsize=7.5,
                ha='center', va='bottom', color=BPT,
                arrowprops=dict(arrowstyle='-', lw=0.7, color=BPT))
    for xv in (d1hat_at_7, c_frac):
        b2.plot([xv, xv], [0, -0.32], lw=0.6, ls=':', color='0.35')
    b2.annotate('', xy=(c_frac, -0.32), xytext=(d1hat_at_7, -0.32),
                arrowprops=dict(arrowstyle='<->', lw=0.9, color='0.2',
                                mutation_scale=7))
    b2.text(0.5 * (c_frac + d1hat_at_7), -0.48,
            rf'$\varepsilon_7={eps7:.4f}$', fontsize=8, ha='center',
            va='top')
    b2.set_xlabel('fraction along link 6', fontsize=7.5, labelpad=2)
    b2.set_title('(c) the handoff, magnified six times', fontsize=8.5)

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf)
    fig.savefig(png, dpi=200)
    plt.close(fig)

    print(f'T = {T}, t = I(T) = {t:.4f}, fold angle = {fold:.3f} deg')
    print(f'link 6 = {L6:.6f}, center = {c_frac:.6f} of the link')
    print(f'd1 = {d1:.6f}, d1hat = {d1hat:.6f}, P = {P:+.6f}, W = {W:+.6f}')
    print(f'eps_6 = {eps6:.6f}, eps_7 = {eps7:.6f},'
          f' d1hat(7-) = {d1hat_at_7:.6f}')
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
