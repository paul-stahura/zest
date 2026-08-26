#!/usr/bin/env python3
"""
fig_d1_critical.py
==================

Plot of the fractional weight d1 on the critical line (sigma = 1/2) as a
function of the index T, for 1 <= T <= 7.  On the critical line d1 = d2
(Corollary in Section 8.2), so this single curve gives both weights.

d1 is computed exactly as in the other figure scripts: R = zeta - S1 - S2
via mpmath, then the Cramer solution of R = d1 e^{-iw} + d2 e^{i(w+psi)}
(w = t ln(m+1), psi = arg chi).  Each unit interval [n, n+1) is sampled and
drawn separately because m = floor(T) increments at integer T, so d1 jumps
there (the bisector link hands off to the next link).

Outputs (into ./figures/):
    fig_d1_critical.pdf   (vector, used by LaTeX)
    fig_d1_critical.png   (raster preview)

Run:  python3 fig_d1_critical.py
"""

import os
import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt

from fig1_spiral_summands import I_of_T, chi, OUTDIR

BASENAME = 'fig_d1_critical'
T_MIN, T_MAX = 1, 7
SAMPLES_PER_UNIT = 600
X_ARROW = 6.28                  # shared x of the link-length arrows
LABEL_FRAC = 0.64               # label height, as a fraction of the arrow
BLUE = '#1f77b4'

mp.mp.dps = 25


def d1_critical(T):
    """d1 at (sigma = 1/2, index T), Cramer solution as in Section 4."""
    t = I_of_T(T)
    s = mp.mpc(0.5, t)
    m = int(mp.floor(T))
    w = t * mp.log(m + 1)
    ch = chi(s)
    psi = mp.arg(ch)

    S1 = mp.fsum(mp.mpf(n) ** (-s) for n in range(1, m + 1))
    S2 = ch * mp.fsum(mp.mpf(n) ** (s - 1) for n in range(1, m + 1))
    R = mp.zeta(s) - S1 - S2

    u1 = mp.exp(-1j * w)
    u2 = mp.exp(1j * (w + psi))
    a, b = mp.re(u1), mp.re(u2)
    c, d = mp.im(u1), mp.im(u2)
    det = a * d - b * c
    return float((mp.re(R) * d - b * mp.im(R)) / det)


def main():
    fig, (ax, ax2) = plt.subplots(2, 1, figsize=(8.6, 7.2), sharex=True)

    for n in range(T_MIN, T_MAX):
        Ts = np.linspace(n, n + 1, SAMPLES_PER_UNIT, endpoint=False)
        Ts[0] += 1e-9                       # stay inside [n, n+1)
        vals = np.array([d1_critical(float(T)) for T in Ts])
        ax.plot(Ts, vals, '-', color=BLUE, lw=1.2)

        # normalized distance from joint: d1 in units of the bisector-link
        # length ceil(T)^{-sigma}, i.e. ceil(T)^{sigma} d1 (sigma = 1/2)
        frac = np.sqrt(n + 1) * vals
        ax2.plot(Ts, frac, '-', color=BLUE, lw=1.2)
        print('interval [%d,%d): d1 in [%.4f, %.4f], '
              'ceil(T)^0.5 d1 in [%.4f, %.4f]'
              % (n, n + 1, vals.min(), vals.max(), frac.min(), frac.max()))

    for a in (ax, ax2):
        for n in range(T_MIN + 1, T_MAX):
            a.axvline(n, color='0.75', lw=0.7, ls=':')
        a.grid(True, ls=':', alpha=0.4)
        a.set_xlim(T_MIN, T_MAX)

    # length of the link that carries d1, ceil(T)^{-sigma}: a step that drops
    # at each integer T.  Capture the autoscaled top first so it is preserved.
    y_top = ax.get_ylim()[1]
    for n in range(T_MIN, T_MAX):
        ax.plot([n, n + 1], [(n + 1) ** -0.5] * 2, '-', color='0.45', lw=1.1)
    ax.set_ylim(0, y_top)

    # matching double-headed arrow: here the link length is the actual
    # ceil(T)^{-sigma}, so the arrow runs from 0 up to that step
    n_arrow = T_MAX - 1
    L_arrow = (n_arrow + 1) ** -0.5
    ax.annotate('', xy=(X_ARROW, 0), xytext=(X_ARROW, L_arrow),
                arrowprops=dict(arrowstyle='<->', color='0.35', lw=1.1,
                                shrinkA=0, shrinkB=0, mutation_scale=11),
                annotation_clip=False, zorder=5)
    ax.text(X_ARROW, LABEL_FRAC * L_arrow, 'length of\nthe link',
            ha='center', va='center',
            fontsize=8.0, color='0.3', linespacing=1.3, zorder=6,
            bbox=dict(boxstyle='round,pad=0.22', fc='white', ec='none'))

    ax.set_ylabel(r'$d_1$')
    ax.set_title(r'Periodicity of $d_1$ on the critical line ($\sigma=1/2$, '
                 r'where $d_1=d_2$)', fontsize=11)
    ax2.set_ylabel(r'$\lceil T\rceil^{\sigma}\,d_1$')
    ax2.set_xlabel(r'index $T$')
    ax2.set_ylim(0, 1)                  # full length of the link that carries it
    ax2.set_title(r'normalized distance from joint '
                  r'$\lceil T\rceil^{\sigma}\,d_1$   ($\sigma=1/2$)',
                  fontsize=11)

    # double-headed arrow spanning the whole normalized link.  The label sits
    # in the gap over the dip at T ~ 6.4; placement measured against the
    # curve so its background masks no data (see probe in git history).
    ax2.annotate('', xy=(X_ARROW, 0), xytext=(X_ARROW, 1),
                 arrowprops=dict(arrowstyle='<->', color='0.35', lw=1.1,
                                 shrinkA=0, shrinkB=0, mutation_scale=11),
                 annotation_clip=False, zorder=5)
    ax2.text(X_ARROW, LABEL_FRAC, 'length of\nthe link',
             ha='center', va='center',
             fontsize=8.0, color='0.3', linespacing=1.3, zorder=6,
             bbox=dict(boxstyle='round,pad=0.22', fc='white', ec='none'))
    fig.tight_layout()

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf)
    fig.savefig(png, dpi=200)
    plt.close(fig)
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
