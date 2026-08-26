#!/usr/bin/env python3
"""
fig_ik_m2_chain.py
==================

Vector diagram of the six matrices of the m = 2 chain (the inverse-kinematics
example of section "Inverse kinematics of the m=2 chain"), at sigma = 0.6,
T = 2.4:

    Z = M(0,1) M(th1,a) M(th2,d1) M(-2(th1+th2)+psi+pi,-d2) M(th2,-b) M(th1,-c)

with a = 2^-sigma, b = |chi| 2^(sigma-1), c = |chi|, psi = arg chi.  One arrow
per matrix, drawn tip-to-tail; the six net displacements are

    1,  a e^{i th1},  d1 e^{i(th1+th2)},
    d2 e^{i(psi-th1-th2)},  b e^{i(psi-th1)},  c e^{i psi},

which sum to zeta.  Colors match fig_zeta_chain.py: blue for the Sigma1
links, red for R1ps, orange for R2ps, green for the Sigma2 links.

Outputs (into ./figures/):
    fig_ik_m2_chain.pdf   (vector, used by LaTeX)
    fig_ik_m2_chain.png   (raster preview)

Run:  python3 fig_ik_m2_chain.py
"""

import os
import mpmath as mp
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D

SIGMA = mp.mpf('0.6')
T_INDEX = mp.mpf('2.4')

BLUE, RED, GREEN, ORANGE = '#1f77b4', '#d62728', '#2ca02c', '#ff7f0e'
PURPLE = '#7f2fbf'

OUTDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'figures')
BASENAME = 'fig_ik_m2_chain'

mp.mp.dps = 40


def I_of_T(T):
    return (2 * T + 1) * mp.pi / (mp.log(T + 1) - mp.log(T))


def chi(s):
    return mp.mpf(2) ** s * mp.pi ** (s - 1) * mp.sin(mp.pi * s / 2) * mp.gamma(1 - s)


def C(z):
    return complex(float(mp.re(z)), float(mp.im(z)))


def compute():
    t = I_of_T(T_INDEX)
    s = mp.mpc(SIGMA, t)
    ch = chi(s)
    psi = mp.arg(ch)
    w = t * mp.log(3)

    Sigma1 = sum(mp.mpf(n) ** (-s) for n in (1, 2))
    Sigma2 = ch * sum(mp.mpf(n) ** (s - 1) for n in (1, 2))
    zeta = mp.zeta(s)
    R = zeta - Sigma1 - Sigma2
    u1, u2 = mp.exp(-1j * w), mp.exp(1j * (w + psi))
    det = mp.re(u1) * mp.im(u2) - mp.re(u2) * mp.im(u1)
    d1 = (mp.re(R) * mp.im(u2) - mp.re(u2) * mp.im(R)) / det
    d2 = (mp.re(u1) * mp.im(R) - mp.re(R) * mp.im(u1)) / det

    th1 = -t * mp.log(2)
    th2 = -t * mp.log(mp.mpf(3) / 2)
    a = mp.mpf(2) ** (-SIGMA)
    b = mp.fabs(ch) * mp.mpf(2) ** (SIGMA - 1)
    c = mp.fabs(ch)

    # the six net displacements, in chain order
    vecs = [mp.mpc(1),
            a * mp.exp(1j * th1),
            d1 * mp.exp(1j * (th1 + th2)),
            d2 * mp.exp(1j * (psi - th1 - th2)),
            b * mp.exp(1j * (psi - th1)),
            c * mp.exp(1j * psi)]
    pts = [mp.mpc(0)]
    for v in vecs:
        pts.append(pts[-1] + v)

    return dict(t=t, psi=psi, d1=d1, d2=d2, a=a, b=b, c=c, th1=th1, th2=th2,
                chi=ch, zeta=zeta, vecs=vecs, pts=pts,
                err=mp.fabs(pts[-1] - zeta))


def arrow(ax, tail, head, color, lw=1.8, ms=13, zorder=4):
    ax.annotate('', xy=(head.real, head.imag), xytext=(tail.real, tail.imag),
                arrowprops=dict(arrowstyle='-|>', color=color, lw=lw,
                                shrinkA=0, shrinkB=0, mutation_scale=ms),
                zorder=zorder)


def make_figure(d):
    fig, ax = plt.subplots(figsize=(7.6, 6.6))
    pts = [C(p) for p in d['pts']]

    colors = [BLUE, BLUE, RED, ORANGE, GREEN, GREEN]
    labels = [r'$M(0,\,1)$',
              r'$M(\theta_1,\,a)$',
              r'$M(\theta_2,\,d_1)$',
              r'$M(2\omega{+}\psi{+}\pi,\,-d_2)$',
              r'$M(\theta_2,\,-b)$',
              r'$M(\theta_1,\,-c)$']
    # chain-local link numbers: chain 1 runs 0,1,2 forward; chain 2 is
    # traversed tip-first, so its links appear in the order 2,1,0
    linknums = ['0', '1', '2', '2', '1', '0']
    linkchain = [1, 1, 1, 2, 2, 2]
    # label offsets (points), tuned to avoid overlaps
    offs = [(0, -23), (-15, 0), (9, 10), (12, 10), (15, -14), (0, -23)]
    has = ['center', 'right', 'left', 'left', 'left', 'center']

    for k in range(6):
        arrow(ax, pts[k], pts[k + 1], colors[k], lw=1.8, ms=13, zorder=4)
        mid = 0.5 * (pts[k] + pts[k + 1])
        ax.annotate(labels[k], (mid.real, mid.imag),
                    textcoords='offset points', xytext=offs[k],
                    fontsize=8.6, color=colors[k], ha=has[k], zorder=7)
        ax.annotate(r'$%s^{(%d)}$' % (linknums[k], linkchain[k]),
                    (mid.real, mid.imag), textcoords='offset points',
                    xytext=(0, 0), fontsize=7.4, color=colors[k],
                    ha='center', va='center', zorder=8,
                    bbox=dict(boxstyle='circle,pad=0.20', fc='white',
                              ec=colors[k], lw=0.9))

    # joints, with chain-local joint numbers (link n runs joint n -> n+1)
    for p in pts:
        ax.plot([p.real], [p.imag], 'o', color='0.25', ms=3.2, zorder=6)
    jnum = [(0, '0', 1, (-3, 11)), (1, '1', 1, (1, -15)), (2, '2', 1, (8, 13)),
            (3, '3', 1, (-11, -12)), (3, '3', 2, (10, -12)),
            (4, '2', 2, (9, 3)), (5, '1', 2, (-11, 3)), (6, '0', 2, (13, -9))]
    for idx, num, ch, off in jnum:
        ax.annotate(r'$%s^{(%d)}$' % (num, ch), (pts[idx].real, pts[idx].imag),
                    textcoords='offset points', xytext=off, fontsize=7.4,
                    color=BLUE if ch == 1 else GREEN, ha='center',
                    va='center', zorder=8)

    # named points
    named = [(pts[0], r'$O$', (-15, -9), 'k'),
             (pts[2], r'$\Sigma_1$', (-6, 5), BLUE),
             (pts[3], r'$B_1$', (13, 4), RED),
             (pts[6], r'$\zeta(s)$', (9, 4), PURPLE)]
    for p, lab, off, col in named:
        ax.annotate(lab, (p.real, p.imag), textcoords='offset points',
                    xytext=off, fontsize=10, color=col, zorder=7)
    ax.plot([pts[6].real], [pts[6].imag], 'o', color=PURPLE, ms=5.5, zorder=7)

    ax.text(0.015, 0.015,
            'circled: link $n^{(c)}$   plain: joint $n^{(c)}$   '
            '($c$ = chain; link $n$ runs joint $n\\to n{+}1$)',
            transform=ax.transAxes, fontsize=7.6, color='0.35', zorder=8)

    handles = [
        Line2D([], [], color=BLUE, lw=1.8, label=r'$P_{\Sigma_1}$ links'),
        Line2D([], [], color=RED, lw=1.8, label=r'$M_{R_{1ps}}$'),
        Line2D([], [], color=ORANGE, lw=1.8, label=r'$M_{R_{2ps}}$'),
        Line2D([], [], color=GREEN, lw=1.8, label=r'$P_{\Sigma_2}$ links'),
    ]
    ax.legend(handles=handles, loc='upper left', fontsize=9, framealpha=0.92)

    ax.set_xlim(-0.14, 1.78)
    ax.set_ylim(-0.74, 0.82)
    ax.set_aspect('equal', adjustable='box')
    ax.grid(True, ls=':', alpha=0.4)
    ax.set_xlabel(r'$\Re$')
    ax.set_ylabel(r'$\Im$')
    ttl = (r'$\sigma=%.1f,\ T=%.1f\ (t=I(T)\approx%.3f),\ m=2$'
           % (float(SIGMA), float(T_INDEX), float(d['t'])))
    ax.set_title('The six matrices of the $m=2$ chain\n' + ttl, fontsize=11)
    fig.tight_layout()

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf)
    fig.savefig(png, dpi=200)
    plt.close(fig)
    return pdf, png


def main():
    d = compute()
    print('t = I(T)      =', mp.nstr(d['t'], 10))
    print('psi = arg chi =', mp.nstr(d['psi'], 8), '  |chi| =', mp.nstr(d['c'], 8))
    print('a, b, c       =', mp.nstr(d['a'], 8), mp.nstr(d['b'], 8), mp.nstr(d['c'], 8))
    print('d1, d2        =', mp.nstr(d['d1'], 8), mp.nstr(d['d2'], 8))
    print('th1, th2      =', mp.nstr(mp.arg(mp.exp(1j * d['th1'])), 8),
          mp.nstr(mp.arg(mp.exp(1j * d['th2'])), 8), '(mod 2pi)')
    print('zeta          =', mp.nstr(d['zeta'], 10))
    print('chain end     =', mp.nstr(d['pts'][-1], 10))
    print('|error|       =', mp.nstr(d['err'], 5))
    pdf, png = make_figure(d)
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
