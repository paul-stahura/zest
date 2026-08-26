#!/usr/bin/env python3
"""
fig_d1_any_link.py
==================

hat d1(k, T) for forward links k = 0..6 over 6 < T < 7, drawn as the
Zest links tab draws the band under the strips: one panel per link, x the
fractional part of T, y the crossing fraction along that link from the
left joint, which is (k+1)^sigma d1(k, T) of §12.12.

A light horizontal at 1/2, a light vertical at the running example T = 6.18,
and a dot on each track there.

Outputs (into ./figures/):
    fig_d1_any_link.pdf
    fig_d1_any_link.png

Run:  python3 fig_d1_any_link.py
"""

import os

import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt

from fig1_spiral_summands import I_of_T, chi, OUTDIR

BASENAME = "fig_d1_any_link"
SIGMA = mp.mpf("0.5")
M = 6
LINKS = list(range(M + 1))
T_SNAP = 6.18
N_PATH = 220
YELLOW = "#e6b422"
MID = "#bbbbbb"
GUIDE = "#cccccc"
DOT = "#222222"

mp.mp.dps = 25


def sample(T):
    """R, chi, s and the two prefix walks at one T."""
    t = I_of_T(mp.mpf(T))
    s = mp.mpc(SIGMA, t)
    ch = chi(s)
    m = int(mp.floor(T))
    a2 = t / (2 * mp.pi)
    far = max(m + 1, int(mp.nint(a2)) + 2)
    fwd = [mp.mpc(0)]
    z = mp.mpc(0)
    for n in range(1, m + 1):
        z += mp.mpf(n) ** (-s)
        fwd.append(z)
    rev = [mp.mpc(0)]
    z = mp.mpc(0)
    for n in range(1, far + 1):
        z += mp.mpf(n) ** (s - 1)
        rev.append(z)
    R = mp.zeta(s) - fwd[m] - ch * rev[m]
    return s, ch, R, m, a2, fwd, rev


def named_link(k, m, a2):
    return m if k == m else int(mp.nint(a2 / (k + 1))) - 1


def Y(k, j, s, ch, R, m, fwd, rev):
    head = fwd[m] - fwd[k]
    tail = rev[j] - rev[m] if j >= m else rev[m] - rev[j]
    W = head + R - ch * tail
    return mp.power(k + 1, s) * W


def crossing_fraction(Yin, Yang):
    rise = mp.im(Yin) - mp.im(Yang)
    if rise == 0:
        return None
    u = mp.im(Yin) / rise
    if u < 0 or u > 1:
        return None
    return float(mp.re(Yin) + u * (mp.re(Yang) - mp.re(Yin)))


def hat_d1(k, s, ch, R, m, a2, fwd, rev, near):
    named = named_link(k, m, a2)
    cands = [named] if k == m else [named, named + 1, named - 1]
    best, best_gap = None, None
    for j in cands:
        if j < 0 or j + 1 >= len(rev):
            continue
        lam = crossing_fraction(Y(k, j, s, ch, R, m, fwd, rev), Y(k, j + 1, s, ch, R, m, fwd, rev))
        if lam is None:
            continue
        gap = abs(lam - near)
        if best is None or gap < best_gap:
            best, best_gap = lam, gap
    return best


def main():
    eps = 1e-4
    Ts = np.linspace(M + eps, M + 1 - eps, N_PATH)
    tracks = {k: [] for k in LINKS}
    near = {k: 0.5 for k in LINKS}
    snap = {}

    for T in Ts:
        s, ch, R, m, a2, fwd, rev = sample(T)
        for k in LINKS:
            lam = hat_d1(k, s, ch, R, m, a2, fwd, rev, near[k])
            tracks[k].append(lam)
            if lam is not None:
                near[k] = lam

    s, ch, R, m, a2, fwd, rev = sample(T_SNAP)
    for k in LINKS:
        snap[k] = hat_d1(k, s, ch, R, m, a2, fwd, rev, near[k])

    frac = Ts - M
    snap_x = T_SNAP - M

    fig, axes = plt.subplots(1, len(LINKS), figsize=(11.2, 2.6), sharey=True)
    for k, ax in zip(LINKS, axes):
        y = np.array([np.nan if v is None else v for v in tracks[k]], dtype=float)
        ax.axhline(0.5, color=MID, lw=0.8, zorder=1)
        ax.axvline(snap_x, color=GUIDE, lw=0.9, zorder=1)
        ax.plot(frac, y, color=YELLOW, lw=1.4, zorder=2)
        if snap[k] is not None:
            ax.plot(snap_x, snap[k], "o", color=DOT, ms=4.5, zorder=3)
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.set_xticks([0, 0.5, 1])
        ax.set_xticklabels(["0", "", "1"], fontsize=7)
        ax.set_title(str(k) if k < M else r"$6$ (bisector)", fontsize=8, pad=3)
        ax.tick_params(length=2, labelsize=7)
        ax.set_aspect("auto")
        for spine in ax.spines.values():
            spine.set_linewidth(0.5)
            spine.set_color("#888888")

    axes[0].set_yticks([0, 0.5, 1])
    axes[0].set_yticklabels(["0", r"$1/2$", "1"], fontsize=7)
    axes[0].set_ylabel(r"$\hat d_1(k,T)$", fontsize=9)
    fig.supxlabel(r"$\{T\}$, \quad $6<T<7$", fontsize=9, y=0.02)
    fig.suptitle(
        r"$\hat d_1(k,T)$ for links $k=0,\dots,6$  ($\sigma=1/2$; dot at $T=6.18$)",
        fontsize=11,
        y=1.02,
    )
    fig.tight_layout(w_pad=0.25)

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + ".pdf")
    png = os.path.join(OUTDIR, BASENAME + ".png")
    fig.savefig(pdf, bbox_inches="tight")
    fig.savefig(png, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print("T=6.18:")
    for k in LINKS:
        print("  k=%d  hat d1 = %s" % (k, snap[k]))
    print("wrote", pdf)
    print("wrote", png)


if __name__ == "__main__":
    main()
