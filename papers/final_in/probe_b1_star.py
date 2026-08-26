#!/usr/bin/env python3
"""Where B_1 and B_1* sit, and what the retrograde really is.

Both splits obey the projection corollary, Re(exp(i theta) B_1) = Z/2, so both
bisector points lie on one line: the perpendicular to the direction of zeta
through zeta/2.  They differ only in how far along it they sit,

    B_1 - B_1* = i (h - h*) exp(-i theta),

so they are never in the same place.  What decides whether N_ps counts
correctly at an ordinate is not the distance but the side: the crossing
retrogrades exactly when h and h* have opposite signs.

Left panel: the geometry at sigma = 1/2, T = 6.18.
Right panel: h and h* over a band of T, with the ordinates marked and the
two of them where the signs disagree.

Run:  python3 probe_b1_star.py
"""

from __future__ import annotations

import math

import matplotlib.pyplot as plt
import mpmath as mp
import numpy as np

from check_counting_curve import bisector, count_curve, offset, theta_prime
from fig_counting_index import I_of_T, T_of_I

mp.mp.dps = 25

T_SHOW = 6.18
BAND = (6.15, 6.60)
NEON = "#ff2020"
BLUE = "#1f77b4"
GREEN = "#2ca02c"


def geometry(T, sig=0.5):
    t = I_of_T(T)
    s = mp.mpc(sig, t)
    m = int(math.floor(T))
    return {
        "t": t, "theta": mp.siegeltheta(t), "Z": mp.siegelz(t),
        "zeta": mp.zeta(s),
        "S1": mp.fsum(mp.mpf(n) ** (-s) for n in range(1, m + 1)),
        "ps": bisector(t, "ps"), "rs": bisector(t, "rs"),
        "star": bisector(t, "star"),
    }


C = lambda z: (float(mp.re(z)), float(mp.im(z)))

POINTS = (("ps", BLUE, r"$B_1=\Sigma_1+R_{1ps}$"),
          ("rs", GREEN, r"$B_1^{\mathrm{rs}}=\Sigma_1+R/2$"),
          ("star", NEON, r"$B_1^{\ast}=\zeta+\zeta'/2\theta'$"))


def draw_plane(ax, g, legs=True, labels=True):
    zeta, th = g["zeta"], g["theta"]
    half = zeta / 2
    e = mp.exp(-1j * th)          # the line through 0 and zeta: the divider
    perp = 1j * e                 # the line both bisector points live on

    ax.plot(*zip(C(-4.2 * e), C(4.2 * e)), color="0.45", lw=1.0, ls=(0, (4, 3)),
            zorder=1, label=r"the $\zeta$ line (through $0$ and $\zeta$)"
            if labels else None)
    ax.plot(*zip(C(half - 4.2 * perp), C(half + 4.2 * perp)), color="0.7",
            lw=1.0, zorder=1,
            label=r"perpendicular through $\zeta/2$" if labels else None)

    for key, col, lab in POINTS:
        B = g[key]
        if legs:
            ax.plot([0, C(B)[0]], [0, C(B)[1]], color=col, lw=1.3, zorder=3)
            ax.plot([C(B)[0], C(zeta)[0]], [C(B)[1], C(zeta)[1]], color=col,
                    lw=1.3, ls=(0, (5, 2)), zorder=3)
        ax.plot(*C(B), "o", ms=7, mfc=col, mec="k", mew=0.8, zorder=5,
                label=lab if labels else None)

    for z, lab, off in ((0, "origin", (7, -12)), (zeta, r"$\zeta$", (8, 2)),
                        (half, r"$\zeta/2$", (-30, 4)),
                        (g["S1"], r"$\Sigma_1$", (7, 6))):
        ax.plot(*C(z), "k.", ms=6, zorder=4)
        if labels:
            ax.annotate(lab, C(z), textcoords="offset points", xytext=off,
                        fontsize=9.5)

    if labels:  # the two offsets, as arrows along the perpendicular
        for key, col, name, frac, dx in (("ps", BLUE, "h", 0.80, (-4, -16)),
                                         ("star", NEON, r"h^{\ast}", 0.42,
                                          (-52, -14))):
            B = g[key]
            h = float(mp.im(mp.exp(1j * th) * B))
            ax.annotate("", C(B), xytext=C(half),
                        arrowprops=dict(arrowstyle="-|>", color=col, lw=1.1,
                                        shrinkA=0, shrinkB=4))
            ax.annotate(rf"${name}={h:+.3f}$",
                        C(half + (B - half) * frac), textcoords="offset points",
                        xytext=dx, fontsize=9, color=col)

    ax.set_aspect("equal")
    ax.grid(True, ls=":", alpha=0.4)


def draw_band(ax):
    T = np.linspace(*BAND, 340)
    hp = np.array([float(offset(I_of_T(x), "ps")) for x in T])
    hs = np.array([float(offset(I_of_T(x), "star")) for x in T])
    ax.axhline(0, color="k", lw=0.8)
    ax.plot(T, hp, color=BLUE, lw=1.3, label=r"$h$, from $B_1$")
    ax.plot(T, hs, color=NEON, lw=1.3, label=r"$h^{\ast}$, from $B_1^{\ast}$")
    ax.axvline(T_SHOW, color="0.5", lw=0.9, ls=":")
    ax.annotate(rf"$T={T_SHOW}$", (T_SHOW, ax.get_ylim()[1]),
                textcoords="offset points", xytext=(3, -12), fontsize=8,
                color="0.35")

    n = 1
    while T_of_I(float(mp.zetazero(n).imag)) < BAND[0]:
        n += 1
    while True:
        t = float(mp.zetazero(n).imag)
        x = T_of_I(t)
        if x > BAND[1]:
            break
        a, b = float(offset(t, "ps")), float(offset(t, "star"))
        bad = a * b < 0
        if bad:
            ax.axvspan(x - 0.004, x + 0.004, color="0.85", zorder=0)
            ax.annotate(rf"$\gamma_{{{n}}}$", (x, -2.55),
                        textcoords="offset points", xytext=(-9, 0), fontsize=8.5)
            v = count_curve(x, "ps")
            print(f"  gamma_{n}: T = {x:.4f}, h = {a:+.4f}, h* = {b:+.4f},"
                  f" opposite sides, N_ps = {v:.3f} against {n}")
        ax.plot([x, x], [a, b], color="k" if bad else "0.6", lw=0.8, zorder=2)
        ax.plot(x, a, "o", ms=5, mfc=BLUE, mec="k", mew=0.7, zorder=4)
        ax.plot(x, b, "o", ms=5, mfc=NEON, mec="k", mew=0.7, zorder=4)
        n += 1

    ax.set_xlim(*BAND)
    ax.set_xlabel(r"$T$")
    ax.set_ylabel(r"transverse offset")
    ax.grid(True, ls=":", alpha=0.4)
    ax.set_title("the offsets at the ordinates: same side, or not")
    ax.legend(loc="upper right", fontsize=8.5)


def main() -> None:
    fig, (axl, axz, axr) = plt.subplots(
        1, 3, figsize=(15.0, 5.0),
        gridspec_kw={"width_ratios": [1.0, 0.72, 1.25]})
    g = geometry(T_SHOW)
    print(f"geometry at T = {T_SHOW}")
    for key, _, _ in POINTS:
        B = g[key]
        h = float(mp.im(mp.exp(1j * g["theta"]) * B))
        print(f"  {key:>4}: B1 = {complex(B):+.6f}  |leg1| = {float(abs(B)):.6f}"
              f"  |leg2| = {float(abs(g['zeta'] - B)):.6f}  h = {h:+.6f}")
    print(f"  Sigma1 = {complex(g['S1']):+.6f},"
          f"  |B1 - B1*| = {float(abs(g['ps'] - g['star'])):.6f}")

    draw_plane(axl, g)
    axl.set_xlim(-1.5, 3.5)
    axl.set_ylim(-0.6, 3.7)
    axl.set_title(rf"$\sigma=1/2$, $T={T_SHOW}$  ($t={float(g['t']):.3f}$)")
    axl.legend(loc="lower right", fontsize=8)

    # B_1, B_1^rs and Sigma_1 nearly coincide at this height, so magnify them
    draw_plane(axz, g, legs=False, labels=False)
    cx, cy = C((g["ps"] + g["S1"]) / 2)
    axz.set_xlim(cx - 0.075, cx + 0.075)
    axz.set_ylim(cy - 0.075, cy + 0.075)
    for z, lab, off in ((g["S1"], r"$\Sigma_1$", (8, -4)),
                        (g["ps"], r"$B_1$", (6, 8)),
                        (g["rs"], r"$B_1^{\mathrm{rs}}$", (6, -12))):
        axz.annotate(lab, C(z), textcoords="offset points", xytext=off,
                     fontsize=9.5)
    axz.annotate(r"toward $B_1^{\ast}$", C(g["ps"]), textcoords="offset points",
                 xytext=(-100, -22), fontsize=8.5, color=NEON,
                 arrowprops=dict(arrowstyle="<|-", color=NEON, lw=1.0,
                                 shrinkA=2, shrinkB=2))
    axz.set_title("the same corner magnified 20 times")

    print(f"\nordinates in {BAND} where the two offsets disagree in sign")
    draw_band(axr)
    fig.tight_layout()
    out = "/tmp/b1_vs_b1star.png"
    fig.savefig(out, dpi=170)
    print("\nwrote", out)


if __name__ == "__main__":
    main()
