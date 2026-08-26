#!/usr/bin/env python3
"""
fig_pole_heights_zoom.py
========================

Document Figure 17: two side-by-side magnifications of the critical strip
in the same style as fig_combined_strips.py (Fig 16): equal legs blue,
folded legs red (true vartheta2 = pi), critical line, zeros.  The loci are
recomputed densely (~400 values of sigma).  Near the d1 pole the PS split
is singular (tiny det); those samples are skipped for the red locus so the
pole is not mislabeled as a fold.

Left panel:  T in [2.75, 2.76].
Right panel: T in [5.25, 5.26].

Outputs (into ./figures/):
    fig_pole_heights_zoom.pdf
    fig_pole_heights_zoom.png
    fig_pole_heights_zoom_data.npz   (cached loci; reuse with --plot-only)

Run:
    python3 fig_pole_heights_zoom.py              # compute + plot
    python3 fig_pole_heights_zoom.py --plot-only  # replot from cache
"""

import os
import sys

import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt

from fig1_spiral_summands import I_of_T, chi, OUTDIR
from fig_equal_legs_strips import read_points_csv, ZEROS_CSV, ZEROCOLOR

# Darker than the strip-figure defaults so the loci read at print size.
BLUE = "#08306b"
RED = "#99000d"

BASENAME = 'fig_pole_heights_zoom'
CACHE_PATH = os.path.join(os.path.dirname(__file__), 'figures',
                          BASENAME + '_data.npz')
N_SIGMA = 400
# (T_lo, T_hi): bottoms at floor(T)±1/4; tops just above the strip lines
WINDOWS = (
    (2.75, 2.76),
    (5.25, 5.26),
)

mp.mp.dps = 25


def _state(sig, T):
    t = I_of_T(mp.mpf(T))
    s = mp.mpc(sig, t)
    m = int(mp.floor(T))
    w = t * mp.log(m + 1)
    ch = chi(s)
    psi = mp.arg(ch)
    S1 = mp.fsum(mp.mpf(n) ** (-s) for n in range(1, m + 1))
    S2 = ch * mp.fsum(mp.mpf(n) ** (s - 1) for n in range(1, m + 1))
    zeta = mp.zeta(s)
    R = zeta - S1 - S2
    u1 = mp.exp(-1j * w)
    u2 = mp.exp(1j * (w + psi))
    det = float(mp.re(u1) * mp.im(u2) - mp.re(u2) * mp.im(u1))
    return dict(w=w, psi=psi, S1=S1, zeta=zeta, R=R, u1=u1, u2=u2, det=det)


def pole_residual(sig, T):
    st = _state(sig, T)
    val = 2 * st['w'] + st['psi']
    k = mp.nint(val / (2 * mp.pi))
    return float(val - 2 * mp.pi * k)


def leg_diff(sig, T, det_min=1e-10):
    st = _state(sig, T)
    if abs(st['det']) < det_min:
        return np.nan
    u1, u2, R = st['u1'], st['u2'], st['R']
    d1 = (mp.re(R) * mp.im(u2) - mp.re(u2) * mp.im(R)) / st['det']
    B1 = st['S1'] + d1 * u1
    return float(mp.fabs(B1) - mp.fabs(st['zeta'] - B1))


def theta2(sig, T, det_min=1e-12):
    st = _state(sig, T)
    if abs(st['det']) < det_min:
        return np.nan
    u1, u2, R = st['u1'], st['u2'], st['R']
    d1 = (mp.re(R) * mp.im(u2) - mp.re(u2) * mp.im(R)) / st['det']
    B1 = st['S1'] + d1 * u1
    if abs(B1) < 1e-30:
        return np.nan
    return float(mp.arg((st['zeta'] - B1) / B1))


def find_roots(f, lo, hi, n=500):
    Ts = np.linspace(lo, hi, n)
    vals = np.empty(n)
    for i, T in enumerate(Ts):
        try:
            vals[i] = f(float(T))
        except Exception:
            vals[i] = np.nan
    roots = []
    for i in range(n - 1):
        a, b = vals[i], vals[i + 1]
        if not (np.isfinite(a) and np.isfinite(b)):
            continue
        if a * b <= 0:
            if b == a:
                roots.append(float(Ts[i]))
            else:
                roots.append(float(Ts[i] - a * (Ts[i + 1] - Ts[i]) / (b - a)))
    return roots


def pick_branch(roots, target):
    if not roots:
        return np.nan
    return min(roots, key=lambda T: abs(T - target))


def find_folded_T(sig, lo, hi, target, n=900, det_min=1e-4, err_max=0.04):
    """True vartheta2=pi in [lo,hi], rejecting singular PS splits (tiny det)."""
    best_T, best_score = np.nan, 1e9
    for T in np.linspace(lo, hi, n):
        T = float(T)
        try:
            st = _state(sig, T)
            if abs(st['det']) < det_min:
                continue
            th = theta2(sig, T, det_min=det_min)
        except Exception:
            continue
        if not np.isfinite(th):
            continue
        err = abs(abs(th) - np.pi)
        if err > err_max:
            continue
        score = err + 30.0 * abs(T - target)
        if score < best_score:
            best_score, best_T = score, T
    return best_T


def compute_loci(lo, hi):
    """Return (sigmas, T_equal, T_folded) with N_SIGMA samples across (0,1).

    Blue: L1=L2 strip-line branch in the window.
    Red: true vartheta2=pi (same meaning as Fig 16), never the d1 pole.
    """
    center = 0.5 * (lo + hi)
    guide = lo
    sigmas = np.linspace(0.02, 0.98, N_SIGMA)
    T_eq = np.full(N_SIGMA, np.nan)
    T_fold = np.full(N_SIGMA, np.nan)

    # Seed equal-leg band from the CSV-ish heights near floor(T)±1/4.
    T_pole_mid = pick_branch(
        find_roots(lambda T: pole_residual(0.5, T), lo, hi, n=400), center)
    frac = guide - np.floor(guide)
    if abs(frac - 0.75) < 0.1:
        eq_seed = (T_pole_mid - 0.0023) if np.isfinite(T_pole_mid) else center
    else:
        eq_seed = T_pole_mid if np.isfinite(T_pole_mid) else center
    eq_target = eq_seed

    # Seed folded branch by a mid-strip probe (not the pole).
    fold_target = find_folded_T(0.25, lo, hi, center)
    if not np.isfinite(fold_target):
        fold_target = find_folded_T(0.75, lo, hi, center)
    if not np.isfinite(fold_target):
        fold_target = center
    print('  seeds: equal~%.6f  folded~%.6f' % (eq_target, fold_target),
          flush=True)

    for i, sig in enumerate(sigmas):
        sig = float(sig)

        # --- equal-leg strip line (blue) ---
        if abs(sig - 0.5) < 1e-9:
            # Whole critical line is equal-leg; mark the tracked band height.
            T_eq[i] = eq_target
        else:
            roots = find_roots(lambda T, s=sig: leg_diff(s, T),
                               lo, hi, n=600)
            near = [T for T in roots if abs(T - eq_target) < 0.004]
            T_eq[i] = pick_branch(near if near else roots, eq_target)
            if np.isfinite(T_eq[i]):
                eq_target = T_eq[i]

        # --- folded-leg (red): true theta2 = pi, skip d1-pole singularities ---
        T_fold[i] = find_folded_T(sig, lo, hi, fold_target)
        if np.isfinite(T_fold[i]):
            fold_target = T_fold[i]

        if i % 20 == 0 or i == N_SIGMA - 1:
            print('  sigma=%.4f  equal=%.6f  folded=%.6f'
                  % (sig,
                     T_eq[i] if np.isfinite(T_eq[i]) else float('nan'),
                     T_fold[i] if np.isfinite(T_fold[i]) else float('nan')),
                  flush=True)

    return sigmas, T_eq, T_fold


def load_cache():
    data = np.load(CACHE_PATH)
    panels = []
    for i in range(len(WINDOWS)):
        panels.append((data['sigmas_%d' % i],
                       data['T_eq_%d' % i],
                       data['T_fold_%d' % i]))
    return panels


def save_cache(panels):
    os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
    payload = {}
    for i, (sigmas, T_eq, T_fold) in enumerate(panels):
        payload['sigmas_%d' % i] = sigmas
        payload['T_eq_%d' % i] = T_eq
        payload['T_fold_%d' % i] = T_fold
    np.savez(CACHE_PATH, **payload)
    print('wrote', CACHE_PATH)


def plot_panels(panels):
    zx, zeros_idx = read_points_csv(ZEROS_CSV)
    fig, axes = plt.subplots(1, 2, figsize=(9.6, 7.4))
    for ax, (lo, hi), (sigmas, T_eq, T_fold) in zip(axes, WINDOWS, panels):
        guide = lo
        ax.axvline(0.5, color=BLUE, lw=2.8, zorder=2)
        ax.axhline(guide, color='0.35', ls='--', lw=1.4, zorder=1)

        m = np.isfinite(T_eq)
        ax.plot(sigmas[m], T_eq[m], '-', color=BLUE, lw=3.4, zorder=3)
        ax.plot(sigmas[m], T_eq[m], 'o', color=BLUE, ms=5.0,
                mec=BLUE, mew=0.4, zorder=4)

        m = np.isfinite(T_fold)
        ax.plot(sigmas[m], T_fold[m], '-', color=RED, lw=3.4, zorder=3)
        ax.plot(sigmas[m], T_fold[m], 'o', color=RED, ms=5.0,
                mec=RED, mew=0.4, zorder=4)

        zsel = (zeros_idx >= lo) & (zeros_idx <= hi)
        ax.plot(zx[zsel], zeros_idx[zsel], 'o', color=ZEROCOLOR, ms=5.5,
                mec='white', mew=0.4, zorder=5)

        ax.set_xlim(0, 1)
        ax.set_ylim(lo, hi)
        ax.set_xticks([0, 0.25, 0.5, 0.75, 1])
        yticks = np.arange(lo, hi + 1e-12, 0.005)
        ax.set_yticks(yticks)
        ax.grid(True, ls=':', alpha=0.35)
        ax.set_xlabel(r'$\sigma$')
        ax.set_title(r'$%.2f\leq T\leq %.2f$' % (lo, hi), fontsize=12)
        print('panel [%.3f, %.3f]: equal [%.6f, %.6f], folded [%.6f, %.6f]'
              % (lo, hi, np.nanmin(T_eq), np.nanmax(T_eq),
                 np.nanmin(T_fold), np.nanmax(T_fold)))

    axes[0].set_ylabel(r'index $T$')
    axes[0].legend(
        handles=[
            plt.Line2D([0], [0], color=BLUE, marker='o', ms=10, lw=3.4,
                       label=r'equal legs ($L_1=L_2$), $N=%d$' % N_SIGMA),
            plt.Line2D([0], [0], color=RED, marker='o', ms=10, lw=3.4,
                       label=r'folded legs ($\vartheta_2=\pi$), $N=%d$' % N_SIGMA),
            plt.Line2D([0], [0], color=ZEROCOLOR, marker='o', ls='none',
                       markersize=12, label=r'zeta zeros'),
            plt.Line2D([0], [0], color='0.35', ls='--', lw=1.8,
                       label=r'$T=\lfloor T\rfloor\pm 1/4$ guide'),
        ],
        loc='lower left', fontsize=17, framealpha=0.92,
    )

    fig.suptitle(r'Magnifications of the strip lines near '
                 r'$T\approx 2.75$ and $T\approx 5.25$',
                 fontsize=12)
    fig.tight_layout(rect=(0, 0, 1, 0.96))

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + '.pdf')
    png = os.path.join(OUTDIR, BASENAME + '.png')
    fig.savefig(pdf, dpi=300)
    fig.savefig(png, dpi=200)
    plt.close(fig)
    print('wrote', pdf)
    print('wrote', png)


def main(plot_only=False):
    if plot_only:
        if not os.path.isfile(CACHE_PATH):
            raise SystemExit('no cache at %s; run without --plot-only first'
                             % CACHE_PATH)
        panels = load_cache()
        print('loaded cache', CACHE_PATH)
    else:
        panels = []
        # Search a hair above the display top so strip lines are not clipped
        # during root-finding; the plot itself uses WINDOWS.
        for lo, hi in WINDOWS:
            slo, shi = lo, hi + 0.005
            print('computing loci for search %.3f <= T <= %.3f ...'
                  % (slo, shi))
            panels.append(compute_loci(slo, shi))
        save_cache(panels)
    plot_panels(panels)


if __name__ == '__main__':
    main(plot_only=('--plot-only' in sys.argv))
