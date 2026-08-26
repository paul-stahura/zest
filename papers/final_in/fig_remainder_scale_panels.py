#!/usr/bin/env python3
"""
Remainder geometry in the R-frame, same fractional part, varying integer part.

Figure A (6 panels, 2×3):
  top:    T = 6.18, 50.18, 100.18
  bottom: T = 6.72, 50.72, 100.72
  Each panel: only remainders (R1ps, R2ps, R, R1ak, R2ak), rotated into the
  R-frame (R along +x, midpoint of R at the origin), common axis limits.

Figure B (2 panels):
  left:  T = 6.18 in R-frame
  right: T = 50.18 in R-frame, lengths scaled by
         λ = (|R|_{6.18}/|R|_{50.18}) = (n2/n1)^σ · (κ_1rs(6.18)/κ_1rs(50.18))
  so the two panels should nearly match.

Outputs:
  figures/fig_remainder_scale_grid.pdf/.png
  figures/fig_remainder_scale_match.pdf/.png
"""

from __future__ import annotations

import os
import cmath
import math

import matplotlib.pyplot as plt
import mpmath as mp
import numpy as np

from fig1_spiral_summands import I_of_T, chi, C
from fig4_kuznetsov_zoom import I1_of, PURPLE, ORANGE

OUTDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "figures")
SIGMA = mp.mpf("0.5")
mp.mp.dps = 40

RED = "#d62728"
TOP_TS = [mp.mpf("6.18"), mp.mpf("50.18"), mp.mpf("100.18")]
BOT_TS = [mp.mpf("6.72"), mp.mpf("50.72"), mp.mpf("100.72")]


def remainders_at(T: mp.mpf) -> dict:
    """Exact R, Rps split, and Kuznetsov ak split at (σ, T)."""
    t = I_of_T(T)
    s = mp.mpc(SIGMA, t)
    m = int(mp.floor(T))
    n = m + 1
    w = t * mp.log(n)
    ch = chi(s)
    psi = mp.arg(ch)

    Sigma1 = mp.nsum(lambda k: mp.mpf(k) ** (-s), [1, m])
    Sigma2 = ch * mp.nsum(lambda k: mp.mpf(k) ** (s - 1), [1, m])
    zeta = mp.zeta(s)
    R = zeta - Sigma1 - Sigma2

    u1 = mp.exp(-1j * w)
    u2 = mp.exp(1j * (w + psi))
    a, b = mp.re(u1), mp.re(u2)
    c, d = mp.im(u1), mp.im(u2)
    det = a * d - b * c
    d1 = (mp.re(R) * d - b * mp.im(R)) / det
    d2 = (a * mp.im(R) - mp.re(R) * c) / det
    R1ps = d1 * u1
    R2ps = d2 * u2

    # Kuznetsov
    s_py = complex(float(mp.re(s)), float(mp.im(s)))
    chi_py = complex(float(mp.re(ch)), float(mp.im(ch)))
    mhalf = m + 0.5
    sign = (-1.0) ** m
    s2 = complex(1.0 - float(SIGMA), s_py.imag)
    R1ak = -0.5 * sign * I1_of(s_py, mhalf)
    R2ak = -0.5 * sign * chi_py * I1_of(s2, mhalf).conjugate()

    Rc = C(R)
    return dict(
        T=float(T),
        t=float(t),
        m=m,
        n=n,
        R=Rc,
        R1ps=C(R1ps),
        R2ps=C(R2ps),
        R1ak=R1ak,
        R2ak=R2ak,
        absR=abs(Rc),
        kappa_R=abs(Rc) * (n ** float(SIGMA)),
        d1=float(d1),
        kappa_ps=float(d1) * (n ** float(SIGMA)),
    )


def to_R_frame(vecs: dict) -> dict:
    """Rotate so R lies on +real axis, then center so mid(R) is at the origin.

    In this frame R runs from -|R|/2 to +|R|/2 on the real axis; the joints
    of the ps/ak splits are stored as absolute positions (not as free vectors
    from the left endpoint).
    """
    R = vecs["R"]
    phase = -cmath.phase(R) if abs(R) > 0 else 0.0
    rot = cmath.exp(1j * phase)
    R_rot = R * rot
    mid = R_rot / 2  # shift so center of R is the origin

    def rf(z: complex) -> complex:
        return z * rot - mid

    # Absolute positions of chain joints, origin = center of R.
    # Left endpoint of R = -mid (= rf(0) if we think of vectors from Σ₁).
    origin = -mid
    B = rf(vecs["R1ps"])           # Σ₁+R1ps  → end of R1ps
    A = rf(R)                      # Σ₁+R     → right end of R (= +|R|/2)
    Jak = rf(vecs["R1ak"])         # Σ₁+R1ak
    Eak = rf(vecs["R1ak"] + vecs["R2ak"])

    return dict(
        origin=origin,
        B=B,
        A=A,
        Jak=Jak,
        Eak=Eak,
        R=R_rot,  # free vector (length |R| along +x); used for scaling
        absR=vecs["absR"],
        T=vecs["T"],
        m=vecs["m"],
        n=vecs["n"],
        kappa_R=vecs["kappa_R"],
        kappa_ps=vecs["kappa_ps"],
    )


def draw_remainders(ax, fr: dict, scale: float = 1.0, labels: bool = False,
                    mark_joint: bool = True) -> None:
    """Draw remainder segments in the centered R-frame, optionally scaled."""
    o = fr["origin"] * scale
    B = fr["B"] * scale
    A = fr["A"] * scale
    Jak = fr["Jak"] * scale
    Eak = fr["Eak"] * scale

    ax.plot([o.real, B.real], [o.imag, B.imag], "-", color=RED, lw=2.4,
            solid_capstyle="round", zorder=4,
            label=r"$R_{1ps}$" if labels else None)
    ax.plot([B.real, A.real], [B.imag, A.imag], "-", color=ORANGE, lw=2.4,
            solid_capstyle="round", zorder=4,
            label=r"$R_{2ps}$" if labels else None)
    ax.plot([o.real, A.real], [o.imag, A.imag], "-", color=PURPLE, lw=1.8,
            solid_capstyle="round", zorder=3,
            label=r"$R$" if labels else None)
    ax.plot([o.real, Jak.real], [o.imag, Jak.imag], "--", color=ORANGE, lw=1.6,
            dashes=(4, 2), zorder=4,
            label=r"$R_{1ak},R_{2ak}$" if labels else None)
    ax.plot([Jak.real, Eak.real], [Jak.imag, Eak.imag], "--", color=ORANGE,
            lw=1.6, dashes=(4, 2), zorder=4)

    # The left endpoint of R is Σ₁ itself, the joint every split starts from.
    if mark_joint:
        ax.plot([o.real], [o.imag], "o", ms=11.0, mfc="none", mec="k", mew=1.1,
                zorder=6,
                label=r"$\Sigma_1$ joint $m=\lfloor T\rfloor$" if labels
                else None)

    for p in (o, B, A, Jak):
        ax.plot([p.real], [p.imag], "o", color="k", ms=3.0, zorder=7)

    ax.axhline(0, color="0.85", lw=0.6, zorder=0)
    ax.axvline(0, color="0.85", lw=0.6, zorder=0)


def panel_limits(frames: list[dict], pad: float = 1.15) -> tuple[float, float, float, float]:
    """Common axis box centered on mid(R); symmetric in x about 0."""
    xmax = 0.0
    ymax = 0.0
    ymin = 0.0
    for fr in frames:
        pts = [fr["origin"], fr["B"], fr["A"], fr["Jak"], fr["Eak"]]
        for p in pts:
            xmax = max(xmax, abs(p.real))
            ymax = max(ymax, p.imag)
            ymin = min(ymin, p.imag)
    half = xmax * pad
    return -half, half, ymin * pad - 0.02, ymax * pad + 0.02


def make_grid() -> None:
    tops = [to_R_frame(remainders_at(T)) for T in TOP_TS]
    bots = [to_R_frame(remainders_at(T)) for T in BOT_TS]
    xlim = panel_limits(tops + bots)

    # Keep the common axis limits (same numeric scale). Fill the figure
    # height with the axes themselves (aspect auto): the former gaps under
    # the title, between rows, and above the caption become taller panels.
    x0, x1, y0, y1 = xlim
    fig, axes = plt.subplots(
        2, 3,
        figsize=(10.5, 8.4),
        gridspec_kw=dict(hspace=0.32, wspace=0.16,
                         left=0.08, right=0.99, top=0.90, bottom=0.07),
    )
    for row, frames, ftag in (
        (0, tops, r"$\{T\}=0.18$"),
        (1, bots, r"$\{T\}=0.72$"),
    ):
        for col, fr in enumerate(frames):
            ax = axes[row, col]
            draw_remainders(ax, fr, labels=(row == 0 and col == 0))
            ax.set_xlim(x0, x1)
            ax.set_ylim(y0, y1)
            ax.set_aspect("auto")
            ax.grid(True, ls=":", alpha=0.35)
            ax.set_title(
                rf"$T={fr['T']:.2f}$  ($m={fr['m']}$)"
                "\n"
                rf"$|R|={fr['absR']:.3f},\ \kappa_{{1rs}}={fr['kappa_R']/2:.3f}$",
                fontsize=9,
                pad=3,
            )
            if row == 1:
                ax.set_xlabel(r"$\Re$ (mid($R$) at origin)", labelpad=2)
            if col == 0:
                ax.set_ylabel(r"$\Im$ (R-frame)" + "\n" + ftag, labelpad=2)
    axes[0, 0].legend(loc="lower left", fontsize=7.5, framealpha=0.9)
    fig.suptitle(
        r"Remainders in the $R$-frame (center of $R$ at the origin) "
        r"at fixed $\{T\}$, varying $\lfloor T\rfloor$"
        "\n"
        r"(common scale; $R_{1ps}$ red, $R_{2ps}$ orange, $R$ purple, "
        r"$R_{1ak}{+}R_{2ak}$ orange dashed)",
        fontsize=11,
        y=0.98,
    )
    os.makedirs(OUTDIR, exist_ok=True)
    for ext in ("pdf", "png"):
        path = os.path.join(OUTDIR, f"fig_remainder_scale_grid.{ext}")
        fig.savefig(path, dpi=200 if ext == "png" else None)
        print("wrote", path)
    plt.close(fig)

    # print scale table
    print("\n--- top row κ_1rs ---")
    for fr in tops:
        print(f"T={fr['T']:.2f}  n={fr['n']}  |R|={fr['absR']:.6f}  κ_1rs={fr['kappa_R']/2:.6f}")
    print("--- bottom row κ_1rs ---")
    for fr in bots:
        print(f"T={fr['T']:.2f}  n={fr['n']}  |R|={fr['absR']:.6f}  κ_1rs={fr['kappa_R']/2:.6f}")


def make_match() -> None:
    a = to_R_frame(remainders_at(mp.mpf("6.18")))
    b = to_R_frame(remainders_at(mp.mpf("50.18")))
    # Exact identity: |R_a|/|R_b| = (n_b/n_a)^σ · (κ_a/κ_b)
    lam = a["absR"] / b["absR"]
    n1, n2 = a["n"], b["n"]
    sigma = float(SIGMA)
    lam_formula = ((n2 / n1) ** sigma) * (a["kappa_R"] / b["kappa_R"])
    assert abs(lam - lam_formula) < 1e-12

    # Scale absolute joint positions about the origin (center of R).
    b_scaled = dict(b)
    for k in ("origin", "B", "A", "Jak", "Eak", "R"):
        b_scaled[k] = b[k] * lam

    xlim = panel_limits([a, b_scaled])

    fig, axes = plt.subplots(1, 2, figsize=(9.0, 4.4))
    draw_remainders(axes[0], a, labels=True, mark_joint=False)
    draw_remainders(axes[1], b_scaled, labels=False, mark_joint=False)
    for ax, ttl in (
        (axes[0], rf"$T={a['T']:.2f}$ (reference)"),
        (
            axes[1],
            rf"$T={b['T']:.2f}$, scaled by $\lambda=(n_2/n_1)^{{\sigma}}"
            rf"(\kappa_{{1rs,1}}/\kappa_{{1rs,2}})$"
            "\n"
            rf"$\lambda={lam:.4f}$",
        ),
    ):
        ax.set_xlim(xlim[0], xlim[1])
        ax.set_ylim(xlim[2], xlim[3])
        ax.set_aspect("equal", adjustable="box")
        ax.grid(True, ls=":", alpha=0.35)
        ax.set_xlabel(r"$\Re$ (R-frame, mid($R$) at origin)")
        ax.set_title(ttl, fontsize=10)
    axes[0].set_ylabel(r"$\Im$ (R-frame)")
    axes[0].legend(loc="lower left", fontsize=8, framealpha=0.9)
    fig.suptitle(
        r"Same $\{T\}=0.18$: after $n^{-\sigma}$ scaling the $R$-frame "
        r"remainders nearly coincide",
        fontsize=11,
    )
    fig.tight_layout(rect=[0, 0, 1, 0.90])
    for ext in ("pdf", "png"):
        path = os.path.join(OUTDIR, f"fig_remainder_scale_match.{ext}")
        fig.savefig(path, dpi=200 if ext == "png" else None)
        print("wrote", path)
    plt.close(fig)
    print(f"λ = |R|_6.18/|R|_50.18 = {lam:.8f}")
    print(f"λ formula check       = {lam_formula:.8f}")
    print(f"|R1ps| after scale: {abs(a['B']-a['origin']):.6f} vs {abs(b_scaled['B']-b_scaled['origin']):.6f}")


def main() -> None:
    make_grid()
    make_match()


if __name__ == "__main__":
    main()
