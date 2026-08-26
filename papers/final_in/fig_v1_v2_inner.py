#!/usr/bin/env python3
"""
fig_v1_v2_inner.py
==================

Normalized inner product of V1 and V2 on σ = 1/2, T from 5 to 5.5:

    Re(conj(V1) V2) / (|V1| |V2|)

which is the cosine of the angle between them as plane vectors.
Zeta zeros are marked as dots on the line y = 1. Retrograde zeros
(those with h_ps h_star < 0) get a vertical purple dashed line.

Run:  python3 fig_v1_v2_inner.py
"""

from __future__ import annotations

import math
import os

import matplotlib.pyplot as plt
import numpy as np

from check_counting_curve import offset
from fig1_spiral_summands import OUTDIR
from probe_half_link_sums import I_of_T, load_zero_T, v1_v2_at

BASENAME = "fig_v1_v2_inner"
T_LO, T_HI = 5.0, 5.5
N_SAMP = 1500
TEAL = "#0b7a75"
ZEROC = "#d62728"
PURPLE = "#7f2fbf"


def retrograde_T(zeros):
    """Ordinates where the ps and star offsets have opposite sign."""
    back = []
    for T in zeros:
        t = float(I_of_T(T))
        if float(offset(t, "ps")) * float(offset(t, "star")) < 0:
            back.append(float(T))
    return np.array(back)


def main():
    Ts = np.linspace(T_LO, T_HI, N_SAMP)
    near = {}
    last_m = None
    T_used, cosang = [], []
    for T in Ts:
        m = int(math.floor(T))
        if m != last_m:
            near = {k: near[k] for k in near if k < m}
            last_m = m
        rec = v1_v2_at(float(T), near)
        if rec is None:
            continue
        V1, V2 = rec["V1"], rec["V2"]
        n1, n2 = abs(V1), abs(V2)
        if n1 < 1e-15 or n2 < 1e-15:
            continue
        T_used.append(rec["T"])
        cosang.append(float(np.real(np.conj(V1) * V2) / (n1 * n2)))
    T_used = np.array(T_used)
    cosang = np.array(cosang)

    zeros = load_zero_T(float(I_of_T(T_HI)))
    zeros = zeros[(zeros >= T_LO) & (zeros <= T_HI)]
    back = retrograde_T(zeros)

    fig, ax = plt.subplots(figsize=(10.4, 4.2))
    ax.axhline(1.0, color="0.75", lw=0.8, zorder=1)
    ax.axhline(0.0, color="0.85", lw=0.6, zorder=1)
    ax.axhline(-1.0, color="0.75", lw=0.8, zorder=1)
    for i, T in enumerate(back):
        ax.axvline(T, color=PURPLE, ls="--", lw=1.05, zorder=2,
                   label="retrograde zero" if i == 0 else None)
    ax.plot(T_used, cosang, color=TEAL, lw=1.15, zorder=3)
    ax.plot(zeros, np.ones(zeros.size), "o", color=ZEROC, ms=2.0,
            zorder=5, label="zeta zeros")
    ax.set_xlim(5, 5.5)
    ax.set_ylim(-1.08, 1.12)
    ax.set_xlabel(r"$T$")
    ax.set_ylabel(r"Re($\overline{V_1} V_2$) / (|V1| |V2|)")
    ax.set_title(r"Normalized inner product of $V_1$ and $V_2$ "
                 r"on $\sigma=1/2$, $T$ from 5 to 5.5")
    ax.legend(loc="lower left", fontsize=8.5, framealpha=0.92)
    ax.grid(alpha=0.25, lw=0.4)
    fig.tight_layout()

    os.makedirs(OUTDIR, exist_ok=True)
    for ext in ("pdf", "png"):
        fig.savefig(os.path.join(OUTDIR, f"{BASENAME}.{ext}"), dpi=200)
    print(f"kept {T_used.size}/{N_SAMP}  "
          f"cos in [{cosang.min():.3f}, {cosang.max():.3f}]  "
          f"{zeros.size} zeros  {back.size} retrograde")
    print("wrote", os.path.join(OUTDIR, f"{BASENAME}.pdf"))


if __name__ == "__main__":
    main()
