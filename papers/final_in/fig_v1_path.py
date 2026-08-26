#!/usr/bin/env python3
"""
fig_v1_path.py
==============

The tip of V1, the free-vector sum of the first parts of the forward
links, traced in the complex plane on σ = 1/2 as T runs from 6 to 7.

Run:  python3 fig_v1_path.py
"""

from __future__ import annotations

import os

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.collections import LineCollection

from fig1_spiral_summands import OUTDIR
from probe_half_link_sums import load_zero_T, v1_v2_at, I_of_T

BASENAME = "fig_v1_path"
T_LO, T_HI = 6.0 + 1e-4, 7.0 - 1e-4
N_PATH = 1600
T_SNAP = 6.18
FIRST = "#0b7a75"
ZEROC = "#d62728"
SNAPC = "#222222"


def zeros_in(lo, hi):
    Ts = load_zero_T(float(I_of_T(hi + 0.05)))
    return Ts[(Ts > lo) & (Ts < hi)]


def main():
    Ts = np.linspace(T_LO, T_HI, N_PATH)
    near = {}
    V, used = [], []
    for T in Ts:
        rec = v1_v2_at(float(T), near)
        if rec is None:
            continue
        V.append(rec["V1"])
        used.append(rec["T"])
    V = np.array(V, complex)
    used = np.array(used)

    pts = np.column_stack((V.real, V.imag))
    segs = np.stack((pts[:-1], pts[1:]), axis=1)
    fig, ax = plt.subplots(figsize=(7.2, 6.4))
    lc = LineCollection(segs, cmap="viridis", norm=plt.Normalize(T_LO, T_HI), lw=1.6, zorder=3)
    lc.set_array(used[:-1])
    ax.add_collection(lc)
    cb = fig.colorbar(lc, ax=ax, fraction=0.046, pad=0.03)
    cb.set_label(r"$T$")

    ax.plot(0, 0, "o", color="k", ms=5, zorder=6)
    ax.annotate("$O$", (0, 0), textcoords="offset points", xytext=(-12, -12), fontsize=11)

    def at_T(T):
        k = int(np.argmin(np.abs(used - T)))
        return V[k]

    z = at_T(T_SNAP)
    ax.plot(z.real, z.imag, "o", color=SNAPC, ms=6, zorder=7)
    ax.annotate(rf"$T={T_SNAP}$", (z.real, z.imag),
                textcoords="offset points", xytext=(7, 6), fontsize=10)

    for T in zeros_in(T_LO, T_HI):
        z = at_T(float(T))
        ax.plot(z.real, z.imag, "o", color=ZEROC, ms=4.5, zorder=6)

    ax.set_aspect("equal")
    ax.set_xlabel(r"$\mathrm{Re}\,V_1$")
    ax.set_ylabel(r"$\mathrm{Im}\,V_1$")
    ax.set_title(r"$V_1$ on $\sigma=\frac{1}{2}$, $6<T<7$")
    ax.grid(alpha=0.25, lw=0.4)
    ax.plot([], [], "o", color=ZEROC, ms=4.5, label="zeta zeros")
    ax.plot([], [], "o", color=SNAPC, ms=6, label=rf"$T={T_SNAP}$")
    ax.legend(loc="upper right", fontsize=8.5, framealpha=0.92)
    fig.tight_layout()

    os.makedirs(OUTDIR, exist_ok=True)
    for ext in ("pdf", "png"):
        fig.savefig(os.path.join(OUTDIR, f"{BASENAME}.{ext}"), dpi=200)
    print(f"kept {used.size}/{N_PATH}  "
          f"Re in [{V.real.min():.3f}, {V.real.max():.3f}]  "
          f"Im in [{V.imag.min():.3f}, {V.imag.max():.3f}]")
    print("wrote", os.path.join(OUTDIR, f"{BASENAME}.pdf"))


if __name__ == "__main__":
    main()
