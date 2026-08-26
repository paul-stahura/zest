#!/usr/bin/env python3
"""Scaled hat-d1 tracks for 6<T<7: seven panels, then one overlay. Not for the paper."""

import os

import numpy as np
import matplotlib.pyplot as plt

from fig1_spiral_summands import OUTDIR
from fig_d1_any_link import LINKS, M, N_PATH, T_SNAP, sample, hat_d1

COLORS = ["#4c78a8", "#f58518", "#54a24b", "#e45756", "#b279a2", "#72b7b2", "#222222"]
MID = "#bbbbbb"
GUIDE = "#cccccc"


def tracks():
    eps = 1e-4
    Ts = np.linspace(M + eps, M + 1 - eps, N_PATH)
    near = {k: 0.5 for k in LINKS}
    raw = {k: [] for k in LINKS}
    for T in Ts:
        s, ch, R, m, a2, fwd, rev = sample(T)
        for k in LINKS:
            lam = hat_d1(k, s, ch, R, m, a2, fwd, rev, near[k])
            raw[k].append(np.nan if lam is None else lam)
            if lam is not None:
                near[k] = lam
    frac = Ts - M
    y = {k: np.array(raw[k], dtype=float) for k in LINKS}
    amp = {k: np.nanmax(y[k]) - np.nanmin(y[k]) for k in LINKS}
    mean = {k: np.nanmean(y[k]) for k in LINKS}
    # Center on 1/2 and stretch the wander to the bisector's peak-to-peak.
    scaled = {
        k: 0.5 + (amp[M] / amp[k]) * (y[k] - mean[k])
        for k in LINKS
    }
    snap_i = int(np.argmin(np.abs(Ts - T_SNAP)))
    return frac, y, scaled, amp, mean, snap_i


def style_panel(ax, snap_x):
    ax.axhline(0.5, color=MID, lw=0.8, zorder=1)
    ax.axvline(snap_x, color=GUIDE, lw=0.9, zorder=1)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.set_xticks([0, 0.5, 1])
    ax.tick_params(length=2, labelsize=7)
    for spine in ax.spines.values():
        spine.set_linewidth(0.5)
        spine.set_color("#888888")


def main():
    frac, _raw, scaled, amp, mean, snap_i = tracks()
    snap_x = frac[snap_i]
    print("k   raw swing   mean    scale A_m/A_k")
    for k in LINKS:
        print(f"{k}   {amp[k]:.4f}      {mean[k]:.4f}   {amp[M]/amp[k]:.1f}")

    fig, axes = plt.subplots(1, len(LINKS), figsize=(11.2, 2.6), sharey=True)
    for k, ax in zip(LINKS, axes):
        style_panel(ax, snap_x)
        ax.plot(frac, scaled[k], color=COLORS[k], lw=1.4, zorder=2)
        ax.plot(snap_x, scaled[k][snap_i], "o", color=COLORS[k], ms=4.5, zorder=3,
                markeredgecolor="white", markeredgewidth=0.4)
        ax.set_title(str(k) if k < M else r"$6$ (bisector)", fontsize=8, pad=3)
        ax.set_xticklabels(["0", "", "1"], fontsize=7)
    axes[0].set_yticks([0, 0.5, 1])
    axes[0].set_yticklabels(["0", r"$1/2$", "1"], fontsize=7)
    axes[0].set_ylabel(r"scaled $\hat d_1$", fontsize=9)
    fig.supxlabel(r"$\{T\}$, \quad $6<T<7$", fontsize=9, y=0.02)
    fig.suptitle(
        r"Each track centered at $1/2$ and stretched to the bisector swing"
        r"  ($\sigma=1/2$; dot at $T=6.18$)",
        fontsize=11,
        y=1.02,
    )
    fig.tight_layout(w_pad=0.25)
    panels = os.path.join(OUTDIR, "fig_d1_any_link_scaled_panels.png")
    fig.savefig(panels, dpi=200, bbox_inches="tight")
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(8.4, 5.2))
    style_panel(ax, snap_x)
    ax.set_yticks([0, 0.5, 1])
    ax.set_yticklabels(["0", r"$1/2$", "1"], fontsize=10)
    for k in LINKS:
        label = r"$k=%d$ (bisector)" % k if k == M else r"$k=%d$" % k
        ax.plot(frac, scaled[k], color=COLORS[k], lw=1.8 if k == M else 1.3,
                zorder=3 if k == M else 2, label=label)
        ax.plot(snap_x, scaled[k][snap_i], "o", color=COLORS[k], ms=5.5, zorder=4,
                markeredgecolor="white", markeredgewidth=0.5)
    ax.legend(loc="upper right", fontsize=8, framealpha=0.92)
    ax.set_xlabel(r"$\{T\}$, \quad $6<T<7$", fontsize=11)
    ax.set_ylabel(r"scaled $\hat d_1(k,T)$", fontsize=11)
    ax.set_title(
        r"All seven, overlaid, each stretched to the bisector swing",
        fontsize=12,
    )
    fig.tight_layout()
    overlay = os.path.join(OUTDIR, "fig_d1_any_link_scaled_overlay.png")
    fig.savefig(overlay, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print("wrote", panels)
    print("wrote", overlay)


if __name__ == "__main__":
    main()
