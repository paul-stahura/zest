#!/usr/bin/env python3
"""
fig_cutoff_ovals.py
===================

The ovals that bracket no zero, and why they are not counterexamples.

Fourteen of the fifteen empty ovals in the census sit against an integer of the
index, where the chain gains a link and the locus is recomputed with a different
number of summands. The census counts each oval inside one interval, so such an
oval is cut off at the boundary and its zero, a little further up, is booked to
the interval above. This draws two of them with both sides of the boundary shown:
the arc below computed with m links, the arc above with m+1, the zero marked.

Run:  python3 fig_cutoff_ovals.py
"""

import math
import os
import sys

import matplotlib
import numpy as np

matplotlib.use('Agg')
import matplotlib.pyplot as plt

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                '..', '..', 'equal-leg-density'))
import census as CS                                       # noqa: E402
import eqleg_fast as F                                    # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
CASES = (19, 93)
N_SIG, N_T = 161, 321


def grid(m, T_lo, T_hi, sig):
    """g_ak on a (sigma, T) grid, the chain length being m throughout."""
    zmode, N_em = CS.route(m)
    T = np.linspace(T_lo, T_hi, N_T)
    G = np.empty((N_T, sig.size))
    for j, s in enumerate(sig):
        G[:, j] = F.block(m, T, s, zeta_mode=zmode, N_em=N_em)['g_ak']
    return T, G


def zeros_on_line(m, T_lo, T_hi):
    zmode, N_em = CS.route(m)
    T = np.linspace(T_lo, T_hi, 4000)
    Z = F.hardy_Z(m, T, N_em=N_em, zeta_mode=zmode)
    k = np.nonzero(np.signbit(Z[1:]) != np.signbit(Z[:-1]))[0]
    return [0.5 * (T[i] + T[i + 1]) for i in k]


def main():
    fig, axes = plt.subplots(1, len(CASES), figsize=(7.6, 3.4))
    sig = np.linspace(0.06, 0.94, N_SIG)

    for ax, m in zip(np.atleast_1d(axes), CASES):
        b = m + 1                                  # the boundary
        span = 4.0e-3 if m < 50 else 6.0e-4
        for mm, lo, hi, col in ((m, b - span, b, '#1f4e79'),
                                (m + 1, b, b + span, '#b03a2e')):
            T, G = grid(mm, lo, hi, sig)
            ax.contour(sig, (T - b) * 1e6, G, levels=[0.0], colors=col,
                       linewidths=1.4)
            for tz in zeros_on_line(mm, lo, hi):
                ax.plot([0.5], [(tz - b) * 1e6], 'o', color='k', ms=5,
                        zorder=5)
                print(f'  m={m}: zero at T={tz:.7f}, '
                      f'{(tz-b)*1e6:+.1f}e-6 from the boundary, '
                      f'found with {mm} links')

        ax.axhline(0.0, color='k', lw=0.9, ls='--')
        ax.axvline(0.5, color='k', lw=0.7, ls=':')
        ax.set_xlabel(r'$\sigma$')
        ax.set_ylabel(f'$T-{b}$   ($10^{{-6}}$)')
        ax.set_title(f'the empty oval below $T={b}$', fontsize=9)
        ax.text(0.02, 0.06, f'{m} links', transform=ax.transAxes, fontsize=7,
                color='#1f4e79')
        ax.text(0.02, 0.90, f'{m+1} links', transform=ax.transAxes, fontsize=7,
                color='#b03a2e')
        ax.grid(alpha=0.25, lw=0.4)

    fig.tight_layout()
    for e in ('pdf', 'png'):
        fig.savefig(os.path.join(HERE, 'figures', f'fig_cutoff_ovals.{e}'),
                    dpi=200, bbox_inches='tight')
    print('wrote figures/fig_cutoff_ovals.pdf')


if __name__ == '__main__':
    main()
