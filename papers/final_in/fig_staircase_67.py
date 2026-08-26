#!/usr/bin/env python3
"""Small figure for §12.4: the staircase N(I(T)) over one unit of the index."""

from __future__ import annotations

import math
import os
import shutil

import matplotlib.pyplot as plt
import mpmath as mp
import numpy as np
from matplotlib.patches import ConnectionPatch, Rectangle

mp.mp.dps = 30

OUTDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "figures")
BASENAME = "fig_staircase_67"

BLUE, GREEN, NEON = "#1f77b4", "#2ca02c", "#ff2020"

WINDOW = (6.0, 7.0)
ZOOM = (6.4, 6.6)


def I_of_T(T: float) -> float:
    return math.pi * (2.0 * T + 1.0) / math.log1p(1.0 / T)


def T_of_I(t: float) -> float:
    """Invert the (increasing) index map by bisection."""
    lo, hi = 1e-9, 1.0
    while I_of_T(hi) < t:
        hi *= 2.0
    for _ in range(200):
        mid = 0.5 * (lo + hi)
        if I_of_T(mid) < t:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)


def smooth_theta(t: float) -> float:
    """(121) with S dropped."""
    return float(mp.siegeltheta(t)) / math.pi + 1.0


def main() -> None:
    t_lo, t_hi = (I_of_T(x) for x in WINDOW)

    gammas = []
    k = 1
    while True:
        g = float(mp.zetazero(k).imag)
        if g > t_hi:
            break
        gammas.append(g)
        k += 1
    gammas = np.array(gammas)
    lo, hi = np.searchsorted(gammas, [t_lo, t_hi])
    print(f"T in [{WINDOW[0]},{WINDOW[1]}] -> t in [{t_lo:.2f},{t_hi:.2f}],"
          f" ordinates {lo + 1}..{hi} ({hi - lo} of them)")

    T = np.linspace(*WINDOW, 6000)
    t = np.array([I_of_T(x) for x in T])
    N = np.searchsorted(gammas, t, side="right").astype(float)
    s = np.array([smooth_theta(v) for v in t])
    print(f"N runs {N[0]:.0f} to {N[-1]:.0f}; S in"
          f" [{(N - s).min():+.3f}, {(N - s).max():+.3f}]")

    Tz = np.linspace(*ZOOM, 4000)
    tz = np.array([I_of_T(x) for x in Tz])
    Nz = np.searchsorted(gammas, tz, side="right").astype(float)
    sz = np.array([smooth_theta(v) for v in tz])
    zlo, zhi = np.searchsorted(gammas, [tz[0], tz[-1]])

    fig, ((ax, axz), (axs, axsz)) = plt.subplots(
        2, 2, figsize=(7.2, 3.7), sharex="col",
        gridspec_kw={"height_ratios": [2.1, 1.0]})

    ax.step(T, N, where="post", color=BLUE, lw=0.9, label=r"$N(I(T))$")
    ax.plot(T, s, color="k", lw=1.0, label=r"$\theta(t)/\pi+1$")
    ax.set_ylabel(r"zeros with ordinate in $(0,\,t\,]$", fontsize=8)
    ax.legend(loc="upper left", fontsize=8, framealpha=0.92)

    axz.step(Tz, Nz, where="post", color=BLUE, lw=1.1)
    axz.plot(Tz, sz, color="k", lw=1.1)
    axz.plot([T_of_I(g) for g in gammas[zlo:zhi]], np.arange(zlo, zhi) + 1.0,
             linestyle="none", marker="o", ms=3.4, mfc=NEON, mec=NEON,
             zorder=5, label="ordinates")
    axz.legend(loc="upper left", fontsize=8, framealpha=0.92)
    axz.set_title(rf"zoom: ${ZOOM[0]}\leq T\leq{ZOOM[1]}$"
                  rf"  (${zhi - zlo}$ zeros)", fontsize=8)
    print(f"  zoom {ZOOM}: {zhi - zlo} zeros, counts {zlo + 1}..{zhi}")

    for a, x, y in ((axs, T, N - s), (axsz, Tz, Nz - sz)):
        a.axhline(0.0, color="k", lw=0.7, alpha=0.6)
        a.plot(x, y, color=GREEN, lw=0.9)
        a.set_ylim(-1.4, 1.4)
        a.set_yticks([-1, 0, 1])
        a.set_xlabel(r"$T$")

    # The ordinates, marked on the axis: each one lifts S by a unit.
    Tg = [T_of_I(g) for g in gammas[zlo:zhi]]
    axsz.plot(Tg, np.zeros(len(Tg)), linestyle="none", marker="o", ms=3.4,
              mfc=NEON, mec=NEON, zorder=5)
    axs.set_ylabel(r"$S(t)$", fontsize=8)

    # The zoom window drawn on the left panels, with leaders to the right ones.
    zy0, zy1 = axz.get_ylim()
    ax.add_patch(Rectangle((ZOOM[0], zy0), ZOOM[1] - ZOOM[0], zy1 - zy0,
                           fill=False, ec="0.35", lw=0.8, zorder=6))
    axs.add_patch(Rectangle((ZOOM[0], -1.28), ZOOM[1] - ZOOM[0], 2.56,
                            fill=False, ec="0.35", lw=0.8, zorder=6))
    for corner, frac in ((zy1, 1.0), (zy0, 0.0)):
        fig.add_artist(ConnectionPatch(
            xyA=(ZOOM[1], corner), coordsA=ax.transData,
            xyB=(0.0, frac), coordsB=axz.transAxes,
            color="0.45", lw=0.7, ls=(0, (3, 2))))

    for a in (ax, axz, axs, axsz):
        a.tick_params(labelsize=8)
        a.grid(True, ls=":", alpha=0.4)
    for a in (ax, axs):
        a.set_xlim(*WINDOW)
        a.set_xticks(np.arange(6.0, 7.01, 0.2))
    for a in (axz, axsz):
        a.set_xlim(*ZOOM)
        a.set_xticks(np.arange(6.4, 6.61, 0.05))

    fig.subplots_adjust(left=0.105, right=0.985, top=0.93, bottom=0.13,
                        wspace=0.20, hspace=0.12)

    os.makedirs(OUTDIR, exist_ok=True)
    for ext in ("pdf", "png"):
        tmp = os.path.join("/tmp", f"{BASENAME}.{ext}")
        fig.savefig(tmp, dpi=200 if ext == "png" else None)
        shutil.copyfile(tmp, os.path.join(OUTDIR, f"{BASENAME}.{ext}"))
        print("wrote", os.path.join(OUTDIR, f"{BASENAME}.{ext}"))
    plt.close(fig)


if __name__ == "__main__":
    main()
