#!/usr/bin/env python3
"""
Two spliced strips, the zoom windows of Figures 25 and 26:
  4.65-4.80 | 9.42-9.46
Each strip shows the mean leg imbalance delta-bar (the field of
plot_leg_equality_four_panel.py, purple ramp) on its left half
(sigma < 1/2) and the mean fold deviation tau-bar (the field of
plot_theta2_pi_four_panel.py, blue ramp) on its right half (sigma > 1/2).
Both fields are exactly symmetric under sigma <-> 1-sigma, so no
information is lost.  Color scales match the parent figures (percentiles
of the respective 0-20 full strips).  Zeros @ sigma=1/2 (green).
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import LinearSegmentedColormap, LogNorm

HERE = Path(__file__).resolve().parent
ZEST = HERE.parents[2]
OUT_PNG = HERE / "figures" / "leg_theta2_spliced.png"
OUT_PDF = HERE / "figures" / "leg_theta2_spliced.pdf"
ZEROS_CSV = ZEST / "Assets" / "Resources" / "CriticalStripPoints" / "00 Zeta Zeros.csv"

CMAP_LEGS = LinearSegmentedColormap.from_list(
    "legs",
    ["#1a0033", "#4a0080", "#8b0000", "#e8a838", "#fff8dc"],
)
CMAP_FOLDS = LinearSegmentedColormap.from_list(
    "folds",
    ["#020a2e", "#0b2d6b", "#1663b0", "#79c2e8", "#f4fbff"],
)
FLOOR = 1e-16

WINDOWS = [
    ("4p65_4p80", r"$4.65 \leq T \leq 4.80$"),
    ("9p42_9p46", r"$9.42 \leq T \leq 9.46$"),
]


def cell_edges(centers: np.ndarray, lo: float, hi: float) -> np.ndarray:
    n = centers.size
    edges = np.empty(n + 1, dtype=np.float64)
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
            if len(parts) < 2:
                continue
            ys.append(float(parts[1]))
    return np.asarray(ys, dtype=np.float64)


def load_strip(stem: str) -> dict:
    meta = json.loads((HERE / f"{stem}.json").read_text())
    n_sigma = int(meta["nSigma"])
    n_t = int(meta["nT"])
    field = np.fromfile(HERE / f"{stem}_meand.bin", dtype=np.float64).reshape(
        n_t, n_sigma
    )
    sigmas = np.fromfile(HERE / f"{stem}_sigma.bin", dtype=np.float64)
    t_lo, t_hi = float(meta["tMin"]), float(meta["tMax"])
    t_centers = np.linspace(t_lo, t_hi, n_t)
    return {
        "field": field,
        "sigmas": sigmas,
        "t_lo": t_lo,
        "t_hi": t_hi,
        "sigma_edges": cell_edges(sigmas, meta["sigmaMin"], meta["sigmaMax"]),
        "t_edges": cell_edges(t_centers, t_lo, t_hi),
    }


def norm_from_full(stem: str) -> LogNorm:
    """The parent figures' color scale: percentiles of the 0-20 strip."""
    data = load_strip(stem)
    finite = np.maximum(data["field"], FLOOR)
    finite = finite[np.isfinite(finite)]
    vmin = max(float(np.percentile(finite, 0.5)), FLOOR)
    vmax = float(np.percentile(finite, 50))
    if not (vmin < vmax):
        vmax = vmin * 10
    return LogNorm(vmin=vmin, vmax=vmax)


def draw_half(ax, data, norm, cmap, half: str) -> None:
    field = np.maximum(data["field"], FLOOR)
    mask = data["sigmas"] > 0.5 if half == "left" else data["sigmas"] < 0.5
    masked = np.ma.masked_array(field, np.broadcast_to(mask, field.shape))
    ax.pcolormesh(
        data["sigma_edges"],
        data["t_edges"],
        masked,
        cmap=cmap,
        norm=norm,
        shading="flat",
        rasterized=True,
    )


def main() -> None:
    zeros = read_index_csv(ZEROS_CSV)
    norm_legs = norm_from_full("leg_equality_strip_0_20")
    norm_folds = norm_from_full("theta2_pi_strip_0_20")

    fig, axes = plt.subplots(1, 2, figsize=(11.0, 10.5),
                             gridspec_kw={"wspace": 0.30})
    fig.subplots_adjust(left=0.06, right=0.80, top=0.90, bottom=0.06)

    for ax, (win, label) in zip(axes, WINDOWS):
        legs = load_strip(f"leg_equality_strip_{win}")
        folds = load_strip(f"theta2_pi_strip_{win}")
        draw_half(ax, legs, norm_legs, CMAP_LEGS, "left")
        draw_half(ax, folds, norm_folds, CMAP_FOLDS, "right")
        ax.axvline(0.5, color="white", lw=0.7, alpha=0.8, ls="--")
        z = zeros[(zeros >= legs["t_lo"]) & (zeros <= legs["t_hi"])]
        if z.size:
            ax.plot(np.full_like(z, 0.5), z, "o", color="#00c853",
                    markersize=3.4, markeredgecolor="white",
                    markeredgewidth=0.3, zorder=5, linestyle="None")
        ax.set_xlim(0, 1)
        ax.set_ylim(legs["t_lo"], legs["t_hi"])
        ax.set_aspect("auto")
        ax.set_xlabel(r"$\sigma$", fontsize=8)
        ax.set_title(label, fontsize=9, pad=5)
        ax.tick_params(labelsize=7)
    axes[0].set_ylabel(r"$T$", fontsize=9)

    fig.suptitle(
        r"Left half of each strip: mean leg imbalance $\bar\delta$"
        r" (dark purple = equal legs)"
        "\n"
        r"right half: mean fold deviation $\bar\tau$"
        r" (dark blue = $\vartheta_2=\pi$)"
        "\n"
        r"green markers: zeta zeros at $\sigma=\frac{1}{2}$",
        fontsize=13,
        y=0.985,
    )

    cax1 = fig.add_axes([0.83, 0.06, 0.018, 0.84])
    sm1 = plt.cm.ScalarMappable(cmap=CMAP_LEGS, norm=norm_legs)
    sm1.set_array([])
    cb1 = fig.colorbar(sm1, cax=cax1)
    cb1.set_label(r"mean $\delta$ (log; dark = equal)", fontsize=7.5)
    cb1.ax.tick_params(labelsize=6.5)

    cax2 = fig.add_axes([0.92, 0.06, 0.018, 0.84])
    sm2 = plt.cm.ScalarMappable(cmap=CMAP_FOLDS, norm=norm_folds)
    sm2.set_array([])
    cb2 = fig.colorbar(sm2, cax=cax2)
    cb2.set_label(r"mean $\tau$ (log; dark = folded back)", fontsize=7.5)
    cb2.ax.tick_params(labelsize=6.5)

    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    # Save via /tmp: writing large PDFs in place can stall under file sync.
    for out in (OUT_PNG, OUT_PDF):
        tmp = Path("/tmp") / out.name
        fig.savefig(tmp, dpi=200 if out.suffix == ".png" else None)
        shutil.copyfile(tmp, out)
        print(f"wrote {out}")
    plt.close(fig)


if __name__ == "__main__":
    main()
