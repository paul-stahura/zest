#!/usr/bin/env python3
"""Plot I(T) for the end of §10.1."""

from __future__ import annotations

import os
import numpy as np
import matplotlib.pyplot as plt

OUTDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "figures")
BASENAME = "fig_IT"


def I_of_T(T: np.ndarray) -> np.ndarray:
    return np.pi * (2.0 * T + 1.0) / np.log1p(1.0 / T)


def main() -> None:
    T = np.linspace(0.5, 20.0, 800)
    t = I_of_T(T)
    # two-term Taylor convenience from the paper
    t2 = 2.0 * np.pi * (T ** 2 + T)

    # not sharex: the panels want different scales, linear above and log below
    fig, (ax, ax2) = plt.subplots(
        2, 1, figsize=(7.2, 6.2),
        gridspec_kw=dict(height_ratios=[3, 2], hspace=0.34))
    ax.plot(T, t, color="#1f77b4", lw=2.0, label=r"$I(T)$")
    ax.plot(T, t2, color="#ff7f0e", lw=1.4, ls="--",
            label=r"$2\pi(T^2+T)$ (2-term)")
    ax.set_xlabel(r"$T$")
    ax.set_ylabel(r"$t=I(T)$")
    ax.set_xlim(0.5, 20)
    ax.set_ylim(0, None)
    ax.grid(True, ls=":", alpha=0.4)
    ax.legend(loc="upper left", fontsize=10, framealpha=0.92)
    ax.set_title(r"The index map $t=I(T)$ for the Riemann zeta spiral")

    # the two curves are indistinguishable above: they differ by a constant
    # against values in the thousands. The difference itself moves by only 4%
    # over the range, so what is worth a log axis is its distance from that
    # constant, which is the next term of the expansion.
    ax2.plot(T, np.pi / 3.0 - (t - t2), color="#1f77b4", lw=1.8,
             label=r"$\pi/3-(I(T)-2\pi(T^2+T))$")
    ax2.plot(T, np.pi / (90.0 * T ** 2), color="#ff7f0e", lw=1.2, ls="--",
             label=r"$\pi/90T^2$")
    ax2.set_xscale("log")
    ax2.set_yscale("log")
    ax2.set_xlabel(r"$T$")
    ax2.set_ylabel("shortfall from $\\pi/3$")
    ax2.set_xlim(0.5, 20)
    ax2.grid(True, ls=":", alpha=0.4, which="both")
    ax2.legend(loc="lower left", fontsize=9, framealpha=0.92)

    os.makedirs(OUTDIR, exist_ok=True)
    for ext in ("pdf", "png"):
        path = os.path.join(OUTDIR, f"{BASENAME}.{ext}")
        fig.savefig(path, dpi=200 if ext == "png" else None,
                    bbox_inches="tight")
        print("wrote", path)
    plt.close(fig)


if __name__ == "__main__":
    main()
