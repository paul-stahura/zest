#!/usr/bin/env python3
"""Figure for §12.4: the zero-count staircase resolved over a short index window."""

from __future__ import annotations

import os
import shutil

import matplotlib.pyplot as plt
import mpmath as mp
import numpy as np
from matplotlib.patches import ConnectionPatch

from fig1_spiral_summands import chi
from fig_counting_index import (BLUE, I_of_T, T_of_I, ordinates, smooth_rvm,
                                smooth_theta)

OUTDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "figures")
BASENAME = "fig_counting_zoom"

NEON = "#ff2020"
UPPER = (3.25, 3.75)
WINDOW = (4.65, 4.825)
WIDE = (3.0, 5.0)


def leg1_curve(T: float, sig: float = 0.5) -> float:
    """theta(I(T))/pi + theta_1(sig,T)/pi + 3/2, with theta_1 = arg B_1."""
    t = I_of_T(T)
    s = mp.mpc(sig, t)
    m = int(mp.floor(T))
    w = t * mp.log(m + 1)
    ch = chi(s)
    psi = mp.arg(ch)
    S1 = mp.fsum(mp.mpf(n) ** (-s) for n in range(1, m + 1))
    S2 = ch * mp.fsum(mp.mpf(n) ** (s - 1) for n in range(1, m + 1))
    R = mp.zeta(s) - S1 - S2
    u1, u2 = mp.exp(-1j * w), mp.exp(1j * (w + psi))
    a, b, c, d = mp.re(u1), mp.re(u2), mp.im(u1), mp.im(u2)
    d1 = (mp.re(R) * d - b * mp.im(R)) / (a * d - b * c)
    B1 = S1 + d1 * u1
    return float(mp.siegeltheta(t) / mp.pi + mp.arg(B1) / mp.pi + mp.mpf(3) / 2)


def theta_prime(t):
    """theta'(t) = Re psi(1/4 + it/2)/2 - log(pi)/2."""
    return mp.re(mp.digamma(mp.mpf(1) / 4 + 1j * t / 2)) / 2 - mp.log(mp.pi) / 2


def star_curve(T: float) -> float:
    """The same formula for the velocity bisector point B_1* = zeta + zeta'/(2 theta').

    Rotated, that point is Z/2 - i Z'/(2 theta'), whose transverse offset
    alternates in sign at consecutive ordinates, so the angle never retrogrades.
    """
    t = I_of_T(T)
    th = mp.siegeltheta(t)
    w = mp.siegelz(t) / 2 - 1j * mp.siegelz(t, derivative=1) / (2 * theta_prime(t))
    return float(th / mp.pi + mp.arg(w * mp.exp(-1j * th)) / mp.pi + mp.mpf(3) / 2)


def panel(ax, window, gammas, n_curve, marker_size, label=False):
    """Staircase, N_rvm and N_ps over one index window."""
    T = np.linspace(*window, 2000)
    t = np.array([I_of_T(x) for x in T])
    N = np.searchsorted(gammas, t, side="right")
    lo, hi = np.searchsorted(gammas, [t[0], t[-1]])

    ax.step(T, N, where="post", color=BLUE, lw=1.4,
            label=r"$N(I(T))$, exact staircase" if label else None)
    ax.plot(T, [smooth_rvm(v) for v in t], color="k", lw=1.1, ls="--",
            label=r"$N_{\mathrm{rvm}}$, the smooth part of (123)" if label else None)

    Tc = np.linspace(*window, n_curve)
    C = np.array([leg1_curve(x) for x in Tc])
    C[:-1][np.abs(np.diff(C)) > 1.0] = np.nan  # break the branch wraps of theta_1
    ax.plot(Tc, C, color="0.5", lw=0.9, ls=(0, (1, 1.6)), zorder=3,
            label=r"$N_{\mathrm{ps}}$, built from $\vartheta_1$" if label else None)

    S = np.array([star_curve(x) for x in Tc])
    S[:-1][np.abs(np.diff(S)) > 1.0] = np.nan
    ax.plot(Tc, S, color=NEON, lw=1.6, zorder=4,
            label=r"$N_{\ast}=\frac{1}{\pi}\theta(I(T))"
                  r"+\frac{1}{\pi}\vartheta_1^{\ast}(T)+\frac{3}{2}$"
                  if label else None)

    Tg = [T_of_I(g) for g in gammas[lo:hi]]
    ax.plot(Tg, np.arange(lo, hi) + 1.0, linestyle="none", marker="o",
            ms=marker_size, mfc=BLUE, mec="k", mew=0.7, zorder=5,
            label=r"ordinates, at $T=I^{-1}(\gamma)$" if label else None)

    ax.set_xlim(*window)
    ax.set_ylim(min(N.min() - 0.6, np.nanmin(C) - 0.2, np.nanmin(S) - 0.2),
                max(N.max() + 0.9, np.nanmax(C) + 0.2, np.nanmax(S) + 0.2))
    ax.set_xlabel(r"$T$")
    ax.grid(True, ls=":", alpha=0.4)
    return T, N, Tg, C, lo, hi


def main() -> None:
    gammas = ordinates(I_of_T(WIDE[1]) + 1.0)

    fig, (axu, ax, axw) = plt.subplots(
        3, 1, figsize=(7.2, 8.6),
        gridspec_kw={"height_ratios": [1.05, 1.25, 0.95]})

    Tu, Nu, Tgu, Cu, lou, hiu = panel(axu, UPPER, gammas, 1000, 4.0, label=True)
    print(f"T in {UPPER}: {hiu - lou} zeros, counts {lou + 1}..{hiu}")
    axu.set_ylabel(r"zeros in $(0,\,t\,]$")
    axu.set_title(rf"${UPPER[0]}\leq T\leq {UPPER[1]}$"
                  rf" (${I_of_T(UPPER[0]):.2f}\leq t\leq{I_of_T(UPPER[1]):.2f}$)")
    axu.legend(loc="upper left", fontsize=8.5, framealpha=0.92)

    T, N, Tg, C, lo, hi = panel(ax, WINDOW, gammas, 600, 6.0)
    print(f"T in {WINDOW}: {hi - lo} zeros, counts {lo + 1}..{hi}")
    for k, x in zip(range(lo + 1, hi + 1), Tg):
        ax.annotate(rf"$\gamma_{{{k}}}$", (x, k), textcoords="offset points",
                    xytext=(6, -3), fontsize=8)
    ax.set_yticks(range(int(N.min()), int(N.max()) + 1))
    ax.set_ylabel(r"zeros in $(0,\,t\,]$, $t=I(T)$")
    ax.set_title(rf"${WINDOW[0]}\leq T\leq {WINDOW[1]}$"
                 rf" (${I_of_T(WINDOW[0]):.2f}\leq t\leq{I_of_T(WINDOW[1]):.2f}$)")

    panel(axw, WIDE, gammas, 2600, 2.2)
    axw.set_ylabel(r"zeros in $(0,\,t\,]$")
    for w in (UPPER, WINDOW):
        axw.axvspan(*w, color="0.85", zorder=0)

    fig.subplots_adjust(left=0.11, right=0.97, top=0.955, bottom=0.06, hspace=0.30)

    # The leaders from the upper window pass under the middle panel, so that
    # panel is drawn last and over an opaque background.
    ax.set_zorder(10)
    ax.set_facecolor("white")
    ax.patch.set_alpha(1.0)

    ylo, yhi = axw.get_ylim()
    for src, window, zo in ((axu, UPPER, 1), (ax, WINDOW, 11)):
        for corner, x in ((0.0, window[0]), (1.0, window[1])):
            axw.plot([x, x], [ylo, yhi], color="0.45", lw=0.8, zorder=1)
            fig.add_artist(ConnectionPatch(
                xyA=(corner, 0.0), coordsA=src.transAxes,
                xyB=(x, yhi), coordsB=axw.transData,
                color="0.45", lw=0.8, ls=(0, (4, 3)), zorder=zo))

    os.makedirs(OUTDIR, exist_ok=True)
    for ext in ("pdf", "png"):
        tmp = os.path.join("/tmp", f"{BASENAME}.{ext}")
        fig.savefig(tmp, dpi=200 if ext == "png" else None)
        shutil.copyfile(tmp, os.path.join(OUTDIR, f"{BASENAME}.{ext}"))
        print("wrote", os.path.join(OUTDIR, f"{BASENAME}.{ext}"))
    plt.close(fig)

    gaps = np.diff(Tg)
    print(f"spacing in T: mean {gaps.mean():.4f}, min {gaps.min():.4f},"
          f" max {gaps.max():.4f}")
    off = [k - smooth_theta(I_of_T(x)) for k, x in zip(range(lo + 1, hi + 1), Tg)]
    print("S at each ordinate (right limit): "
          + ", ".join(f"{v:+.3f}" for v in off))
    for name, fn in (("N_ps", leg1_curve), ("N_*", star_curve)):
        vals = [fn(x) for x in Tg]
        dev = max(abs(v - round(v)) for v in vals)
        wrong = [k for k, v in zip(range(lo + 1, hi + 1), vals) if round(v) != k]
        print(f"{name} at the ordinates of the middle window: "
              f"max distance to an integer {dev:.1e}, wrong count at {wrong}")


if __name__ == "__main__":
    main()
