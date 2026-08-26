#!/usr/bin/env python3
"""
fig_ps_ak_r2_legs_angles.py
===========================

Document figure for the section "PS, AK and R/2 Legs and Angles".

Two side-by-side magnifications of the critical strip:

  Left  (leg lengths): points where L1 = L2 for three choices of the
        bisector point B1
          blue:   PS,  B1 = Sigma1 + R1ps
          green:  AK,  B1 = Sigma1 + R1ak
          purple: R/2, B1 = Sigma1 + (R1ak + R2ak)/2  (~ Sigma1 + R/2)

  Right (leg angles): points where theta2 = pi for the same three choices
          red:    PS
          orange: AK
          purple hollow: R/2

Equal-leg loci come from Zest CriticalStripPoints CSVs.  PS folded-leg
locus from the Zps Leg Angle = PI CSV.  AK and R/2 folded-leg loci are
recomputed here with the paper definition
    theta2 = arg((zeta - B1) / B1),
B1 = Sigma1 + R1ak (AK) or Sigma1 + (R1ak+R2ak)/2 (R/2).  (The Zest
"Zak Leg Angle = PI" CSV is *not* used: it tracks the angle-0 collinear
locus, not theta2 = pi.)

Defaults produce the Fig.~16 window 4.65 <= T <= 4.80.  For the
triple-zero oval near T = 9.441 (Fig.~17):

    python3 fig_ps_ak_r2_legs_angles.py \\
        --out fig_ps_ak_r2_oval_9441 --t-lo 9.415 --t-hi 9.465

Outputs (into ./figures/):
    <basename>.pdf
    <basename>.png
    <basename>_folded.npz  (AK / R/2 folded-locus cache)

Run:  python3 fig_ps_ak_r2_legs_angles.py
      python3 fig_ps_ak_r2_legs_angles.py --plot-only
"""

import argparse
import os
import cmath
import math

import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.ticker import MultipleLocator

from fig1_spiral_summands import I_of_T, chi, OUTDIR
from fig_equal_legs_strips import read_points_csv, ZEROS_CSV, BLUE, ZEROCOLOR
from fig4_kuznetsov_zoom import I1_of

DEFAULT_BASENAME = 'fig_ps_ak_r2_legs_angles'
DEFAULT_T_LO, DEFAULT_T_HI = 4.65, 4.80

ZEST_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__),
                                         '..', '..', '..'))
POINTS_DIR = os.path.join(ZEST_ROOT, 'Assets', 'Resources',
                          'CriticalStripPoints')
PS_EQ_CSV = os.path.join(POINTS_DIR, '10 Zps Equal Leg Lengths [1-20].csv')
R_EQ_CSV = os.path.join(POINTS_DIR, '90 R Equal Legs.csv')
AK_EQ_CSV = os.path.join(POINTS_DIR, '91 Rak Equal Legs.csv')
PS_TH_CSV = os.path.join(POINTS_DIR, '12 Zps Leg Angle = PI [1-20].csv')

GREEN = '#2ca02c'
PURPLE = '#7f2fbf'
RED = '#d62728'
ORANGE = '#ff7f0e'

mp.mp.dps = 20
N_SIGMA_FOLD = 100         # sigma samples for computed folded loci
N_T_SCAN = 240             # coarse T scan per sigma
N_T_REFINE = 40            # local refine samples around each candidate


def rak_pair(sig, T):
    """Return (R1ak, R2ak) at (sigma, T) via Kuznetsov's 8-coeff formula."""
    t = float(I_of_T(mp.mpf(T)))
    s = complex(sig, t)
    ch = complex(chi(mp.mpc(sig, t)))
    m = int(math.floor(T))
    mhalf = m + 0.5
    sign = (-1.0) ** m
    s2 = complex(1.0 - sig, t)
    R1ak = -0.5 * sign * I1_of(s, mhalf)
    R2ak = -0.5 * sign * ch * I1_of(s2, mhalf).conjugate()
    return R1ak, R2ak


def _S1_zeta(sig, T):
    t = I_of_T(mp.mpf(T))
    s = mp.mpc(sig, t)
    m = int(mp.floor(T))
    S1 = mp.fsum(mp.mpf(n) ** (-s) for n in range(1, m + 1))
    zeta = mp.zeta(s)
    return complex(S1), complex(zeta)


def theta2_ak(sig, T):
    """theta2 for B1 = Sigma1 + R1ak (paper definition)."""
    S1, zeta = _S1_zeta(sig, T)
    R1ak, _ = rak_pair(sig, T)
    B1 = S1 + R1ak
    if abs(B1) < 1e-30:
        return np.nan
    return float(cmath.phase((zeta - B1) / B1))


def theta2_r2(sig, T):
    """theta2 for B1 = Sigma1 + (R1ak+R2ak)/2."""
    S1, zeta = _S1_zeta(sig, T)
    R1ak, R2ak = rak_pair(sig, T)
    B1 = S1 + 0.5 * (R1ak + R2ak)
    if abs(B1) < 1e-30:
        return np.nan
    return float(cmath.phase((zeta - B1) / B1))


def _theta2_err(theta2_fn, sig, T):
    try:
        th = theta2_fn(float(sig), float(T))
    except Exception:
        return np.nan, np.nan
    if not np.isfinite(th):
        return np.nan, np.nan
    return th, abs(abs(th) - np.pi)


def compute_folded_locus(theta2_fn, sigmas, t_lo, t_hi, label=''):
    """All (sigma, T) in the window with theta2 ≈ ±pi for the given fn.

    Finds local minima of ||theta2|-pi| on a T-grid, then refines each.
    Returns (sig_out, T_out); multiple T roots per sigma are kept.
    """
    sig_out, T_out = [], []
    dT = (t_hi - t_lo) / (N_T_SCAN - 1)
    # Dedup nearby roots; scale with window so thin ovals keep both tips.
    dedup = max(0.002, 0.02 * (t_hi - t_lo))
    for k, sig in enumerate(sigmas):
        Ts = np.linspace(t_lo, t_hi, N_T_SCAN)
        errs = np.empty(N_T_SCAN)
        for i, T in enumerate(Ts):
            _, errs[i] = _theta2_err(theta2_fn, sig, T)

        # candidate local minima of the error (and endpoints if sharp)
        cands = []
        for i in range(N_T_SCAN):
            if not np.isfinite(errs[i]) or errs[i] > 0.5:
                continue
            left = errs[i - 1] if i > 0 else errs[i] + 1
            right = errs[i + 1] if i + 1 < N_T_SCAN else errs[i] + 1
            if not (np.isfinite(left) and np.isfinite(right)):
                continue
            if errs[i] <= left and errs[i] <= right:
                cands.append(float(Ts[i]))

        # refine each candidate on a tight local grid
        roots = []
        for T0 in cands:
            lo = max(t_lo, T0 - 2.5 * dT)
            hi = min(t_hi, T0 + 2.5 * dT)
            Tr = np.linspace(lo, hi, N_T_REFINE)
            best_T, best_err = T0, 1e9
            for T in Tr:
                _, err = _theta2_err(theta2_fn, sig, T)
                if np.isfinite(err) and err < best_err:
                    best_err, best_T = err, float(T)
            if best_err < 0.08:
                roots.append(best_T)

        roots = sorted(roots)
        kept = []
        for T in roots:
            if not kept or abs(T - kept[-1]) > dedup:
                kept.append(T)
        for T in kept:
            sig_out.append(float(sig))
            T_out.append(T)
        if (k + 1) % 20 == 0:
            print('  %s sigma %d/%d (%d roots so far)'
                  % (label, k + 1, len(sigmas), len(T_out)))
    return np.array(sig_out), np.array(T_out)


def window(sig, idx, lo, hi):
    m = (idx >= lo) & (idx <= hi)
    return sig[m], idx[m]


def main(basename=DEFAULT_BASENAME, t_lo=DEFAULT_T_LO, t_hi=DEFAULT_T_HI,
         plot_only=False):
    cache_path = os.path.join(os.path.dirname(__file__), 'figures',
                              basename + '_folded.npz')

    zx, zidx = read_points_csv(ZEROS_CSV)
    ps_eq_s, ps_eq_t = window(*read_points_csv(PS_EQ_CSV), t_lo, t_hi)
    ak_eq_s, ak_eq_t = window(*read_points_csv(AK_EQ_CSV), t_lo, t_hi)
    r_eq_s, r_eq_t = window(*read_points_csv(R_EQ_CSV), t_lo, t_hi)
    ps_th_s, ps_th_t = window(*read_points_csv(PS_TH_CSV), t_lo, t_hi)

    if plot_only and os.path.isfile(cache_path):
        data = np.load(cache_path)
        ak_th_s, ak_th_t = data['ak_s'], data['ak_t']
        r2_th_s, r2_th_t = data['r2_s'], data['r2_t']
        print('loaded folded loci from', cache_path)
    else:
        sigmas = np.linspace(0.02, 0.98, N_SIGMA_FOLD)

        print('computing AK folded-leg locus (%d sigmas)...' % N_SIGMA_FOLD)
        ak_th_s, ak_th_t = compute_folded_locus(
            theta2_ak, sigmas, t_lo, t_hi, label='AK')
        print('  AK folded: %d hits, T in [%.5f, %.5f]'
              % (len(ak_th_t),
                 ak_th_t.min() if len(ak_th_t) else float('nan'),
                 ak_th_t.max() if len(ak_th_t) else float('nan')))

        print('computing R/2 folded-leg locus (%d sigmas)...' % N_SIGMA_FOLD)
        r2_th_s, r2_th_t = compute_folded_locus(
            theta2_r2, sigmas, t_lo, t_hi, label='R/2')
        print('  R/2 folded: %d hits, T in [%.5f, %.5f]'
              % (len(r2_th_t),
                 r2_th_t.min() if len(r2_th_t) else float('nan'),
                 r2_th_t.max() if len(r2_th_t) else float('nan')))

        os.makedirs(os.path.dirname(cache_path), exist_ok=True)
        np.savez(cache_path, ak_s=ak_th_s, ak_t=ak_th_t,
                 r2_s=r2_th_s, r2_t=r2_th_t)
        print('wrote', cache_path)

    # Tall aspect so LaTeX can fill ~full page height within \textwidth.
    fig, axes = plt.subplots(1, 2, figsize=(7.2, 9.8), sharey=True)

    # ---- left: equal legs -------------------------------------------------
    ax = axes[0]
    ax.axvline(0.5, color=BLUE, lw=1.8, zorder=2)
    ax.plot(ps_eq_s, ps_eq_t, '.', color=BLUE, ms=2.2, rasterized=True,
            zorder=3, label=r'PS: $B_1=\Sigma_1+R_{1ps}$')
    ax.plot(ak_eq_s, ak_eq_t, '.', color=GREEN, ms=2.2, rasterized=True,
            zorder=4, label=r'AK: $B_1=\Sigma_1+R_{1ak}$')
    ax.plot(r_eq_s, r_eq_t, '.', color=PURPLE, ms=2.2, rasterized=True,
            zorder=5, label=r'$R/2$: $B_1=\Sigma_1+(R_{1ak}+R_{2ak})/2$')
    zsel = (zidx >= t_lo) & (zidx <= t_hi)
    ax.plot(zx[zsel], zidx[zsel], 'o', color=ZEROCOLOR, ms=5.5,
            mec='white', mew=0.4, zorder=6, label=r'zeta zeros')
    ax.set_title(r'Equal legs ($L_1=L_2$)', fontsize=12)
    ax.set_xlabel(r'$\sigma$')
    ax.set_ylabel(r'index $T$')
    ax.legend(loc='lower left', fontsize=8.5, framealpha=0.92, markerscale=2.0)

    # ---- right: folded legs ----------------------------------------------
    ax = axes[1]
    ax.axvline(0.5, color=BLUE, lw=1.8, zorder=2)
    ax.plot(ps_th_s, ps_th_t, '.', color=RED, ms=3.0, rasterized=True,
            zorder=3, label=r'PS: $\vartheta_2=\pi$')
    # R/2 under AK: the two loci nearly coincide in this window, so draw
    # hollow purple R/2 first and filled orange on top so AK stays visible.
    ax.plot(r2_th_s, r2_th_t, 'o', ms=3.0,
            mfc='none', mec=PURPLE, mew=0.9,
            rasterized=True, zorder=4, label=r'$R/2$: $\vartheta_2=\pi$')
    ax.plot(ak_th_s, ak_th_t, 'o', color=ORANGE, ms=3.0,
            mec='white', mew=0.2, zorder=5, label=r'AK: $\vartheta_2=\pi$')
    ax.plot(zx[zsel], zidx[zsel], 'o', color=ZEROCOLOR, ms=5.5,
            mec='white', mew=0.4, zorder=6, label=r'zeta zeros')
    ax.set_title(r'Folded legs ($\vartheta_2=\pi$)', fontsize=12)
    ax.set_xlabel(r'$\sigma$')
    ax.legend(loc='upper left', fontsize=8.5, framealpha=0.92, markerscale=2.0)

    span = t_hi - t_lo
    # Finer T ticks for the thin oval window; coarser for the Fig.~16 band.
    t_tick = 0.01 if span <= 0.08 else 0.05
    title_fmt = r'$%.3f\leq T\leq %.3f$' if span <= 0.08 else r'$%.2f\leq T\leq %.2f$'

    for ax in axes:
        ax.set_xlim(0, 1)
        ax.set_ylim(t_lo, t_hi)
        ax.set_xticks([0, 0.25, 0.5, 0.75, 1])
        ax.yaxis.set_major_locator(MultipleLocator(t_tick))
        ax.grid(True, ls=':', alpha=0.35)

    fig.suptitle(r'PS, AK and $R/2$ legs and angles, ' + title_fmt % (t_lo, t_hi),
                 fontsize=12)
    fig.tight_layout(rect=(0, 0, 1, 0.96))

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, basename + '.pdf')
    png = os.path.join(OUTDIR, basename + '.png')
    fig.savefig(pdf, dpi=300)
    fig.savefig(png, dpi=200)
    plt.close(fig)
    print('wrote', pdf)
    print('wrote', png)


def _parse_args(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    p.add_argument('--out', default=DEFAULT_BASENAME,
                   help='output basename under figures/ (default: %(default)s)')
    p.add_argument('--t-lo', type=float, default=DEFAULT_T_LO)
    p.add_argument('--t-hi', type=float, default=DEFAULT_T_HI)
    p.add_argument('--plot-only', action='store_true',
                   help='reuse cached folded loci if present')
    return p.parse_args(argv)


if __name__ == '__main__':
    args = _parse_args()
    main(basename=args.out, t_lo=args.t_lo, t_hi=args.t_hi,
         plot_only=args.plot_only)
