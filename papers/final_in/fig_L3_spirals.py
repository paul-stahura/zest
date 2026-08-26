#!/usr/bin/env python3
"""
Forward and reflected partial-sum spirals of L(s, chi_3) at T=6.125,
sigma=1/2, t=I_3(T), reproducing the app's L-function view (LFunctionDrawer /
lFunctionWorkspaceLayer): forward chain of chi_3(n) n^{-s}, phantoms drawn as
zero-term connectors, and the reverse ("refl") chain obtained by reflecting
the forward chain across the perpendicular bisector of origin -> L(s,chi_3).

Output: figures/fig_L3_spirals.{pdf,png}
"""

import math
from pathlib import Path

import matplotlib.pyplot as plt
import mpmath as mp

mp.mp.dps = 30

HERE = Path(__file__).resolve().parent
OUTDIR = HERE / "figures"

P = 3
T = 6.125
SIGMA = 0.5

RED, GREEN, GREY = "#d62728", "#2ca02c", "#c8c8c8"


def chi3(n: int) -> int:
    r = n % 3
    return 0 if r == 0 else (1 if r == 1 else -1)


def i3_of_t(T: float) -> float:
    """I_3(T) with the toggle on (geometric form + gated odd-T offset)."""
    c = (3.0 + math.cos(math.pi * T)) / 2.0
    denom = 3.0 * T
    exact = c * T * math.pi / math.log((denom + c) / (denom - c))
    gate = 0.5 * (1.0 - math.cos(math.pi * T))
    offset = 0.390914 + 0.01712 / (T * T)
    return exact + gate * offset


def l_target(s: complex) -> complex:
    """Analytic L(s, chi_3) = 3^{-s} [zeta(s,1/3) - zeta(s,2/3)]."""
    val = mp.zeta(s, mp.mpf(1) / 3) - mp.zeta(s, mp.mpf(2) / 3)
    val = val * mp.power(3, -s)
    return complex(val)


def forward_chain(n_links: int, s: complex):
    """Partial-sum joints and phantom connectors, as in calculateVectors."""
    joints = [0j]
    phantoms = []
    total = 0j
    for n in range(1, n_links + 1):
        term = n ** (-s)
        cv = chi3(n)
        if cv == 0:
            phantoms.append((total, total + term))
        else:
            total += cv * term
            joints.append(total)
    return joints, phantoms


def reflect_chain(points, target: complex):
    """Reflect across the perpendicular bisector of origin -> target."""
    d = target / abs(target)
    perp = complex(-d.imag, d.real)

    def refl(p: complex) -> complex:
        dot = p.real * perp.real + p.imag * perp.imag
        proj = perp * dot
        return 2 * proj - p + target

    return [refl(p) for p in points]


def main() -> None:
    t = i3_of_t(T)
    s = complex(SIGMA, t)
    n_links = int(2 * T * (T + 1) * P)
    target = l_target(s)
    print(f"T={T}, t=I_3(T)={t:.6f}, links={n_links}, L(s,chi_3)={target:.6f}")

    joints, phantoms = forward_chain(n_links, s)
    r_joints = reflect_chain(joints, target)
    r_phantoms = [tuple(reflect_chain(list(ph), target)) for ph in phantoms]

    fig, ax = plt.subplots(figsize=(7.6, 7.6))

    for i, (a, b) in enumerate(phantoms + r_phantoms):
        ax.plot([a.real, b.real], [a.imag, b.imag], color=GREY, lw=1.0, zorder=1,
                label="phantom links" if i == 0 else None)

    xs = [p.real for p in joints]
    ys = [p.imag for p in joints]
    ax.plot(xs, ys, color=RED, lw=1.1, zorder=3, label="forward spiral")

    rxs = [p.real for p in r_joints]
    rys = [p.imag for p in r_joints]
    ax.plot(rxs, rys, color=GREEN, lw=1.1, zorder=2, label="reverse spiral")

    # Perpendicular bisector of O -> L (the reflection axis)
    mid = target / 2
    d = target / abs(target)
    perp = complex(-d.imag, d.real)
    ext = 2.6
    ax.plot(
        [mid.real - ext * perp.real, mid.real + ext * perp.real],
        [mid.imag - ext * perp.imag, mid.imag + ext * perp.imag],
        color="#1f77b4", lw=0.9, ls="--", zorder=2, label="bisector line",
    )
    ax.plot([mid.real], [mid.imag], marker="o", ms=5, mfc="w", mec="#1f77b4", zorder=4)
    ax.annotate(r"$L(s,\chi_3)/2$", (mid.real, mid.imag),
                textcoords="offset points", xytext=(8, 2), color="#1f77b4")

    # Label the 7th (nonzero) link of each chain; text sits in the empty
    # interior near the bisector line so it clears the spiral strokes.
    for pts, txt_xy in ((joints, (0.82, 1.33)), (r_joints, (1.12, 1.00))):
        a, b = pts[6], pts[7]
        mx, my = (a.real + b.real) / 2, (a.imag + b.imag) / 2
        ax.annotate("Link 6", (mx, my), xytext=txt_xy, textcoords="data",
                    fontsize=9, ha="center", va="center",
                    arrowprops=dict(arrowstyle="->", lw=0.9, color="k"))

    ax.text(0.975, 0.975, r"$T=6.125$", transform=ax.transAxes,
            ha="right", va="top", fontsize=11)

    ax.plot([0], [0], marker="o", ms=5, color="k", zorder=4)
    ax.annotate("$O$", (0, 0), textcoords="offset points", xytext=(6, -10))
    ax.plot([target.real], [target.imag], marker="o", ms=5, mfc="w", mec="k", zorder=4)
    ax.annotate(r"$L(s,\chi_3)$", (target.real, target.imag),
                textcoords="offset points", xytext=(6, 4))

    # Frame on the spirals; the bisector line clips at the axes
    all_pts = joints + r_joints + [q for ph in phantoms + r_phantoms for q in ph]
    pad = 0.12
    ax.set_xlim(min(p.real for p in all_pts) - pad, max(p.real for p in all_pts) + pad)
    ax.set_ylim(min(p.imag for p in all_pts) - pad, max(p.imag for p in all_pts) + pad)

    ax.set_aspect("equal")
    ax.set_xlabel("Re")
    ax.set_ylabel("Im")
    handles, labels = ax.get_legend_handles_labels()
    order = sorted(range(len(labels)), key=lambda i: labels[i] == "phantom links")
    ax.legend([handles[i] for i in order], [labels[i] for i in order],
              loc="lower right", fontsize=9, framealpha=0.95)
    ax.grid(True, alpha=0.2)

    OUTDIR.mkdir(parents=True, exist_ok=True)
    for ext in ("pdf", "png"):
        out = OUTDIR / f"fig_L3_spirals.{ext}"
        fig.savefig(out, bbox_inches="tight", dpi=160)
        print(f"Saved {out}")
    plt.close(fig)


if __name__ == "__main__":
    main()
