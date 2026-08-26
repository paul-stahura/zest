#!/usr/bin/env python3
"""Figure for §12.5: the two envelopes of |zeta| on the critical line.

Each panel carries three curves: the upper envelope 2L, the modulus |zeta|, and
the lower envelope 2L|1 - theta2/pi|, all for one reflection-symmetric split.
The left column takes the split at the partial summand, B1 = Sigma1 + R1ps, and
the right column the velocity split of (eq:vel-split), whose offset vanishes at
every extremum of Z and whose upper envelope is therefore touched once in every
gap.

Run:  python3 fig_envelope.py
"""

from __future__ import annotations

import json
import os
import shutil

import matplotlib.pyplot as plt
import mpmath as mp
import numpy as np

from check_envelope import parts, zeros_in
from check_counting_curve import offset
from fig_counting_index import I_of_T, T_of_I

mp.mp.dps = 25

HERE = os.path.dirname(os.path.abspath(__file__))
OUTDIR = os.path.join(HERE, "figures")
BASENAME = "fig_envelope"
CACHE = os.path.join(HERE, "envelope_cache.json")

WINDOWS = ((12.5, 12.6),)
SPLITS = (("ps", "split at the partial summand"),
          ("star", "velocity split"))
NPTS = 900

NEON = "#ff2020"
TEAL = "#0aa6a6"


def window_data(window):
    """The three curves for both splits, plus the zeros and the touches."""
    T = np.linspace(*window, NPTS)
    t = [I_of_T(mp.mpf(x)) for x in T]
    out = {"T": T.tolist(), "t_lo": float(t[0]), "t_hi": float(t[-1])}
    az = [float(parts(u, "ps")[0]) for u in t]
    out["absz"] = az
    for key, _ in SPLITS:
        L = [float(parts(u, key)[1]) for u in t]
        uu = [float(parts(u, key)[3]) for u in t]
        out[key] = {"upper": [2 * x for x in L],
                    "lower": [2 * x * abs(1 - v) for x, v in zip(L, uu)],
                    "u": uu}
    zs = zeros_in(mp.mpf(t[0]), mp.mpf(t[-1]))
    out["ords"] = [T_of_I(float(z)) for z in zs]
    # touches of the upper envelope: the zeros of the offset h, one per gap
    for key, _ in SPLITS:
        touch = []
        for a, b in zip(zs, zs[1:]):
            if float(offset(a, key)) * float(offset(b, key)) < 0:
                r = mp.findroot(lambda u: offset(u, key), (a, b),
                                solver="bisect", tol=1e-18)
                touch.append(T_of_I(float(r)))
        out[key]["touch"] = touch
    return out


def load():
    data = {}
    if os.path.exists(CACHE):
        with open(CACHE) as fh:
            data = json.load(fh)
    fresh = False
    for w in WINDOWS:
        key = f"{w[0]}-{w[1]}"
        if key not in data:
            data[key] = window_data(w)
            print(f"window {key} done, {len(data[key]['ords'])} zeros,"
                  f" touches: "
                  + ", ".join(f"{k} {len(data[key][k]['touch'])}"
                              for k, _ in SPLITS))
            fresh = True
    if fresh:
        with open(CACHE, "w") as fh:
            json.dump(data, fh)
    return data


def panel(ax, win, window, key, title, legend):
    T = np.array(win["T"])
    az = np.array(win["absz"])
    up = np.array(win[key]["upper"])
    dn = np.array(win[key]["lower"])
    ax.fill_between(T, dn, up, color="0.88", lw=0, zorder=0)
    ax.plot(T, up, color=NEON, lw=1.2, label=r"$2L_1$")
    ax.plot(T, az, color="k", lw=1.1, label=r"$|\zeta|$")
    ax.plot(T, dn, color=TEAL, lw=1.1,
            label=r"$2L_1\,|1-\vartheta_2/\pi|$")
    for x in win["ords"]:
        ax.plot(x, 0.0, "o", ms=3.4, mfc=NEON, mec=NEON, zorder=5,
                clip_on=False)
    for x in win[key]["touch"]:
        ax.plot(x, np.interp(x, T, az), "o", ms=5.2, mfc="none", mec="k",
                mew=0.8, zorder=6)
    ax.set_xlim(*window)
    ax.set_ylim(0, up.max() * 1.06)
    ax.set_xlabel(r"$T$")
    ax.grid(True, ls=":", alpha=0.35)
    ax.set_title(rf"{title}, {len(win[key]['touch'])} touches in"
                 rf" {len(win['ords']) - 1} gaps", fontsize=10)
    if legend:
        ax.legend(loc="upper left", fontsize=9.5, framealpha=0.95,
                  handlelength=1.9)
    print(f"  {key} on {window}: max 2L1 {up.max():.3f}, max |zeta|"
          f" {az.max():.3f}, mean |zeta|/2L1 {np.mean(az / up):.4f},"
          f" touches {len(win[key]['touch'])}")


def main() -> None:
    data = load()
    fig, axes = plt.subplots(len(WINDOWS), 2, squeeze=False,
                             figsize=(11.4, 3.9 * len(WINDOWS)))
    for row, w in enumerate(WINDOWS):
        win = data[f"{w[0]}-{w[1]}"]
        print(f"window {w}: t = {win['t_lo']:.1f} .. {win['t_hi']:.1f},"
              f" {len(win['ords'])} zeros")
        for col, (key, title) in enumerate(SPLITS):
            panel(axes[row][col], win, w, key, title,
                  legend=(row == 0 and col == 0))
        axes[row][0].set_ylabel(rf"$\sigma=1/2$, ${w[0]}\leq T\leq{w[1]}$",
                                fontsize=9.5)

    fig.tight_layout(h_pad=1.8, w_pad=1.6)
    os.makedirs(OUTDIR, exist_ok=True)
    for ext in ("pdf", "png"):
        tmp = os.path.join("/tmp", f"{BASENAME}.{ext}")
        fig.savefig(tmp, dpi=190 if ext == "png" else None)
        shutil.copyfile(tmp, os.path.join(OUTDIR, f"{BASENAME}.{ext}"))
        print("wrote", os.path.join(OUTDIR, f"{BASENAME}.{ext}"))
    plt.close(fig)


if __name__ == "__main__":
    main()
