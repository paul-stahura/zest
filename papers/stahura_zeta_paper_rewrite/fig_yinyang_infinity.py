#!/usr/bin/env python3
"""
fig_yinyang_infinity.py -- the yin and yang curves at infinity.

    Yin_inf(x)  = 1 - Psi(x) e^{-2 pi i (x^2 - 1/16)}
    Yang_inf(x) = -e^{4 pi i x} Yin_inf(x) + e^{4 pi i x}
                = e^{4 pi i x} (1 - Yin_inf(x))

with Psi(x) = cos(2 pi (x^2 - x - 1/16)) / cos(2 pi x), for 0 < x < 1.
The chord joining the two points at any x crosses the real axis at
d(x) = 1/2 + W_inf(x); the plot draws the chord at x = 0.6.

Outputs figures/fig_yinyang_infinity.png.  Run:  python3 fig_yinyang_infinity.py
"""

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

BLUE, DARKRED, GRAY = 'b', '#a02020', '0.45'


def Psi(x):
    return np.cos(2*np.pi*(x**2 - x - 1/16)) / np.cos(2*np.pi*x)


def Yin(x):
    A = 2*np.pi*(x**2 - 1/16)
    return 1 - Psi(x)*np.exp(-1j*A)


def Yang(x):
    return np.exp(4j*np.pi*x)*(1 - Yin(x))


eps = 1e-6
# avoid the removable 0/0 points of Psi at x = 1/4, 3/4
x = np.linspace(eps, 1 - eps, 8001)
x = x[(np.abs(x - 0.25) > 1e-4) & (np.abs(x - 0.75) > 1e-4)]

zi, za = Yin(x), Yang(x)

fig, ax = plt.subplots(figsize=(5.8, 5.0))
ax.axhline(0, color='0.75', lw=0.8, zorder=1)
ax.plot(zi.real, zi.imag, '--', color=BLUE, lw=1.4, zorder=2,
        label=r'$\mathrm{Yin}_{\infty}(x)$')
ax.plot(za.real, za.imag, '--', color=DARKRED, lw=1.4, zorder=2,
        label=r'$\mathrm{Yang}_{\infty}(x)$')

# dots every 0.1 in x on both curves
for xk in np.arange(0.1, 0.95, 0.1):
    for f, c in ((Yin, BLUE), (Yang, DARKRED)):
        zk = f(xk)
        ax.plot([zk.real], [zk.imag], 'o', color=c, ms=3, zorder=3)

# the chord at x0 and its crossing of the real axis
x0 = 0.18
p, q = Yin(x0), Yang(x0)
cross = (p.real*q.imag - q.real*p.imag) / (q.imag - p.imag)
ax.plot([p.real, q.real], [p.imag, q.imag], '-', color=GRAY, lw=1.6,
        zorder=5)
ax.plot([p.real, q.real], [p.imag, q.imag], 'o', color=GRAY, ms=4,
        zorder=6)
ax.plot([cross], [0], 'o', color='k', ms=5, zorder=7)
ax.annotate(r'$\mathrm{Yin}_{\infty}(%g)$' % x0, (p.real, p.imag),
            textcoords='offset points', xytext=(6, -10), fontsize=8,
            color=GRAY)
ax.annotate(r'$\mathrm{Yang}_{\infty}(%g)$' % x0, (q.real, q.imag),
            textcoords='offset points', xytext=(-6, 6), fontsize=8,
            color=GRAY, ha='right')
# curly brace from 0 to the crossing dot, pointing down to the label
def draw_brace(ax, xa, xb, y, depth):
    res = 1001
    xs = np.linspace(xa, xb, res)
    half = xs[:res//2 + 1]
    beta = 40.0/(xb - xa)
    prof = (1/(1 + np.exp(-beta*(half - half[0])))
            + 1/(1 + np.exp(-beta*(half - half[-1]))))
    prof = np.concatenate((prof, prof[-2::-1]))   # 0.5 .. 1.5 .. 0.5
    ax.plot(xs, y - depth*(prof - 0.5), color='k', lw=1.0, zorder=8)


brace_y = -0.015
draw_brace(ax, 0.0, cross, brace_y, 0.05)
ax.text(cross/2, brace_y - 0.075,
        '$d(x)$\n' r'$\frac{1}{2}+\mathcal{W}_{\infty}(%g)=%.3f$'
        % (x0, cross),
        fontsize=8, ha='center', va='top')

ax.set_aspect('equal', adjustable='datalim')
ax.grid(True, ls=':', alpha=0.4)
ax.set_xlabel('Re')
ax.set_ylabel('Im')
ax.legend(loc='upper left', fontsize=9)
ax.set_title(r'$\mathrm{Yin}_{\infty}$ and $\mathrm{Yang}_{\infty}$'
             r' in the complex plane, $0<x<1$', fontsize=11)
fig.tight_layout()
fig.savefig('figures/fig_yinyang_infinity.png', dpi=200)
print('wrote figures/fig_yinyang_infinity.png  (crossing at x0=%g: %.10f)'
      % (x0, cross))
