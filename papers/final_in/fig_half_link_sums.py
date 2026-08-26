#!/usr/bin/env python3
"""
fig_half_link_sums.py
=====================

Each forward link k = 0..m-1 is cut by its reverse crossing partner into
a first part (joint to crossing) and a second part (crossing to next
joint). The bisector link k = m contributes only its first part, the
stub from Sigma1 to B1.

This figure sums those pieces as free vectors:

    V1 = sum first parts, including the bisector stub
    V2 = sum second parts, no bisector second part

and draws V1 from the origin and V2 from the tip of V1. They add to B1.

Run:  python3 fig_half_link_sums.py
"""

import os

import matplotlib.pyplot as plt
import mpmath as mp
from matplotlib.patches import FancyArrowPatch

from fig1_spiral_summands import C, OUTDIR
from fig_d1_any_link import hat_d1, sample

BASENAME = "fig_half_link_sums"
SIGMA = mp.mpf("0.5")
T = 6.18
FIRST = "#0b7a75"
SECOND = "#7b2d8e"
CHAIN = "#9bb8d3"
STUB = "#d62728"
CROSS = "#e6b422"
B1C = "#333333"

mp.mp.dps = 30


def arrow(ax, start, end, color, lw, label=None, z=6):
    ax.add_patch(
        FancyArrowPatch(
            (start.real, start.imag),
            (end.real, end.imag),
            arrowstyle="-|>",
            mutation_scale=16,
            lw=lw,
            color=color,
            zorder=z,
        )
    )
    if label:
        mid = start + 0.55 * (end - start)
        ax.annotate(
            label,
            (mid.real, mid.imag),
            textcoords="offset points",
            xytext=(6, 6),
            fontsize=11,
            color=color,
            zorder=z + 1,
        )


def main():
    s, ch, R, m, a2, fwd, rev = sample(T)
    v_bis = mp.power(m + 1, -s)
    parts1, parts2, crosses, fracs = [], [], [], []
    for k in range(m + 1):
        p = hat_d1(k, s, ch, R, m, a2, fwd, rev, 0.5)
        if p is None:
            raise SystemExit(f"no crossing fraction on link {k}")
        v = (fwd[k + 1] - fwd[k]) if k < m else v_bis
        parts1.append(mp.mpf(p) * v)
        if k < m:
            parts2.append((1 - mp.mpf(p)) * v)
        crosses.append(fwd[k] + mp.mpf(p) * v)
        fracs.append(p)

    V1 = sum(parts1, mp.mpc(0))
    V2 = sum(parts2, mp.mpc(0))
    B1 = fwd[m] + fracs[m] * v_bis
    err = abs(V1 + V2 - B1)

    fig, ax = plt.subplots(figsize=(7.2, 6.2))
    js = [C(z) for z in fwd]
    xs = [z.real for z in js]
    ys = [z.imag for z in js]
    ax.plot(xs, ys, "-", color=CHAIN, lw=1.6, zorder=2, label=r"forward chain to $\Sigma_1$")
    ax.plot(xs, ys, "o", color=CHAIN, ms=4, zorder=3)
    b1 = C(B1)
    sig = C(fwd[m])
    ax.plot(
        [sig.real, b1.real],
        [sig.imag, b1.imag],
        "-",
        color=STUB,
        lw=1.8,
        zorder=3,
        label=r"bisector stub $\Sigma_1\to B_1$",
    )

    for k, P in enumerate(crosses):
        p = C(P)
        ax.plot(p.real, p.imag, "o", color=CROSS, ms=5.5, zorder=5)
        if k < m:
            j1, j2 = js[k], js[k + 1]
            ax.plot(
                [j1.real, p.real],
                [j1.imag, p.imag],
                "-",
                color=FIRST,
                lw=2.0,
                alpha=0.35,
                zorder=2,
            )
            ax.plot(
                [p.real, j2.real],
                [p.imag, j2.imag],
                "-",
                color=SECOND,
                lw=2.0,
                alpha=0.35,
                zorder=2,
            )

    v1, v2 = C(V1), C(V2)
    arrow(ax, 0j, v1, FIRST, 2.6, r"$V_1$ (sum of first parts)")
    arrow(ax, v1, v1 + v2, SECOND, 2.6, r"$V_2$ (sum of second parts)")
    ax.plot(
        [0, b1.real],
        [0, b1.imag],
        "--",
        color=B1C,
        lw=1.0,
        zorder=1,
        label=r"$B_1$",
    )
    ax.plot(0, 0, "o", color="k", ms=5, zorder=7)
    ax.plot(b1.real, b1.imag, "o", color=B1C, ms=7, zorder=7)
    ax.annotate(r"$B_1$", (b1.real, b1.imag), textcoords="offset points",
                xytext=(7, -12), fontsize=11)
    ax.annotate(r"$\Sigma_1$", (sig.real, sig.imag), textcoords="offset points",
                xytext=(6, 4), fontsize=10, color=STUB)
    ax.annotate("$O$", (0, 0), textcoords="offset points",
                xytext=(-12, -12), fontsize=11)

    ax.set_aspect("equal")
    ax.set_xlabel(r"$\mathrm{Re}$")
    ax.set_ylabel(r"$\mathrm{Im}$")
    ax.set_title(
        rf"First-part and second-part sums of $\Sigma_1$ at "
        rf"$\sigma=1/2$, $T={T}$ ($V_1+V_2=B_1$ to ${float(err):.1e}$)"
    )
    ax.legend(loc="upper left", fontsize=8.5, framealpha=0.92)
    ax.grid(alpha=0.25, lw=0.4)
    fig.tight_layout()
    os.makedirs(OUTDIR, exist_ok=True)
    for ext in ("pdf", "png"):
        fig.savefig(os.path.join(OUTDIR, f"{BASENAME}.{ext}"), dpi=200)
    print(f"m={m}  |V1+V2-B1|={mp.nstr(err, 4)}")
    print("  k   p_k")
    for k, p in enumerate(fracs):
        print(f"  {k}  {p:.6f}")
    print(f"  V1 = {C(V1)}")
    print(f"  V2 = {C(V2)}")
    print(f"  B1 = {b1}")
    print(f"wrote figures/{BASENAME}.pdf")


if __name__ == "__main__":
    main()
