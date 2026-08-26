#!/usr/bin/env python3
"""
fig4_kuznetsov_zoom.py
======================

Document Figure 4 (section "Other remainders: Kuznetsov").  It replicates the
joint-region zoom of fig2_remainder_zoom.py (same window, same exact
fractional links R_{1ps} in red and R_{2ps} in orange, same faint context and
the two crossing links), but

  * drops the curly brace and the "R" label, and
  * overlays Kuznetsov's approximate half-remainders R_{1ak}, R_{2ak}
    (both drawn in orange, dashed) as a second route from Sigma1 to the same
    endpoint Sigma1 + R.

Kuznetsov's remainders (his 2025 paper, arXiv:2503.09519), in this paper's
notation:

    R_{1ak} = -1/2 (-1)^{floor(T)} I_1(sigma, T)
    R_{2ak} = -1/2 (-1)^{floor(T)} chi(s) * conj( I_1(1-sigma, T) )

with I_1 the 8-coefficient asymptotic integral (coefficients omega_0,
omega_1[.], lambda[.] below, l = 8).  Then R_{1ak}+R_{2ak} approximates
Siegel's exact R = R_{1ps}+R_{2ps}; the approximation is extremely close in
this range, so the R_{1ak}->R_{2ak} path lands on the same point A = Sigma1+R,
but bends to the opposite side of R from the exact R_{1ps}->R_{2ps} path.

Output (into ./figures/):
    fig4_kuznetsov_zoom.pdf   (vector)
    fig4_kuznetsov_zoom.png   (raster preview)

Run:  python3 fig4_kuznetsov_zoom.py
"""

import os
import cmath
import math
import numpy as np
import matplotlib.pyplot as plt

from fig1_spiral_summands import compute, C, xy, OUTDIR, SIGMA, T_INDEX

BASENAME = 'fig4_kuznetsov_zoom'

# ---- zoom window / style (match fig2) -------------------------------------
XLIM = (1.50, 2.20)
YLIM = (1.60, 2.55)
PURPLE = '#7f2fbf'
ORANGE = '#ff7f0e'

# ---- Kuznetsov coefficients (l = 8), from arXiv:2503.09519 ----------------
OMEGA0 = 0.1926019633029103199063 + 0.02472986965795651842299j
OMEGA1 = [
    0.1582954327321094104502 + 0.04149113569204600502105j,
    0.07826728293587305110862 + 0.05215518667623989653254j,
    0.01940595049247490540621 + 0.02977286598777633378610j,
    0.0016911847719027555036966 + 0.008938933548999206800196j,
    -0.0002994777986686168319731 + 0.001567541981830224487301j,
    -0.00009837202592542590210980 + 0.0001502108057352792742070j,
    -0.000009346989286415688998740 + 0.000005793852209955845432028j,
    -0.0000002451577304299235983015 + 0.000000006134784898751456953524j,
]
LAMBDA = [
    0.152845417613666702426 - 0.119440685603870510384j,
    0.302346225128945757427 - 0.243989695504400621268j,
    0.451119584531782942888 - 0.378479770209444563858j,
    0.604563710297226464637 - 0.523486888629095259770j,
    0.765965706759629396959 - 0.678405572413543444272j,
    0.938371150977889047740 - 0.845332361280975174880j,
    1.128148837845288402558 - 1.030737947568157685685j,
    1.353030558654668162533 - 1.252503278108132307164j,
]


def I1_of(s, mhalf):
    """Kuznetsov's I_1 for complex argument s = re + i I(T), m_half = floor(T)+1/2."""
    acc = OMEGA0
    for w, lam in zip(OMEGA1, LAMBDA):
        e1 = -2.0 * math.pi * mhalf * lam - s * cmath.log(1.0 + 1j * lam / mhalf)
        e2 = 2.0 * math.pi * mhalf * lam - s * cmath.log(1.0 - 1j * lam / mhalf)
        acc += w * (cmath.exp(e1) + cmath.exp(e2))
    return cmath.exp(-s * cmath.log(mhalf)) * acc


def main():
    data = compute()
    Sigma1 = data['Sigma1']
    B1 = data['B1']                       # Sigma1 + R1ps
    A = B1 + data['R2ps']                 # Sigma1 + R1ps + R2ps  (= Sigma1 + R)

    # Kuznetsov half-remainders at the same (sigma, T)
    s = complex(data['s'])
    m = int(data['m'])
    chi = complex(data['chi'])
    mhalf = m + 0.5
    sign = (-1.0) ** m
    s2 = complex(1.0 - float(SIGMA), s.imag)          # 1 - sigma, same I(T)
    R1ak = -0.5 * sign * I1_of(s, mhalf)
    R2ak = -0.5 * sign * chi * I1_of(s2, mhalf).conjugate()
    Jak = complex(Sigma1) + R1ak                      # Sigma1 + R1ak
    Eak = Jak + R2ak                                  # Sigma1 + R1ak + R2ak (~A)
    ak_err = abs((R1ak + R2ak) - complex(data['R']))

    p_S = C(Sigma1)
    p_B = C(B1)
    p_A = C(A)
    p_J = C(Jak)
    p_E = C(Eak)

    fig, ax = plt.subplots(figsize=(7.0, 7.6))

    # thin continuations completing each fractional link to the full (m+1)st
    # summand (same as fig 3)
    tip1 = C(Sigma1 + data['next1'])
    tip2 = C(A - data['next2'])
    ax.plot([p_B.real, tip1.real], [p_B.imag, tip1.imag], '-',
            color='#1f77b4', lw=0.9, alpha=0.9, zorder=1)
    ax.plot([p_A.real, tip2.real], [p_A.imag, tip2.imag], '-',
            color='#2ca02c', lw=0.9, alpha=0.9, zorder=1)

    # faint context: leg 1 arriving (blue), leg 2 leaving (green)
    x1, y1 = xy(data['leg1'])
    ax.plot(x1, y1, '-', color='#1f77b4', lw=1.4, marker='o', ms=2.2,
            alpha=0.9, zorder=2)
    leg2 = [A]
    z = A
    for n in range(data['m'], 0, -1):
        z += data['chi'] * (n ** (data['s'] - 1))
        leg2.append(z)
    x2, y2 = xy(leg2)
    ax.plot(x2, y2, '-', color='#2ca02c', lw=1.4, marker='s', ms=2.2,
            alpha=0.9, zorder=2)

    # exact fractional links R1ps (red), R2ps (orange)
    ax.plot([p_S.real, p_B.real], [p_S.imag, p_B.imag], '-',
            color='#d62728', lw=3.0, solid_capstyle='round',
            label=r'$R_{1ps}$', zorder=4)
    ax.plot([p_B.real, p_A.real], [p_B.imag, p_A.imag], '-',
            color=ORANGE, lw=3.0, solid_capstyle='round',
            label=r'$R_{2ps}$', zorder=4)

    # R = R1ps + R2ps (straight purple resultant); brace removed
    ax.plot([p_S.real, p_A.real], [p_S.imag, p_A.imag], '-',
            color=PURPLE, lw=2.2, solid_capstyle='round',
            label=r'$R=R_{1ps}+R_{2ps}$', zorder=3)

    # Kuznetsov's approximate half-remainders R1ak, R2ak (both orange, dashed)
    ax.plot([p_S.real, p_J.real], [p_S.imag, p_J.imag], '--',
            color=ORANGE, lw=2.2, dashes=(5, 2), solid_capstyle='round',
            label=r'$R_{1ak},R_{2ak}$ (Kuznetsov, approx.)', zorder=4)
    ax.plot([p_J.real, p_E.real], [p_J.imag, p_E.imag], '--',
            color=ORANGE, lw=2.2, dashes=(5, 2), solid_capstyle='round',
            zorder=4)
    ax.plot([p_J.real], [p_J.imag], 'o', color=ORANGE, ms=5, zorder=6,
            markeredgecolor='k', markeredgewidth=0.5)

    # labels for the two ak links, on the right (their bend is to the right of R)
    ax.annotate(r'$R_{1ak}$', xy=(0.5 * (p_S.real + p_J.real),
                                  0.5 * (p_S.imag + p_J.imag)),
                xytext=(2.12, 2.02), textcoords='data', ha='left',
                va='center', fontsize=15, color=ORANGE,
                arrowprops=dict(arrowstyle='->', color=ORANGE, lw=1.1),
                annotation_clip=False, zorder=8)
    ax.annotate(r'$R_{2ak}$', xy=(0.5 * (p_J.real + p_E.real),
                                  0.5 * (p_J.imag + p_E.imag)),
                xytext=(2.12, 2.28), textcoords='data', ha='left',
                va='center', fontsize=15, color=ORANGE,
                arrowprops=dict(arrowstyle='->', color=ORANGE, lw=1.1),
                annotation_clip=False, zorder=8)

    # joint dots + labels
    for p, lab, dx, dy, ha in [
        (p_S, r'$\Sigma_1$', 9, -12, 'left'),
        (p_B, r'$\Sigma_1{+}R_{1ps}$', -10, -2, 'right'),
    ]:
        ax.plot([p.real], [p.imag], 'o', color='k', ms=4, zorder=5)
        ax.annotate(lab, (p.real, p.imag), textcoords='offset points',
                    xytext=(dx, dy), ha=ha, fontsize=16.5, zorder=7,
                    annotation_clip=False)
    # shared endpoint dot (Sigma1 + R1ps + R2ps = Sigma1 + R), label removed
    ax.plot([p_A.real], [p_A.imag], 'o', color='k', ms=4, zorder=5)

    # joint-index callouts for the sum-1 (leg 1) link chain
    ax.annotate(r'joint $m=\lfloor T\rfloor$',
                xy=(p_S.real, p_S.imag), xytext=(2.00, 1.90),
                textcoords='data', ha='left', va='center', fontsize=14,
                arrowprops=dict(arrowstyle='->', color='0.25', lw=1.2),
                annotation_clip=False, zorder=8)
    ax.annotate(r'joint $m+1$',
                xy=(tip1.real, tip1.imag), xytext=(1.85, 2.44),
                textcoords='data', ha='left', va='center', fontsize=14,
                arrowprops=dict(arrowstyle='->', color='0.25', lw=1.2),
                annotation_clip=False, zorder=8)

    # the two crossing links, labelled (same as fig 3)
    def _intersect(a0, a1, b0, b1):
        a0 = np.array([a0.real, a0.imag]); a1 = np.array([a1.real, a1.imag])
        b0 = np.array([b0.real, b0.imag]); b1 = np.array([b1.real, b1.imag])
        da, db = a1 - a0, b1 - b0
        u = np.linalg.solve(np.array([[da[0], -db[0]], [da[1], -db[1]]]),
                            b0 - a0)[0]
        return a0 + u * da
    Xc = _intersect(p_B, tip1, p_A, tip2)
    d1v = np.array([tip1.real - p_B.real, tip1.imag - p_B.imag])
    d1v /= np.hypot(*d1v)
    d2v = np.array([tip2.real - p_A.real, tip2.imag - p_A.imag])
    d2v /= np.hypot(*d2v)
    P1 = Xc + 0.11 * d1v
    P2 = Xc + 0.11 * d2v
    ax.annotate(r'link $m$ in sum1', xy=(P1[0], P1[1]), xytext=(1.55, 2.24),
                textcoords='data', ha='left', va='center', fontsize=13,
                color='#1f77b4',
                arrowprops=dict(arrowstyle='->', color='#1f77b4', lw=1.1),
                annotation_clip=False, zorder=9)
    ax.annotate(r'link $m$ in sum2', xy=(P2[0], P2[1]), xytext=(1.60, 1.93),
                textcoords='data', ha='left', va='center', fontsize=13,
                color='#2ca02c',
                arrowprops=dict(arrowstyle='->', color='#2ca02c', lw=1.1),
                annotation_clip=False, zorder=9)

    ax.set_xlim(*XLIM)
    ax.set_ylim(*YLIM)
    ax.set_aspect('equal', adjustable='box')
    ax.grid(True, ls=':', alpha=0.4)
    ax.set_xlabel(r'$\Re$')
    ax.set_ylabel(r'$\Im$')
    ttl = (r'$\sigma=%.2f,\ T\approx%.2f\ (t\approx%.2f),\ m=%d$'
           % (float(SIGMA), float(T_INDEX), float(data['t']), data['m']))
    ax.set_title('Exact vs. Kuznetsov remainders (zoom):\n'
                 r'$R_{1ps}+R_{2ps}=R\approx R_{1ak}+R_{2ak}$' + '   ' + ttl,
                 fontsize=11)
    ax.legend(loc='lower left', fontsize=8.5, framealpha=0.92)
    fig.tight_layout()

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf)
    fig.savefig(png, dpi=200)
    plt.close(fig)
    print('R1ak         =', R1ak)
    print('R2ak         =', R2ak)
    print('R1ak+R2ak    =', R1ak + R2ak)
    print('R (exact)    =', complex(data['R']))
    print('|approx - R| =', ak_err)
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
