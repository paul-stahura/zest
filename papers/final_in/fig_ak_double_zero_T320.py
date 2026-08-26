#!/usr/bin/env python3
"""AK oval at T ~ 320.57 that brackets two zeros. Dense g_ak = 0 contour."""

import os
import sys

import matplotlib
import numpy as np
from matplotlib.ticker import FuncFormatter
from scipy.optimize import brentq

matplotlib.use("Agg")
import matplotlib.pyplot as plt

sys.path.insert(
    0,
    os.path.join(os.path.dirname(os.path.abspath(__file__)),
                 "..", "..", "equal-leg-density"),
)
import census as CS
import eqleg_fast as F

HERE = os.path.dirname(os.path.abspath(__file__))
M = 320
BOT, TOP = 320.56901546, 320.56913050
N_SIG, N_T = 501, 901
OUT = os.path.join(HERE, "figures", "ak_double_zero_T320.png")
BLUE = "#1f4e79"
GREEN = "#1a7f37"


def flips(y):
    return np.nonzero(np.signbit(y[1:]) != np.signbit(y[:-1]))[0]


def hardy_zeros(m, T, zmode, N_em):
    Z = F.hardy_Z(m, T, N_em=N_em, zeta_mode=zmode)
    out = []
    for i in flips(Z):
        f = lambda x: float(F.hardy_Z(m, np.atleast_1d(x),
                                      N_em=N_em, zeta_mode=zmode)[0])
        out.append(brentq(f, T[i], T[i + 1], xtol=1e-14))
    return out


def has_well(m, sigma, lo, hi, zmode, N_em, n=4001):
    T = np.linspace(lo, hi, n)
    g = F.block(m, T, sigma, zeta_mode=zmode, N_em=N_em)["g_ak"]
    return bool(np.any(g < 0.0) and np.any(g > 0.0) and flips(g).size >= 2)


def tip_width(m, lo, hi, zmode, N_em):
    a, b = 1e-3, 0.42
    if not has_well(m, 0.5 + a, lo, hi, zmode, N_em):
        raise RuntimeError("no oval next to the line")
    for _ in range(36):
        mid = 0.5 * (a + b)
        if has_well(m, 0.5 + mid, lo, hi, zmode, N_em):
            a = mid
        else:
            b = mid
    return a


def main():
    zmode, N_em = CS.route(M)
    height = TOP - BOT
    T_probe = np.linspace(BOT - 3.5 * height, TOP + 3.5 * height, 20001)
    all_zeros = hardy_zeros(M, T_probe, zmode, N_em)
    inside = [z for z in all_zeros if BOT < z < TOP]
    print("nearby zeros:", all_zeros)
    print("zeros inside:", inside)
    a = tip_width(M, BOT - 0.4 * height, TOP + 0.4 * height, zmode, N_em)
    print(f"tip half-width {a:.5f}  sigma {0.5 - a:.4f} to {0.5 + a:.4f}")

    pad = 0.55 * height
    T_lo, T_hi = BOT - pad, TOP + pad
    sig = np.linspace(0.5 - a - 0.035, 0.5 + a + 0.035, N_SIG)
    T = np.linspace(T_lo, T_hi, N_T)
    G = np.empty((N_T, N_SIG))
    for j, s in enumerate(sig):
        G[:, j] = F.block(M, T, s, zeta_mode=zmode, N_em=N_em)["g_ak"]
        if j % 80 == 0:
            print(f"  grid {j + 1}/{N_SIG}")
    j0 = int(np.argmin(np.abs(sig - 0.5)))
    if 0 < j0 < sig.size - 1:
        G[:, j0] = np.minimum(G[:, j0 - 1], G[:, j0 + 1])

    t = np.array([float(F.I_of_T(x)) for x in T])
    t_in = [float(F.I_of_T(z)) for z in inside]
    t_all = [float(F.I_of_T(z)) for z in all_zeros]
    gap = t_in[1] - t_in[0]
    mean = 2 * np.pi / np.log(t_in[0] / (2 * np.pi))
    print(f"t = {t_in[0]:.3f}, {t_in[1]:.3f}; gap/mean = {gap / mean:.3f}")

    fig, axes = plt.subplots(1, 2, figsize=(10.4, 5.8), layout="constrained")
    for ax, zeros_y, labels, ylab, title, fmt in (
        (axes[0], all_zeros,
         [f"$T={inside[0]:.6f}$", f"$T={inside[1]:.6f}$"],
         r"$T$", r"index $T$", lambda v, _p: f"{v:.6f}"),
        (axes[1], t_all,
         [f"$t={t_in[0]:.2f}$", f"$t={t_in[1]:.2f}$"],
         r"$t$", r"true scale in $t=I(T)$", lambda v, _p: f"{v:.2f}"),
    ):
        yy = T if ax is axes[0] else t
        ax.contour(sig, yy, G, levels=[0.0], colors=[BLUE], linewidths=2.0)
        ax.axvline(0.5, color="#c4a000", lw=1.1, zorder=2)
        for z, zy in zip(all_zeros, zeros_y):
            on = BOT < z < TOP
            if zy < yy.min() or zy > yy.max():
                continue
            ax.plot(0.5, zy, "o", color=GREEN if on else "0.35",
                    ms=8.5 if on else 5, zorder=5,
                    markeredgecolor="white", markeredgewidth=0.6)
        dy = 0.12 * (yy.max() - yy.min())
        ax.annotate(labels[0], xy=(0.5, zeros_y[all_zeros.index(inside[0])]),
                    xytext=(0.58, zeros_y[all_zeros.index(inside[0])] - dy),
                    fontsize=8, color=GREEN,
                    arrowprops=dict(arrowstyle="->", color=GREEN, lw=0.75))
        ax.annotate(labels[1], xy=(0.5, zeros_y[all_zeros.index(inside[1])]),
                    xytext=(0.58, zeros_y[all_zeros.index(inside[1])] + dy),
                    fontsize=8, color=GREEN,
                    arrowprops=dict(arrowstyle="->", color=GREEN, lw=0.75))
        ax.set_xlim(sig[0], sig[-1])
        ax.set_xlabel(r"$\sigma$")
        ax.set_ylabel(ylab)
        ax.set_title(title)
        ax.grid(alpha=0.22, lw=0.4)
        ax.yaxis.set_major_formatter(FuncFormatter(fmt))
        if ax is axes[0]:
            ax.axhline(BOT, color="0.45", ls="--", lw=0.7)
            ax.axhline(TOP, color="0.45", ls="--", lw=0.7)
        else:
            ax.plot([], [], color=BLUE, lw=1.7, label="equal-leg oval")
            ax.plot([], [], "o", color=GREEN, ms=8, label="zeros inside")
            ax.plot([], [], "o", color="0.35", ms=5, label="neighbors")
            ax.legend(loc="upper right", framealpha=0.92, fontsize=8)

    fig.suptitle(r"AK oval holding two zeros, $T\approx 320.57$",
                 y=1.02, fontsize=12)
    fig.savefig(OUT, dpi=200, bbox_inches="tight")
    fig.savefig(OUT.replace(".png", ".pdf"), bbox_inches="tight")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
