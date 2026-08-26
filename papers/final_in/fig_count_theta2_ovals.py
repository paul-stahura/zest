#!/usr/bin/env python3
"""Figure for the counting section: the count, theta_2, and the equal-leg
ovals read together.

Top: the magnified staircase window of fig_nps_staircase (6.125 <= T <= 6.275)
with N, the smooth part, N_ps and N*.  Bottom: theta_2 and theta_2* on the
same window with the off-line equal-leg ovals of the ps split overlaid (sigma
on the right-hand scale, so the critical line sits on the dashed
theta_2 = pi line), and the stretches where theta_2 runs retrograde shaded.

Also prints the correlation between the retrograde stretches of theta_2 and
the T-extents of the ovals, which the section text quotes.

Run:  python3 fig_count_theta2_ovals.py
"""

from __future__ import annotations

import math
import os
import shutil
import sys

import matplotlib.pyplot as plt
import mpmath as mp
import numpy as np
from matplotlib.patches import ConnectionPatch

from check_counting_curve import bisector, count_curve, offset
from fig_counting_index import I_of_T, T_of_I

mp.mp.dps = 12

OUTDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "figures")
BASENAME = "fig_count_theta2_ovals"
CACHE_PATH = os.path.join(OUTDIR, BASENAME + "_data.npz")

WINDOW = (5.9, 6.7)
ZOOM = (6.125, 6.275)
YLIM = (121.0, 132.0)

BLUE = "#1f77b4"
NEON = "#ff2020"
ORANGE = "#ff7f0e"
GREEN = "#2ca02c"
PURPLE = "#7f2fbf"
SHADE = "#ffd9b3"

GAM = []


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


def theta2_raw(T, which="ps"):
    """arg of the folded leg against leg 1, un-reduced."""
    t = I_of_T(T)
    B1 = bisector(t, which)
    return float(mp.arg((mp.zeta(mp.mpc(0.5, t)) - B1) / B1))


def leg_delta(sig, T):
    """|leg 1| - |leg 2| for the ps split at (sigma, T)."""
    t = I_of_T(T)
    B1 = bisector(t, "ps", float(sig))
    return float(abs(B1) - abs(mp.zeta(mp.mpc(float(sig), t)) - B1))


def retro_intervals(T, raw):
    """The T-intervals where the unwrapped theta_2 increases (retrograde)."""
    dth = np.gradient(np.unwrap(raw), T)
    retro = dth > 0
    out, start = [], None
    for i in range(T.size):
        if retro[i] and start is None:
            start = T[i]
        if not retro[i] and start is not None:
            out.append((start, T[i]))
            start = None
    if start is not None:
        out.append((start, T[-1]))
    return out


def oval_extents(Tg, sigs, delta):
    """T-intervals where the leg difference changes sign off the line.

    The two half-strips are tested separately: the leg difference flips sign
    across the critical line itself, which is not an oval.
    """
    lo = np.sign(delta[sigs < 0.47, :])
    hi = np.sign(delta[sigs > 0.53, :])
    has = (np.any(lo[:-1, :] != lo[1:, :], axis=0)
           | np.any(hi[:-1, :] != hi[1:, :], axis=0))
    out, start = [], None
    for j in range(Tg.size):
        if has[j] and start is None:
            start = Tg[j]
        if not has[j] and start is not None:
            out.append((start, Tg[j]))
            start = None
    if start is not None:
        out.append((start, Tg[-1]))
    return out


def theta2_panel(ax, window, nline, Tg, sigs, delta, T=None, raw=None,
                 raw_star=None):
    """theta_2 with the equal-leg ovals overlaid, sigma on 2*pi*sigma."""
    if T is None:
        T = np.linspace(*window, nline)
        raw = np.array([theta2_raw(x) for x in T])
    ivals = retro_intervals(T, raw)
    for a, b in ivals:
        ax.axvspan(a, b, color=SHADE, alpha=0.9, lw=0, zorder=0)
    A = np.mod(raw, 2 * math.pi)
    ax.plot(T, broken(A, math.pi), color=PURPLE, lw=1.0, zorder=3)
    if raw_star is not None:
        ax.plot(T, broken(np.mod(raw_star, 2 * math.pi), math.pi),
                color=GREEN, lw=1.5, zorder=2)
    ax.contour(Tg, 2 * math.pi * sigs, delta, levels=[0.0], colors=[BLUE],
               linewidths=1.5, zorder=2)
    ax.axhline(math.pi, color="k", lw=0.8, ls="--", zorder=1)
    for n, x, b in GAM:
        if window[0] <= x <= window[1]:
            ax.plot(x, math.pi, "o", ms=8.5, mfc=NEON if b else "w",
                    mec="k", mew=0.6, zorder=5)
    ax.set_xlim(*window)
    ax.set_ylim(0, 2 * math.pi)
    ax.set_yticks([0, math.pi, 2 * math.pi])
    ax.set_yticklabels(["$0$", r"$\pi$", r"$2\pi$"])
    ax.set_ylabel(r"$\vartheta_2$", fontsize=9)
    ax.grid(True, ls=":", alpha=0.4)
    twin = ax.twinx()
    twin.set_ylim(0, 1)
    twin.set_yticks([0, 0.5, 1])
    twin.set_yticklabels(["$0$", r"$\frac{1}{2}$", "$1$"])
    twin.set_ylabel(r"$\sigma$", fontsize=9, rotation=0, labelpad=8)
    return ivals


def load_or_compute(plot_only: bool):
    """Ordinates, equal-leg grids and the zoom-window count curves."""
    global GAM
    if os.path.isfile(CACHE_PATH):
        with np.load(CACHE_PATH, allow_pickle=False) as npz:
            data = {k: npz[k] for k in npz.files}
        GAM = list(zip(data["gam_n"].astype(int), data["gam_T"],
                       data["gam_back"].astype(bool)))
        print(f"loaded cache {CACHE_PATH}")
        if "raw_star_z" not in data:
            print("computing theta_2* on the zoom window ...")
            data["raw_star_z"] = np.array([theta2_raw(x, "star")
                                           for x in data["T_th_z"]])
            np.savez(CACHE_PATH, **data)
            print("extended cache", CACHE_PATH)
        return (data["sigs"], data["Tg_wide"], data["Tg_zoom"],
                data["delta_wide"], data["delta_zoom"],
                data["Tz"], data["N"], data["smooth"], data["Nps"], data["Nstar"],
                data["T_th_z"], data["raw_z"], data["T_th_w"], data["raw_w"],
                data["raw_star_z"])
    if plot_only:
        raise SystemExit(f"no cache at {CACHE_PATH}")

    GAM = ordinate_list(WINDOW)
    sigs = np.linspace(0.02, 0.98, 65)
    Tg_wide = np.linspace(*WINDOW, 801)
    Tg_zoom = np.linspace(*ZOOM, 301)
    print("computing wide grid ...")
    delta_wide = np.array([[leg_delta(sg, T) for T in Tg_wide] for sg in sigs])
    print("computing zoom grid ...")
    delta_zoom = np.array([[leg_delta(sg, T) for T in Tg_zoom] for sg in sigs])
    base = GAM[0][0] - 1
    Tz = np.linspace(*ZOOM, 1200)
    N = base + np.searchsorted([x for _, x, _ in GAM], Tz, side="right")
    smooth = np.array([float(mp.siegeltheta(I_of_T(x)) / mp.pi + 1) for x in Tz])
    Nps = np.array([count_curve(x, "ps") for x in Tz])
    Nstar = np.array([count_curve(x, "star") for x in Tz])
    print("computing theta_2 ...")
    T_th_z = np.linspace(*ZOOM, 1200)
    raw_z = np.array([theta2_raw(x) for x in T_th_z])
    raw_star_z = np.array([theta2_raw(x, "star") for x in T_th_z])
    T_th_w = np.linspace(*WINDOW, 4200)
    raw_w = np.array([theta2_raw(x) for x in T_th_w])
    os.makedirs(OUTDIR, exist_ok=True)
    np.savez(CACHE_PATH,
             gam_n=np.array([n for n, _, _ in GAM]),
             gam_T=np.array([x for _, x, _ in GAM]),
             gam_back=np.array([b for _, _, b in GAM]),
             sigs=sigs, Tg_wide=Tg_wide, Tg_zoom=Tg_zoom,
             delta_wide=delta_wide, delta_zoom=delta_zoom,
             Tz=Tz, N=N, smooth=smooth, Nps=Nps, Nstar=Nstar,
             T_th_z=T_th_z, raw_z=raw_z, T_th_w=T_th_w, raw_w=raw_w,
             raw_star_z=raw_star_z)
    print("wrote", CACHE_PATH)
    return (sigs, Tg_wide, Tg_zoom, delta_wide, delta_zoom,
            Tz, N, smooth, Nps, Nstar, T_th_z, raw_z, T_th_w, raw_w,
            raw_star_z)


def link_panes(fig, upper, lower, x, color, ls, lw=0.8):
    """A guide from the bottom of upper to the top of lower, at the same T."""
    fig.add_artist(ConnectionPatch(
        xyA=(x, upper.get_ylim()[0]), coordsA=upper.transData,
        xyB=(x, lower.get_ylim()[1]), coordsB=lower.transData,
        color=color, lw=lw, ls=ls, zorder=1, clip_on=False))


def main() -> None:
    global GAM
    plot_only = "--plot-only" in sys.argv
    (sigs, Tg_wide, Tg_zoom, delta_wide, delta_zoom,
     Tz, N, smooth, Nps, Nstar, T_th_z, raw_z, T_th_w, raw_w,
     raw_star_z) = load_or_compute(plot_only)
    back = [n for n, _, b in GAM if b]
    print(f"{len(GAM)} ordinates over {WINDOW}: n = {GAM[0][0]}..{GAM[-1][0]}")
    print(f"retrograde at n = {back} ({len(back)} of {len(GAM)})")

    fig, (ax, axz) = plt.subplots(
        2, 1, figsize=(11.0, 9.0),
        gridspec_kw={"height_ratios": [3.0, 1.3]})

    # --- top: the magnified staircase window ---
    ax.step(Tz, N, where="post", color=BLUE, lw=1.0, label=r"$N(I(T))$")
    ax.plot(Tz, smooth, color="k", lw=1.0, label=r"$\vartheta(t)/\pi+1$")
    ax.plot(Tz, broken(Nps, 1.0), color=ORANGE, lw=1.1, label=r"$N_{ps}$")
    ax.plot(Tz, broken(Nstar, 1.0), color=GREEN, lw=2.2, label=r"$N^{\ast}$")
    inside = [(n, x) for n, x, _ in GAM if ZOOM[0] <= x <= ZOOM[1]]
    ax.plot([x for _, x in inside], [n for n, _ in inside], linestyle="none",
            marker="o", ms=5.5, mfc=NEON, mec=NEON, zorder=5, label="ordinates")
    retro_zoom = [(n, x) for n, x, b in GAM if b and ZOOM[0] <= x <= ZOOM[1]]
    DASH = (0, (3, 2))
    for n, x in retro_zoom:
        ax.axvline(x, color=NEON, lw=1.1, ls=DASH, zorder=0)
    ax.set_xlim(*ZOOM)
    ax.set_ylim(*YLIM)
    ax.set_ylabel(r"zeros with ordinate in $(0,\,t\,]$", fontsize=9)
    ax.grid(True, ls=":", alpha=0.4)
    nz = len(inside)
    ax.set_title(rf"$\sigma=1/2$, ${ZOOM[0]}\leq T\leq{ZOOM[1]}$"
                 rf" (${nz}$ ordinates)")
    handles, labels = ax.get_legend_handles_labels()
    handles.append(plt.Line2D([], [], color=NEON, lw=0.9, ls=(0, (3, 2))))
    labels.append("retrograde ordinate")
    ax.legend(handles, labels, loc="upper left", fontsize=11,
              framealpha=0.95, ncol=3, columnspacing=1.2, handlelength=1.8)
    ax.tick_params(labelbottom=False)

    # --- bottom: theta_2 and theta_2* with the ovals, same window ---
    theta2_panel(axz, ZOOM, 1200, Tg_zoom, sigs, delta_zoom, T_th_z, raw_z,
                 raw_star_z)
    axz.set_title(r"$\vartheta_2$ (purple) and $\vartheta_2^{\ast}$ (green)"
                  r" with the off-line equal-leg ovals"
                  r" of the $ps$ split (blue), retrograde stretches shaded",
                  fontsize=9)
    axz.set_xlabel(r"$T$")
    for n, x in retro_zoom:
        axz.axvline(x, color=NEON, lw=1.1, ls=DASH, zorder=0)

    # --- correlation report for the section text (wide window, not drawn) ---
    ivals = retro_intervals(T_th_w, raw_w)
    ovals = oval_extents(Tg_wide, sigs, delta_wide)
    print(f"\nretrograde stretches of theta_2 over {WINDOW}: {len(ivals)}")
    for a, b in ivals:
        inside = [(n, bk) for n, x, bk in GAM if a <= x <= b]
        print(f"  [{a:.4f}, {b:.4f}]  width {b - a:.4f}  ordinates inside:"
              f" {inside}")
    print(f"oval T-extents over {WINDOW}: {len(ovals)}")
    for a, b in ovals:
        cov = sum(max(0.0, min(b, d) - max(a, c)) for c, d in ivals)
        print(f"  [{a:.4f}, {b:.4f}]  width {b - a:.4f}"
              f"  retrograde coverage {cov / (b - a):.2f}")

    fig.tight_layout(h_pad=1.4)
    # The two retrograde ordinates carried between panes as dotted guides.
    for n, x in retro_zoom:
        link_panes(fig, ax, axz, x, NEON, ":", 1.0)

    os.makedirs(OUTDIR, exist_ok=True)
    for ext in ("pdf", "png"):
        tmp = os.path.join("/tmp", f"{BASENAME}.{ext}")
        fig.savefig(tmp, dpi=190 if ext == "png" else None)
        shutil.copyfile(tmp, os.path.join(OUTDIR, f"{BASENAME}.{ext}"))
        print("wrote", os.path.join(OUTDIR, f"{BASENAME}.{ext}"))
    plt.close(fig)


if __name__ == "__main__":
    main()
