#!/usr/bin/env python3
"""Opening figure for §12.4: the three angles that count zeros.

Top:    theta_2 = arg((zeta - B_1)/B_1) reduced to [0, 2pi), whose passages
        through pi are the ordinates.
Middle: theta_1 = arg B_1, the leg-1 angle of the partial-summand split.
Bottom: theta_1* = arg B_1*, the leg-1 angle of the velocity split.

theta_2 falls at the rate -2 theta', 54 turns over 6 <= T <= 7, crossing pi
once per ordinate.  The two leg-1 angles instead stay of order one: B_1 and
B_1* carry exp(-i theta) against a rotation of +theta in the rotated frame and
the two cancel.  theta_1 nonetheless wraps once at every retrograde ordinate,
five times here, while theta_1* never wraps.  The right column magnifies a
short sub-window so those events are legible.

Run:  python3 fig_theta_angles.py
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

mp.mp.dps = 15

OUTDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "figures")
BASENAME = "fig_theta_angles"

WIDE = (6.4, 6.6)
NPTS_WIDE = 2000

BLUE = "#1f77b4"
NEON = "#ff2020"
PURPLE = "#7f2fbf"


def angles(T):
    """theta_2, theta_1 and theta_1* at sigma = 1/2."""
    t = I_of_T(T)
    B1, Bs = bisector(t, "ps"), bisector(t, "star")
    th2 = mp.arg((mp.zeta(mp.mpc(0.5, t)) - B1) / B1)
    return (float(mp.fmod(th2 + 2 * mp.pi, 2 * mp.pi)),
            float(mp.arg(B1)), float(mp.arg(Bs)))


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


def draw(axes, window, npts, gam, label):
    T = np.linspace(*window, npts)
    A = np.array([angles(x) for x in T])
    ax2, ax1, axs = axes

    ax2.plot(T, broken(A[:, 0], math.pi), color=PURPLE, lw=1.0)
    ax2.axhline(math.pi, color="k", lw=0.9, ls="--")
    ax2.set_ylim(0, 2 * math.pi)
    ax2.set_yticks([0, math.pi / 2, math.pi, 3 * math.pi / 2, 2 * math.pi])
    ax2.set_yticklabels(["$0$", r"$\pi/2$", r"$\pi$", r"$3\pi/2$", r"$2\pi$"])
    ax2.set_ylabel(r"$\vartheta_2$ mod $2\pi$" if label else None)

    for ax, col, key, name in ((ax1, BLUE, 1, r"$\vartheta_1$"),
                               (axs, NEON, 2, r"$\vartheta_1^{\ast}$")):
        ax.plot(T, broken(A[:, key], math.pi), color=col, lw=1.0)
        ax.axhline(0, color="0.7", lw=0.8)
        ax.set_ylim(-math.pi, math.pi)
        ax.set_yticks([-math.pi, -math.pi / 2, 0, math.pi / 2, math.pi])
        ax.set_yticklabels([r"$-\pi$", r"$-\pi/2$", "$0$", r"$\pi/2$", r"$\pi$"])
        ax.set_ylabel(name if label else None)

    for ax in axes:
        for n, x, back in gam:
            if not (window[0] <= x <= window[1]):
                continue
            ax.axvline(x, color="0.85" if not back else NEON, lw=0.7,
                       ls=":" if not back else (0, (3, 2)),
                       zorder=1.5 if back else 0,
                       alpha=1.0 if back else 0.9)
        ax.set_xlim(*window)
        ax.grid(True, axis="y", ls=":", alpha=0.35)
    axes[-1].set_xlabel(r"$T$")

    # the ordinates sit on theta_2 = pi and at theta_1 = -theta +- pi/2
    for n, x, back in gam:
        if not (window[0] <= x <= window[1]):
            continue
        ax2.plot(x, math.pi, "o", ms=4.5 if len(gam) < 20 else 2.8,
                 mfc=NEON if back else "w", mec="k", mew=0.6, zorder=5)
    return A


def main() -> None:
    gam_w = ordinate_list(WIDE)
    back = [n for n, _, b in gam_w if b]
    print(f"{len(gam_w)} ordinates over {WIDE}: n = {gam_w[0][0]}..{gam_w[-1][0]}")
    print(f"retrograde at n = {back} ({len(back)} of {len(gam_w)})")

    fig, axm = plt.subplots(3, 1, figsize=(11.0, 7.0), sharex=True)
    draw(axm, WIDE, NPTS_WIDE, gam_w, label=True)

    axm[0].set_title(rf"$\sigma=1/2$, ${WIDE[0]}\leq T\leq{WIDE[1]}$"
                     rf" (${I_of_T(WIDE[0]):.1f}\leq t\leq{I_of_T(WIDE[1]):.1f}$,"
                     rf" {len(gam_w)} ordinates)")

    handles = [plt.Line2D([], [], color="k", lw=0.9, ls="--",
                          label=r"$\vartheta_2=\pi$"),
               plt.Line2D([], [], color="0.85", lw=0.9, ls=":",
                          label="ordinate"),
               plt.Line2D([], [], color=NEON, lw=0.9, ls=(0, (3, 2)),
                          label="ordinate where the crossing retrogrades")]
    axm[0].legend(handles=handles, loc="lower left", fontsize=7.5,
                     framealpha=0.95, ncol=3, columnspacing=1.1,
                     handlelength=1.8)

    fig.tight_layout(h_pad=0.6)
    os.makedirs(OUTDIR, exist_ok=True)
    for ext in ("pdf", "png"):
        tmp = os.path.join("/tmp", f"{BASENAME}.{ext}")
        fig.savefig(tmp, dpi=190 if ext == "png" else None)
        shutil.copyfile(tmp, os.path.join(OUTDIR, f"{BASENAME}.{ext}"))
        print("wrote", os.path.join(OUTDIR, f"{BASENAME}.{ext}"))
    plt.close(fig)


if __name__ == "__main__":
    main()
