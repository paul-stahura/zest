#!/usr/bin/env python3
"""
fig_yinyang_extended.py
=======================

Figure 56.  The top row of Figure 55, with each non-bisector yin and yang
arc continued the way the Zest links view does: hold the reverse link and
step T half a unit past the end farther from the origin (yin) or the other
end (yang).  The bisector strip is left alone.  Wings are solid, not dashed.

Outputs (into ./figures/):
    fig_yinyang_extended.pdf
    fig_yinyang_extended.png

Run:  python3 fig_yinyang_extended.py
"""

import os

import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt

from fig1_spiral_summands import OUTDIR
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
from fig_yinyang_link5 import (
    M,
    T_SNAP,
    Y_k,
    collect_paths,
    remainder_at,
    yin_yang_at,
)

BASENAME = "fig_yinyang_extended"
EXTENT = 0.5
N_WING = 48
YIN_EXT_COLOR = "#2ec4a8"
YANG_EXT_COLOR = "#b050e8"

mp.mp.dps = 25


def hypot2(z):
    return z.real * z.real + z.imag * z.imag


def collect_wings(paths, m):
    """One wing per yin/yang piece, same end rule as the links-tab extension."""
    wings = []
    for k, pieces in paths.items():
        if k == m:
            continue
        for piece in pieces:
            yin = piece["yin"]
            yang = piece["yang"]
            if not yin or not yang:
                continue
            t0, t1 = piece["T"][0], piece["T"][-1]
            j = piece["i"]
            for end, pts in (("yin", yin), ("yang", yang)):
                first_farther = hypot2(pts[0]) > hypot2(pts[-1])
                down = (not first_farther) if end == "yang" else first_farther
                tip = pts[0] if down else pts[-1]
                t_from = max(k + 1e-6, t0 - EXTENT) if down else t1
                t_to = t0 if down else t1 + EXTENT
                if t_to <= t_from:
                    continue
                wings.append({
                    "k": k, "j": j, "end": end, "down": down,
                    "tip": tip, "t_from": t_from, "t_to": t_to,
                })
    return wings


def sample_wing(wing, n, cache):
    Ts = np.linspace(wing["t_from"], wing["t_to"], n + 1)
    pts = []
    k = wing["k"]
    joint = wing["j"] if wing["end"] == "yin" else wing["j"] + 1
    for T in Ts:
        if wing["down"] and T >= wing["t_to"] - 1e-12:
            continue
        if not wing["down"] and T <= wing["t_from"] + 1e-12:
            continue
        if int(mp.floor(T)) < k:
            continue
        key = round(float(T), 8)
        if key not in cache:
            cache[key] = remainder_at(T)
        pts.append(Y_k(cache[key], k, joint))
    if wing["down"]:
        pts.reverse()
    return [wing["tip"]] + pts


def draw_row(axes, frames, m, paths, wings, now, xlim, ylim):
    by_k = {k: [] for k in range(m + 1)}
    for w, pts in wings:
        by_k[w["k"]].append((w, pts))

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
        if i_cross is not None and i_cross + 1 < len(fr["framed_inv"]):
            p = fr["framed_inv"][i_cross]
            q = fr["framed_inv"][i_cross + 1]
            ax.plot(
                [p.real, q.real], [p.imag, q.imag],
                "-", color=CROSS_COLOR, lw=2.15, solid_capstyle="round", zorder=4,
            )

        for w, pts in by_k[k]:
            arr = np.array(pts)
            color = YIN_EXT_COLOR if w["end"] == "yin" else YANG_EXT_COLOR
            ax.plot(arr.real, arr.imag, "-", color=color, lw=1.15, zorder=2)

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


def main():
    print("paths over (6, 7)")
    paths = collect_paths(M, 280)
    wings = collect_wings(paths, M)
    print("wings", len(wings))
    cache = {}
    sampled = []
    for i, w in enumerate(wings):
        pts = sample_wing(w, N_WING, cache)
        sampled.append((w, pts))
        print(
            "  k=%d  %s  j=%d  T=%.3f..%.3f  n=%d"
            % (w["k"], w["end"], w["j"], w["t_from"], w["t_to"], len(pts))
        )

    data = compute_chains(T_SNAP)
    frames = build_frames(data)
    info0 = remainder_at(T_SNAP)
    now = {k: yin_yang_at(info0, k)[:2] for k in range(M + 1)}

    n = M + 1
    fig, axes = plt.subplots(1, n, figsize=(13.2, 2.55), sharey=True)
    fig.subplots_adjust(wspace=0.0, left=0.038, right=0.995, top=0.92, bottom=0.08)
    half = 0.5 / UNIT_FRACTION
    draw_row(
        axes, frames, data["m"], paths, sampled, now,
        (0.5 - half, 0.5 + half), (-1.25, 1.30),
    )
    mid = 0.5 * (axes[0].get_position().y0 + axes[0].get_position().y1)
    fig.text(0.010, mid, r"$T=6.18$", rotation=90, va="center", fontsize=15)

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
