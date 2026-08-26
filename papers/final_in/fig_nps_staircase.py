#!/usr/bin/env python3
"""Figure for §12.4: the staircase, the smooth part, and N_ps together.

N(I(T)) over 5.9 <= T <= 6.7 with theta/pi + 1 and the partial-summand
counting curve N_ps of (eq:N-ps) on top of it.  N_ps tracks the staircase
except after a retrograde ordinate, where it rides a unit too high until the
next ordinate pulls it back.

Run:  python3 fig_nps_staircase.py
"""

from __future__ import annotations

import math
import os
import shutil

import matplotlib.pyplot as plt
import mpmath as mp
import numpy as np
from matplotlib.patches import ConnectionPatch, Rectangle

from check_counting_curve import bisector, count_curve, offset
from fig_counting_index import I_of_T, T_of_I

mp.mp.dps = 15

GAM = []

OUTDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "figures")
BASENAME = "fig_nps_staircase"

WINDOW = (5.9, 6.7)
ZOOM = (6.1, 6.3)
ZOOM2 = (6.125, 6.275)
YLIM = (121.0, 132.0)
NPTS = 1600

BLUE = "#1f77b4"
NEON = "#ff2020"
ORANGE = "#ff7f0e"
GREEN = "#2ca02c"
PURPLE = "#7f2fbf"


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


def curves(window, npts, base):
    """The staircase, the smooth part and N_ps sampled over a window."""
    T = np.linspace(*window, npts)
    N = base + np.searchsorted([x for _, x, _ in GAM], T, side="right")
    smooth = np.array([float(mp.siegeltheta(I_of_T(x)) / mp.pi + 1) for x in T])
    Nps = np.array([count_curve(x, "ps") for x in T])
    return T, N, smooth, Nps


def theta2(T):
    """The folding angle, reduced to [0, 2pi)."""
    t = I_of_T(T)
    B1 = bisector(t, "ps")
    th2 = mp.arg((mp.zeta(mp.mpc(0.5, t)) - B1) / B1)
    return float(mp.fmod(th2 + 2 * mp.pi, 2 * mp.pi))


def draw(ax, window, T, N, smooth, Nps, ms):
    ax.step(T, N, where="post", color=BLUE, lw=1.0, label=r"$N(I(T))$")
    ax.plot(T, smooth, color="k", lw=1.0, label=r"$\theta(t)/\pi+1$")
    ax.plot(T, broken(Nps, 1.0), color=ORANGE, lw=1.1, label=r"$N_{ps}$")
    inside = [(n, x) for n, x, _ in GAM if window[0] <= x <= window[1]]
    ax.plot([x for _, x in inside], [n for n, _ in inside], linestyle="none",
            marker="o", ms=ms, mfc=NEON, mec=NEON, zorder=5, label="ordinates")
    for n, x, b in GAM:
        if b and window[0] <= x <= window[1]:
            ax.axvline(x, color=NEON, lw=0.7, ls=(0, (3, 2)), zorder=0)
    ax.set_xlim(*window)
    ax.set_ylabel(r"zeros with ordinate in $(0,\,t\,]$", fontsize=9)
    ax.grid(True, ls=":", alpha=0.4)


def main() -> None:
    global GAM
    GAM = ordinate_list(WINDOW)
    back = [n for n, _, b in GAM if b]
    print(f"{len(GAM)} ordinates over {WINDOW}: n = {GAM[0][0]}..{GAM[-1][0]}")
    print(f"retrograde at n = {back} ({len(back)} of {len(GAM)})")

    base = GAM[0][0] - 1
    wide = curves(WINDOW, NPTS, base)
    zoom2 = curves(ZOOM2, 1200, base)
    print(f"N runs {wide[1][0]} to {wide[1][-1]};"
          f" max |N_ps - N| = {np.abs(wide[3] - wide[1]).max():.3f}")

    fig, (ax, axz2, axth) = plt.subplots(
        3, 1, figsize=(11.0, 11.3),
        gridspec_kw={"height_ratios": [1.0, 3.6, 0.62]})
    draw(ax, WINDOW, *wide, ms=4.0)
    draw(axz2, ZOOM2, *zoom2, ms=5.5)
    axz2.set_ylim(*YLIM)

    # The velocity-split curve on the magnified panel: it lands on every ordinate.
    Tz = zoom2[0]
    Nstar = np.array([count_curve(x, "star") for x in Tz])
    star, = axz2.plot(Tz, broken(Nstar, 1.0), color=GREEN, lw=2.2,
                      label=r"$N^{\ast}$")
    axz2.legend(handles=[star], loc="upper left", fontsize=9, framealpha=0.95)
    print(f"max |N* - N| over {ZOOM2} = {np.abs(Nstar - zoom2[1]).max():.3f}")

    # A thin strip of theta_2 underneath, on the same T range.
    A = np.array([theta2(x) for x in Tz])
    axth.plot(Tz, broken(A, math.pi), color=PURPLE, lw=1.0)
    axth.axhline(math.pi, color="k", lw=0.8, ls="--")
    axth.set_ylim(0, 2 * math.pi)
    axth.set_yticks([0, math.pi, 2 * math.pi])
    axth.set_yticklabels(["$0$", r"$\pi$", r"$2\pi$"])
    axth.set_ylabel(r"$\vartheta_2$", fontsize=9)
    axth.set_title(r"$\vartheta_2$, the angle between the legs,"
                   " showing retrograde ordinates", fontsize=9)
    axth.set_xlim(*ZOOM2)
    axth.set_xlabel(r"$T$")
    axth.grid(True, ls=":", alpha=0.4)
    for n, x, b in GAM:
        if ZOOM2[0] <= x <= ZOOM2[1]:
            axth.axvline(x, color=NEON if b else "0.8", lw=0.7,
                         ls=(0, (3, 2)) if b else ":", zorder=0)
        if ZOOM2[0] <= x <= ZOOM2[1]:
            axth.plot(x, math.pi, "o", ms=10.8, mfc=NEON if b else "w",
                      mec="k", mew=0.6, zorder=5)
    axz2.tick_params(labelbottom=False)

    ax.set_title(rf"$\sigma=1/2$, ${WINDOW[0]}\leq T\leq{WINDOW[1]}$"
                 rf" (${I_of_T(WINDOW[0]):.1f}\leq t\leq{I_of_T(WINDOW[1]):.1f}$,"
                 rf" {len(GAM)} ordinates)")
    nz = sum(1 for _, x, _ in GAM if ZOOM2[0] <= x <= ZOOM2[1])
    axz2.set_title(rf"${ZOOM2[0]}\leq T\leq{ZOOM2[1]}$ magnified"
                   rf" (${nz}$ ordinates)", fontsize=9)

    handles, labels = ax.get_legend_handles_labels()
    handles.append(plt.Line2D([], [], color=NEON, lw=0.9, ls=(0, (3, 2))))
    labels.append("ordinate where the crossing retrogrades")
    ax.legend(handles, labels, loc="upper left", fontsize=8.5, framealpha=0.95,
              ncol=5, columnspacing=1.2, handlelength=1.8)

    # Each magnified window boxed above, and its retrograde ordinates carried
    # down to the same ordinates in the panel below.
    for upper, lower, w in ((ax, axz2, ZOOM2),):
        ly0, ly1 = lower.get_ylim()
        upper.add_patch(Rectangle((w[0], ly0), w[1] - w[0], ly1 - ly0,
                                  fill=False, ec="0.35", lw=0.8, zorder=6))
        for n, x, b in GAM:
            if b and w[0] <= x <= w[1]:
                fig.add_artist(ConnectionPatch(
                    xyA=(x, ly0), coordsA=upper.transData,
                    xyB=(x, ly1), coordsB=lower.transData,
                    color=NEON, lw=0.7, ls=":", zorder=1))

    fig.tight_layout(h_pad=1.6)
    os.makedirs(OUTDIR, exist_ok=True)
    for ext in ("pdf", "png"):
        tmp = os.path.join("/tmp", f"{BASENAME}.{ext}")
        fig.savefig(tmp, dpi=190 if ext == "png" else None)
        shutil.copyfile(tmp, os.path.join(OUTDIR, f"{BASENAME}.{ext}"))
        print("wrote", os.path.join(OUTDIR, f"{BASENAME}.{ext}"))
    plt.close(fig)


if __name__ == "__main__":
    main()
