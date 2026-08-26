#!/usr/bin/env python3
"""
fig2_remainder_zoom.py
======================

Zoom-in companion to fig1_spiral_summands.py.  It magnifies the joint
region (imaginary part roughly 1.5 .. 2.6) and shows how the two
fractional links add up to Siegel's remainder,

        R_{1ps} + R_{2ps} = R                       (paper's theorem)

as a little triangle in the complex plane:

    joint  Sigma1                       (end of the sum-1 partial sum)
      |  R_{1ps}  (red)
    joint  Sigma1 + R_{1ps}
      |  R_{2ps}  (orange)
    joint  Sigma1 + R_{1ps} + R_{2ps}

The straight purple vector from Sigma1 to Sigma1+R_{1ps}+R_{2ps} is R
itself (= R_{1ps}+R_{2ps}); it is identified in the legend.  Curly braces
labelled d1 (red) and d2 (orange) span the two fractional links, marking
their lengths, i.e. how far each reaches from its own joint (Sigma1 =
joint m of sum1 for d1; Sigma1+R1ps+R2ps = joint m of sum2 for d2).
Faint blue / green stubs show leg 1 arriving and leg 2 leaving.

All numbers come from fig1_spiral_summands.compute() (mpmath, exact),
so this figure is guaranteed consistent with figure 1.

Output (into ./figures/):
    fig2_remainder_zoom.pdf   (vector)
    fig2_remainder_zoom.png   (raster preview)

Run:  python3 fig2_remainder_zoom.py
Edit the ZOOM WINDOW / STYLE block below to taste.
"""

import os
import numpy as np
import matplotlib.pyplot as plt

from fig1_spiral_summands import compute, C, xy, OUTDIR, SIGMA, T_INDEX

BASENAME = 'fig2_remainder_zoom'

# ---- zoom window / style (edit here) --------------------------------------
XLIM = (1.50, 2.20)
YLIM = (1.60, 2.55)          # imaginary-part window requested
BRACE_DEPTH = 0.016          # how far the d1/d2 braces stand off their links
BRACE_LABEL_GAP = 0.030      # extra offset of the labels past the brace tip
PURPLE = '#7f2fbf'


# ---------------------------------------------------------------------------
def curly_brace(ax, p1, p2, side, depth, color, lw, label,
                label_gap, fontsize):
    """Draw a curly brace spanning p1->p2, standing off to `side` (+1/-1)."""
    p1 = np.array(p1, float)
    p2 = np.array(p2, float)
    d = p2 - p1
    L = np.hypot(*d)
    ang = np.arctan2(d[1], d[0])
    ca, sa = np.cos(ang), np.sin(ang)

    res = 201
    t = np.linspace(0, 1, res)
    half = res // 2 + 1
    th = t[:half]
    beta = 40.0
    ph = 1 / (1 + np.exp(-beta * (th - th[0]))) \
        + 1 / (1 + np.exp(-beta * (th - th[-1])))
    prof = np.concatenate((ph, ph[-2::-1]))
    prof = prof - prof.min()          # ends at 0, central tip at 1

    u = t * L
    w = side * depth * prof
    X = p1[0] + u * ca - w * sa
    Y = p1[1] + u * sa + w * ca
    ax.plot(X, Y, color=color, lw=lw, zorder=6, solid_capstyle='round')

    if label:
        um = 0.5 * L
        wm = side * (depth + label_gap)
        lx = p1[0] + um * ca - wm * sa
        ly = p1[1] + um * sa + wm * ca
        ax.text(lx, ly, label, color=color, ha='center', va='center',
                fontsize=fontsize, zorder=7)


def main():
    data = compute()
    Sigma1 = data['Sigma1']
    B1 = data['B1']                       # Sigma1 + R1ps
    A = B1 + data['R2ps']                 # Sigma1 + R1ps + R2ps  (= Sigma1 + R)

    p_S = C(Sigma1)
    p_B = C(B1)
    p_A = C(A)

    fig, ax = plt.subplots(figsize=(7.0, 7.6))

    # thin continuations completing each fractional link to the full (m+1)st
    # summand, in each leg's colour and beneath the partial links:
    #   blue : from the end of R1ps (Sigma1+R1ps) out to the leg-1 link m+1 tip
    #   green: from the end of R2ps (Sigma1+R1ps+R2ps) out to the leg-2 tip
    tip1 = C(Sigma1 + data['next1'])           # Sigma1 + (m+1)^{-s}
    # leg 2 is laid front-to-back, so its full (m+1) summand runs in the
    # opposite sense (as in Figure 1): from the end of R2ps back through the
    # joint toward A - chi (m+1)^{s-1}.
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

    # the two fractional links
    ax.plot([p_S.real, p_B.real], [p_S.imag, p_B.imag], '-',
            color='#d62728', lw=3.0, solid_capstyle='round',
            label=r'$R_{1ps}$', zorder=4)
    ax.plot([p_B.real, p_A.real], [p_B.imag, p_A.imag], '-',
            color='#ff7f0e', lw=3.0, solid_capstyle='round',
            label=r'$R_{2ps}$', zorder=4)

    # R = R1ps + R2ps, straight purple resultant Sigma1 -> Sigma1+R1ps+R2ps
    ax.plot([p_S.real, p_A.real], [p_S.imag, p_A.imag], '-',
            color=PURPLE, lw=2.2, solid_capstyle='round',
            label=r'$R=R_{1ps}+R_{2ps}$', zorder=3)

    # d1 / d2 braces: each spans a fractional link and marks its length,
    # i.e. how far the link reaches from its own joint (Sigma1 = joint m of
    # sum1 for d1; Sigma1+R1ps+R2ps = joint m of sum2 for d2).  Each brace
    # stands off on the bend side, where the two links fold away from the
    # straight resultant R.
    bend = np.array([p_B.real - (p_S.real + p_A.real) / 2,
                     p_B.imag - (p_S.imag + p_A.imag) / 2])
    for pa, pb, lab, col in [(p_S, p_B, r'$d_1$', '#d62728'),
                             (p_B, p_A, r'$d_2$', '#ff7f0e')]:
        seg = np.array([pb.real - pa.real, pb.imag - pa.imag])
        nrm = np.array([-seg[1], seg[0]]) / np.hypot(*seg)
        side = +1 if np.dot(nrm, bend) > 0 else -1
        curly_brace(ax, (pa.real, pa.imag), (pb.real, pb.imag), side,
                    BRACE_DEPTH, col, 1.4, lab, BRACE_LABEL_GAP, 15)

    # joint dots + labels
    for p, lab, dx, dy, ha in [
        (p_S, r'$\Sigma_1$', 9, -12, 'left'),
        (p_B, r'$\Sigma_1{+}R_{1ps}$', -10, -2, 'right'),
        (p_A, r'$\Sigma_1{+}R_{1ps}{+}R_{2ps}$', 16, 7, 'left'),
    ]:
        ax.plot([p.real], [p.imag], 'o', color='k', ms=4, zorder=5)
        ax.annotate(lab, (p.real, p.imag), textcoords='offset points',
                    xytext=(dx, dy), ha=ha, fontsize=16.5, zorder=7,
                    annotation_clip=False)

    # joint-index callouts for the sum-1 (leg 1) link chain:
    #   Sigma1 is joint m = floor(T); Sigma1+R1ps is joint m+1 (last chain point)
    ax.annotate(r'joint $m=\lfloor T\rfloor$',
                xy=(p_S.real, p_S.imag), xytext=(2.00, 1.90),
                textcoords='data', ha='left', va='center', fontsize=14,
                annotation_clip=False, zorder=8)
    # joint m+1 is the END of the full (m+1)st link (tip of the thin blue line),
    # not the partway point Sigma1+R1ps
    ax.annotate(r'joint $m+1$',
                xy=(tip1.real, tip1.imag), xytext=(1.85, 2.44),
                textcoords='data', ha='left', va='center', fontsize=14,
                arrowprops=dict(arrowstyle='->', color='0.25', lw=1.2),
                annotation_clip=False, zorder=8)

    # mark the two links that cross near the joint: leg-1's link (blue) and
    # leg-2's link (green).  Put a point on each, one above the crossing (sum1)
    # and one below it (sum2), labelled accordingly.
    def _intersect(a0, a1, b0, b1):
        a0 = np.array([a0.real, a0.imag]); a1 = np.array([a1.real, a1.imag])
        b0 = np.array([b0.real, b0.imag]); b1 = np.array([b1.real, b1.imag])
        da, db = a1 - a0, b1 - b0
        u = np.linalg.solve(np.array([[da[0], -db[0]], [da[1], -db[1]]]),
                            b0 - a0)[0]
        return a0 + u * da
    Xc = _intersect(p_B, tip1, p_A, tip2)      # crossing of the two links
    d1v = np.array([tip1.real - p_B.real, tip1.imag - p_B.imag])
    d1v /= np.hypot(*d1v)                       # up the sum-1 link (above)
    d2v = np.array([tip2.real - p_A.real, tip2.imag - p_A.imag])
    d2v /= np.hypot(*d2v)                       # down the sum-2 link (below)
    P1 = Xc + 0.11 * d1v
    P2 = Xc + 0.11 * d2v
    ax.annotate(r'link $m$ in $\Sigma_1$', xy=(P1[0], P1[1]), xytext=(1.55, 2.24),
                textcoords='data', ha='left', va='center', fontsize=13,
                color='#1f77b4',
                arrowprops=dict(arrowstyle='->', color='#1f77b4', lw=1.1),
                annotation_clip=False, zorder=9)
    ax.annotate(r'link $m$ in $\Sigma_2$', xy=(P2[0], P2[1]), xytext=(1.55, 1.99),
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
    ax.set_title('Remainder as one more summand (zoom):\n'
                 r'$R_{1ps}+R_{2ps}=R$' + '   ' + ttl, fontsize=11)
    ax.legend(loc='lower left', fontsize=9, framealpha=0.92)
    fig.tight_layout()

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf)
    fig.savefig(png, dpi=200)
    plt.close(fig)
    print('R1ps        =', data['R1ps'])
    print('R2ps        =', data['R2ps'])
    print('R1ps+R2ps   =', data['R1ps'] + data['R2ps'])
    print('R (zeta-S1-S2) =', data['R'])
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
