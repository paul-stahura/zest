#!/usr/bin/env python3
"""
fig_F_curve.py -- the trace of the conjugate of Siegel's F ("desired
result") in the complex plane.

    Fbar(tau) = (e^{-pi i tau^2} - e^{-pi i tau}) / (2 i sin(pi tau))

for -1.5 <= tau <= 1.5.  The apparent poles at integer tau are removable,
with Fbar -> 1/2 - n as tau -> n (black squares at 3/2, 1/2, -1/2).

Outputs figures/fig_F_curve.png.  Run:  python3 fig_F_curve.py
"""

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

BLUE, RED = 'b', '#d62728'


def F(tau):
    return (np.exp(-1j*np.pi*tau**2) - np.exp(-1j*np.pi*tau)) \
        / (2j*np.sin(np.pi*tau))


eps = 1e-6
tau = np.linspace(-1.5 + eps, 1.5 - eps, 6000)
z = F(tau)

fig, ax = plt.subplots(figsize=(5.4, 4.6))
ax.plot(z.real, z.imag, '-', color=BLUE, lw=1.4, zorder=2)

# dots every 0.1 in tau (skipping the integers)
for tk in np.arange(-1.4, 1.45, 0.1):
    if abs(tk - round(tk)) < 1e-9:
        continue
    zk = F(tk)
    ax.plot([zk.real], [zk.imag], 'o', color=RED, ms=3, zorder=3)

# label the outermost dots
for tk, off in ((-1.4, (6, 4)), (1.4, (6, 2))):
    zk = F(tk)
    ax.annotate(r'$\tau=%.1f$' % tk, (zk.real, zk.imag),
                textcoords='offset points', xytext=off, fontsize=8,
                color=RED)

# removable points at the integers: F -> 1/2 - n
for n in (-1, 0, 1):
    lim = 0.5 - n
    ax.plot([lim], [0], 's', color='k', ms=6, zorder=4)
    ax.annotate(r'$\tau\to%d$: $%+.1f$' % (n, lim), (lim, 0),
                textcoords='offset points', xytext=(8, 0), fontsize=8,
                va='center')

# unit chord: F(tau+1) - F(tau) = -e^{-i pi (tau^2+tau)} has modulus 1
GRAY = '0.45'
za, zb = F(0.18), F(1.18)
ax.plot([za.real, zb.real], [za.imag, zb.imag], '-', color=GRAY,
        lw=1.6, zorder=5)
ax.plot([za.real, zb.real], [za.imag, zb.imag], 'o', color=GRAY,
        ms=4, zorder=6)
ax.annotate(r'$\tau=0.18$', (za.real, za.imag), textcoords='offset points',
            xytext=(6, -12), fontsize=8, color=GRAY)
ax.annotate(r'$\tau=1.18$', (zb.real, zb.imag), textcoords='offset points',
            xytext=(9, -6), fontsize=8, color=GRAY, ha='left')
mid = 0.5*(za + zb)
ax.annotate('length 1', (mid.real, mid.imag), textcoords='offset points',
            xytext=(10, -2), fontsize=8, color=GRAY, ha='left')

ax.set_aspect('equal', adjustable='datalim')
ax.grid(True, ls=':', alpha=0.4)
ax.set_xlabel('Re')
ax.set_ylabel('Im')
ax.set_title(r'$\overline{F(\tau)}$ in the complex plane,'
             r' $-1.5\leq\tau\leq 1.5$',
             fontsize=11)
fig.tight_layout()
fig.savefig('figures/fig_F_curve.png', dpi=200)
print('wrote figures/fig_F_curve.png')
