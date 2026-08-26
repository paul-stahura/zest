#!/usr/bin/env python3
"""
Colinearity of the three first-half remainders R1ps, R1rs(=R/2), R1ak,
zoom band T in [9.42, 9.46], sigma in [0, 1]. Companion of the leg-equality
panels (same window as the 2nd panel of the four-panel figure).

Data: colinearity_strip_9p42_9p46_flat{.bin,_sigma.bin,.json} produced by
web/scripts/remainder-colinearity-heatmap-zoom.mjs.

Output: figures/fig_colinearity_zoom.{pdf,png}
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import LinearSegmentedColormap, LogNorm

HERE = Path(__file__).resolve().parent
ZEST = HERE.parents[2]
STEM = sys.argv[1] if len(sys.argv) > 1 else "colinearity_strip_9p42_9p46_flat"
OUT = sys.argv[2] if len(sys.argv) > 2 else "fig_colinearity_zoom"
ZEROS_CSV = ZEST / "Assets" / "Resources" / "CriticalStripPoints" / "00 Zeta Zeros.csv"

CMAP = LinearSegmentedColormap.from_list(
    "legs",
    ["#1a0033", "#4a0080", "#8b0000", "#e8a838", "#fff8dc"],
)
FLOOR = 1e-16


def cell_edges(centers: np.ndarray, lo: float, hi: float) -> np.ndarray:
    edges = np.empty(centers.size + 1, dtype=np.float64)
    edges[0] = lo
    edges[-1] = hi
    edges[1:-1] = 0.5 * (centers[:-1] + centers[1:])
    return edges


def read_index_csv(path: Path) -> np.ndarray:
    ys: list[float] = []
    with path.open() as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split(",")
            if len(parts) >= 2:
                ys.append(float(parts[1]))
    return np.asarray(ys, dtype=np.float64)


def main() -> None:
    meta = json.loads((HERE / f"{STEM}.json").read_text())
    n_sigma, n_t = int(meta["nSigma"]), int(meta["nT"])
    flat = np.fromfile(HERE / f"{STEM}.bin", dtype=np.float64).reshape(n_t, n_sigma)
    pca = np.fromfile(HERE / f"{STEM}_pca.bin", dtype=np.float64).reshape(n_t, n_sigma)
    sigmas = np.fromfile(HERE / f"{STEM}_sigma.bin", dtype=np.float64)
    t_lo, t_hi = float(meta["tMin"]), float(meta["tMax"])
    t_centers = np.linspace(t_lo, t_hi, n_t)

    zeros = read_index_csv(ZEROS_CSV)
    z = zeros[(zeros >= t_lo) & (zeros <= t_hi)]

    panels = [
        (flat, r"triangle flatness $2\,|\mathrm{area}|/\mathrm{diam}^2$"),
        (pca, r"PCA aspect ratio $\lambda_{\min}/\lambda_{\max}$"),
    ]

    fig, axes = plt.subplots(1, 2, figsize=(9.4, 7.2), sharey=True)
    for ax, (data, label) in zip(axes, panels):
        vals = np.maximum(data, FLOOR)
        norm = LogNorm(vmin=max(vals.min(), FLOOR), vmax=vals.max())
        mesh = ax.pcolormesh(
            cell_edges(sigmas, meta["sigmaMin"], meta["sigmaMax"]),
            cell_edges(t_centers, t_lo, t_hi),
            vals,
            cmap=CMAP,
            norm=norm,
            shading="flat",
            rasterized=True,
        )
        if z.size:
            ax.plot(np.full_like(z, 0.5), z, "o", color="#00c853", markersize=4,
                    markeredgecolor="white", markeredgewidth=0.3, zorder=5,
                    linestyle="None")
        ax.set_xlim(0, 1)
        ax.set_ylim(t_lo, t_hi)
        ax.set_xlabel(r"$\sigma$")
        ax.set_title(label, fontsize=10)
        cbar = fig.colorbar(mesh, ax=ax, fraction=0.07, pad=0.03)
        cbar.ax.tick_params(labelsize=8)
    axes[0].set_ylabel(r"$T$")
    fig.suptitle(
        "Colinearity of $R_{1ps}$, $R_{1rs}$, $R_{1ak}$ (dark = colinear)",
        fontsize=11,
    )
    fig.tight_layout()

    outdir = HERE / "figures"
    outdir.mkdir(exist_ok=True)
    for ext in ("pdf", "png"):
        out = outdir / f"{OUT}.{ext}"
        fig.savefig(out, bbox_inches="tight", dpi=160)
        print(f"Saved {out}")
    plt.close(fig)


if __name__ == "__main__":
    main()
