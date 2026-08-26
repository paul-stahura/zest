#!/usr/bin/env python3
"""The two fold angles compared: theta_2 of the ps split against theta_2* of
the velocity split, over the window 5.9 <= T <= 6.7 at sigma = 1/2.

theta_2 stalls at pi and runs retrograde on five stretches (shaded), one per
retrograde ordinate, and on each N_ps is off by one.  theta_2* has no
retrograde stretch anywhere: it passes pi prograde at every ordinate, which
is why N* is never off the count.

Reuses the cached theta_2 samples of fig_count_theta2_ovals where available.

Run:  python3 fig_theta2_star_compare.py
"""

from __future__ import annotations

import math
import os
import shutil

import matplotlib.pyplot as plt
import mpmath as mp
import numpy as np

from check_counting_curve import bisector, offset
from fig_counting_index import I_of_T, T_of_I

mp.mp.dps = 12

HERE = os.path.dirname(os.path.abspath(__file__))
OUTDIR = os.path.join(HERE, "figures")
BASENAME = "fig_theta2_star_compare"
CACHE_PATH = os.path.join(OUTDIR, BASENAME + "_data.npz")
PS_CACHE = os.path.join(OUTDIR, "fig_count_theta2_ovals_data.npz")

WINDOW = (5.9, 6.7)
NPTS = 4200

NEON = "#ff2020"
GREEN = "#2ca02c"
PURPLE = "#7f2fbf"
SHADE = "#ffd9b3"


def ordinate_list(window):
    """(n, T, retrograde?) for the ordinates inside a window of the index."""
    out = []
    t_lo, t_hi = I_of_T(window[0]), I_of_T(window[1])
    n = 1
    while float(mp.zetazero(n).imag) < float(t_lo):
        n += 1
    while True:
        t = float(mp.zetazero(n).imag)
        if t > float(t_hi):
            return out
        back = float(offset(t, "ps")) * float(offset(t, "star")) < 0
        out.append((n, T_of_I(t), back))
        n += 1


def broken(y, gap):
    """Blank the sample before each branch wrap so no vertical line is drawn."""
    y = np.asarray(y, dtype=float).copy()
    y[:-1][np.abs(np.diff(y)) > gap] = np.nan
    return y


def theta2_raw(T, which):
    """arg of the folded leg against leg 1 for a split, un-reduced."""
    t = I_of_T(T)
    B1 = bisector(t, which)
    return float(mp.arg((mp.zeta(mp.mpc(0.5, t)) - B1) / B1))


def retro_intervals(T, raw):
    """The T-intervals where the unwrapped fold angle increases (retrograde)."""
    dth = np.gradient(np.unwrap(raw), T)
    retro = dth > 0
    out, start = [], None
    for i in range(T.size):
        if retro[i] and start is None:
            start = T[i]
        if not retro[i] and start is not None:
            out.append((start, T[i]))
            start = None
    if start is not None:
        out.append((start, T[-1]))
    return out


def load_or_compute():
    if os.path.isfile(CACHE_PATH):
        data = np.load(CACHE_PATH, allow_pickle=False)
        gam = list(zip(data["gam_n"].astype(int), data["gam_T"],
                       data["gam_back"].astype(bool)))
        print(f"loaded cache {CACHE_PATH}")
        return data["T"], data["raw_ps"], data["raw_star"], gam

    if os.path.isfile(PS_CACHE):
        ps = np.load(PS_CACHE, allow_pickle=False)
        T, raw_ps = ps["T_th_w"], ps["raw_w"]
        gam = list(zip(ps["gam_n"].astype(int), ps["gam_T"],
                       ps["gam_back"].astype(bool)))
        print(f"reusing theta_2(ps) from {PS_CACHE}")
    else:
        T = np.linspace(*WINDOW, NPTS)
        print("computing theta_2 (ps) ...")
        raw_ps = np.array([theta2_raw(x, "ps") for x in T])
        gam = ordinate_list(WINDOW)
    print("computing theta_2* (velocity split) ...")
    raw_star = np.array([theta2_raw(x, "star") for x in T])
    os.makedirs(OUTDIR, exist_ok=True)
    np.savez(CACHE_PATH, T=T, raw_ps=raw_ps, raw_star=raw_star,
             gam_n=np.array([n for n, _, _ in gam]),
             gam_T=np.array([x for _, x, _ in gam]),
             gam_back=np.array([b for _, _, b in gam]))
    print("wrote", CACHE_PATH)
    return T, raw_ps, raw_star, gam


def main() -> None:
    T, raw_ps, raw_star, gam = load_or_compute()

    iv_ps = retro_intervals(T, raw_ps)
    iv_star = retro_intervals(T, raw_star)
    print(f"retrograde stretches of theta_2 (ps): {len(iv_ps)}")
    for a, b in iv_ps:
        inside = [n for n, x, _ in gam if a <= x <= b]
        print(f"  [{a:.4f}, {b:.4f}]  width {b - a:.4f}  ordinates {inside}")
    print(f"retrograde stretches of theta_2*: {len(iv_star)}")
    for a, b in iv_star:
        print(f"  [{a:.4f}, {b:.4f}]")

    fig, ax = plt.subplots(figsize=(11.0, 3.6))
    for a, b in iv_ps:
        ax.axvspan(a, b, color=SHADE, alpha=0.9, lw=0, zorder=0)
    ax.plot(T, broken(np.mod(raw_ps, 2 * math.pi), math.pi),
            color=PURPLE, lw=1.1, zorder=3,
            label=r"$\vartheta_2$ ($ps$ split)")
    ax.plot(T, broken(np.mod(raw_star, 2 * math.pi), math.pi),
            color=GREEN, lw=1.6, zorder=2,
            label=r"$\vartheta_2^{\ast}$ (velocity split)")
    ax.axhline(math.pi, color="k", lw=0.8, ls="--", zorder=1)
    for n, x, b in gam:
        ax.plot(x, math.pi, "o", ms=8.0, mfc=NEON if b else "w",
                mec="k", mew=0.6, zorder=5)
    handles, labels = ax.get_legend_handles_labels()
    handles.append(plt.Rectangle((0, 0), 1, 1, fc=SHADE, ec="none"))
    labels.append(r"$\vartheta_2$ retrograde ($N_{ps}$ off by one)")
    handles.append(plt.Line2D([], [], linestyle="none", marker="o", ms=7,
                              mfc=NEON, mec="k", mew=0.6))
    labels.append("retrograde ordinate")
    ax.legend(handles, labels, loc="upper right", fontsize=11,
              framealpha=0.95, ncol=2, columnspacing=1.2, handlelength=1.6)
    ax.set_xlim(*WINDOW)
    ax.set_ylim(0, 2 * math.pi)
    ax.set_yticks([0, math.pi, 2 * math.pi])
    ax.set_yticklabels(["$0$", r"$\pi$", r"$2\pi$"])
    ax.set_xlabel(r"$T$")
    ax.set_ylabel("fold angle", fontsize=9)
    ax.grid(True, ls=":", alpha=0.4)
    ax.set_title(rf"$\sigma=1/2$, ${WINDOW[0]}\leq T\leq{WINDOW[1]}$:"
                 r" $\vartheta_2$ retrogrades at five ordinates,"
                 r" $\vartheta_2^{\ast}$ never does", fontsize=13)

    fig.tight_layout()
    os.makedirs(OUTDIR, exist_ok=True)
    for ext in ("pdf", "png"):
        tmp = os.path.join("/tmp", f"{BASENAME}.{ext}")
        fig.savefig(tmp, dpi=190 if ext == "png" else None)
        shutil.copyfile(tmp, os.path.join(OUTDIR, f"{BASENAME}.{ext}"))
        print("wrote", os.path.join(OUTDIR, f"{BASENAME}.{ext}"))
    plt.close(fig)


if __name__ == "__main__":
    main()
