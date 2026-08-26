#!/usr/bin/env python3
"""
Four skinny equal-height collinearity panels, left → right:
  4.65–4.80 | 9.42–9.46 | 16.95–18.05 | 0–20
Same layout as leg_equality_four_panel, but the plotted field
is the PCA aspect ratio lambda_min/lambda_max of the three first-half
remainders (R1ps, R1rs=R/2, R1ak).
Zoom bands linked to the full strip by connection lines.

Data: colinearity_strip_*_pca.bin produced by
web/scripts/remainder-colinearity-heatmap-zoom.mjs.
"""

from __future__ import annotations

import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import LinearSegmentedColormap, LogNorm
from matplotlib.patches import Rectangle

HERE = Path(__file__).resolve().parent
OUT_PNG = HERE / "figures" / "colinearity_four_panel.png"
OUT_PDF = HERE / "figures" / "colinearity_four_panel.pdf"

CMAP = LinearSegmentedColormap.from_list(
    "legs",
    ["#1a0033", "#4a0080", "#8b0000", "#e8a838", "#fff8dc"],
)
FLOOR = 1e-16
CONN_COLOR = "0.25"

PANELS = [
    ("colinearity_strip_4p65_4p80", r"$4.65 \leq T \leq 4.80$"),
    ("colinearity_strip_9p42_9p46", r"$9.42 \leq T \leq 9.46$"),
    ("colinearity_strip_16p95_18p05", r"$16.95 \leq T \leq 18.05$"),
    ("colinearity_strip_0_20", r"$0 \leq T \leq 20$"),
]


def cell_edges(centers: np.ndarray, lo: float, hi: float) -> np.ndarray:
    n = centers.size
    edges = np.empty(n + 1, dtype=np.float64)
    edges[0] = lo
    edges[-1] = hi
    edges[1:-1] = 0.5 * (centers[:-1] + centers[1:])
    return edges


def load_strip(stem: str) -> dict:
    meta = json.loads((HERE / f"{stem}.json").read_text())
    n_sigma = int(meta["nSigma"])
    n_t = int(meta["nT"])
    pca = np.fromfile(HERE / f"{stem}_pca.bin", dtype=np.float64).reshape(
        n_t, n_sigma
    )
    sigmas = np.fromfile(HERE / f"{stem}_sigma.bin", dtype=np.float64)
    t_lo, t_hi = float(meta["tMin"]), float(meta["tMax"])
    t_centers = np.linspace(t_lo, t_hi, n_t)
    return {
        "meta": meta,
        "pca": pca,
        "sigmas": sigmas,
        "t_lo": t_lo,
        "t_hi": t_hi,
        "t_centers": t_centers,
        "sigma_edges": cell_edges(sigmas, meta["sigmaMin"], meta["sigmaMax"]),
        "t_edges": cell_edges(t_centers, t_lo, t_hi),
    }


def draw_panel(ax, data, norm, *, show_ylabel: bool,
               integer_ticks: bool = False) -> None:
    ax.pcolormesh(
        data["sigma_edges"],
        data["t_edges"],
        np.maximum(data["pca"], FLOOR),
        cmap=CMAP,
        norm=norm,
        shading="flat",
        rasterized=True,
    )
    ax.set_xlim(0, 1)
    ax.set_ylim(data["t_lo"], data["t_hi"])
    if integer_ticks:
        ax.set_yticks(np.arange(1, int(np.floor(data["t_hi"])) + 1))
    ax.set_aspect("auto")
    ax.set_xlabel(r"$\sigma$", fontsize=8)
    if show_ylabel:
        ax.set_ylabel(r"$T$", fontsize=9)
    else:
        ax.set_ylabel("")
    ax.tick_params(labelsize=7)


def _fig_point(ax: plt.Axes, xy: tuple[float, float], inv) -> np.ndarray:
    return inv.transform(ax.transData.transform(xy))


def _segments_outside_boxes(
    p0: np.ndarray,
    p1: np.ndarray,
    boxes: list[tuple[float, float, float, float]],
    n: int = 800,
) -> list[tuple[np.ndarray, np.ndarray]]:
    """Split p0→p1 into segments that stay outside axis bboxes (figure coords)."""
    ts = np.linspace(0.0, 1.0, n)
    pts = (1.0 - ts)[:, None] * p0 + ts[:, None] * p1
    inside = np.zeros(n, dtype=bool)
    for x0, x1, y0, y1 in boxes:
        inside |= (
            (pts[:, 0] >= x0)
            & (pts[:, 0] <= x1)
            & (pts[:, 1] >= y0)
            & (pts[:, 1] <= y1)
        )
    segments: list[tuple[np.ndarray, np.ndarray]] = []
    start: int | None = None
    for i, is_in in enumerate(inside):
        if not is_in and start is None:
            start = i
        elif is_in and start is not None:
            if i - 1 > start:
                segments.append((pts[start], pts[i - 1]))
            start = None
    if start is not None and start < n - 1:
        segments.append((pts[start], pts[-1]))
    return segments


def connect_band(
    fig: plt.Figure,
    ax_bg: plt.Axes,
    ax_zoom: plt.Axes,
    ax_full: plt.Axes,
    intervening: list[plt.Axes],
    t_lo: float,
    t_hi: float,
) -> None:
    """Zoom→full connectors, clipped away where they cross intervening panels."""
    inv = fig.transFigure.inverted()
    # Only suppress the line over panels between zoom and full (gutters stay).
    boxes = []
    for ax in intervening:
        b = ax.get_position()
        # Slight pad so the line doesn't peek under spines.
        pad = 0.001
        boxes.append((b.x0 - pad, b.x1 + pad, b.y0 - pad, b.y1 + pad))

    for t in (t_lo, t_hi):
        p0 = _fig_point(ax_zoom, (1.0, t), inv)
        p1 = _fig_point(ax_full, (0.0, t), inv)
        for a, bpt in _segments_outside_boxes(p0, p1, boxes):
            ax_bg.plot(
                [a[0], bpt[0]],
                [a[1], bpt[1]],
                color=CONN_COLOR,
                lw=0.85,
                solid_capstyle="butt",
                clip_on=False,
                zorder=0,
            )
    ax_full.add_patch(
        Rectangle(
            (0.0, t_lo),
            1.0,
            t_hi - t_lo,
            fill=False,
            edgecolor=CONN_COLOR,
            lw=0.9,
            zorder=4,
        )
    )


def main() -> None:
    panels = [(load_strip(stem), label) for stem, label in PANELS]

    # Shared color scale from the full strip.
    full = panels[-1][0]
    finite = np.maximum(full["pca"], FLOOR)
    finite = finite[np.isfinite(finite)]
    vmin = max(float(np.percentile(finite, 0.5)), FLOOR)
    vmax = float(np.percentile(finite, 50))
    if not (vmin < vmax):
        vmax = vmin * 10
    norm = LogNorm(vmin=vmin, vmax=vmax)

    # Four equal-height skinny panels in a row.
    fig_h = 10.5
    fig_w = 11.0
    fig = plt.figure(figsize=(fig_w, fig_h))
    # Full-figure axes for connectors. Lines are clipped out over intervening
    # panels, so they only appear in the gutters (visually behind the strips).
    ax_bg = fig.add_axes([0, 0, 1, 1], zorder=10)
    ax_bg.set_axis_off()
    ax_bg.set_xlim(0, 1)
    ax_bg.set_ylim(0, 1)
    ax_bg.patch.set_visible(False)

    axes = fig.subplots(
        1,
        4,
        gridspec_kw={"width_ratios": [1, 1, 1, 1], "wspace": 0.55},
    )
    fig.subplots_adjust(left=0.05, right=0.90, top=0.90, bottom=0.07)

    for i, (ax, (data, label)) in enumerate(zip(axes, panels)):
        draw_panel(ax, data, norm, show_ylabel=(i == 0),
                   integer_ticks=(i == len(panels) - 1))
        ax.set_title(label, fontsize=9, pad=5)
        # Opaque panel faces so background connector lines are covered.
        ax.set_facecolor("white")
        ax.patch.set_alpha(1.0)
        ax.set_zorder(2 + i)
        ax.patch.set_zorder(2 + i)

    # Finalize layout so data→figure transforms are valid, then draw connectors.
    fig.canvas.draw()
    ax_full = axes[-1]
    for i, (ax, (data, _)) in enumerate(zip(axes[:3], panels[:3])):
        # Lines must not paint over panels between this zoom and the full strip.
        intervening = list(axes[i + 1 : -1])
        connect_band(
            fig, ax_bg, ax, ax_full, intervening, data["t_lo"], data["t_hi"]
        )

    fig.suptitle(
        r"PCA aspect ratio $\lambda_{\min}/\lambda_{\max}$ of "
        r"$(R_{1ps},\,R_{1rs},\,R_{1ak})$  (dark purple = collinear)"
        "\n"
        r"first three panels are zooms of the outlined bands on the right",
        fontsize=10,
        y=0.97,
    )

    cax = fig.add_axes([0.92, 0.07, 0.018, 0.83])
    sm = plt.cm.ScalarMappable(cmap=CMAP, norm=norm)
    sm.set_array([])
    cbar = fig.colorbar(sm, cax=cax)
    cbar.set_label(
        r"$\lambda_{\min}/\lambda_{\max}$ (log; dark = collinear)", fontsize=8
    )
    cbar.ax.tick_params(labelsize=7)

    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT_PNG, dpi=200)
    fig.savefig(OUT_PDF)
    plt.close(fig)
    print(f"wrote {OUT_PNG}")
    print(f"wrote {OUT_PDF}")


if __name__ == "__main__":
    main()
