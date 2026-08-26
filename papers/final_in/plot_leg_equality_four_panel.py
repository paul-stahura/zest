#!/usr/bin/env python3
"""
Four skinny equal-height leg-equality panels, left → right:
  4.65–4.80 | 9.42–9.46 | 17.2–17.6 | 0–20
Zeros @ σ=1/2 (green); no champions.
Zoom bands linked to the full strip by connection lines.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import LinearSegmentedColormap, LogNorm
from matplotlib.patches import Rectangle

HERE = Path(__file__).resolve().parent
ZEST = HERE.parents[2]
OUT_PNG = HERE / "figures" / "leg_equality_four_panel.png"
OUT_PDF = HERE / "figures" / "leg_equality_four_panel.pdf"
ZEROS_CSV = ZEST / "Assets" / "Resources" / "CriticalStripPoints" / "00 Zeta Zeros.csv"

CMAP = LinearSegmentedColormap.from_list(
    "legs",
    ["#1a0033", "#4a0080", "#8b0000", "#e8a838", "#fff8dc"],
)
FLOOR = 1e-16
CONN_COLOR = "0.25"

PANELS = [
    ("leg_equality_strip_4p65_4p80", r"$4.65 \leq T \leq 4.80$"),
    ("leg_equality_strip_9p42_9p46", r"$9.42 \leq T \leq 9.46$"),
    ("leg_equality_strip_17p2_17p6", r"$17.2 \leq T \leq 17.6$"),
    ("leg_equality_strip_0_20", r"$0 \leq T \leq 20$"),
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
    mean_d = np.fromfile(HERE / f"{stem}_meand.bin", dtype=np.float64).reshape(
        n_t, n_sigma
    )
    sigmas = np.fromfile(HERE / f"{stem}_sigma.bin", dtype=np.float64)
    t_lo, t_hi = float(meta["tMin"]), float(meta["tMax"])
    t_centers = np.linspace(t_lo, t_hi, n_t)
    return {
        "meta": meta,
        "mean_d": mean_d,
        "sigmas": sigmas,
        "t_lo": t_lo,
        "t_hi": t_hi,
        "t_centers": t_centers,
        "sigma_edges": cell_edges(sigmas, meta["sigmaMin"], meta["sigmaMax"]),
        "t_edges": cell_edges(t_centers, t_lo, t_hi),
    }


def draw_panel(ax, data, zeros, norm, *, show_ylabel: bool,
               integer_ticks: bool = False) -> None:
    ax.pcolormesh(
        data["sigma_edges"],
        data["t_edges"],
        np.maximum(data["mean_d"], FLOOR),
        cmap=CMAP,
        norm=norm,
        shading="flat",
        rasterized=True,
    )
    ax.axvline(0.5, color="white", lw=0.55, alpha=0.65, ls="--")
    z = zeros[(zeros >= data["t_lo"]) & (zeros <= data["t_hi"])]
    if z.size:
        ax.plot(
            np.full_like(z, 0.5),
            z,
            "o",
            color="#00c853",
            markersize=2.8,
            markeredgecolor="white",
            markeredgewidth=0.2,
            zorder=5,
            linestyle="None",
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
    zeros = read_index_csv(ZEROS_CSV)

    # Shared color scale from the full strip.
    full = panels[-1][0]
    finite = np.maximum(full["mean_d"], FLOOR)
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
        draw_panel(ax, data, zeros, norm, show_ylabel=(i == 0),
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
        r"Mean leg imbalance $\bar\delta$  (dark purple = equal legs)"
        "\n"
        r"green markers: zeta zeros at $\sigma=\frac{1}{2}$"
        "  ·  "
        r"first three panels are zooms of the outlined bands on the right",
        fontsize=13,
        y=0.98,
    )

    cax = fig.add_axes([0.92, 0.07, 0.018, 0.83])
    sm = plt.cm.ScalarMappable(cmap=CMAP, norm=norm)
    sm.set_array([])
    cbar = fig.colorbar(sm, cax=cax)
    cbar.set_label(r"mean $\delta$ (log; dark = equal)", fontsize=8)
    cbar.ax.tick_params(labelsize=7)

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
