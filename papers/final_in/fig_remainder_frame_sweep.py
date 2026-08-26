#!/usr/bin/env python3
"""
fig_remainder_frame_sweep.py
============================

The remainder splits in the R-frame as T sweeps one unit, T = 4 to 5 at
sigma = 1/2, in 4 x 4 = 16 panels: the companion of fig_bisector_frame.py
(which does the same sweep for the neighboring links) drawn in the frame of
fig_remainder_scale_panels.py.

Frame: rotate so R lies along the real axis and translate so the midpoint of R
is the origin. R then runs from -|R|/2 to +|R|/2, and the chain of the split
runs from the left endpoint (the joint Sigma_1, at m = 4 throughout) to the
right. All sixteen panels share one absolute scale, so both the growth of |R|
and the motion of the split are visible.

The chain length is held at m = 4 for the whole sweep, as fig_bisector_frame.py
holds the bisector link, so T = 5 is the handoff instant seen from below.

Dotted arrows: from the midpoint of R1ps and of R2ps to where the next panel
puts them, along the path actually taken, as in fig_bisector_frame.py.

Run:  python3 fig_remainder_frame_sweep.py
"""

import cmath
import os

import matplotlib.pyplot as plt
import mpmath as mp
import numpy as np

from fig1_spiral_summands import I_of_T, chi, C
from fig4_kuznetsov_zoom import I1_of, PURPLE, ORANGE
from fig_remainder_scale_panels import RED

OUTDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'figures')
BASENAME = 'fig_remainder_frame_sweep'
SIGMA = mp.mpf('0.5')
M = 4                              # chain length, held fixed across the sweep
N_PANELS = 16
N_SUB = 36                         # samples along each motion arrow

mp.mp.dps = 30

# heights in (4, 5) where sin(2 omega + arg chi) = 0, from eq. (pole-locations)
POLES = (4.2566854, 4.7558984)


def frame_at(T):
    """The split in the R-frame at index T, chain length M.

    Returns the left endpoint of R (the Sigma_1 joint), the PS joint, the two
    AK joints, and |R|.  Positions are absolute in the frame whose origin is
    the midpoint of R.
    """
    t = I_of_T(mp.mpf(T))
    s = mp.mpc(SIGMA, t)
    n = M + 1
    w = t * mp.log(n)
    ch = chi(s)
    psi = mp.arg(ch)

    S1 = mp.fsum(mp.mpf(k) ** (-s) for k in range(1, M + 1))
    S2 = ch * mp.fsum(mp.mpf(k) ** (s - 1) for k in range(1, M + 1))
    R = mp.zeta(s) - S1 - S2

    u1, u2 = mp.exp(-1j * w), mp.exp(1j * (w + psi))
    a, b = mp.re(u1), mp.re(u2)
    c, d = mp.im(u1), mp.im(u2)
    det = a * d - b * c
    d1 = (mp.re(R) * d - b * mp.im(R)) / det
    R1ps = d1 * u1

    s_py = complex(0.5, float(t))
    chi_py = complex(float(mp.re(ch)), float(mp.im(ch)))
    sign = (-1.0) ** M
    R1ak = -0.5 * sign * I1_of(s_py, M + 0.5)
    R2ak = -0.5 * sign * chi_py * I1_of(complex(0.5, s_py.imag),
                                       M + 0.5).conjugate()

    Rc = C(R)
    rot = cmath.exp(-1j * cmath.phase(Rc))
    mid = Rc * rot / 2

    def rf(z):
        return z * rot - mid

    return dict(T=float(T), absR=abs(Rc), det=float(det),
                O=rf(0.0), A=rf(Rc), B=rf(C(R1ps)),
                Jak=rf(R1ak), Eak=rf(R1ak + R2ak))


def midpoints(fr):
    """Midpoints of R1ps and R2ps in the frame."""
    return 0.5 * (fr['O'] + fr['B']), 0.5 * (fr['B'] + fr['A'])


def draw_motion_arrow(ax, path, color):
    """Dotted trail to where the next panel puts the segment, arrow at the end."""
    xs = [p.real for p in path]
    ys = [p.imag for p in path]
    ax.plot(xs, ys, ls=':', color=color, lw=1.0, alpha=0.95, zorder=6)
    ax.annotate('', xy=(xs[-1], ys[-1]), xytext=(xs[-2], ys[-2]),
                arrowprops=dict(arrowstyle='-|>', color=color, lw=1.0,
                                shrinkA=0, shrinkB=0),
                annotation_clip=False, zorder=6)


def draw_panel(ax, fr, legend=False):
    o, A, B = fr['O'], fr['A'], fr['B']
    Jak, Eak = fr['Jak'], fr['Eak']
    seg = lambda p, q, **kw: ax.plot([p.real, q.real], [p.imag, q.imag],
                                     solid_capstyle='round', **kw)
    seg(o, A, ls='-', color=PURPLE, lw=1.8, zorder=3,
        label=r'$R$' if legend else None)
    seg(o, B, ls='-', color=RED, lw=2.4, zorder=4,
        label=r'$R_{1ps}$' if legend else None)
    seg(B, A, ls='-', color=ORANGE, lw=2.4, zorder=4,
        label=r'$R_{2ps}$' if legend else None)
    ax.plot([o.real, Jak.real], [o.imag, Jak.imag], '--', color=ORANGE,
            lw=1.5, dashes=(4, 2), zorder=5,
            label=r'$R_{1ak},R_{2ak}$' if legend else None)
    ax.plot([Jak.real, Eak.real], [Jak.imag, Eak.imag], '--', color=ORANGE,
            lw=1.5, dashes=(4, 2), zorder=5)
    ax.plot([o.real], [o.imag], 'o', ms=10, mfc='none', mec='k', mew=1.1,
            zorder=7, label=r'$\Sigma_1$ joint, $m=%d$' % M if legend else None)
    for p in (o, A, B, Jak):
        ax.plot([p.real], [p.imag], 'o', color='k', ms=2.8, zorder=8)
    ax.axhline(0, color='0.88', lw=0.6, zorder=0)
    ax.axvline(0, color='0.88', lw=0.6, zorder=0)


def main():
    Ts = np.linspace(M, M + 1, N_PANELS)
    frames = [frame_at(T) for T in Ts]

    # the paths the two midpoints take between consecutive panels
    trails = []
    for k in range(len(Ts) - 1):
        sub = [midpoints(frame_at(T))
               for T in np.linspace(Ts[k], Ts[k + 1], N_SUB)]
        trails.append(([p[0] for p in sub], [p[1] for p in sub]))

    pts = [p for fr in frames for p in (fr['O'], fr['A'], fr['B'],
                                        fr['Jak'], fr['Eak'])]
    pts += [z for t in trails for half in t for z in half]
    mrg = 0.03
    xlim = (min(p.real for p in pts) - mrg, max(p.real for p in pts) + mrg)
    ylim = (min(p.imag for p in pts) - mrg, max(p.imag for p in pts) + mrg)

    aspect = (xlim[1] - xlim[0]) / (ylim[1] - ylim[0])
    width = 12.4
    fig, axes = plt.subplots(4, 4, figsize=(width, width / aspect + 1.15))

    notes = {
        0: 'Start when $T=n$',
        3: 'PS apex dropping onto $R$:\n$d_1$ pole at $T=%.4f$' % POLES[0],
        4: 'past the pole, PS apex\nnow below $R$',
        7: '$|R|$ growing, PS apex\nstill descending',
        11: 'PS apex rising back through $R$:\n$d_1$ pole at $T=%.4f$' % POLES[1],
        12: 'past the second pole,\nPS apex above $R$ again',
        15: 'End when $T=n+1$:\nthe next link takes over',
    }

    for k, (ax, fr) in enumerate(zip(axes.flat, frames)):
        draw_panel(ax, fr, legend=(k == 0))
        if k < len(trails):
            draw_motion_arrow(ax, trails[k][0], RED)
            draw_motion_arrow(ax, trails[k][1], ORANGE)
        ax.text(0.03, 0.95, r'$T=%.4g$' % fr['T'], transform=ax.transAxes,
                fontsize=9, ha='left', va='top')
        ax.text(0.97, 0.95, r'$|R|=%.3f$' % fr['absR'], transform=ax.transAxes,
                fontsize=8, ha='right', va='top', color='0.35')
        if k in notes:
            ax.text(0.03, 0.86, notes[k], transform=ax.transAxes, fontsize=7.5,
                    ha='left', va='top')
        if k == 0:                                   # scale bar, no ticks
            y = ylim[0] + 0.07 * (ylim[1] - ylim[0])
            ax.plot([0.14, 0.24], [y, y], '-', color='k', lw=1.6,
                    solid_capstyle='butt')
            ax.text(0.19, y + 0.012 * (ylim[1] - ylim[0]), '0.1', fontsize=7.5,
                    ha='center', va='bottom')
        ax.set_xlim(*xlim)
        ax.set_ylim(*ylim)
        ax.set_aspect('equal', adjustable='box')
        ax.set_xticks([])
        ax.set_yticks([])

    handles, labels = axes.flat[0].get_legend_handles_labels()
    axes.flat[0].get_legend().remove() if axes.flat[0].get_legend() else None
    fig.legend(handles, labels, loc='upper center', ncol=5, frameon=False,
               fontsize=10, bbox_to_anchor=(0.5, 0.955))
    fig.suptitle(r'The remainder splits in the $R$-frame, $T=%d\to%d$ at '
                 r'$\sigma=1/2$ (chain length $m=%d$, common scale)'
                 % (M, M + 1, M), fontsize=13, y=0.995)
    fig.tight_layout(rect=(0, 0, 1, 0.945))

    os.makedirs(OUTDIR, exist_ok=True)
    for ext in ('pdf', 'png'):
        path = os.path.join(OUTDIR, f'{BASENAME}.{ext}')
        fig.savefig(path, dpi=200 if ext == 'png' else None)
        print('wrote', path)
    plt.close(fig)

    print(f'\n{"T":>8} {"|R|":>8} {"apex height":>12} {"d1/|R|":>8} '
          f'{"sin(2w+psi)":>12}')
    for fr in frames:
        d1 = abs(fr['B'] - fr['O'])
        print(f'{fr["T"]:8.4f} {fr["absR"]:8.4f} {fr["B"].imag:12.4f} '
              f'{d1/fr["absR"]:8.4f} {fr["det"]:12.4f}')


if __name__ == '__main__':
    main()
