#!/usr/bin/env python3
"""Figure for §12.5: hunting large |zeta| with the first few links.

Left, how much of a unit interval's largest |Z| is captured by evaluating Z only
at the strongest peaks of the K-link score S_K, against K.  Right, the interval
maximum itself against sqrt(T), together with the link ceiling
2 sum_{n<=m} n^{-1/2}, which is the envelope 2L1 with every link aligned.

Run:  python3 fig_large_values.py
"""

from __future__ import annotations

import os
import shutil

import matplotlib.pyplot as plt
import numpy as np

from check_large_values import KS, RANGE, TOPS, load, spear

HERE = os.path.dirname(os.path.abspath(__file__))
OUTDIR = os.path.join(HERE, "figures")
BASENAME = "fig_large_values"

NEON = "#ff2020"
PURPLE = "#7f2fbf"
TEAL = "#0aa6a6"
COLORS = (PURPLE, TEAL, "#c9701a")
MARKERS = ("o", "s", "^")
SHOW_TOPS = (1, 3, 5)


def panel_capture(ax, rows):
    K = np.array(KS, dtype=float)
    for top, col, mk in zip(SHOW_TOPS, COLORS, MARKERS):
        y = np.array([np.mean([r["capture"][str(k)][str(top)] for r in rows])
                      for k in KS])
        lo = np.array([min(r["capture"][str(k)][str(top)] for r in rows)
                       for k in KS])
        ax.plot(K, y, mk + "-", ms=4.6, lw=1.2, color=col, mec="k", mew=0.3,
                label=rf"test the top {top} peak{'s' if top > 1 else ''}")
        ax.fill_between(K, lo, y, color=col, alpha=0.12, lw=0)
        print(f"  top{top}: capture {y[0]:.3f} at K={KS[0]}"
              f" to {y[-1]:.3f} at K={KS[-1]}")
    ax.axhline(1.0, color="0.55", ls=":", lw=1.0)
    ax.set_xlabel(r"links $K$ kept in the score $S_K$")
    ax.set_ylabel(r"fraction of the interval's $\max|Z|$ found")
    ax.set_ylim(0.4, 1.04)
    ax.set_xticks(list(KS))
    ax.grid(True, ls=":", alpha=0.35)
    ax.legend(loc="lower right", fontsize=9.5, framealpha=0.95)
    ax.set_title("cost of the search, mean over the intervals"
                 "\n(shading down to the worst interval)", fontsize=10)


def panel_growth(ax, rows):
    T = np.array([float(r["T"]) for r in rows])
    M = np.array([r["M"] for r in rows])
    ceil = np.array([r["ceiling"] for r in rows])
    x = np.sqrt(T)
    ax.plot(x, ceil, "s--", ms=4.0, lw=1.1, color=PURPLE, mec="k", mew=0.3,
            label=r"link ceiling $2\sum_{n\leq m}n^{-1/2}$")
    ax.plot(x, M, "o-", ms=4.6, lw=1.2, color=NEON, mec="k", mew=0.3,
            label=r"$\max|Z|$ on $[T,T+1]$")
    c = np.polyfit(np.log(T), np.log(M), 1)
    xs = np.linspace(x.min(), x.max(), 40)
    ax.plot(xs, np.exp(c[1]) * xs ** (2 * c[0]), "-", color="0.35", lw=1.0,
            zorder=0, label=rf"fit ${np.exp(c[1]):.2f}\,T^{{{c[0]:.3f}}}$")
    ticks = [t for t in (5, 8, 12, 16, 20, 23) if T.min() <= t <= T.max()]
    ax.set_xticks([np.sqrt(t) for t in ticks])
    ax.set_xticklabels([str(t) for t in ticks])
    ax.set_xlabel(r"$T$, on a $\sqrt{T}$ scale")
    ax.set_ylabel(r"$|Z|$")
    ax.grid(True, ls=":", alpha=0.35)
    ax.legend(loc="upper left", fontsize=9.5, framealpha=0.95)
    ax.set_title(r"maximum and ceiling, both straight in $\sqrt{T}$",
                 fontsize=10)
    res = M / np.sqrt(T)
    S10 = [r["peak"]["10"] for r in rows]
    print(f"  max|Z|/sqrt(T) mean {res.mean():.3f} sd {res.std():.3f};"
          f" M/ceiling {(M / ceil).max():.3f} to {(M / ceil).min():.3f}")
    print(f"  S10 vs detrended max: spearman {spear(S10, res):+.3f}")


def main() -> None:
    rows = load(RANGE)
    print(f"{len(rows)} intervals, T = {RANGE[0]} to {RANGE[1]}")
    fig, axes = plt.subplots(1, 2, figsize=(9.8, 4.3))
    panel_capture(axes[0], rows)
    panel_growth(axes[1], rows)
    fig.tight_layout(w_pad=2.0)
    os.makedirs(OUTDIR, exist_ok=True)
    for ext in ("pdf", "png"):
        tmp = os.path.join("/tmp", f"{BASENAME}.{ext}")
        fig.savefig(tmp, dpi=190 if ext == "png" else None)
        shutil.copyfile(tmp, os.path.join(OUTDIR, f"{BASENAME}.{ext}"))
        print("wrote", os.path.join(OUTDIR, f"{BASENAME}.{ext}"))
    plt.close(fig)


if __name__ == "__main__":
    main()
