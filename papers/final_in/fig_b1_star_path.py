#!/usr/bin/env python3
"""
fig_b1_star_path.py
===================

The path of the velocity-split companion

    B1* = zeta + zeta'/(2 theta')

on the critical line, drawn as a curve in the plane over T = 1 to 10, which is
t = 13.60 to 692.20.  The fast route to it is the rotated form of the paper,

    e^{i theta} B1* = Z/2 - i Z'/(2 theta'),

exact and cheap, since Z and Z' come from the Riemann-Siegel formula.  Checked
against zeta + zeta'/(2 theta') directly: they agree to 18 digits.

Left panel: the whole range in the world plane, the colour running with T.  The
curve loops once per ordinate and never reaches the origin.
Middle panel: one unit of the index, T = 6 to 7, in the same plane, with the
ordinates marked.  The loops are visible one at a time here.
Right panel: the same unit rotated by e^{i theta}, which is the frame in which
the real part is Z/2 and the imaginary part is the offset h* = -Z'/2theta'.
Every loop encircles the origin once, crossing the imaginary axis exactly at
the ordinates: that winding is the counting curve N*.

Output (into ./figures/):
    fig_b1_star_path.pdf   (vector)
    fig_b1_star_path.png   (raster preview)

Run:  python3 fig_b1_star_path.py
"""

import multiprocessing as mproc
import os

import matplotlib.pyplot as plt
import mpmath as mp
import numpy as np
from matplotlib.collections import LineCollection

from fig_counting_index import I_of_T

BASENAME = 'fig_b1_star_path'
OUTDIR = 'figures'

T_LO, T_HI = 1.0, 10.0
WIN = (6.0, 7.0)
N_FULL, N_WIN = 40000, 6000
CMAP = 'viridis'
CMAP2 = 'plasma'
RED = '#b03a2e'
CACHE = 'b1_star_path_cache.npz'
N_ZEROS = 408          # ordinates in 13.597 <= t <= 692.197

mp.mp.dps = 12


def theta_prime(t):
    return mp.re(mp.digamma(mp.mpf(1) / 4 + 1j * t / 2)) / 2 - mp.log(mp.pi) / 2


def rotated(t):
    """e^{i theta} B1* = Z/2 - i Z'/(2 theta'), and the phase that undoes it."""
    t = mp.mpf(t)
    w = mp.siegelz(t) / 2 - 1j * mp.siegelz(t, derivative=1) / (2 * theta_prime(t))
    return complex(w), float(mp.siegeltheta(t))


def path(Ts, pool):
    ts = np.array([float(I_of_T(T)) for T in Ts])
    out = pool.map(rotated, ts, chunksize=50)
    W = np.array([o[0] for o in out])
    th = np.array([o[1] for o in out])
    return ts, np.exp(-1j * th) * W, W


def ordinates(ts, W):
    """The zeros of Z in the sampled range, from the sign changes of Re W."""
    Z = 2.0 * W.real
    out = []
    for k in np.nonzero(np.sign(Z[:-1]) != np.sign(Z[1:]))[0]:
        out.append(float(mp.findroot(mp.siegelz, (ts[k], ts[k + 1]), solver='bisect',
                                     tol=1e-18)))
    return np.array(out)


def coloured(ax, xy, c, lw=0.5, alpha=0.85, cmap=CMAP):
    pts = np.array([xy.real, xy.imag]).T.reshape(-1, 1, 2)
    seg = np.concatenate([pts[:-1], pts[1:]], axis=1)
    lc = LineCollection(seg, cmap=cmap, lw=lw, alpha=alpha)
    lc.set_array(c[:-1])
    ax.add_collection(lc)
    return lc


def frame(ax, title):
    ax.axhline(0, color='0.65', lw=0.7, zorder=0)
    ax.axvline(0, color='0.65', lw=0.7, zorder=0)
    ax.plot(0, 0, 'k+', ms=9, mew=1.4, zorder=6)
    ax.set_aspect('equal')
    ax.grid(True, ls=':', alpha=0.35)
    ax.set_xlabel('real part')
    ax.set_title(title, fontsize=10.5)


def samples():
    """Sample the path, keeping a cache so the drawing can be redone quickly."""
    if os.path.exists(CACHE):
        d = np.load(CACHE)
        return (d['Tf'], d['tf'], d['Bf'], d['Tw'], d['Bw'], d['Ww'], d['Bg'],
                d['Wg'], d['gam'])
    ctx = mproc.get_context('fork')
    with ctx.Pool(10) as pool:
        Tf = np.linspace(T_LO, T_HI, N_FULL)
        tf, Bf, _ = path(Tf, pool)
        Tw = np.linspace(*WIN, N_WIN)
        tw, Bw, Ww = path(Tw, pool)
        gam = ordinates(tw, Ww)
        at = pool.map(rotated, gam)
    Wg = np.array([o[0] for o in at])
    Bg = np.array([np.exp(-1j * o[1]) * o[0] for o in at])
    np.savez(CACHE, Tf=Tf, tf=tf, Bf=Bf, Tw=Tw, Bw=Bw, Ww=Ww, Bg=Bg, Wg=Wg,
             gam=gam)
    return Tf, tf, Bf, Tw, Bw, Ww, Bg, Wg, gam


def main():
    Tf, tf, Bf, Tw, Bw, Ww, Bg, Wg, gam = samples()

    fig, ax = plt.subplots(1, 3, figsize=(11.6, 4.5), constrained_layout=True,
                           gridspec_kw={'width_ratios': [1.02, 1.0, 1.32]})

    lc = coloured(ax[0], Bf, Tf, lw=0.3, alpha=0.65)
    ax[0].autoscale_view()
    frame(ax[0], r'$B_1^{\ast}=\zeta+\zeta^{\prime}/2\vartheta^{\prime}$ over '
                 '\n' r'$1\leq T\leq 10$: %d loops, one per ordinate' % N_ZEROS)
    ax[0].set_ylabel('imaginary part')
    cb = fig.colorbar(lc, ax=ax[0], pad=0.02)
    cb.set_label('$T$')
    r = np.abs(Bf)
    j = r.argmin()
    ax[0].plot(Bf[j].real, Bf[j].imag, 'o', ms=7, mfc='none', mec=RED, mew=1.4,
               zorder=7)
    ax[0].annotate('closest approach to the origin,\n'
                   r'$|B_1^{\ast}|=%.3f$ at $T=%.3f$' % (r[j], Tf[j]),
                   (Bf[j].real, Bf[j].imag), xycoords='data',
                   xytext=(0.02, 0.02), textcoords='axes fraction',
                   fontsize=9, color=RED, ha='left', va='bottom',
                   arrowprops=dict(arrowstyle='-', color=RED, lw=0.8,
                                   shrinkB=6))

    lc2 = coloured(ax[1], Bw, Tw, lw=0.75, alpha=0.95, cmap=CMAP2)
    ax[1].autoscale_view()
    ax[1].plot(Bg.real, Bg.imag, 'o', ms=3.6, mfc=RED, mec='k', mew=0.4,
               zorder=6, label='the %d ordinates of the unit' % len(gam))
    frame(ax[1], 'one unit of the index, $6\\leq T\\leq 7$,\nin the same plane')
    ax[1].legend(loc='upper left', fontsize=8.5, framealpha=0.93)

    lc3 = coloured(ax[2], Ww, Tw, lw=0.75, alpha=0.95, cmap=CMAP2)
    ax[2].autoscale_view()
    ax[2].plot(Wg.real, Wg.imag, 'o', ms=3.6, mfc=RED, mec='k', mew=0.4,
               zorder=6, label='the ordinates, on the imaginary axis')
    frame(ax[2], 'the same unit rotated by $e^{i\\vartheta}$: every loop\n'
                 'encircles the origin once, and that is $N_{\\ast}$')
    ax[2].set_xlabel(r'$\frac{1}{2}Z$')
    ax[2].set_ylabel(r'$h^{\ast}=-Z^{\prime}/2\vartheta^{\prime}$')
    cb3 = fig.colorbar(lc3, ax=[ax[1], ax[2]], pad=0.02)
    cb3.set_label('$T$')
    ax[2].legend(loc='upper left', fontsize=8.5, framealpha=0.93)
    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf)
    fig.savefig(png, dpi=190)
    plt.close(fig)

    print('T = %g to %g, t = %.3f to %.3f' % (T_LO, T_HI, tf[0], tf[-1]))
    print('|B1*|: min %.4f at T = %.4f, max %.4f at T = %.4f, median %.4f'
          % (r.min(), Tf[r.argmin()], r.max(), Tf[r.argmax()], np.median(r)))
    print('unit %g to %g holds %d ordinates' % (WIN[0], WIN[1], len(gam)))
    print('wrote', pdf)
    print('wrote', png)


if __name__ == '__main__':
    main()
