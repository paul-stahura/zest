#!/usr/bin/env python3
"""
fig_yinyang_link5.py
====================

Figure 55.  Two panels at sigma = 1/2, m = 6.

  (a) The local frames of Figure 53's top row (T = 6.18), now with the
      yin and yang loci of every forward link k = 0..6 as T runs through
      (6, 7), not only the bisector.
  (b) The same yin and yang of link k = 5, zoomed, as before: three arcs
      as the crossing summand n' runs 7 -> 8 -> 9.

Yin and yang of link k are the two ends of the reverse link that crosses
it, in the frame that pins forward link k to [0, 1]:

    Y_in(k, T)  = Y_k(i),     Y_ang(k, T) = Y_k(i+1),
    i = C_ell(k, T),

with i pinned to m at the bisector.  Paths are broken at handoffs so a
change of crossing link does not draw a jump.

Outputs (into ./figures/):
    fig_yinyang_link5.pdf
    fig_yinyang_link5.png

Run:  python3 fig_yinyang_link5.py
"""

import os

import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.patches import ConnectionPatch

from fig1_spiral_summands import I_of_T, chi, C, OUTDIR
from fig_link_frames import (
    AXIS_COLOR,
    BISECTOR_FACE,
    CROSS_COLOR,
    FORWARD_COLOR,
    SEP_COLOR,
    UNIT_FRACTION,
    YANG_COLOR,
    YIN_COLOR,
    build_frames,
    compute_chains,
)

BASENAME = "fig_yinyang_link5"
SIGMA = mp.mpf("0.5")
K_ZOOM = 5
M = 6
T_SNAP = 6.18
N_PATH = 280

GREEN = YIN_COLOR
YANG = YANG_COLOR
DARKBLUE = "#0b3d6b"
DARK_YELLOW = "#c4a014"
ZOOM_FACE = "#fff8e0"

mp.mp.dps = 25


def empty_sum(values):
    items = list(values)
    return mp.fsum(items) if items else mp.mpf(0)


def remainder_at(T):
    t = I_of_T(mp.mpf(T))
    s = mp.mpc(SIGMA, t)
    m = int(mp.floor(T))
    ch = chi(s)
    S1 = empty_sum(mp.mpf(n) ** (-s) for n in range(1, m + 1))
    S2 = ch * empty_sum(mp.mpf(n) ** (s - 1) for n in range(1, m + 1))
    return dict(t=t, s=s, m=m, ch=ch, R=mp.zeta(s) - S1 - S2, a2=t / (2 * mp.pi))


def crossing_ell(k, a2, m):
    """Reverse link that crosses forward link k; mirror pins the bisector."""
    if k == m:
        return m
    return int(mp.nint(a2 / (k + 1))) - 1


def Y_k(info, k, j):
    """Reverse joint j in the frame of forward link k, equation (195)."""
    s, ch, R, m = info["s"], info["ch"], info["R"], info["m"]
    head = empty_sum(mp.mpf(n) ** (-s) for n in range(k + 1, m + 1))
    if j <= m:
        tail = empty_sum(mp.mpf(n) ** (s - 1) for n in range(j + 1, m + 1))
    else:
        tail = -empty_sum(mp.mpf(n) ** (s - 1) for n in range(m + 1, j + 1))
    return C((mp.mpf(k + 1) ** s) * (head + R + ch * tail))


def yin_yang_at(info, k):
    i = crossing_ell(k, info["a2"], info["m"])
    return Y_k(info, k, i), Y_k(info, k, i + 1), i


def collect_paths(m, n_path):
    """Per-link yin/yang loci over (m, m+1), split at handoffs."""
    eps = 1e-4
    Ts = np.linspace(m + eps, m + 1 - eps, n_path)
    paths = {k: [] for k in range(m + 1)}
    held = {k: None for k in range(m + 1)}
    for T in Ts:
        info = remainder_at(T)
        for k in range(m + 1):
            yin, yang, i = yin_yang_at(info, k)
            if i != held[k]:
                paths[k].append({"i": i, "T": [], "yin": [], "yang": []})
                held[k] = i
            paths[k][-1]["T"].append(T)
            paths[k][-1]["yin"].append(yin)
            paths[k][-1]["yang"].append(yang)
    return paths


def draw_top_row(axes, frames, m, paths, now, xlim, ylim):
    for ax, fr in zip(axes, frames):
        k = fr["k"]
        ax.set_xlim(*xlim)
        ax.set_ylim(*ylim)
        ax.set_aspect("equal", adjustable="box")
        ax.set_xticks([])
        ax.set_yticks([])
        for spine in ax.spines.values():
            spine.set_color(SEP_COLOR)
            spine.set_linewidth(0.8)
        if k == m:
            ax.set_facecolor(BISECTOR_FACE)
        if k == K_ZOOM:
            ax.set_facecolor(ZOOM_FACE)
            for spine in ax.spines.values():
                spine.set_color("#b89a20")
                spine.set_linewidth(1.15)
        ax.axhline(0.0, color=AXIS_COLOR, lw=0.6, zorder=1)

        i_cross = fr["i_cross"]
        if i_cross is not None and i_cross + 1 < len(fr["framed_inv"]):
            p = fr["framed_inv"][i_cross]
            q = fr["framed_inv"][i_cross + 1]
            ax.plot(
                [p.real, q.real], [p.imag, q.imag],
                "-", color=CROSS_COLOR, lw=2.15, solid_capstyle="round", zorder=4,
            )

        for piece in paths[k]:
            yin = np.array(piece["yin"])
            yang = np.array(piece["yang"])
            ax.plot(yin.real, yin.imag, "-", color=YIN_COLOR, lw=1.15, zorder=3)
            ax.plot(yang.real, yang.imag, "-", color=YANG_COLOR, lw=1.15, zorder=3)
        yin_now, yang_now = now[k]
        ax.plot([yin_now.real], [yin_now.imag], "o", color=YIN_COLOR, ms=4.0, zorder=6)
        ax.plot([yang_now.real], [yang_now.imag], "o", color=YANG_COLOR, ms=4.0, zorder=6)

        ax.plot(
            [0.0, 1.0], [0.0, 0.0],
            "-", color=FORWARD_COLOR, lw=2.6, solid_capstyle="round", zorder=5,
        )
        ax.plot([0.0, 1.0], [0.0, 0.0], "o", color=FORWARD_COLOR, ms=3.2, zorder=6)

        if fr["hit"] is not None:
            ax.plot(
                [fr["hit"].real], [fr["hit"].imag],
                "o", color=CROSS_COLOR, ms=5.2,
                markeredgecolor="#333333", markeredgewidth=0.6, zorder=7,
            )

        ax.text(
            0.5, 0.10, "%d" % k,
            ha="center", va="center", fontsize=16.5, fontweight="bold",
            color=FORWARD_COLOR, zorder=8, transform=ax.transAxes,
        )
        if k == m:
            ax.text(
                0.5, 0.055, "bisector",
                ha="center", va="center", fontsize=10.5,
                color=FORWARD_COLOR, zorder=8, transform=ax.transAxes,
            )

        if i_cross is not None:
            ax.text(
                0.5, 0.90, str(i_cross),
                ha="center", va="center", fontsize=15, fontweight="bold",
                color=CROSS_COLOR, zorder=8, transform=ax.transAxes,
            )


def draw_link5_zoom(ax, paths):
    pieces = paths[K_ZOOM]
    for p in pieces:
        yin = np.array(p["yin"])
        yang = np.array(p["yang"])
        ax.plot(yin.real, yin.imag, "-", color=GREEN, lw=1.6, zorder=3)
        ax.plot(yang.real, yang.imag, "-", color=YANG, lw=1.6, zorder=3)
        mid = (p["T"][0] + p["T"][-1]) / 2
        info = remainder_at(mid)
        yi = Y_k(info, K_ZOOM, p["i"])
        ya = Y_k(info, K_ZOOM, p["i"] + 1)
        ax.annotate(
            r"$n'=%d$" % (p["i"] + 1),
            (yi.real, yi.imag),
            textcoords="offset points",
            xytext=(8, 8),
            fontsize=9,
            color=GREEN,
        )
        ax.annotate(
            r"$n'=%d$" % (p["i"] + 1),
            (ya.real, ya.imag),
            textcoords="offset points",
            xytext=(8, -12),
            fontsize=9,
            color=YANG,
        )
        print(
            "  n' = %d  for T in %.4f .. %.4f"
            % (p["i"] + 1, p["T"][0], p["T"][-1])
        )

    ax.plot([0, 1], [0, 0], "-", color=DARKBLUE, lw=3.0, solid_capstyle="round", zorder=4)
    ax.plot([0, 1], [0, 0], "o", color=DARKBLUE, ms=4, zorder=5)
    ax.annotate(
        "forward link 5\n(unit length)",
        (0.5, 0),
        textcoords="offset points",
        xytext=(0, -28),
        fontsize=9,
        ha="center",
    )

    info0 = remainder_at(T_SNAP)
    yin0, yang0, i0 = yin_yang_at(info0, K_ZOOM)
    ax.plot(
        [yin0.real, yang0.real],
        [yin0.imag, yang0.imag],
        "-",
        color=DARK_YELLOW,
        lw=2.2,
        solid_capstyle="round",
        zorder=6,
    )
    ax.plot([yin0.real], [yin0.imag], "o", color=GREEN, ms=6, zorder=7)
    ax.plot([yang0.real], [yang0.imag], "o", color=YANG, ms=6, zorder=7)
    ax.annotate(
        r"$Y_{in}$", (yin0.real, yin0.imag),
        textcoords="offset points", xytext=(-28, 6), fontsize=11, color=GREEN,
    )
    ax.annotate(
        r"$Y_{ang}$", (yang0.real, yang0.imag),
        textcoords="offset points", xytext=(8, -4), fontsize=11, color=YANG,
    )

    ax.set_aspect("equal", adjustable="datalim")
    ax.grid(True, ls=":", alpha=0.35)
    ax.legend(
        handles=[
            Line2D([0], [0], color=GREEN, lw=1.6, label=r"$Y_{in}(5,T)$"),
            Line2D([0], [0], color=YANG, lw=1.6, label=r"$Y_{ang}(5,T)$"),
            Line2D([0], [0], color=DARK_YELLOW, lw=2.2,
                   label=r"crossing link at $T=%.2f$ ($n'=%d$)" % (T_SNAP, i0 + 1)),
        ],
        loc="upper right",
        fontsize=9,
        framealpha=0.92,
    )
    ax.set_xlabel("Re")
    ax.set_ylabel("Im")
    ax.set_title(
        r"(b) Yin and yang of forward link $k=5$,  $6<T<7$"
        r"  ($\sigma=1/2$, three arcs)",
        fontsize=11,
    )


def main():
    print("paths over (6, 7)")
    paths = collect_paths(M, N_PATH)
    for k, pieces in paths.items():
        nprimes = [p["i"] + 1 for p in pieces]
        print("  k=%d  n' = %s" % (k, nprimes))

    print("snapshot T =", T_SNAP)
    data = compute_chains(T_SNAP)
    frames = build_frames(data)
    info0 = remainder_at(T_SNAP)
    now = {k: yin_yang_at(info0, k)[:2] for k in range(M + 1)}

    n = M + 1
    fig = plt.figure(figsize=(13.2, 10.6))
    gs = fig.add_gridspec(
        2, 1, height_ratios=[1.0, 2.15], hspace=0.22,
    )
    gs_top = gs[0].subgridspec(1, n, wspace=0.0)
    gs_bot = gs[1].subgridspec(1, 3, width_ratios=[0.14, 0.72, 0.14])
    axes_top = [fig.add_subplot(gs_top[0, j]) for j in range(n)]
    ax_bot = fig.add_subplot(gs_bot[0, 1])

    half = 0.5 / UNIT_FRACTION
    xlim = (0.5 - half, 0.5 + half)
    ylim = (-1.25, 1.30)
    draw_top_row(
        axes_top, frames, data["m"], paths, now, xlim, ylim,
    )
    draw_link5_zoom(ax_bot, paths)

    ax_src = axes_top[K_ZOOM]
    for x_top, x_bot in ((0.0, 0.0), (1.0, 1.0)):
        fig.add_artist(ConnectionPatch(
            xyA=(x_top, 0.0), coordsA=ax_src.transAxes,
            xyB=(x_bot, 1.0), coordsB=ax_bot.transAxes,
            color="0.45", lw=0.9, ls=(0, (4, 3)), clip_on=False,
        ))

    fig.subplots_adjust(left=0.038, right=0.995, top=0.97, bottom=0.055)
    top_mid = 0.5 * (axes_top[0].get_position().y0 + axes_top[0].get_position().y1)
    fig.text(0.010, top_mid, r"$T=6.18$", rotation=90, va="center", fontsize=15)

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + ".pdf")
    png = os.path.join(OUTDIR, BASENAME + ".png")
    fig.savefig(pdf)
    fig.savefig(png, dpi=200)
    plt.close(fig)
    print("wrote", pdf)
    print("wrote", png)


if __name__ == "__main__":
    main()
