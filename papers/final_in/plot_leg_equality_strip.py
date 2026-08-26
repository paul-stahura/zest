#!/usr/bin/env python3
"""
Leg-equality strip T∈[0,20]: mean δ (dark purple = equal legs).
Overlays: champions as red dots at σ=0; zeta zeros as green dots at σ=1.
"""

from __future__ import annotations

import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import LinearSegmentedColormap, LogNorm

HERE = Path(__file__).resolve().parent
ZEST = HERE.parents[2]
STEM = "leg_equality_strip_0_20"
META = HERE / f"{STEM}.json"
MEAND_BIN = HERE / f"{STEM}_meand.bin"
SIGMA_BIN = HERE / f"{STEM}_sigma.bin"
OUT_PNG = HERE / "figures" / f"{STEM}.png"
OUT_PDF = HERE / "figures" / f"{STEM}.pdf"

CHAMPIONS_CSV = (
    ZEST / "web" / "public" / "critical-strip-points" / "champions_149_with_precise_T.csv"
)
ZEROS_CSV = ZEST / "Assets" / "Resources" / "CriticalStripPoints" / "00 Zeta Zeros.csv"

CMAP = LinearSegmentedColormap.from_list(
    "legs",
    ["#1a0033", "#4a0080", "#8b0000", "#e8a838", "#fff8dc"],
)

FIG_W = 3.0
FIG_H = 30 * FIG_W
FLOOR = 1e-16


def cell_edges(centers: np.ndarray, lo: float, hi: float) -> np.ndarray:
    n = centers.size
    edges = np.empty(n + 1, dtype=np.float64)
    edges[0] = lo
    edges[-1] = hi
    edges[1:-1] = 0.5 * (centers[:-1] + centers[1:])
    return edges


def read_index_csv(path: Path) -> np.ndarray:
    """Zest point CSV: real,index — return index column."""
    ys: list[float] = []
    with path.open() as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split(",")
            if len(parts) < 2:
                continue
            ys.append(float(parts[1]))
    return np.asarray(ys, dtype=np.float64)


def main() -> None:
    meta = json.loads(META.read_text())
    n_sigma = int(meta["nSigma"])
    n_t = int(meta["nT"])
    mean_d = np.fromfile(MEAND_BIN, dtype=np.float64).reshape(n_t, n_sigma)
    sigmas = np.fromfile(SIGMA_BIN, dtype=np.float64)

    plot_d = np.maximum(mean_d, FLOOR)
    finite = plot_d[np.isfinite(plot_d)]
    vmin = max(float(np.percentile(finite, 0.5)), FLOOR)
    vmax = float(np.percentile(finite, 50))
    if not (vmin < vmax):
        vmax = vmin * 10

    t_lo, t_hi = float(meta["tMin"]), float(meta["tMax"])
    t_centers = np.linspace(t_lo, t_hi, n_t)
    sigma_edges = cell_edges(sigmas, meta["sigmaMin"], meta["sigmaMax"])
    t_edges = cell_edges(t_centers, t_lo, t_hi)

    champs = read_index_csv(CHAMPIONS_CSV)
    champs = champs[(champs >= t_lo) & (champs <= t_hi)]
    zeros = read_index_csv(ZEROS_CSV)
    zeros = zeros[(zeros >= t_lo) & (zeros <= t_hi)]

    fig_w_total = FIG_W + 0.9
    fig, ax = plt.subplots(figsize=(fig_w_total, FIG_H))
    fig.subplots_adjust(left=0.18, right=0.78, top=0.97, bottom=0.02)
    pcm = ax.pcolormesh(
        sigma_edges,
        t_edges,
        plot_d,
        cmap=CMAP,
        norm=LogNorm(vmin=vmin, vmax=vmax),
        shading="flat",
        rasterized=True,
    )
    ax.axvline(0.5, color="white", lw=0.7, alpha=0.65, ls="--")

    # Champions at σ=0 (red); zeros at σ=1 (green) — markers off the critical line
    # so the dark purple σ=1/2 band stays visible.
    ax.plot(
        np.zeros_like(champs),
        champs,
        "o",
        color="#ff2020",
        markersize=5,
        markeredgecolor="white",
        markeredgewidth=0.4,
        zorder=5,
        label=f"champions (n={champs.size}) @ σ=0",
        linestyle="None",
    )
    ax.plot(
        np.ones_like(zeros),
        zeros,
        "o",
        color="#00c853",
        markersize=4,
        markeredgecolor="white",
        markeredgewidth=0.35,
        zorder=5,
        label=f"zeta zeros (n={zeros.size}) @ σ=1",
        linestyle="None",
    )

    ax.set_xlabel(r"$\sigma$", fontsize=9)
    ax.set_ylabel(r"$T$", fontsize=9)
    ax.set_xlim(meta["sigmaMin"], meta["sigmaMax"])
    ax.set_ylim(t_lo, t_hi)
    ax.set_aspect(1.0 / 30.0 * (t_hi - t_lo) / (meta["sigmaMax"] - meta["sigmaMin"]))
    ax.set_title(
        r"Mean leg imbalance $\bar\delta$  (dark purple = equal legs / bisector)"
        "\n"
        fr"$T\in[{t_lo:g},{t_hi:g}]$ · {n_t} T · {n_sigma} σ/T uniform"
        "\n"
        r"red: champions @ $\sigma=0$ · green: zeta zeros @ $\sigma=1$",
        fontsize=9,
    )
    ax.legend(loc="upper right", fontsize=7, framealpha=0.85)

    cax = fig.add_axes([0.82, 0.02, 0.04, 0.95])
    cbar = fig.colorbar(pcm, cax=cax)
    cbar.set_label(r"mean $\delta$ (log; dark = equal)", fontsize=8)
    cbar.ax.tick_params(labelsize=7)

    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT_PNG, dpi=200)
    print(f"wrote {OUT_PNG}")
    try:
        fig.savefig(OUT_PDF)
        print(f"wrote {OUT_PDF}")
    except OSError as exc:
        print(f"PDF skipped ({exc})")
    plt.close(fig)
    print(f"champions in range: {champs.size}  zeros in range: {zeros.size}")
    print(f"LogNorm clim [{vmin:.3e}, {vmax:.3e}]")


if __name__ == "__main__":
    main()
