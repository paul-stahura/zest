#!/usr/bin/env python3
"""
fig_yinyang_general.py -- the general yin and yang curves on the critical
line for 1 <= T <= 2, drawn over the limit curves of section 6.4.

    Yin(s)  = R M^s,          Yang(s) = Yin(s) - chi(s) M^{2s-1},

with s = 1/2 + i I(T), M = ceil(T).  The chord at the snapshot T = 1.18
crosses the real axis at (d1_hat, 0); the piece [0, d1_hat] of the axis is
the in-frame image of R1 (red) and the piece from the crossing to the yin
point is the image of R2 (orange), as in the companion visualizations.

Outputs figures/fig_yinyang_general.png.  Run:  python3 fig_yinyang_general.py
"""

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.legend_handler import HandlerTuple
from mpmath import mp, mpc, pi, log, sin, gamma, zeta, arg, fabs, im, re

mp.dps = 20

C0 = 'gold'                 # the [1,2] interval color of Figure 2
COBALT = 'b'                # both limit curves, the blue of Figure 4
RED, ORANGE = '#d62728', '#ff7f0e'   # images of R1 and R2
GRAY = '0.45'

SIGMA = 0.5
T_SNAP = 1.18


def I(T):
    return pi*(2*T + 1)/log(1/T + 1)


def chi(s):
    return 2**s * pi**(s - 1) * sin(pi*s/2) * gamma(1 - s)


def yin_yang(sigma, T):
    t = I(T)
    s = mpc(sigma, t)
    M = int(np.ceil(T))
    S1 = sum(n**(-s) for n in range(1, int(np.floor(T)) + 1))
    S2 = chi(s)*sum(n**(-(1 - s)) for n in range(1, int(np.floor(T)) + 1))
    R = zeta(s) - S1 - S2
    yin = R*M**s
    yang = yin - chi(s)*M**(2*s - 1)
    return complex(yin), complex(yang)


# the finite-T curves over 6 < T < 7
Ts = np.linspace(1.001, 1.999, 900)
pts = [yin_yang(SIGMA, T) for T in Ts]
yins = np.array([p[0] for p in pts])
yangs = np.array([p[1] for p in pts])

# the limit curves of section 6.4
def Psi(x):
    return np.cos(2*np.pi*(x**2 - x - 1/16)) / np.cos(2*np.pi*x)


def YinInf(x):
    return 1 - Psi(x)*np.exp(-2j*np.pi*(x**2 - 1/16))


def YangInf(x):
    return np.exp(4j*np.pi*x)*(1 - YinInf(x))


eps = 1e-6
x = np.linspace(eps, 1 - eps, 8001)
x = x[(np.abs(x - 0.25) > 1e-4) & (np.abs(x - 0.75) > 1e-4)]
zi_inf, za_inf = YinInf(x), YangInf(x)

fig, ax = plt.subplots(figsize=(6.2, 5.2))
ax.axhline(0, color='0.75', lw=0.8, zorder=1)

h_inf, = ax.plot(zi_inf.real, zi_inf.imag, '--', color=COBALT, lw=1.5,
                 alpha=0.8, zorder=2)
ax.plot(za_inf.real, za_inf.imag, '--', color=COBALT, lw=1.5,
        alpha=0.8, zorder=2)

h_finite, = ax.plot(yins.real, yins.imag, '-', color=C0, lw=1.5, zorder=3)
ax.plot(yangs.real, yangs.imag, '-', color=C0, lw=1.5, zorder=3)

# the unit segment [0,1] (the next main summand in frame)
h_unit, = ax.plot([0, 1], [0, 0], '-', color='k', lw=1.5, zorder=5,
                  solid_capstyle='round')
ax.plot([0, 1], [0, 0], 'o', color='k', ms=4, zorder=5)

# the chord at T_SNAP and its crossing of the real axis
p, q = yin_yang(SIGMA, T_SNAP)
cross = (p.real*q.imag - q.real*p.imag) / (q.imag - p.imag)
h_chord, = ax.plot([p.real, q.real], [p.imag, q.imag], '-', color=GRAY,
                   lw=1.5, zorder=6)
ax.plot([p.real, q.real], [p.imag, q.imag], 'o', color=GRAY, ms=4,
        zorder=7)
ax.annotate(r'$\mathrm{Yin}(s)$, $T=%.2f$' % T_SNAP, (p.real, p.imag),
            textcoords='offset points', xytext=(6, -12), fontsize=8,
            color=GRAY)
ax.annotate(r'$\mathrm{Yang}(s)$, $T=%.2f$' % T_SNAP, (q.real, q.imag),
            textcoords='offset points', xytext=(8, 4), fontsize=8,
            color=GRAY, ha='left')

# images of R1 (on the axis) and R2 (along the chord), as in the
# companion visualizations
h_r1, = ax.plot([0, cross], [0, 0], '-', color=RED, lw=4.0, zorder=7,
                solid_capstyle='butt')
h_r2, = ax.plot([cross, p.real], [0, p.imag], '-', color=ORANGE, lw=4.0,
                zorder=6, solid_capstyle='butt')

# the crossing dot, with its coordinates
ax.plot([cross], [0], 'o', color='k', ms=6, zorder=8)
ax.annotate(r'$\hat d_1=%.3f$' % cross, (cross, 0),
            textcoords='offset points', xytext=(-7, 8), fontsize=8)

ax.set_aspect('equal', adjustable='datalim')
ax.grid(True, ls=':', alpha=0.4)
ax.set_xlabel('Re')
ax.set_ylabel('Im')
ax.legend([h_inf, h_finite, (h_unit, h_chord), h_r1, h_r2],
          [r'$\mathrm{Yin}_{\infty}(x)$ and $\mathrm{Yang}_{\infty}(x)$',
           r'$\mathrm{Yin}(s)$ and $\mathrm{Yang}(s)$, $1\leq T\leq 2$',
           'pictorial representation of\n' r'unit-scaled summands at $M$',
           r'image of $R_1$: $[0,\ \hat d_1]$',
           r'image of $R_2$'],
          loc='upper right', fontsize=8,
          handler_map={tuple: HandlerTuple(ndivide=None)})
ax.set_title(r'$\mathrm{Yin}$ and $\mathrm{Yang}$ for $1\leq T\leq 2$,'
             r' $\sigma=\frac{1}{2}$, against the limit curves', fontsize=11)
fig.tight_layout()
fig.savefig('figures/fig_yinyang_general.png', dpi=200)
print('wrote figures/fig_yinyang_general.png  (T=%.2f: crossing %.6f)'
      % (T_SNAP, cross))
