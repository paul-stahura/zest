#!/usr/bin/env python3
"""
fig1_spiral_summands.py
=======================

Generates Figure "fractional-summand picture" for the rewrite_v7 paper:
a spiral (Euler-like) representation of the four pieces of the
"one more summand" identity

    zeta(s) = Sigma1 + R1ps + Sigma2 + R2ps                       (eq. 24)

in the complex plane, for  s = sigma + i t  with

    sigma = 0.5,   T ~ 6.18   =>   t = I(T) ~ 279.85,   m = floor(T) = 6.

The picture shows:
  * Leg 1: the partial-sum spiral  Sigma1 = sum_{n=1}^m n^{-s}
           (cumulative links), then the short fractional link
           R1ps = d1 e^{-i w} lying ALONG the (m+1)st link direction,
           reaching the bisector point  B1 = Sigma1 + R1ps.
  * Leg 2: the partial-sum spiral  Sigma2 = chi(s) sum_{n=1}^m n^{s-1}
           laid tip-to-tail starting at B1, then the short fractional
           link R2ps = d2 e^{i(w+arg chi)} along its (m+1)st link,
           reaching  zeta.
The faint dashed vectors show the *full* (m+1)st summand of each leg, so
that R1ps / R2ps are visibly a shortened ("fractional") version of it.

All numbers are computed exactly (mpmath): zeta, chi and the partial
sums are evaluated, R = zeta - Sigma1 - Sigma2 is decomposed onto the
two unit link-directions e^{-i w} and e^{i(w+psi)} by solving the 2x2
real linear system (Cramer), giving real d1, d2.

Outputs (into ./figures/):
    fig1_spiral_summands.pdf   (vector, used by LaTeX)
    fig1_spiral_summands.png   (raster preview)

Edit the PARAMETERS block below to regenerate for other (sigma, t, m).
Run:  python3 fig1_spiral_summands.py
"""

import os
import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt

# --------------------------------------------------------------------------
# PARAMETERS  (edit here, then re-run)
# --------------------------------------------------------------------------
SIGMA   = mp.mpf('0.5')          # real part of s (critical line)
T_INDEX = mp.mpf('6.18')         # the index T
M       = 6                      # m = floor(T)
# Imaginary part t = I(T) = (2T+1) pi / (ln(T+1) - ln T).
# (Given T ~ 6.18 this evaluates to t ~ 279.85; set T_INDEX above to change.)
USE_I_OF_T = True                # if False, set T_EXPLICIT below
T_EXPLICIT = mp.mpf('279.85')    # used only if USE_I_OF_T is False

OUTDIR  = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'figures')
BASENAME = 'fig1_spiral_summands'

mp.mp.dps = 50


# --------------------------------------------------------------------------
# Core mathematics
# --------------------------------------------------------------------------
def I_of_T(T):
    return (2 * T + 1) * mp.pi / (mp.log(T + 1) - mp.log(T))


def chi(s):
    """Functional-equation factor: zeta(s) = chi(s) zeta(1-s)."""
    return mp.mpf(2) ** s * mp.pi ** (s - 1) * mp.sin(mp.pi * s / 2) * mp.gamma(1 - s)


def compute():
    t = I_of_T(T_INDEX) if USE_I_OF_T else T_EXPLICIT
    s = mp.mpc(SIGMA, t)
    m = M
    w = t * mp.log(m + 1)                 # omega = t ln(m+1)
    ch = chi(s)
    psi = mp.arg(ch)                      # arg chi

    # Leg-1 partial sum spiral: cumulative sum of n^{-s}
    leg1 = [mp.mpc(0)]
    z = mp.mpc(0)
    for n in range(1, m + 1):
        z += mp.mpf(n) ** (-s)
        leg1.append(z)
    Sigma1 = leg1[-1]

    # entire sum-1 chain, continued past m out to the link nearest its
    # spiral center (link floor(t/pi), links 0-based) -- drawn faintly
    # underneath the partial-sum links
    n_full = int(mp.floor(t / mp.pi)) + 1
    full1 = list(leg1)
    z = Sigma1
    for n in range(m + 1, n_full + 1):
        z += mp.mpf(n) ** (-s)
        full1.append(z)

    # Leg-2 partial sum: chi * sum n^{s-1}, laid from the bisector point later
    partial2 = [mp.mpc(0)]
    z = mp.mpc(0)
    for n in range(1, m + 1):
        z += ch * mp.mpf(n) ** (s - 1)
        partial2.append(z)
    Sigma2 = partial2[-1]

    zeta = mp.zeta(s)
    R = zeta - Sigma1 - Sigma2            # Siegel remainder (exact)

    # Decompose R = d1 e^{-i w} + d2 e^{i(w+psi)} for real d1, d2 (Cramer).
    u1 = mp.exp(-1j * w)
    u2 = mp.exp(1j * (w + psi))
    a, b = mp.re(u1), mp.re(u2)
    c, d = mp.im(u1), mp.im(u2)
    det = a * d - b * c
    d1 = (mp.re(R) * d - b * mp.im(R)) / det
    d2 = (a * mp.im(R) - mp.re(R) * c) / det

    # Cross-check against the closed-form sine expressions.
    argR = mp.arg(R)
    d1_sine = mp.fabs(R) * mp.sin(w - argR + psi) / mp.sin(2 * w + psi)
    d2_sine = mp.fabs(R) * mp.sin(w + argR) / mp.sin(2 * w + psi)

    R1ps = d1 * u1
    R2ps = d2 * u2
    B1 = Sigma1 + R1ps                    # bisector point
    zeta_reconstructed = Sigma1 + R1ps + Sigma2 + R2ps

    # full (would-be) (m+1)st summand of each leg (for the dashed "full link")
    next1 = mp.mpf(m + 1) ** (-s)                 # direction e^{-i w}, len (m+1)^-sigma
    next2 = ch * mp.mpf(m + 1) ** (s - 1)         # leg-2 next summand

    return dict(
        t=t, s=s, m=m, w=w, chi=ch, psi=psi,
        leg1=leg1, full1=full1, Sigma1=Sigma1, partial2=partial2, Sigma2=Sigma2,
        zeta=zeta, R=R, d1=d1, d2=d2, d1_sine=d1_sine, d2_sine=d2_sine,
        R1ps=R1ps, R2ps=R2ps, B1=B1, zeta_reconstructed=zeta_reconstructed,
        next1=next1, next2=next2,
    )


# --------------------------------------------------------------------------
# Plot helpers
# --------------------------------------------------------------------------
def C(z):
    """mpmath complex -> python complex (for plotting)."""
    return complex(float(mp.re(z)), float(mp.im(z)))


def xy(points):
    arr = np.array([C(p) for p in points])
    return arr.real, arr.imag


def make_figure(data):
    B1 = data['B1']
    # leg-1 path (origin -> Sigma1) and the R1ps link on top
    leg1 = data['leg1']
    Sigma1 = data['Sigma1']
    # leg-2 path, drawn front-to-back from the end of leg 1: first the
    # fractional link R2ps (along the (m+1)st direction), then the summand
    # links n = m, m-1, ..., 1, closing on zeta.  Same endpoints, reversed
    # winding, so leg 2 tightens toward the joint just as leg 1 does.
    R2ps = data['R2ps']
    A_joint = B1 + R2ps
    leg2 = [A_joint]
    z = A_joint
    for n in range(data['m'], 0, -1):
        z += data['chi'] * mp.mpf(n) ** (data['s'] - 1)
        leg2.append(z)
    zeta_pt = z                           # = zeta

    fig, ax = plt.subplots(figsize=(7.4, 6.4))

    # --- entire sum-1 spiral, thin at 50% opacity, underneath ---
    xf, yf = xy(data['full1'])
    ax.plot(xf, yf, '-', color='#1f77b4', lw=0.6, alpha=0.5, zorder=1)

    # --- Leg 1 spiral (partial sum Sigma1) ---
    x1, y1 = xy(leg1)
    ax.plot(x1, y1, '-', color='#1f77b4', lw=1.6, marker='o', ms=2.2,
            label=r'$\Sigma_1=\sum_{n\leq m} n^{-s}$ (leg 1)', zorder=3)

    # full (m+1)st summand of leg 1 (dashed, joint m -> joint m+1), same
    # blue as the rest of the sum-1 links; R1ps is its shortened part
    n1x, n1y = xy([Sigma1, Sigma1 + data['next1']])
    ax.plot(n1x, n1y, '--', color='#1f77b4', lw=1.3, alpha=0.85, zorder=2)
    r1x, r1y = xy([Sigma1, B1])
    ax.plot(r1x, r1y, '-', color='#d62728', lw=3.0, solid_capstyle='round',
            label=r'$R_{1ps}=d_1e^{-i\omega}$ (fractional link)', zorder=4)

    # --- Leg 2: fractional link R2ps at the joint, then spiral to zeta ---
    # full (m+1)st summand (dashed) runs joint m (A_joint) -> joint m+1 and on,
    # same sense as R2ps; coloured the sum-2 green like its other links
    n2x, n2y = xy([A_joint, A_joint - data['next2']])
    ax.plot(n2x, n2y, '--', color='#2ca02c', lw=1.3, alpha=0.85, zorder=2)
    r2x, r2y = xy([B1, A_joint])
    ax.plot(r2x, r2y, '-', color='#ff7f0e', lw=3.0, solid_capstyle='round',
            label=r'$R_{2ps}=d_2e^{\,i(\omega+\arg\chi)}$ (fractional link)', zorder=4)

    x2, y2 = xy(leg2)
    ax.plot(x2, y2, '-', color='#2ca02c', lw=1.6, marker='s', ms=2.2,
            label=r'$\Sigma_2=\chi\sum_{n\leq m} n^{\,s-1}$ (leg 2)', zorder=3)

    # --- key points ---
    def mark(z, label, dx, dy, color='k', show_dot=True, ha='left'):
        p = C(z)
        if show_dot:
            ax.plot([p.real], [p.imag], 'o', color=color, ms=4, zorder=5)
        ax.annotate(label, (p.real, p.imag),
                    textcoords='offset points', xytext=(dx, dy),
                    fontsize=11, color=color, ha=ha)

    mark(mp.mpc(0), r'$O$', -14, -4)
    mark(zeta_pt, r'$\zeta(s)$', -8, 6, color='#7f2fbf', show_dot=False, ha='right')

    # both callouts point to the central joint where the two fractional links meet
    bpt = C(B1)
    ax.annotate(r'link $m=\lfloor T\rfloor$ intersection',
                xy=(bpt.real, bpt.imag), xytext=(0.30, bpt.imag),
                textcoords='data', ha='left', va='center', fontsize=9,
                arrowprops=dict(arrowstyle='->', color='0.25', lw=1.1),
                annotation_clip=False, zorder=6)
    ax.annotate(r'$\Sigma_1{+}R_{1ps}$',
                xy=(bpt.real, bpt.imag), xytext=(2.4, 1.9),
                textcoords='data', ha='left', va='center', fontsize=11,
                color='#d62728',
                arrowprops=dict(arrowstyle='->', color='#d62728', lw=1.1),
                annotation_clip=False, zorder=6)

    ax.set_aspect('equal', adjustable='datalim')
    ax.grid(True, ls=':', alpha=0.4)
    ax.set_xlabel(r'$\Re$')
    ax.set_ylabel(r'$\Im$')
    ttl = (r'$\sigma=%.2f,\ T\approx%.2f\ (t=I(T)\approx%.2f),\ m=%d$'
           % (float(SIGMA), float(T_INDEX), float(data['t']), data['m']))
    ax.set_title('Fractional-summand picture: '
                 r'$\zeta=\Sigma_1+R_{1ps}+\Sigma_2+R_{2ps}$' + '\n' + ttl,
                 fontsize=11)
    ax.legend(loc='lower left', bbox_to_anchor=(0.02, 0.08),
              fontsize=8.5, framealpha=0.92)
    fig.tight_layout()

    # zoom inset on the two fractional links (same idea as fig_zeta_chain).
    # Created after tight_layout so the main axes layout -- and hence the
    # autoscaled limits, which fig_zeta_chain copies -- are unchanged.
    s1c, frc = C(Sigma1), C(A_joint)
    axins = ax.inset_axes([0.05, 0.40, 0.34, 0.30])
    axins.plot(xf, yf, '-', color='#1f77b4', lw=0.6, alpha=0.5, zorder=1)
    axins.plot(x1, y1, '-', color='#1f77b4', lw=1.6, marker='o', ms=2.2,
               zorder=3)
    axins.plot(n1x, n1y, '--', color='#1f77b4', lw=1.3, alpha=0.85, zorder=2)
    axins.plot(n2x, n2y, '--', color='#2ca02c', lw=1.3, alpha=0.85, zorder=2)
    axins.plot(x2, y2, '-', color='#2ca02c', lw=1.6, marker='s', ms=2.2,
               zorder=3)
    for tail, head, color in [(s1c, bpt, '#d62728'), (bpt, frc, '#ff7f0e')]:
        axins.annotate('', xy=(head.real, head.imag),
                       xytext=(tail.real, tail.imag),
                       arrowprops=dict(arrowstyle='-|>', color=color, lw=2.2,
                                       shrinkA=0, shrinkB=0,
                                       mutation_scale=13),
                       zorder=5)
    axins.annotate(r'$\Sigma_1$', (s1c.real, s1c.imag),
                   textcoords='offset points', xytext=(6, -10), fontsize=9)
    axins.annotate(r'$B_1$', (bpt.real, bpt.imag),
                   textcoords='offset points', xytext=(7, -2), fontsize=9)
    xs = [s1c.real, bpt.real, frc.real]
    ys = [s1c.imag, bpt.imag, frc.imag]
    pad = 0.05
    axins.set_xlim(min(xs) - pad, max(xs) + pad)
    axins.set_ylim(min(ys) - pad, max(ys) + pad)
    axins.set_aspect('equal')
    axins.set_xticks([])
    axins.set_yticks([])
    ax.indicate_inset_zoom(axins, edgecolor='0.45')

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
    err = mp.fabs(data['zeta_reconstructed'] - data['zeta'])
    print('s                 =', data['s'])
    print('t = I(T)          =', mp.nstr(data['t'], 8))
    print('omega = t ln(m+1) =', mp.nstr(data['w'], 8))
    print('|chi|             =', mp.nstr(mp.fabs(data['chi']), 8), '(should be 1)')
    print('arg chi           =', mp.nstr(data['psi'], 8))
    print('Sigma1            =', mp.nstr(data['Sigma1'], 8))
    print('Sigma2            =', mp.nstr(data['Sigma2'], 8))
    print('zeta(s)           =', mp.nstr(data['zeta'], 8))
    print('R = zeta-S1-S2    =', mp.nstr(data['R'], 8))
    print('d1 (linear solve) =', mp.nstr(data['d1'], 8),
          '  d1 (sine form) =', mp.nstr(data['d1_sine'], 8))
    print('d2 (linear solve) =', mp.nstr(data['d2'], 8),
          '  d2 (sine form) =', mp.nstr(data['d2_sine'], 8))
    print('R1ps              =', mp.nstr(data['R1ps'], 8))
    print('R2ps              =', mp.nstr(data['R2ps'], 8))
    print('reconstruction err|S1+R1+S2+R2 - zeta| =', mp.nstr(err, 5))
    pdf, png = make_figure(data)
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
