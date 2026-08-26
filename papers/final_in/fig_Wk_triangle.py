#!/usr/bin/env python3
"""
fig_Wk_triangle.py
==================

The cone W_k = R_1(k) + R_2(k) at sigma = 1/2, T = 6.18, one strip
per forward link, in the local-frame style of the top row of
fig_yinyang_link5: each strip pins forward link k to [0, 1] on the
real axis.

In that frame:
    R_1 is the red stub from 0 to the crossing along the unit link,
    R_2 is the orange stub from the crossing to reverse joint j,
    W_k  is the purple resultant from 0 to that joint,
    and the yellow segment is the reverse link that crosses.

Outputs (into ./figures/):
    fig_Wk_triangle.pdf
    fig_Wk_triangle.png

Run:  python3 fig_Wk_triangle.py
"""

import os

import mpmath as mp
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D

from fig1_spiral_summands import OUTDIR
from fig_link_frames import (
    AXIS_COLOR,
    BISECTOR_FACE,
    CROSS_COLOR,
    FORWARD_COLOR,
    SEP_COLOR,
    UNIT_FRACTION,
    build_frames,
    compute_chains,
)

BASENAME = "fig_Wk_triangle"
T_SNAP = 6.18
PURPLE = "#7f2fbf"
RED = "#d62728"
ORANGE = "#ff7f0e"

mp.mp.dps = 25


def draw_row(axes, frames, m, xlim, ylim):
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
        ax.axhline(0.0, color=AXIS_COLOR, lw=0.6, zorder=1)

        i_cross = fr["i_cross"]
        yin = yang = None
        if i_cross is not None and i_cross + 1 < len(fr["framed_inv"]):
            yin = fr["framed_inv"][i_cross]
            yang = fr["framed_inv"][i_cross + 1]
            ax.plot(
                [yin.real, yang.real], [yin.imag, yang.imag],
                "-", color=CROSS_COLOR, lw=2.15, solid_capstyle="round", zorder=4,
            )

        ax.plot(
            [0.0, 1.0], [0.0, 0.0],
            "-", color=FORWARD_COLOR, lw=2.6, solid_capstyle="round", zorder=5,
        )
        ax.plot([0.0, 1.0], [0.0, 0.0], "o", color=FORWARD_COLOR, ms=3.2, zorder=6)

        hit = fr["hit"]
        if yin is not None:
            ax.plot(
                [0.0, yin.real], [0.0, yin.imag],
                "-", color=PURPLE, lw=1.8, solid_capstyle="round", zorder=7,
            )
        if hit is not None:
            ax.plot(
                [0.0, hit.real], [0.0, hit.imag],
                "-", color=RED, lw=2.4, solid_capstyle="round", zorder=8,
            )
            if yin is not None:
                ax.plot(
                    [hit.real, yin.real], [hit.imag, yin.imag],
                    "-", color=ORANGE, lw=2.4, solid_capstyle="round", zorder=8,
                )

        if hit is not None:
            ax.plot(
                [hit.real], [hit.imag],
                "o", color=CROSS_COLOR, ms=5.2,
                markeredgecolor="#333333", markeredgewidth=0.6, zorder=9,
            )
        if yin is not None:
            ax.plot([yin.real], [yin.imag], "o", color="k", ms=3.2, zorder=9)

        ax.text(
            0.5, 0.10, "%d" % k,
            ha="center", va="center", fontsize=16.5, fontweight="bold",
            color=FORWARD_COLOR, zorder=10, transform=ax.transAxes,
        )
        if k == m:
            ax.text(
                0.5, 0.055, "bisector",
                ha="center", va="center", fontsize=10.5,
                color=FORWARD_COLOR, zorder=10, transform=ax.transAxes,
            )
        if i_cross is not None:
            ax.text(
                0.5, 0.90, str(i_cross),
                ha="center", va="center", fontsize=15, fontweight="bold",
                color=CROSS_COLOR, zorder=10, transform=ax.transAxes,
            )


def main():
    print("snapshot T =", T_SNAP)
    data = compute_chains(T_SNAP)
    frames = build_frames(data)
    m = data["m"]
    n = m + 1

    fig = plt.figure(figsize=(13.2, 3.15))
    gs = fig.add_gridspec(1, n, wspace=0.0)
    axes = [fig.add_subplot(gs[0, j]) for j in range(n)]

    half = 0.5 / UNIT_FRACTION
    xlim = (0.5 - half, 0.5 + half)
    ylim = (-1.25, 1.30)
    draw_row(axes, frames, m, xlim, ylim)

    fig.subplots_adjust(left=0.038, right=0.995, top=0.82, bottom=0.08)
    top_mid = 0.5 * (axes[0].get_position().y0 + axes[0].get_position().y1)
    fig.text(0.010, top_mid, r"$T=6.18$", rotation=90, va="center", fontsize=15)
    fig.legend(
        handles=[
            Line2D([0], [0], color=RED, lw=2.4, label=r"$R_1(k)$"),
            Line2D([0], [0], color=ORANGE, lw=2.4, label=r"$R_2(k)$"),
            Line2D([0], [0], color=PURPLE, lw=1.8, label=r"$W_k=R_1+R_2$"),
            Line2D([0], [0], color=CROSS_COLOR, lw=2.15, label="crossing reverse link"),
            Line2D([0], [0], color=FORWARD_COLOR, lw=2.6, label="forward link"),
        ],
        loc="upper center",
        ncol=5,
        frameon=False,
        fontsize=10,
        bbox_to_anchor=(0.52, 1.02),
    )

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
