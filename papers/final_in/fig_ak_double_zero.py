#!/usr/bin/env python3
"""The first AK oval that brackets two zeros, at T ~ 201.72.

A dense (sigma, T) sample of g_ak, then the g = 0 contour. The earlier
bottom-to-top envelope filled the waist and squared the sides; this is the
actual equal-leg curve.
"""

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
M = 201
T_GUESS = 201.71853
N_SIG, N_T = 361, 701
OUT = os.path.join(HERE, "figures", "ak_double_zero_T201.png")
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


def wells(m, sigma, lo, hi, zmode, N_em, n=8001):
    T = np.linspace(lo, hi, n)
    g = F.block(m, T, sigma, zeta_mode=zmode, N_em=N_em)["g_ak"]
    f = lambda x: float(F.block(m, np.atleast_1d(float(x)), sigma,
                                zeta_mode=zmode, N_em=N_em)["g_ak"][0])
    ks = flips(g)
    out = []
    for a, b in zip(ks[0::2], ks[1::2]):
        out.append((brentq(f, T[a], T[a + 1], xtol=1e-14),
                    brentq(f, T[b], T[b + 1], xtol=1e-14)))
    return out


def main():
    zmode, N_em = CS.route(M)
    T_probe = np.linspace(T_GUESS - 5e-4, T_GUESS + 5e-4, 16001)
    all_zeros = hardy_zeros(M, T_probe, zmode, N_em)
    scan_wells = wells(M, 0.51, all_zeros[0] + 1e-6, all_zeros[-1] - 1e-6,
                       zmode, N_em)
    print("wells at sigma=0.51:", scan_wells)
    print("nearby zeros:", all_zeros)
    bot, top = scan_wells[0]
    inside = [z for z in all_zeros if bot < z < top]
    print("zeros inside:", inside)
    for s in (0.505, 0.52, 0.55, 0.58, 0.62, 0.65):
        print(f"  wells at sigma={s:.3f}: {wells(M, s, bot - 8e-5, top + 8e-5, zmode, N_em)}")

    pad = 8e-5
    T_lo, T_hi = bot - pad, top + pad
    sig = np.linspace(0.30, 0.70, N_SIG)
    T = np.linspace(T_lo, T_hi, N_T)
    G = np.empty((N_T, N_SIG))
    for j, s in enumerate(sig):
        G[:, j] = F.block(M, T, s, zeta_mode=zmode, N_em=N_em)["g_ak"]
        if j % 60 == 0:
            print(f"  grid {j + 1}/{N_SIG}")
    # g vanishes on the whole half-line, which would draw a vertical
    # contour there. Copy the off-line sign onto sigma = 1/2 so the
    # contour is only the oval and the two lobes stay joined.
    j0 = int(np.argmin(np.abs(sig - 0.5)))
    if 0 < j0 < sig.size - 1:
        G[:, j0] = np.minimum(G[:, j0 - 1], G[:, j0 + 1])

    t = np.array([float(F.I_of_T(x)) for x in T])
    t_in = [float(F.I_of_T(z)) for z in inside]
    t_all = [float(F.I_of_T(z)) for z in all_zeros]

    fig, axes = plt.subplots(1, 2, figsize=(10.4, 5.8), layout="constrained")
    for ax, y, ylab, title, zeros_y, labels in (
        (axes[0], T, r"$T$", r"index $T$", all_zeros,
         [f"$T={inside[0]:.6f}$", f"$T={inside[1]:.6f}$"]),
        (axes[1], t, r"$t$", r"true scale in $t=I(T)$", t_all,
         [f"$t={t_in[0]:.2f}$", f"$t={t_in[1]:.2f}$"]),
    ):
        yy = T if ax is axes[0] else t
        ax.contour(sig, yy, G, levels=[0.0], colors=[BLUE], linewidths=2.0)
        ax.axvline(0.5, color="#c4a000", lw=1.1, zorder=2)
        for z, zy in zip(all_zeros, zeros_y):
            on = bot < z < top
            if zy < yy.min() or zy > yy.max():
                continue
            ax.plot(0.5, zy, "o", color=GREEN if on else "0.35",
                    ms=8.5 if on else 5, zorder=5,
                    markeredgecolor="white", markeredgewidth=0.6)
        dy = 0.12 * (yy.max() - yy.min())
        ax.annotate(labels[0], xy=(0.5, zeros_y[all_zeros.index(inside[0])]),
                    xytext=(0.575, zeros_y[all_zeros.index(inside[0])] - dy),
                    fontsize=8, color=GREEN,
                    arrowprops=dict(arrowstyle="->", color=GREEN, lw=0.75))
        ax.annotate(labels[1], xy=(0.5, zeros_y[all_zeros.index(inside[1])]),
                    xytext=(0.575, zeros_y[all_zeros.index(inside[1])] + dy),
                    fontsize=8, color=GREEN,
                    arrowprops=dict(arrowstyle="->", color=GREEN, lw=0.75))
        ax.set_xlim(0.30, 0.70)
        ax.set_xlabel(r"$\sigma$")
        ax.set_ylabel(ylab)
        ax.set_title(title)
        ax.grid(alpha=0.22, lw=0.4)
        if ax is axes[0]:
            ax.yaxis.set_major_formatter(FuncFormatter(lambda v, _p: f"{v:.6f}"))
            ax.axhline(bot, color="0.45", ls="--", lw=0.7)
            ax.axhline(top, color="0.45", ls="--", lw=0.7)
        else:
            ax.yaxis.set_major_formatter(FuncFormatter(lambda v, _p: f"{v:.2f}"))
            ax.plot([], [], color=BLUE, lw=1.7, label="equal-leg oval")
            ax.plot([], [], "o", color=GREEN, ms=8, label="zeros inside")
            ax.plot([], [], "o", color="0.35", ms=5, label="neighbors")
            ax.legend(loc="upper right", framealpha=0.92, fontsize=8)

    fig.suptitle("One AK oval holding two zeros", y=1.02, fontsize=12)
    fig.savefig(OUT, dpi=200, bbox_inches="tight")
    fig.savefig(OUT.replace(".png", ".pdf"), bbox_inches="tight")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
