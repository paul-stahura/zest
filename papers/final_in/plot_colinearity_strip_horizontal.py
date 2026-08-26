#!/usr/bin/env python3
"""
Replot existing colinearity_strip_0_50_area_dense data horizontally.

Layout (no recompute):
  For each sample (T, σ):
    x = floor(T) + σ     in [0, 50]  (each integer T = one horizontal unit; σ fills it)
    y = T - floor(T)     in [0, 1)   (fractional T on the vertical axis)
  color = log10(1/area)

So the figure is 50 units wide (σ-stacks) × 1 unit tall (frac T).
Bright bands at integer T sit at y→0 in every column — that's the PS-split singularity.
"""

from __future__ import annotations

import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import LinearSegmentedColormap

HERE = Path(__file__).resolve().parent
STEM = "colinearity_strip_0_50_area_dense"
META = HERE / f"{STEM}.json"
BIN = HERE / f"{STEM}.bin"
SIGMA_BIN = HERE / f"{STEM}_sigma.bin"
OUT_PNG = HERE / "figures" / f"{STEM}_horizontal.png"
OUT_PDF = HERE / "figures" / f"{STEM}_horizontal.pdf"

CMAP = LinearSegmentedColormap.from_list(
    "colin",
    ["#0d0887", "#41049d", "#6a00a8", "#b12a90", "#e16462", "#fca636", "#f0f921"],
)

# 50 wide × 1 tall in data → figure width = 50 × height
FIG_H = 2.4
FIG_W = 50 * FIG_H


def main() -> None:
    meta = json.loads(META.read_text())
    n_sigma = int(meta["nSigma"])
    n_t = int(meta["nT"])
    log_inv = np.fromfile(BIN, dtype=np.float64).reshape(n_t, n_sigma)
    sigmas = np.fromfile(SIGMA_BIN, dtype=np.float64)
    t_centers = np.linspace(meta["tMin"], meta["tMax"], n_t)

    # Raster into a regular image: x = ⌊T⌋+σ ∈ [0,50], y = {T} ∈ [0,1]
    # px per integer-T column (σ resolution) and rows for fractional T
    px_per_unit = 80
    x_max = 50.0
    nx = int(x_max * px_per_unit)
    ny = 200
    img = np.full((ny, nx), np.nan, dtype=np.float64)
    counts = np.zeros((ny, nx), dtype=np.int32)

    for j, T in enumerate(t_centers):
        if T >= x_max:
            # T=50 lands on the right edge; fold into last column
            t_base = x_max - 1.0
            y_frac = 0.999
        else:
            t_base = float(np.floor(T))
            y_frac = float(T - t_base)
        iy = min(ny - 1, max(0, int(y_frac * ny)))
        row = log_inv[j]
        for i, sigma in enumerate(sigmas):
            x = t_base + float(sigma)
            if x < 0 or x >= x_max:
                continue
            ix = min(nx - 1, max(0, int(x / x_max * nx)))
            v = row[i]
            if counts[iy, ix] == 0:
                img[iy, ix] = v
            else:
                img[iy, ix] += v
            counts[iy, ix] += 1

    mask = counts > 0
    img[mask] /= counts[mask]

    finite = img[np.isfinite(img)]
    vmin = float(np.percentile(finite, 1))
    vmax = float(np.percentile(finite, 99))

    fig_w_total = FIG_W + 1.0
    fig, ax = plt.subplots(figsize=(fig_w_total, FIG_H + 1.0))
    fig.subplots_adjust(left=0.025, right=0.975, top=0.78, bottom=0.22)

    im = ax.imshow(
        img,
        origin="lower",
        aspect="auto",
        extent=[0, x_max, 0, 1],
        cmap=CMAP,
        vmin=vmin,
        vmax=vmax,
        interpolation="nearest",
    )
    # Equal data units ⇒ Δx=50, Δy=1 draws as a 50∶1 wide strip.
    ax.set_aspect(1.0)

    for n in range(0, 51):
        ax.axvline(n, color="white", lw=0.2, alpha=0.2)
    ax.axhline(0.0, color="white", lw=0.5, alpha=0.5)

    ax.set_xlabel(
        r"$x=\lfloor T\rfloor+\sigma$   "
        r"(each integer $T$ = one unit; $\sigma$ runs $0\to 1$ inside that unit)"
    )
    ax.set_ylabel(r"$\{T\}=T-\lfloor T\rfloor$")
    ax.set_xlim(0, x_max)
    ax.set_ylim(0, 1)
    ax.set_title(
        r"Remainder-head alignment $\log_{10}(1/\mathrm{area})$ — horizontal unwrap"
        "\n"
        r"Same data as $T\in[0,50]$ dense run · "
        r"bright bands at $\{T\}\!\to\!0$ (just after each integer)"
        "\n"
        r"Why integers? $R_{1ps}=d_1 e^{-i\omega}$ with "
        r"$d_1\propto 1/\sin(2\omega+\psi)$, $\omega=t\ln\lceil T\rceil$; "
        r"as $T\to n^+$, the PS split becomes nearly singular and the "
        r"$(R_{1ps},R/2,R_{1ak})$ triangle collapses"
    )

    cax = fig.add_axes([0.025, 0.08, 0.95, 0.04])
    cbar = fig.colorbar(im, cax=cax, orientation="horizontal")
    cbar.set_label(r"$\log_{10}(1/\mathrm{area})$")

    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT_PNG, dpi=100)
    fig.savefig(OUT_PDF)
    plt.close(fig)
    print(f"wrote {OUT_PNG}")
    print(f"wrote {OUT_PDF}")
    print(f"raster {nx}×{ny}  ·  figure ≈ {fig_w_total:.0f}×{FIG_H + 1:.1f} in (50∶1 data)")


if __name__ == "__main__":
    main()
