#!/usr/bin/env python3
"""
fig_tip_exceptions.py
=====================

The two census ovals that bracket no zero without straddling an integer, at
T = 393.2 and T = 398.4, and why they are not zeroless.

Both are ovals whose tip in sigma stops just past the scan line
sigma = 1/2 + 0.01. The scan therefore cuts them at the very tip, where the
cross-section has narrowed to about 3e-7 of the index, and that sliver lies just
to one side of the zero's height: above it at T = 398, below it at T = 393. The
oval itself is some 4e-6 tall at the critical line and holds the zero
comfortably. The miss is in the bracket test at eps = 0.01, not in the oval.

Run:  python3 fig_tip_exceptions.py
"""

import math
import os
import sys

import matplotlib
import numpy as np
from scipy.optimize import brentq

matplotlib.use('Agg')
import matplotlib.pyplot as plt

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                '..', '..', 'equal-leg-density'))
import census as CS                                           # noqa: E402
import eqleg_fast as F                                        # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
CASES = ((393, 393.2124569), (398, 398.3647071))
EPS_SCAN = 0.01                                    # the census scan line
SPAN = 4.0e-6                                      # T window about the zero


class Oval:
    """One oval, its zero, and its boundary as a function of sigma."""

    def __init__(self, m, T_guess):
        self.m = m
        self.zmode, self.N_em = CS.route(m)
        self.tz = self._zero(T_guess)
        self.lo, self.hi = self.tz - SPAN, self.tz + SPAN
        self.tip = self._tip()

    def _zero(self, T_guess):
        T = np.linspace(T_guess - SPAN, T_guess + SPAN, 2001)
        Z = F.hardy_Z(self.m, T, N_em=self.N_em, zeta_mode=self.zmode)
        k = np.nonzero(np.signbit(Z[1:]) != np.signbit(Z[:-1]))[0][0]
        f = lambda x: float(F.hardy_Z(self.m, np.atleast_1d(x), N_em=self.N_em,
                                      zeta_mode=self.zmode)[0])
        return brentq(f, T[k], T[k + 1], xtol=1e-14)

    def branch(self, d):
        """(bottom, top) of the oval at sigma = 1/2 + d, or None past the tip."""
        T = np.linspace(self.lo, self.hi, 4001)
        g = F.block(self.m, T, 0.5 + d, zeta_mode=self.zmode,
                    N_em=self.N_em)['g_ak']
        k = np.nonzero(np.signbit(g[1:]) != np.signbit(g[:-1]))[0]
        if k.size < 2:
            return None
        s = CS.scalar_g(self.m, 0.5 + d, 'ak', self.zmode, self.N_em)
        return (brentq(s, T[k[0]], T[k[0] + 1], xtol=1e-14),
                brentq(s, T[k[-1]], T[k[-1] + 1], xtol=1e-14))

    def _tip(self):
        a, b = EPS_SCAN, EPS_SCAN + 0.002
        for _ in range(30):
            mid = 0.5 * (a + b)
            if self.branch(mid) is None:
                b = mid
            else:
                a = mid
        return a

    def outline(self, d_lo, d_hi, n):
        """Boundary over a sigma ladder, dense at the tip end."""
        x = np.linspace(0.0, 1.0, n)
        ds = d_lo + (d_hi - d_lo) * np.sin(0.5 * math.pi * x)
        out = []
        for d in ds:
            b = self.branch(d)
            if b is not None:
                out.append((d, b[0] - self.tz, b[1] - self.tz))
        return np.array(out)

    def crossing(self):
        """Sigma at which the zero's height leaves the cross-section, and which
        boundary it leaves through."""
        for i, side in enumerate(('top', 'bottom')):
            def gap(d, i=i):
                b = self.branch(d)
                if b is None:
                    return -1.0
                return (b[1] - self.tz) if i == 0 else (self.tz - b[0])
            if gap(0.009) > 0 and gap(self.tip - 1e-7) < 0:
                return brentq(gap, 0.009, self.tip - 1e-7, xtol=1e-10), side
        return None, None


def sci(x, digits=1):
    """1.2e-07 as $1.2\\times10^{-7}$."""
    e = int(math.floor(math.log10(abs(x))))
    return f'${x/10**e:.{digits}f}\\times10^{{{e}}}$'


def draw(ax, ov, o, scale, zoom):
    """One panel: the oval about its zero, sigma horizontal, T vertical."""
    d, bot, top = o[:, 0], o[:, 1] / scale, o[:, 2] / scale
    for sign in (+1, -1):
        s = 0.5 + sign * d
        ax.plot(s, bot, '-', color='#1f4e79', lw=1.5)
        ax.plot(s, top, '-', color='#1f4e79', lw=1.5)
        ax.fill_between(s, bot, top, color='#1f4e79', alpha=0.13, lw=0)
    ax.axhline(0.0, color='#b03a2e', lw=0.9, ls='--')
    for sign in (+1, -1):
        ax.axvline(0.5 + sign * EPS_SCAN, color='k', lw=0.8, ls=':')
    b = ov.branch(EPS_SCAN)
    ax.plot([0.5 + EPS_SCAN] * 2, [(b[0] - ov.tz) / scale,
                                   (b[1] - ov.tz) / scale],
            '-', color='#e67e22', lw=3.2, solid_capstyle='butt',
            zorder=4, label='what the scan sees')
    ax.plot([0.5], [0.0], 'o', color='#b03a2e', ms=6, zorder=5,
            label=r'zero of $\zeta$')
    ax.grid(alpha=0.25, lw=0.4)
    ax.set_xlabel(r'$\sigma$')
    p = int(round(-math.log10(scale)))
    ax.set_ylabel(f'$T - T_{{\\rm zero}}$   ($10^{{-{p}}}$)')
    if zoom:
        ax.set_xlim(0.5 + 0.0088, 0.5 + ov.tip + 4e-5)
        ax.set_xticks([0.5090, 0.5095, 0.5100])
        ax.set_xticklabels(['0.5090', '0.5095', '0.5100'])
    else:
        ax.set_xlim(0.5 - ov.tip - 0.0012, 0.5 + ov.tip + 0.0012)


def main():
    fig, axes = plt.subplots(2, 2, figsize=(7.8, 6.4))
    for col, (m, Tg) in enumerate(CASES):
        ov = Oval(m, Tg)
        ds, side = ov.crossing()
        wide = ov.outline(1e-5, ov.tip, 44)
        near = ov.outline(0.0088, ov.tip, 40)
        h_line = wide[0, 2] - wide[0, 1]
        sliver = ov.branch(EPS_SCAN)
        print(f'm={m}: zero at T={ov.tz:.12f}, tip at sigma={0.5+ov.tip:.7f}, '
              f'{h_line:.3e} tall at the line')
        print(f'  the scan at sigma=0.51 sees {sliver[1]-sliver[0]:.3e}, '
              f'{"below" if sliver[1] < ov.tz else "above"} the zero by '
              f'{min(abs(sliver[0]-ov.tz), abs(sliver[1]-ov.tz)):.2e}')
        print(f'  the zero leaves the cross-section through the {side} '
              f'at sigma={0.5+ds:.7f}')

        draw(axes[0][col], ov, wide, 1e-6, False)
        axes[0][col].set_title(f'the oval at $T={ov.tz:.4f}$', fontsize=9)
        draw(axes[1][col], ov, near, 1e-7, True)
        axes[1][col].axvline(0.5 + ds, color='#2e86c1', lw=0.9, ls='-.')
        axes[1][col].set_title('its tip, where the scan line falls',
                               fontsize=9)
        axes[1][col].annotate('last cross-section holding\n'
                              f'the zero: $\\sigma={0.5+ds:.5f}$',
                              xy=(0.5 + ds, 0.0), xytext=(0.40, 0.10),
                              textcoords='axes fraction', fontsize=7,
                              color='#2e86c1',
                              arrowprops=dict(arrowstyle='->', lw=0.7,
                                              color='#2e86c1'))
        miss = min(abs(sliver[0] - ov.tz), abs(sliver[1] - ov.tz))
        axes[1][col].text(0.98, 0.95,
                          f'sliver {sci(sliver[1] - sliver[0])} tall,\n'
                          f'missing by {sci(miss)}',
                          transform=axes[1][col].transAxes, fontsize=7,
                          ha='right', va='top', color='#e67e22')
        if col == 0:
            axes[0][col].legend(frameon=False, fontsize=7, loc='lower left')

    fig.tight_layout()
    for e in ('pdf', 'png'):
        fig.savefig(os.path.join(HERE, 'figures', f'fig_tip_exceptions.{e}'),
                    dpi=200, bbox_inches='tight')
    print('wrote figures/fig_tip_exceptions.pdf')


if __name__ == '__main__':
    main()
