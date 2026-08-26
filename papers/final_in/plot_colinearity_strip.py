#!/usr/bin/env python3
"""
Vertical colinearity strip from existing area data (no recompute).

Metric: triangle area of remainder heads (R1ps, R/2, R1ak).
Color: darker ⇔ smaller area (more colinear). Mapping is LogNorm in area —
linear area would look uniform because the heads are always nearly colinear;
log stretch puts almost-all of the dynamic range on the near-zero tip, and
everything above ~median area washes to the same super-light floor.
"""

from __future__ import annotations

import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import LinearSegmentedColormap, LogNorm

HERE = Path(__file__).resolve().parent
STEM = "colinearity_strip_0_50_area_dense"
META = HERE / f"{STEM}.json"
AREA_BIN = HERE / f"{STEM}_area.bin"
SIGMA_BIN = HERE / f"{STEM}_sigma.bin"
OUT_PNG = HERE / "figures" / f"{STEM}.png"
OUT_PDF = HERE / "figures" / f"{STEM}.pdf"

# Light (poor / large area) → dark (colinear / tiny area).
CMAP = LinearSegmentedColormap.from_list(
    "colin_dark",
    [
        "#f7f7f7",  # super light — above the almost-colinear band
        "#d9d9d9",
        "#bdbdbd",
        "#969696",
        "#737373",
        "#525252",
        "#252525",
        "#000000",  # darkest — nearest to exact colinearity
    ],
)

FIG_W = 3.0
FIG_H = 30 * FIG_W
AREA_FLOOR = 1e-18  # match compute ε; avoids log(0)


def cell_edges(centers: np.ndarray, lo: float, hi: float) -> np.ndarray:
    n = centers.size
    edges = np.empty(n + 1, dtype=np.float64)
    edges[0] = lo
    edges[-1] = hi
    edges[1:-1] = 0.5 * (centers[:-1] + centers[1:])
    return edges


def main() -> None:
    meta = json.loads(META.read_text())
    n_sigma = int(meta["nSigma"])
    n_t = int(meta["nT"])
    areas = np.fromfile(AREA_BIN, dtype=np.float64).reshape(n_t, n_sigma)
    sigmas = np.fromfile(SIGMA_BIN, dtype=np.float64)
    assert sigmas.size == n_sigma

    # Clamp for LogNorm; keep a parallel mask of true zeros if any.
    plot_a = np.maximum(areas, AREA_FLOOR)

    finite = plot_a[np.isfinite(plot_a)]
    # Dark end: rare ultra-colinear tip. Light end: ~median — larger areas
    # all share the same super-light color ("above almost-colinear").
    vmin = float(np.percentile(finite, 0.1))
    vmax = float(np.percentile(finite, 50))
    vmin = max(vmin, AREA_FLOOR)
    if not (vmin < vmax):
        vmax = vmin * 10

    t_centers = np.linspace(meta["tMin"], meta["tMax"], n_t)
    sigma_edges = cell_edges(sigmas, meta["sigmaMin"], meta["sigmaMax"])
    t_edges = cell_edges(t_centers, meta["tMin"], meta["tMax"])
    knots = meta["sigmaDensityKnots"]

    fig_w_total = FIG_W + 0.9
    fig, ax = plt.subplots(figsize=(fig_w_total, FIG_H))
    fig.subplots_adjust(left=0.18, right=0.78, top=0.97, bottom=0.02)
    pcm = ax.pcolormesh(
        sigma_edges,
        t_edges,
        plot_a,
        cmap=CMAP,
        norm=LogNorm(vmin=vmin, vmax=vmax),
        shading="flat",
        rasterized=True,  # huge mesh; keep PDF writable
    )
    ax.axvline(0.5, color="0.35", lw=0.6, alpha=0.8, ls="--")
    ax.set_xlabel(r"$\sigma$", fontsize=9)
    ax.set_ylabel(r"$T$", fontsize=9)
    ax.set_xlim(meta["sigmaMin"], meta["sigmaMax"])
    ax.set_ylim(meta["tMin"], meta["tMax"])
    ax.set_aspect(
        1.0
        / 30.0
        * (meta["tMax"] - meta["tMin"])
        / (meta["sigmaMax"] - meta["sigmaMin"])
    )
    ax.set_title(
        r"Remainder-head colinearity  (triangle area; dark = colinear)"
        "\n"
        fr"$T\in[{meta['tMin']},{meta['tMax']}]$ · {n_t} T · {n_sigma} σ "
        r"(ρ(½)=4000)"
        "\n"
        r"LogNorm in area · light above median area",
        fontsize=9,
    )
    cax = fig.add_axes([0.82, 0.02, 0.04, 0.95])
    cbar = fig.colorbar(pcm, cax=cax)
    cbar.set_label(r"triangle area (log scale; dark $\downarrow$)", fontsize=8)
    cbar.ax.tick_params(labelsize=7)

    ax.text(
        0.04,
        0.995,
        (
            f"ρ: 0→{knots['0']}, 0.25→{knots['0.25']}, ½→{knots['0.5']}, "
            f"0.75→{knots['0.75']}, 1→{knots['1']}\n"
            f"LogNorm area [{vmin:.2e}, {vmax:.2e}]  "
            f"(p0.1 → p50; larger → same light)\n"
            f"darker = smaller triangle = more colinear"
        ),
        transform=ax.transAxes,
        va="top",
        ha="left",
        fontsize=7,
        color="black",
        bbox=dict(boxstyle="round,pad=0.25", fc="white", alpha=0.7, ec="none"),
    )

    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT_PNG, dpi=200)
    print(f"wrote {OUT_PNG}")
    try:
        fig.savefig(OUT_PDF)
        print(f"wrote {OUT_PDF}")
    except OSError as exc:
        print(f"PDF skipped ({exc})")
    plt.close(fig)
    print(f"LogNorm area clim: [{vmin:.3e}, {vmax:.3e}]  (p0.1 → median)")
    print(
        f"frac at dark floor (≤vmin): {float(np.mean(plot_a <= vmin)):.4f}; "
        f"frac at light ceiling (≥vmax): {float(np.mean(plot_a >= vmax)):.4f}"
    )


if __name__ == "__main__":
    main()
