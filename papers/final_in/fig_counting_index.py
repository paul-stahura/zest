#!/usr/bin/env python3
"""Full-page figure for §12.4: (121) and (123) in the index coordinate t=I(T)."""

from __future__ import annotations

import math
import os
import shutil

import matplotlib.pyplot as plt
import mpmath as mp
import numpy as np

mp.mp.dps = 40

OUTDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "figures")
BASENAME = "fig_counting_index"

BLUE, GREEN, RED = "#1f77b4", "#2ca02c", "#d62728"

T_MAX = 8.0
ZOOM = (1.75, 2.45)
ZOOM2 = (4.65, 4.825)


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
    """(121) with S dropped: theta(t)/pi + 1."""
    return float(mp.siegeltheta(t)) / math.pi + 1.0


def smooth_rvm(t: float, nterms: int = 2) -> float:
    """(123) with S dropped: two Stirling corrections kept."""
    v = (t / (2 * math.pi)) * math.log(t / (2 * math.pi)) - t / (2 * math.pi) + 7.0 / 8.0
    for j, c in enumerate((1.0 / 48, 7.0 / 5760)[:nterms]):
        v += c / (math.pi * t ** (2 * j + 1))
    return v


def stirling_gap(t: float, nterms: int = 2) -> float:
    """The two smooth parts differ far below double precision, so subtract in mp."""
    tt = mp.mpf(t)
    a = mp.siegeltheta(tt) / mp.pi + 1
    b = (tt / (2 * mp.pi)) * mp.log(tt / (2 * mp.pi)) - tt / (2 * mp.pi) + mp.mpf(7) / 8
    for j, c in enumerate((mp.mpf(1) / 48, mp.mpf(7) / 5760)[:nterms]):
        b += c / (mp.pi * tt ** (2 * j + 1))
    return float(abs(a - b))


def ordinates(t_max: float) -> np.ndarray:
    out = []
    k = 1
    while True:
        g = float(mp.zetazero(k).imag)
        if g > t_max:
            return np.array(out)
        out.append(g)
        k += 1


def main() -> None:
    t_max = I_of_T(T_MAX)
    gammas = ordinates(t_max)
    print(f"T in (0,{T_MAX}] -> t in (0,{t_max:.2f}], {len(gammas)} ordinates")

    T = np.linspace(0.02, T_MAX, 3000)
    t = np.array([I_of_T(x) for x in T])
    s_theta = np.array([smooth_theta(v) for v in t])
    s_rvm = np.array([smooth_rvm(v) for v in t])
    N = np.searchsorted(gammas, t, side="right").astype(float)
    S = N - s_theta

    fig, (ax, axs, axd) = plt.subplots(
        3, 1, figsize=(7.6, 7.0), sharex=True,
        gridspec_kw={"height_ratios": [3.4, 1.05, 0.85], "hspace": 0.10})

    ax.step(T, N, where="post", color=BLUE, lw=1.0,
            label=r"$N(I(T))$, exact staircase")
    ax.plot(T, s_theta, color="k", lw=1.4,
            label=r"(121) less $S$:  $\theta(t)/\pi+1$")
    ax.plot(T, s_rvm, color=RED, lw=1.0, ls="--",
            label=r"(123) less $S$:  Riemann-von Mangoldt")
    ax.set_ylabel(r"zeros with ordinate in $(0,\,t\,]$, $t=I(T)$")
    ax.set_title(r"The zero count in the index coordinate $t=I(T)$")
    ax.legend(loc="lower right", fontsize=9, framealpha=0.92)
    ax.set_ylim(bottom=0)
    ax.grid(True, ls=":", alpha=0.4)

    # Both flush left and clear of the staircase, which hugs the axis until T~6.
    def zoom_inset(rect, window, xticks):
        axz = ax.inset_axes(rect)
        Tw = np.linspace(*window, 1200)
        tw = np.array([I_of_T(x) for x in Tw])
        axz.step(Tw, np.searchsorted(gammas, tw, side="right"), where="post",
                 color=BLUE, lw=1.0)
        axz.plot(Tw, [smooth_theta(v) for v in tw], color="k", lw=1.2)
        axz.plot(Tw, [smooth_rvm(v) for v in tw], color=RED, lw=1.0, ls="--")
        lo, hi = np.searchsorted(gammas, [tw[0], tw[-1]])
        axz.plot([T_of_I(g) for g in gammas[lo:hi]], np.arange(lo, hi) + 1.0,
                 linestyle="none", marker="o", ms=3.0, mfc=BLUE, mec="k",
                 mew=0.4, zorder=5)
        axz.set_title(rf"zoom: ${window[0]}\leq T\leq {window[1]}$"
                      rf"  (${hi - lo}$ zeros)", fontsize=8)
        print(f"  zoom {window}: {hi - lo} zeros, counts {lo + 1}..{hi}")
        axz.tick_params(labelsize=7)
        axz.set_xticks(xticks)
        axz.grid(True, ls=":", alpha=0.4)
        return Tw, tw

    Tz, tz = zoom_inset([0.055, 0.60, 0.40, 0.31], ZOOM,
                        [1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4])
    zoom_inset([0.055, 0.15, 0.40, 0.30], ZOOM2, [4.65, 4.70, 4.75, 4.80])

    axs.axhline(0.0, color="k", lw=0.8, alpha=0.6)
    axs.plot(T, S, color=GREEN, lw=0.8)
    axs.set_ylabel(r"$S(t)$")
    axs.set_ylim(-1.2, 1.2)
    axs.grid(True, ls=":", alpha=0.4)

    axins = axs.inset_axes([0.55, 0.60, 0.42, 0.30])
    axins.axhline(0.0, color="k", lw=0.6, alpha=0.6)
    axins.plot(Tz, np.searchsorted(gammas, tz, side="right")
               - np.array([smooth_theta(v) for v in tz]), color=GREEN, lw=1.0)
    axins.tick_params(labelsize=6)
    axins.set_xticks([1.8, 2.0, 2.2, 2.4])
    axins.set_yticks([-1, 0, 1])
    axins.set_ylim(-1.1, 1.1)
    axins.grid(True, ls=":", alpha=0.4)

    d = np.array([stirling_gap(v) for v in t])
    axd.semilogy(T, d, color=RED, lw=1.2)
    axd.set_ylabel("Stirling truncation:\n" + r"(121) less (123)")
    axd.set_xlabel(r"$T$")
    axd.set_xlim(0, T_MAX)
    axd.set_xticks(range(0, int(T_MAX) + 1))
    axd.grid(True, ls=":", alpha=0.4, which="both")

    fig.subplots_adjust(left=0.13, right=0.97, top=0.96, bottom=0.08, hspace=0.10)

    os.makedirs(OUTDIR, exist_ok=True)
    for ext in ("pdf", "png"):
        tmp = os.path.join("/tmp", f"{BASENAME}.{ext}")
        fig.savefig(tmp, dpi=200 if ext == "png" else None)
        shutil.copyfile(tmp, os.path.join(OUTDIR, f"{BASENAME}.{ext}"))
        print("wrote", os.path.join(OUTDIR, f"{BASENAME}.{ext}"))
    plt.close(fig)

    m = T >= 1.0
    print(f"max |(121)-(123)| overall {d.max():.2e} at T={T[d.argmax()]:.2f};"
          f" for T>=1 it is {d[m].max():.2e}")
    print(f"S in [{S.min():+.4f}, {S.max():+.4f}]")
    for a, b in ((1, 2), (2, 3), (4, 5), (7, 8)):
        print(f"  T {a}->{b}: smooth count gain"
              f" {smooth_theta(I_of_T(b)) - smooth_theta(I_of_T(a)):7.2f}")


if __name__ == "__main__":
    main()
