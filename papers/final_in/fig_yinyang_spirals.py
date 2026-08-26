#!/usr/bin/env python3
"""
fig_yinyang_spirals.py
======================

Companion to the yin-and-yang section: the two spirals at the same
parameters as the bisector-frame figure (sigma = 1/4, T = 6.18, m = 6),
with BOTH bisector links highlighted.

Both panels are drawn in the coordinate frame of the FORWARD BISECTOR
LINK: every point is translated so joint m (Sigma1) sits at the origin
and rotated so the forward bisector link lies along the positive
x-axis.  NO scaling is applied -- all lengths are the true lengths, so
the forward bisector link runs from 0 to (m+1)^{-sigma} on the x-axis.

Left panel:  the full forward chain (Sigma1 side, blue, anchored at O)
             and reverse chain (Sigma2 side, green, anchored at zeta),
             each drawn out to link floor(I(T)/pi) as in the other
             spiral figures.  The forward bisector link (link m of the
             forward chain) and the reverse bisector link (link m of
             the reverse chain) are overdrawn with thick dark strokes.
             A gray rectangle marks the zoom window of the right panel.
Right panel: zoom into the bisector-link area: the two thick links
             crossing at the bisector point (red dot), with labels.

Outputs (into ./figures/):
    fig_yinyang_spirals.pdf   (vector, used by LaTeX)
    fig_yinyang_spirals.png   (raster preview)

Run:  python3 fig_yinyang_spirals.py
"""

import os

import mpmath as mp
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

from fig1_spiral_summands import I_of_T, chi, C, xy, OUTDIR

BASENAME = 'fig_yinyang_spirals'
SIGMA = mp.mpf('0.25')
T_INDEX = mp.mpf('6.18')

BLUE, GREEN, PURPLE, RED = '#1f77b4', '#2ca02c', '#7f2fbf', '#d62728'
DARKBLUE, DARKGREEN = '#0b3d6b', '#0e5c17'

mp.mp.dps = 30


def compute():
    t = I_of_T(T_INDEX)
    s = mp.mpc(SIGMA, t)
    m = int(mp.floor(T_INDEX))
    w = t * mp.log(m + 1)
    ch = chi(s)
    psi = mp.arg(ch)
    n_links = int(mp.floor(t / mp.pi)) + 1
    zeta = mp.zeta(s)

    fwd = [mp.mpc(0)]
    z = mp.mpc(0)
    for n in range(1, n_links + 1):
        z += mp.mpf(n) ** (-s)
        fwd.append(z)
    Sigma1 = fwd[m]

    rev = [zeta]
    z = zeta
    for n in range(1, n_links + 1):
        z -= ch * mp.mpf(n) ** (s - 1)
        rev.append(z)

    R = zeta - Sigma1 - (zeta - rev[m])

    u1 = mp.exp(-1j * w)
    u2 = mp.exp(1j * (w + psi))
    det = mp.re(u1) * mp.im(u2) - mp.re(u2) * mp.im(u1)
    d1 = (mp.re(R) * mp.im(u2) - mp.re(u2) * mp.im(R)) / det
    B1 = Sigma1 + d1 * u1

    # frame of the forward bisector link: translate joint m to the origin
    # and rotate the link onto the positive x-axis (NO scaling: the link
    # direction is e^{-iw}, so multiplying by e^{+iw} makes it horizontal
    # while keeping every length unchanged).
    rot = mp.exp(1j * w)
    frame = lambda z: (z - Sigma1) * rot
    fwd = [frame(z) for z in fwd]
    rev = [frame(z) for z in rev]
    origin = frame(mp.mpc(0))
    zeta_f = frame(zeta)
    B1_f = frame(B1)

    return dict(t=t, s=s, m=m, fwd=fwd, rev=rev, zeta=zeta_f, B1=B1_f,
                origin=origin, zeta_world=zeta, n_links=n_links)


def draw(ax, data, zoom):
    m = data['m']
    xf, yf = xy(data['fwd'])
    ax.plot(xf, yf, '-', color=BLUE, lw=0.8, alpha=0.95, zorder=2,
            label=r'forward chain ($\Sigma_1$ side)')
    xr, yr = xy(data['rev'])
    ax.plot(xr, yr, '-', color=GREEN, lw=0.8, alpha=0.95, zorder=2,
            label=r'reverse chain ($\Sigma_2$ side)')

    # the two bisector links (link m of each chain), thick
    fa, fb = C(data['fwd'][m]), C(data['fwd'][m + 1])
    ra, rb = C(data['rev'][m]), C(data['rev'][m + 1])
    ax.plot([fa.real, fb.real], [fa.imag, fb.imag], '-', color=DARKBLUE,
            lw=3.2, solid_capstyle='round', zorder=4,
            label='forward bisector link')
    ax.plot([ra.real, rb.real], [ra.imag, rb.imag], '-', color=DARKGREEN,
            lw=3.2, solid_capstyle='round', zorder=4,
            label='reverse bisector link')

    # bisector point
    bpt = C(data['B1'])
    ax.plot([bpt.real], [bpt.imag], 'o', color=RED, ms=6, zorder=6)

    ax.set_aspect('equal', adjustable='box' if zoom else 'datalim')
    ax.grid(True, ls=':', alpha=0.4)
    ax.set_xlabel('bisector-frame $x$')
    if not zoom:
        ax.set_ylabel('bisector-frame $y$')

    if zoom:
        # window centered on the two bisector links
        pts = [fa, fb, ra, rb, bpt]
        x0 = min(p.real for p in pts)
        x1 = max(p.real for p in pts)
        y0 = min(p.imag for p in pts)
        y1 = max(p.imag for p in pts)
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        half = max(x1 - x0, y1 - y0) / 2 * 1.45
        ax.set_xlim(cx - half, cx + half)
        ax.set_ylim(cy - half, cy + half)

        ax.annotate('forward bisector link\n(link %d of the forward chain)'
                    % m, (fb.real, fb.imag),
                    color=DARKBLUE, textcoords='offset points',
                    xytext=(-4, 10), fontsize=9, ha='right')
        ax.annotate('reverse bisector link\n(link %d of the reverse chain)'
                    % m, (rb.real, rb.imag),
                    color=DARKGREEN, textcoords='offset points',
                    xytext=(12, -6), fontsize=9, ha='left')
        ax.annotate('bisector point', (bpt.real, bpt.imag), color=RED,
                    textcoords='offset points', xytext=(0, 8),
                    fontsize=10, ha='center', va='bottom')
        ax.set_title('zoom: the bisector-link area', fontsize=11)
        return (cx, cy, half)

    # full view: labels for O (the world origin, moved by the frame map)
    # and zeta
    opt = C(data['origin'])
    ax.plot([opt.real], [opt.imag], 'o', color='k', ms=5, zorder=5)
    ax.annotate(r'$O$', (opt.real, opt.imag), textcoords='offset points',
                xytext=(26, -4), fontsize=12, ha='left', va='center')
    zpt = C(data['zeta'])
    ax.plot([zpt.real], [zpt.imag], 'o', color=PURPLE, ms=5, zorder=5)
    ax.annotate(r'$\zeta$', (zpt.real, zpt.imag), color=PURPLE,
                textcoords='offset points', xytext=(-30, 0), fontsize=12,
                ha='right', va='center')
    ax.set_title('the two chains and their bisector links', fontsize=11)
    ax.legend(loc='upper left', fontsize=8.5, framealpha=0.92)
    return None


def main():
    data = compute()
    fig, (axL, axR) = plt.subplots(1, 2, figsize=(12.6, 6.2))

    window = draw(axR, data, zoom=True)
    draw(axL, data, zoom=False)

    # zoom rectangle on the left panel
    cx, cy, half = window
    axL.add_patch(Rectangle((cx - half, cy - half), 2 * half, 2 * half,
                            fill=False, ec='0.35', lw=1.1, zorder=7))

    fig.suptitle(r'The bisector links at $\sigma=1/4$, $T=6.18$ '
                 r'($t=I(T)\approx%.2f$, $m=%d$)'
                 % (float(data['t']), data['m']), fontsize=12)
    fig.tight_layout(rect=(0, 0, 1, 0.96))

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf)
    fig.savefig(png, dpi=200)
    plt.close(fig)

    print('zeta =', mp.nstr(data['zeta'], 8), ' B1 =', mp.nstr(data['B1'], 8),
          ' links per chain =', data['n_links'])
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
