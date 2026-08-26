#!/usr/bin/env python3
"""Figure for §12.4: the slope of N* against the size of |Z| between ordinates.

Left, the slope in units of the local mean density on the same magnified window
as Figure fig_nps_staircase: it equals 1 at every ordinate and dips in the
middle of each gap, deepest where |Z| rises highest.  Middle, the flatness at
the hump against the height of the hump, in three blocks of ordinates spread
over two decades of t.  Right, the same heights against rho'(gamma_n), read at
the ordinate behind the hump rather than at the hump itself.

Run:  python3 fig_nstar_slope.py
"""

from __future__ import annotations

import json
import os
import shutil
import statistics as st

import matplotlib.pyplot as plt
import mpmath as mp
import numpy as np

from check_nstar_slope import corr, gaps, rank, rho
from fig_counting_index import I_of_T

mp.mp.dps = 25

HERE = os.path.dirname(os.path.abspath(__file__))
OUTDIR = os.path.join(HERE, "figures")
BASENAME = "fig_nstar_slope"
CACHE = os.path.join(HERE, "nstar_slope_cache.json")

WINDOWS = ((6.125, 6.275), (12.5, 12.6))
NPTS = 900
BLOCKS = ((1, 100), (1000, 60), (10_000, 40))

NEON = "#ff2020"
PURPLE = "#7f2fbf"
TEAL = "#0aa6a6"
COLORS = (PURPLE, TEAL, "#c9701a")
MARKERS = ("o", "s", "^")


def window_curves(window):
    """rho, Z and the ordinates over a window of the index."""
    T = np.linspace(*window, NPTS)
    t = [I_of_T(mp.mpf(x)) for x in T]
    Z = [float(mp.siegelz(u)) for u in t]
    ords = []
    for i in range(NPTS - 1):
        if Z[i] * Z[i + 1] < 0:
            r = mp.findroot(mp.siegelz, (t[i], t[i + 1]), solver="bisect",
                            tol=1e-20)
            ords.append(float(T[i] + (T[i + 1] - T[i])
                              * float((r - t[i]) / (t[i + 1] - t[i]))))
    return {"T": T.tolist(), "rho": [float(rho(u)) for u in t], "Z": Z,
            "ords": ords, "t_lo": float(t[0]), "t_hi": float(t[-1])}


def load():
    """The blocks of gaps and the window curves, each computed once."""
    data = {"blocks": [], "windows": {}}
    if os.path.exists(CACHE):
        with open(CACHE) as fh:
            data = json.load(fh)
        data.setdefault("windows", {})
    if not data["blocks"]:
        for n0, ng in BLOCKS:
            gam, rows = gaps(n0, ng)
            data["blocks"].append({"n0": n0, "ng": ng, "t_lo": float(gam[0]),
                                   "t_hi": float(gam[-1]), "rows": rows})
            print(f"block gamma_{n0}..gamma_{n0 + ng} done")
    fresh = False
    for w in WINDOWS:
        key = f"{w[0]}-{w[1]}"
        if key not in data["windows"]:
            data["windows"][key] = window_curves(w)
            print(f"window {key} done,"
                  f" {len(data['windows'][key]['ords'])} ordinates")
            fresh = True
    if fresh or "window" in data:
        data.pop("window", None)
        with open(CACHE, "w") as fh:
            json.dump(data, fh)
    return data


def fit(x, y):
    """Slope and intercept of a least-squares line in the logs."""
    c = np.polyfit(np.log(x), np.log(y), 1)
    return c[0], np.exp(c[1])


def panel_window(ax, data, window, legend):
    win = data["windows"][f"{window[0]}-{window[1]}"]
    T = np.array(win["T"])
    rh = np.array(win["rho"])
    aZ = np.abs(np.array(win["Z"]))
    ax.plot(T, rh, color=PURPLE, lw=1.3,
            label=r"$\rho$, the slope of $N_{\ast}$")
    ax.axhline(1.0, color="0.55", ls=":", lw=1.0)
    ax.set_xlim(*window)
    ax.set_ylim(0, max(5.2, rh.max() * 1.08))
    ax.set_xlabel(r"$T$")
    ax.set_ylabel(r"$\rho$", color=PURPLE)
    ax.grid(True, ls=":", alpha=0.35)
    axr = ax.twinx()
    axr.plot(T, aZ, color=NEON, lw=1.0, alpha=0.9, label=r"$|Z|$")
    axr.set_ylabel(r"$|Z|$", color=NEON)
    axr.set_ylim(0, aZ.max() * 1.18)
    for x in win["ords"]:
        ax.plot(x, 1.0, "o", ms=3.4, mfc=NEON, mec=NEON, zorder=5)
    if legend:
        h1, l1 = ax.get_legend_handles_labels()
        h2, l2 = axr.get_legend_handles_labels()
        ax.legend(h1 + h2, l1 + l2, loc="upper center", fontsize=9.5,
                  framealpha=0.95, ncol=2, columnspacing=1.0, handlelength=1.6)
    ax.set_title(rf"${window[0]}\leq T\leq{window[1]}$"
                 rf" (${win['t_lo']:.1f}\leq t\leq{win['t_hi']:.1f}$,"
                 rf" {len(win['ords'])} ordinates)", fontsize=10.5)
    print(f"window {window}: rho {rh.min():.3f} to {rh.max():.3f},"
          f" max |Z| {aZ.max():.3f} at T = {T[aZ.argmax()]:.4f}"
          f" where rho = {rh[aZ.argmax()]:.3f}")


def scatter(ax, data, key, xlabel, title, logx):
    for (blk, col, mk) in zip(data["blocks"], COLORS, MARKERS):
        rows = blk["rows"]
        x = np.array([r[key] for r in rows])
        y = np.array([r["p"] for r in rows])
        # quoted against rho itself, though the axis carries 1/rho
        sp = corr(rank(x.tolist()), rank(y.tolist()))
        if key == "rho":
            x = 1.0 / x
        ax.plot(x, y, mk, ms=4.0, mfc=col, mec="k", mew=0.3, alpha=0.85,
                label=rf"$\gamma_{{{blk['n0']}}}$, $t\approx{blk['t_lo']:.0f}$"
                      rf" ($r_s={sp:+.2f}$)")
    ax.set_yscale("log")
    if logx:
        ax.set_xscale("log")
        allx = np.concatenate([1.0 / np.array([r["rho"] for r in b["rows"]])
                               for b in data["blocks"]])
        ally = np.concatenate([np.array([r["p"] for r in b["rows"]])
                               for b in data["blocks"]])
        e, a = fit(allx, ally)
        xs = np.linspace(allx.min(), allx.max(), 40)
        ax.plot(xs, a * xs ** e, "-", color="0.3", lw=1.1, zorder=0,
                label=rf"$\propto\rho^{{-{e:.2f}}}$")
    else:
        ax.axvline(0.0, color="0.55", ls=":", lw=1.0)
    ax.set_xlabel(xlabel)
    ax.set_ylabel(r"$|Z|_{\max}$ in the gap, detrended")
    ax.grid(True, which="both", ls=":", alpha=0.35)
    ax.legend(loc="upper left", fontsize=9.0, framealpha=0.95,
              handlelength=1.2, borderpad=0.4)
    ax.set_title(title, fontsize=10.5)


def main() -> None:
    data = load()
    for blk in data["blocks"]:
        rows = blk["rows"]
        rh = [r["rho"] for r in rows]
        p = [r["p"] for r in rows]
        fall = [r["fall"] for r in rows]
        print(f"gamma_{blk['n0']}: rho vs peak {corr(rank(rh), rank(p)):+.3f},"
              f" fall vs peak {corr(rank(fall), rank(p)):+.3f},"
              f" median |Z|max {st.median(r['peak'] for r in rows):.3f}")

    fig = plt.figure(figsize=(9.2, 9.1))
    gs = fig.add_gridspec(3, 2, height_ratios=[0.85, 0.85, 1.15])
    panel_window(fig.add_subplot(gs[0, :]), data, WINDOWS[0], True)
    panel_window(fig.add_subplot(gs[1, :]), data, WINDOWS[1], False)
    scatter(fig.add_subplot(gs[2, 0]), data, "rho",
            r"$1/\rho$ at the hump (flatter $N_{\ast}$ to the right)",
            "flatness at the hump against its height", True)
    scatter(fig.add_subplot(gs[2, 1]), data, "fall",
            r"$\rho'(\gamma_n)$, at the ordinate behind the hump",
            "the same heights, forecast one ordinate early", False)

    fig.tight_layout(h_pad=2.2, w_pad=2.0)
    os.makedirs(OUTDIR, exist_ok=True)
    for ext in ("pdf", "png"):
        tmp = os.path.join("/tmp", f"{BASENAME}.{ext}")
        fig.savefig(tmp, dpi=190 if ext == "png" else None)
        shutil.copyfile(tmp, os.path.join(OUTDIR, f"{BASENAME}.{ext}"))
        print("wrote", os.path.join(OUTDIR, f"{BASENAME}.{ext}"))
    plt.close(fig)


if __name__ == "__main__":
    main()
