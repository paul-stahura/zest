#!/usr/bin/env python3
"""
fig_link_frames.py
==================

The Links-tab local frames at sigma = 1/2, two heights in the same
unit: T = 6.18 (top; the running example, t = I(T) ~ 279.85, m = 6)
and T = 6.72 (bottom).  One vertical strip per forward link 0 through
the bisector 6.

Each strip pins that link to the unit interval [0, 1] on the x-axis
(the similarity (p − a)/(b − a)).  In that frame the reflected inverse
chain is drawn as it sits relative to the link: the span band (one turn
of the inverse spiral belonging to this strip, inclusive of both end
links) in blue, and the single inverse link that crosses the frame link
in yellow, with a dot at the crossing.  The window is the Links tab at
unit fraction 0.50: the forward link occupies 50% of each strip.
Forward links are black; inverse numbers take the colour of the stroke
they name.

The bisector strip also carries the yin and yang loci of the reverse
bisector ends as T runs through (6, 7).

Outputs (into ./figures/):
    fig_link_frames.pdf
    fig_link_frames.png

Run:  python3 fig_link_frames.py
"""

import os

import mpmath as mp
import numpy as np
import matplotlib.pyplot as plt

from fig1_spiral_summands import I_of_T, chi, C, OUTDIR

BASENAME = "fig_link_frames"
SIGMA = mp.mpf("0.5")
T_TOP = mp.mpf("6.18")
T_BOT = mp.mpf("6.72")
N_YIN = 280

FORWARD_COLOR = "#111111"
SPAN_COLOR = "#1f77b4"
CROSS_COLOR = "#e6b800"
YIN_COLOR = "#2ca02c"
YANG_COLOR = "#d62728"
AXIS_COLOR = "#b0b0b0"
SEP_COLOR = "#d8d8d8"
BISECTOR_FACE = "#eef5fb"
# Fraction of each strip taken by the unit forward link (the app default is 0.8).
UNIT_FRACTION = 0.50

mp.mp.dps = 25


def to_link_frame(p, a, b):
    """(p − a)/(b − a) as a Python complex: a → 0, b → 1."""
    d = b - a
    r = p - a
    den = d.real * d.real + d.imag * d.imag
    return complex(
        (r.real * d.real + r.imag * d.imag) / den,
        (r.imag * d.real - r.real * d.imag) / den,
    )


def seg_cross(a, b, c, d):
    """Intersection of segments ab and cd, or None."""
    den = (b.real - a.real) * (d.imag - c.imag) - (b.imag - a.imag) * (d.real - c.real)
    if abs(den) < 1e-15:
        return None
    p = ((c.real - a.real) * (d.imag - c.imag) - (c.imag - a.imag) * (d.real - c.real)) / den
    q = ((c.real - a.real) * (b.imag - a.imag) - (c.imag - a.imag) * (b.real - a.real)) / den
    if not (0.0 <= p <= 1.0 and 0.0 <= q <= 1.0):
        return None
    return a + p * (b - a)


def span_edge(t, a):
    return float("inf") if a <= 0 else float(t / (mp.pi * a))


def span_link_range(t, k, m):
    """Band of inverse links drawn in the strip of forward link k."""
    a0 = float(t / (mp.pi * (m + 1)))
    step = (a0 - 1.0) / max(1, m)
    j = m - k
    lo = int(round(span_edge(t, a0 - (j - 1) * step)))
    hi = int(round(span_edge(t, a0 - j * step)))
    return min(lo, hi), max(lo, hi)


def crossing_named(a2, k, m, nmax, fwd, inv):
    """The inverse link that crosses forward link k, and the point."""
    exact = float(a2 / (k + 1)) - 1.0
    named = int(round(exact))
    candidates = sorted(
        [named, named - 1, named + 1, named - 2, named + 2],
        key=lambda i: abs(i - exact),
    )
    if k == m:
        candidates = [k] + [i for i in candidates if i != k]
    a, b = fwd[k], fwd[k + 1]
    for i in candidates:
        if i < 0 or i + 1 >= len(inv):
            continue
        hit = seg_cross(a, b, inv[i], inv[i + 1])
        if hit is not None:
            return i, hit
    if 0 <= named and named + 1 < len(inv):
        return named, None
    return None, None


def compute_chains(T):
    t = I_of_T(mp.mpf(T))
    s = mp.mpc(SIGMA, t)
    m = int(mp.floor(T))
    ch = chi(s)
    zeta = mp.zeta(s)
    nmax = int(mp.floor(t / mp.pi)) + 1
    a2 = t / (2 * mp.pi)

    fwd, z = [0j], mp.mpc(0)
    for n in range(1, nmax + 1):
        z += mp.mpf(n) ** (-s)
        fwd.append(C(z))

    inv, acc = [C(zeta)], mp.mpc(0)
    for n in range(1, nmax + 1):
        acc += mp.mpf(n) ** (s - 1)
        inv.append(C(zeta - ch * acc))

    return dict(t=t, m=m, nmax=nmax, a2=a2, fwd=fwd, inv=inv)


def yin_yang(T):
    t = I_of_T(mp.mpf(T))
    s = mp.mpc(SIGMA, t)
    m = int(mp.floor(T))
    ch = chi(s)
    S1 = mp.fsum(mp.mpf(n) ** (-s) for n in range(1, m + 1))
    S2 = ch * mp.fsum(mp.mpf(n) ** (s - 1) for n in range(1, m + 1))
    R = mp.zeta(s) - S1 - S2
    M1 = mp.mpf(m + 1)
    yin = R * M1 ** s
    yang = yin - ch * M1 ** (2 * s - 1)
    return C(yin), C(yang)


def map_chain(joints, a, b):
    return [to_link_frame(p, a, b) for p in joints]


def stroke_links(ax, framed, lo, hi, color, lw):
    xs, ys = [], []
    for i in range(lo, hi + 1):
        if i + 1 >= len(framed):
            break
        p, q = framed[i], framed[i + 1]
        if xs:
            xs.append(np.nan)
            ys.append(np.nan)
        xs.extend([p.real, q.real])
        ys.extend([p.imag, q.imag])
    if xs:
        ax.plot(xs, ys, "-", color=color, lw=lw, solid_capstyle="round", zorder=2)


def build_frames(data):
    t, m, nmax, a2 = data["t"], data["m"], data["nmax"], data["a2"]
    fwd, inv = data["fwd"], data["inv"]
    frames = []
    for k in range(m + 1):
        a, b = fwd[k], fwd[k + 1]
        i_cross, hit = crossing_named(a2, k, m, nmax, fwd, inv)
        hit_f = to_link_frame(hit, a, b) if hit is not None else None
        frames.append(dict(
            k=k,
            framed_inv=map_chain(inv, a, b),
            span=span_link_range(t, k, m),
            i_cross=i_cross,
            hit=hit_f,
        ))
        print(
            "  k=%d  span=%s  cross=%s  hit=%s"
            % (k, frames[-1]["span"], i_cross,
               None if hit_f is None else (hit_f.real, hit_f.imag))
        )
    return frames


def draw_row(axes, frames, m, nmax, yin_path, yang_path, yin_now, yang_now, xlim, ylim):
    for ax, fr in zip(axes, frames):
        k = fr["k"]
        ax.set_xlim(*xlim)
        ax.set_ylim(*ylim)
        ax.set_aspect("equal", adjustable="box")
        ax.set_xticks([])
        ax.set_yticks([])
        for spine in ax.spines.values():
            spine.set_color(SEP_COLOR)
            spine.set_linewidth(0.8)
        if k == m:
            ax.set_facecolor(BISECTOR_FACE)
        ax.axhline(0.0, color=AXIS_COLOR, lw=0.6, zorder=1)

        lo, hi = fr["span"]
        lo = max(0, lo)
        hi = min(nmax - 1, hi)
        stroke_links(ax, fr["framed_inv"], lo, hi, SPAN_COLOR, 1.15)

        i_cross = fr["i_cross"]
        if i_cross is not None and i_cross + 1 < len(fr["framed_inv"]):
            p = fr["framed_inv"][i_cross]
            q = fr["framed_inv"][i_cross + 1]
            ax.plot(
                [p.real, q.real], [p.imag, q.imag],
                "-", color=CROSS_COLOR, lw=2.15, solid_capstyle="round", zorder=4,
            )

        if k == m:
            yin = np.array(yin_path)
            yang = np.array(yang_path)
            ax.plot(yin.real, yin.imag, "-", color=YIN_COLOR, lw=1.15, zorder=3)
            ax.plot(yang.real, yang.imag, "-", color=YANG_COLOR, lw=1.15, zorder=3)
            ax.plot([yin_now.real], [yin_now.imag], "o", color=YIN_COLOR, ms=4.0, zorder=6)
            ax.plot([yang_now.real], [yang_now.imag], "o", color=YANG_COLOR, ms=4.0, zorder=6)

        ax.plot(
            [0.0, 1.0], [0.0, 0.0],
            "-", color=FORWARD_COLOR, lw=2.6, solid_capstyle="round", zorder=5,
        )
        ax.plot([0.0, 1.0], [0.0, 0.0], "o", color=FORWARD_COLOR, ms=3.2, zorder=6)

        if fr["hit"] is not None:
            ax.plot(
                [fr["hit"].real], [fr["hit"].imag],
                "o", color=CROSS_COLOR, ms=5.2,
                markeredgecolor="#333333", markeredgewidth=0.6, zorder=7,
            )

        ax.text(
            0.5, 0.10, "%d" % k,
            ha="center", va="center", fontsize=16.5, fontweight="bold",
            color=FORWARD_COLOR, zorder=8, transform=ax.transAxes,
        )
        if k == m:
            ax.text(
                0.5, 0.055, "bisector",
                ha="center", va="center", fontsize=10.5,
                color=FORWARD_COLOR, zorder=8, transform=ax.transAxes,
            )

        if i_cross is not None:
            ax.text(
                0.5, 0.90, str(i_cross),
                ha="center", va="center", fontsize=15, fontweight="bold",
                color=CROSS_COLOR, zorder=8, transform=ax.transAxes,
            )
        ax.text(
            0.10, 0.90, str(hi),
            ha="left", va="center", fontsize=12,
            color=SPAN_COLOR, zorder=8, transform=ax.transAxes,
        )
        ax.text(
            0.90, 0.90, str(lo),
            ha="right", va="center", fontsize=12,
            color=SPAN_COLOR, zorder=8, transform=ax.transAxes,
        )


def main():
    snapshots = (T_TOP, T_BOT)
    rows = []
    for T in snapshots:
        print("T =", T)
        data = compute_chains(T)
        rows.append((T, data, build_frames(data)))

    m = rows[0][1]["m"]
    eps = 1e-4
    Ts = np.linspace(m + eps, m + 1 - eps, N_YIN)
    yin_path = []
    yang_path = []
    for T in Ts:
        yi, ya = yin_yang(T)
        yin_path.append(yi)
        yang_path.append(ya)

    n = m + 1
    fig, axes = plt.subplots(
        2, n,
        figsize=(13.2, 5.78),
        sharey=True,
        gridspec_kw={"wspace": 0.0, "hspace": 0.10},
    )

    half = 0.5 / UNIT_FRACTION
    xlim = (0.5 - half, 0.5 + half)
    ylim = (-1.25, 1.30)

    for r, (T, data, frames) in enumerate(rows):
        yin_now, yang_now = yin_yang(float(T))
        draw_row(
            axes[r], frames, data["m"], data["nmax"],
            yin_path, yang_path, yin_now, yang_now, xlim, ylim,
        )

    fig.subplots_adjust(left=0.038, right=0.995, top=0.98, bottom=0.04)
    fig.text(0.010, 0.75, r"$T=6.18$", rotation=90, va="center", fontsize=15)
    fig.text(0.010, 0.27, r"$T=6.72$", rotation=90, va="center", fontsize=15)

    os.makedirs(OUTDIR, exist_ok=True)
    pdf = os.path.join(OUTDIR, BASENAME + ".pdf")
    png = os.path.join(OUTDIR, BASENAME + ".png")
    fig.savefig(pdf)
    fig.savefig(png, dpi=200)
    plt.close(fig)
    print("wrote", pdf)
    print("wrote", png)


if __name__ == "__main__":
    main()
