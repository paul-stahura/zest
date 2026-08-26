#!/usr/bin/env python3
"""
fig_links_crossing.py
=====================

Which link of the reverse chain crosses a given link of the forward chain
(section "Links crossing"), drawn at the paper's running example
sigma = 1/2, T = 6.18  (t = I(T) ~ 279.85, m = 6, a = sqrt(t/2pi) ~ 6.674).

Everything is drawn in the rotated frame  z -> e^{i vartheta} z, where
vartheta is the Riemann-Siegel theta angle fixed by chi = e^{-2i vartheta}.
In that frame zeta lands on the real axis at Z = e^{i vartheta} zeta and the
reverse chain is the mirror image of the forward chain in the vertical line
X = Z/2:

    e^{i vartheta} K_i = Z - conj(e^{i vartheta} J_i),

with J_n the forward joints (partial sums of Sigma_1) and K_i the reverse
joints (zeta minus the partial sums of Sigma_2), both numbered from zero.

The law: counting summands from one, forward link k (summand n = k+1) is
crossed by the reverse link carrying summand n' with n n' = a^2 = t/2pi.

Three panels, (a) full width on top and (b), (c) in a row below:
  (a) both chains, whole first turn, with the seven crossings the law names
      for k = 0..m;
  (b) the mechanism at the far end, k = 0: between two spiral centres the
      reverse chain makes one sweep, and that sweep is a mirror copy of the
      forward link it crosses, at its midpoint;
  (c) the law as a hyperbola n n' = a^2, the measured crossings on it, and the
      tangent line n + n' = 2a at the self-dual point, which is the sum rule
      that holds only near the fold.

Outputs (into ./figures/):
    fig_links_crossing.pdf   (vector, used by LaTeX)
    fig_links_crossing.png   (raster preview)

Run:  python3 fig_links_crossing.py
"""

import os
import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import ConnectionPatch

from fig1_spiral_summands import I_of_T, chi, C, OUTDIR

# --------------------------------------------------------------------------
# PARAMETERS  (edit here, then re-run)
# --------------------------------------------------------------------------
SIGMA = mp.mpf('0.5')
T_INDEX = mp.mpf('6.18')

BASENAME = 'fig_links_crossing'
BLUE, GREEN, RED = '#1f77b4', '#2ca02c', '#d62728'
GOLD = '#e8a33d'

mp.mp.dps = 30


# --------------------------------------------------------------------------
# Core mathematics
# --------------------------------------------------------------------------
def compute():
    t = I_of_T(T_INDEX)
    s = mp.mpc(SIGMA, t)
    m = int(mp.floor(T_INDEX))
    ch = chi(s)
    theta = -mp.arg(ch) / 2                    # chi = e^{-2 i vartheta}
    rot = mp.exp(1j * theta)
    zeta = mp.zeta(s)
    Z = rot * zeta                             # real, up to rounding
    nmax = int(mp.floor(t / mp.pi)) + 1        # end of the first turn

    fwd, z = [mp.mpc(0)], mp.mpc(0)
    for n in range(1, nmax + 1):
        z += mp.mpf(n) ** (-s)
        fwd.append(z)
    rev, z = [zeta], zeta
    for n in range(1, nmax + 1):
        z -= ch * mp.mpf(n) ** (s - 1)
        rev.append(z)

    P = [rot * j for j in fwd]                 # forward joints, rotated
    Q = [rot * j for j in rev]                 # reverse joints, rotated
    mirror_err = max(abs(Q[n] - (Z - mp.conj(P[n]))) for n in range(nmax + 1))

    # lambda: where the forward chain meets the mirror line, inside link m
    X = [mp.re(p) for p in P]
    lam = (mp.re(Z) / 2 - X[m]) / (X[m + 1] - X[m])

    return dict(t=t, s=s, m=m, nmax=nmax, theta=theta, zeta=zeta, Z=Z,
                P=P, Q=Q, lam=lam, mirror_err=mirror_err,
                a2=t / (2 * mp.pi), a=mp.sqrt(t / (2 * mp.pi)))


def seg_cross(a, b, c, d):
    """Intersection of segments ab and cd, as (point, p, q) or None."""
    a, b, c, d = C(a), C(b), C(c), C(d)
    den = (b.real - a.real) * (d.imag - c.imag) - (b.imag - a.imag) * (d.real - c.real)
    if abs(den) < 1e-15:
        return None
    p = ((c.real - a.real) * (d.imag - c.imag) - (c.imag - a.imag) * (d.real - c.real)) / den
    q = ((c.real - a.real) * (b.imag - a.imag) - (c.imag - a.imag) * (b.real - a.real)) / den
    if not (0 <= p <= 1 and 0 <= q <= 1):
        return None
    return a + p * (b - a), p, q


def law_link(data, k):
    """The reverse link the product law names for forward link k."""
    return int(mp.nint(data['a2'] / (k + 1))) - 1


def crossings(data):
    """(k, i, point, p) for each forward link k = 0..m, i the link the law names."""
    P, Q, m, nmax = data['P'], data['Q'], data['m'], data['nmax']
    out = []
    for k in range(m + 1):
        named = law_link(data, k)
        for i in sorted([named, named - 1, named + 1, named - 2, named + 2],
                        key=lambda j: abs(j + 1 - float(data['a2'] / (k + 1)))):
            if not (0 <= i < nmax):
                continue
            hit = seg_cross(P[k], P[k + 1], Q[i], Q[i + 1])
            if hit is not None:
                pt, p, _ = hit
                out.append((k, i, pt, p, i == named))
                break
    return out


def fold_link(data, S):
    """Link nearest spiral centre S, where the turn angle is (2S+1) pi: eq. LN."""
    return float(data['t'] / (mp.pi * (2 * S + 1)))


# --------------------------------------------------------------------------
# Plot
# --------------------------------------------------------------------------
def xy(points):
    arr = np.array([C(p) for p in points])
    return arr.real, arr.imag


def make_figure(data, cross):
    m, Zr = data['m'], float(mp.re(data['Z']))
    P, Q, nmax = data['P'], data['Q'], data['nmax']
    a, a2 = float(data['a']), float(data['a2'])

    fig = plt.figure(figsize=(9.9, 8.6))
    gs = fig.add_gridspec(2, 2, height_ratios=[1.45, 1.0], hspace=0.32, wspace=0.26)
    axA = fig.add_subplot(gs[0, :])
    axB = fig.add_subplot(gs[1, 0])
    axC = fig.add_subplot(gs[1, 1])

    # ---- (a) both chains, whole first turn -------------------------------
    axA.plot(*xy(P), '-', color=BLUE, lw=0.8, alpha=0.85, zorder=3)
    axA.plot(*xy(Q), '-', color=GREEN, lw=0.8, alpha=0.85, zorder=3)
    for k in range(m + 1):
        axA.plot(*xy([P[k], P[k + 1]]), '-', color=BLUE, lw=2.2, zorder=4)
    axA.axvline(Zr / 2, color='0.45', ls='--', lw=1.0, zorder=1)
    for _, _, pt, _, _ in cross:
        axA.plot([pt.real], [pt.imag], 'o', color=RED, ms=4.0, zorder=6)
    axA.plot([0], [0], 'o', color='k', ms=4, zorder=7)
    axA.annotate(r'$O$', (0, 0), textcoords='offset points', xytext=(-9, -2),
                 fontsize=9)
    axA.plot([Zr], [0], 'o', color='k', ms=4, zorder=7)
    axA.annotate(r'$Z=e^{i\vartheta}\zeta$', (Zr, 0), textcoords='offset points',
                 xytext=(4, 4), fontsize=9)
    axA.annotate(r'$X=Z/2$', (Zr / 2, -1.55), textcoords='offset points',
                 xytext=(4, 0), fontsize=9, color='0.35')
    axA.grid(True, ls=':', alpha=0.35)
    axA.set_aspect('equal', adjustable='datalim')
    axA.set_title('(a) the two chains and the seven\ncrossings the law names',
                  fontsize=9.5)
    axA.set_xlabel(r'$X$')
    axA.set_ylabel(r'$Y$')

    # ---- (b) the mechanism at k = 0 --------------------------------------
    k0, i0 = cross[0][0], cross[0][1]
    lo, hi = int(fold_link(data, 1)) + 1, min(nmax, int(fold_link(data, 0)))
    axB.plot(*xy(Q), '-', color=GREEN, lw=0.6, alpha=0.25, zorder=2)
    axB.plot(*xy(Q[lo:hi + 1]), '-', color=GOLD, lw=1.7, alpha=0.95, zorder=3)
    axB.plot(*xy([Q[i0], Q[i0 + 1]]), '-', color=GREEN, lw=3.0, zorder=5)
    axB.plot(*xy([P[k0], P[k0 + 1]]), '-', color=BLUE, lw=3.0, zorder=5)
    axB.plot([cross[0][2].real], [cross[0][2].imag], 'o', color=RED, ms=6, zorder=7)
    # the two spiral centres the sweep runs between, at the ends of the gold turn
    for S, off, ha in ((1, (10, 8), 'left'), (0, (12, -14), 'left')):
        q = C(Q[int(round(fold_link(data, S)))])
        axB.plot([q.real], [q.imag], 'x', color='0.25', ms=7, mew=1.6, zorder=7)
        axB.annotate(r'centre $S_n=%d$' % S + '\n' + r'(link $%d$)'
                     % int(round(fold_link(data, S))),
                     (q.real, q.imag), textcoords='offset points', xytext=off,
                     fontsize=8, color='0.25', ha=ha)
    p0, p1 = C(P[k0]), C(P[k0 + 1])
    axB.annotate(r'forward link $%d$' % k0,
                 ((p0.real + p1.real) / 2, (p0.imag + p1.imag) / 2),
                 textcoords='offset points', xytext=(-14, -16), fontsize=8.5,
                 color=BLUE, ha='right',
                 arrowprops=dict(arrowstyle='->', color=BLUE, lw=0.9))
    q0, q1 = C(Q[i0]), C(Q[i0 + 1])
    axB.annotate(r'reverse link $%d$' % i0,
                 ((q0.real + q1.real) / 2, (q0.imag + q1.imag) / 2),
                 textcoords='offset points', xytext=(16, 10), fontsize=8.5,
                 color=GREEN, ha='left',
                 arrowprops=dict(arrowstyle='->', color=GREEN, lw=0.9))
    axB.plot([0], [0], 'o', color='k', ms=4, zorder=7)
    axB.annotate(r'$O$', (0, 0), textcoords='offset points', xytext=(-11, -4),
                 fontsize=9)
    cx, cy = (p0.real + p1.real) / 2, (p0.imag + p1.imag) / 2
    half = 1.15
    fig.subplots_adjust(left=0.07, right=0.98, bottom=0.07, top=0.90)
    fig.canvas.draw()
    box = axB.get_window_extent()
    yhalf = half * box.height / box.width
    x0, x1 = cx - half, cx + half
    y0, y1 = cy - yhalf, cy + yhalf
    axB.set_aspect('equal', adjustable='box')
    axB.set_xlim(x0, x1)
    axB.set_ylim(y0, y1)
    axA.add_patch(plt.Rectangle((x0, y0), x1 - x0, y1 - y0,
                                fill=False, ec='0.35', lw=0.9, zorder=8))
    for xA, xB in ((x0, 0.0), (x1, 1.0)):
        fig.add_artist(ConnectionPatch(
            xyA=(xA, y0), coordsA=axA.transData,
            xyB=(xB, 1.0), coordsB=axB.transAxes,
            color='0.45', lw=0.8, ls=(0, (4, 3)), clip_on=False, zorder=10))
    axB.grid(True, ls=':', alpha=0.35)
    axB.set_title('(b) one sweep of the reverse chain,\n'
                  r'links $%d$–$%d$, laid on forward link $0$' % (lo, hi),
                  fontsize=9.5)
    axB.set_xlabel(r'$X$')

    # ---- (c) the hyperbola and its tangent -------------------------------
    ns = np.linspace(0.75, 12.4, 600)
    axC.plot(ns, a2 / ns, '-', color='k', lw=1.5, label=r"$n\,n'=a^{2}$")
    tang = 2 * a - ns
    axC.plot(ns[tang > 0], tang[tang > 0], '--', color='0.5', lw=1.4,
             label=r"$n+n'=2a$ (sum rule)")
    for k, i, _, _, named in cross:
        axC.plot([k + 1], [i + 1], 'o', color=RED if named else GOLD, ms=6,
                 zorder=5)
        axC.annotate(r'$(%d,%d)$' % (k + 1, i + 1), (k + 1, i + 1),
                     textcoords='offset points',
                     xytext=(7, 3) if k + 1 < a - 1 else (2, 12),
                     fontsize=8, color=RED, ha='left')
    axC.plot([a], [a], '*', color='k', ms=12, zorder=6)
    axC.annotate('self-dual point', (a, a), textcoords='offset points',
                 xytext=(-32, -22), fontsize=8.5, ha='right', va='top',
                 arrowprops=dict(arrowstyle='->', color='k', lw=0.9))
    axC.set_yscale('log')
    axC.set_xlim(0.4, 12.6)
    axC.set_ylim(3.4, 70)
    axC.set_yticks([4, 6, 10, 15, 22, 45])
    axC.set_yticklabels(['4', '6', '10', '15', '22', '45'])
    axC.set_xlabel(r"forward summand $n=k+1$")
    axC.set_ylabel(r"reverse summand $n'=i+1$")
    axC.grid(True, ls=':', alpha=0.35, which='both')
    axC.legend(fontsize=8.5, loc='upper right', framealpha=0.9)
    axC.set_title('(c) the crossing pairs lie on a hyperbola;\n'
                  'the sum rule is its tangent at the fold', fontsize=9.5)

    fig.suptitle(r'Links crossing at $\sigma=1/2$, $T=%.2f$ '
                 r'($t=I(T)\approx%.2f$, $m=6$, $a=\sqrt{t/2\pi}=%.3f$, '
                 r'$a^{2}=%.2f$)'
                 % (float(T_INDEX), float(data['t']), a, a2),
                 fontsize=10.5, y=0.99)
    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf)
    fig.savefig(png, dpi=200)
    plt.close(fig)
    return pdf, png


# --------------------------------------------------------------------------
def main():
    data = compute()
    cross = crossings(data)
    print('t = I(T)        =', mp.nstr(data['t'], 8))
    print('a = sqrt(t/2pi) =', mp.nstr(data['a'], 8), ' (T + 1/2 =',
          mp.nstr(T_INDEX + mp.mpf('0.5'), 8), ')')
    print('a^2 = t/2pi     =', mp.nstr(data['a2'], 8))
    print('Z = e^{i th} z  =', mp.nstr(data['Z'], 8), ' (imag part should vanish)')
    print('mirror residual =', mp.nstr(data['mirror_err'], 4))
    print('lambda = hat d1 =', mp.nstr(data['lam'], 10))
    print('links of the first turn:', data['nmax'])
    print('spiral centres  : S=0 at link %.1f, S=1 at %.1f, S=2 at %.1f'
          % (fold_link(data, 0), fold_link(data, 1), fold_link(data, 2)))
    print()
    print("   k    n=k+1   law i   n'=i+1   n n'      p along link   named?")
    for k, i, _, p, named in cross:
        print('  %2d   %4d    %4d    %5d    %7.1f      %.3f          %s'
              % (k, k + 1, i, i + 1, (k + 1) * (i + 1), p, 'yes' if named else 'no'))
    pdf, png = make_figure(data, cross)
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
