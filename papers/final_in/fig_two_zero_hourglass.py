#!/usr/bin/env python3
"""Four-panel hourglass ovals in the style of fig_ps_ak_r2_legs_angles.

Two two-zero AK ovals (T ~ 201.72 and T ~ 320.57). Each has an equal-leg
panel (PS / AK / R/2) and a folded-leg panel (theta2 = pi for the same
three splits). Dense (sigma, T) grids, 15 workers, resumable cache.

Run:
    python3 fig_two_zero_hourglass.py
    python3 fig_two_zero_hourglass.py --plot-only
    python3 fig_two_zero_hourglass.py --status
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed

import matplotlib
import numpy as np
from matplotlib.ticker import FuncFormatter
from scipy.optimize import brentq

matplotlib.use("Agg")
import matplotlib.pyplot as plt

sys.path.insert(
    0,
    os.path.join(os.path.dirname(os.path.abspath(__file__)),
                 "..", "..", "equal-leg-density"),
)
import census as CS
import eqleg_fast as F

HERE = os.path.dirname(os.path.abspath(__file__))
FIGDIR = os.path.join(HERE, "figures")
CACHEDIR = os.path.join(FIGDIR, "fig_two_zero_hourglass_cache")
STATUS = os.path.join(CACHEDIR, "status.json")
BASENAME = "fig_two_zero_hourglass"
N_WORKERS = 15
N_SIG = 721
N_T = 1201

BLUE = "#1f77b4"
GREEN = "#2ca02c"
PURPLE = "#7f2fbf"
RED = "#d62728"
ORANGE = "#ff7f0e"
ZEROCOLOR = "k"

OVALS = (
    dict(tag="T201", m=201, T_lo=201.718350, T_hi=201.718720,
         zeros=(201.718470943, 201.718615511),
         title=r"$T\approx 201.72$"),
    dict(tag="T320", m=320, T_lo=320.568850, T_hi=320.569300,
         zeros=(320.569032133, 320.569110203),
         title=r"$T\approx 320.57$"),
)
SPLITS = ("ps", "ak", "rs")


def write_status(**kwargs):
    os.makedirs(CACHEDIR, exist_ok=True)
    cur = {}
    if os.path.isfile(STATUS):
        try:
            cur = json.loads(open(STATUS).read())
        except Exception:
            cur = {}
    cur.update(kwargs)
    cur["updated"] = time.strftime("%Y-%m-%d %H:%M:%S")
    with open(STATUS, "w") as fh:
        json.dump(cur, fh, indent=2)
        fh.write("\n")


def flips(y):
    return np.nonzero(np.signbit(y[1:]) != np.signbit(y[:-1]))[0]


def hardy_zeros(m, T, zmode, N_em):
    Z = F.hardy_Z(m, T, N_em=N_em, zeta_mode=zmode)
    out = []
    for i in flips(Z):
        f = lambda x: float(F.hardy_Z(m, np.atleast_1d(x),
                                      N_em=N_em, zeta_mode=zmode)[0])
        out.append(brentq(f, T[i], T[i + 1], xtol=1e-14))
    return out


def _column(args):
    """One sigma column: g and folded indicators for all three splits."""
    m, sigma, T, zmode, N_em = args
    b = F.block(m, T, sigma, zeta_mode=zmode, N_em=N_em)
    pack = {"sden": b["sden"].astype(np.float64)}
    for k in SPLITS:
        B1 = b["B1" + k]
        w = np.conj(B1) * (b["zeta"] - B1)
        pack["g_" + k] = b["g_" + k].astype(np.float64)
        pack["fold_" + k] = w.imag.astype(np.float64)
        pack["opp_" + k] = w.real.astype(np.float64)
    return pack


def cache_path(tag):
    return os.path.join(CACHEDIR, tag + ".npz")


def compute_oval(ov, n_workers):
    tag, m = ov["tag"], ov["m"]
    path = cache_path(tag)
    if os.path.isfile(path):
        write_status(stage=f"{tag}: cache hit")
        return dict(np.load(path))

    zmode, N_em = CS.route(m)
    sig = np.linspace(0.20, 0.80, N_SIG)
    T = np.linspace(ov["T_lo"], ov["T_hi"], N_T)
    keys = (["sden"]
            + [f"{p}_{k}" for k in SPLITS for p in ("g", "fold", "opp")])
    grids = {k: np.empty((N_T, N_SIG), np.float64) for k in keys}

    jobs = [(m, float(sig[j]), T, zmode, N_em) for j in range(N_SIG)]
    done = 0
    t0 = time.time()
    write_status(stage=f"{tag}: computing", done=0, total=N_SIG,
                 workers=n_workers)
    with ProcessPoolExecutor(max_workers=n_workers) as pool:
        fmap = {pool.submit(_column, job): j for j, job in enumerate(jobs)}
        for fut in as_completed(fmap):
            j = fmap[fut]
            pack = fut.result()
            for k, arr in pack.items():
                grids[k][:, j] = arr
            done += 1
            if done == 1 or done % 40 == 0 or done == N_SIG:
                rate = done / max(time.time() - t0, 1e-6)
                eta = (N_SIG - done) / max(rate, 1e-9)
                write_status(stage=f"{tag}: computing", done=done,
                             total=N_SIG, rate_per_s=round(rate, 2),
                             eta_s=round(eta, 1),
                             elapsed_s=round(time.time() - t0, 1))
                print(f"  {tag}  {done}/{N_SIG}  "
                      f"{rate:.1f}/s  eta {eta:.0f}s", flush=True)

    # On the half-line g vanishes identically; copy the off-line sign
    # so the equal-leg contour is the oval, not the whole line.
    j0 = int(np.argmin(np.abs(sig - 0.5)))
    if 0 < j0 < sig.size - 1:
        for k in SPLITS:
            grids["g_" + k][:, j0] = np.minimum(
                grids["g_" + k][:, j0 - 1], grids["g_" + k][:, j0 + 1])

    zeros = hardy_zeros(m, T, zmode, N_em)
    np.savez_compressed(path, sig=sig, T=T, zeros=np.array(zeros), **grids)
    write_status(stage=f"{tag}: wrote cache", path=path)
    print(f"  wrote {path}", flush=True)
    return dict(np.load(path))


def _mask_ps(g, sden):
    out = np.array(g, copy=True)
    out[np.abs(sden) < 1e-8] = np.nan
    return out


def _fold_roots(sig, T, fold, opp):
    """(sigma, T) samples of theta2 = pi, one column at a time."""
    xs, ys = [], []
    for j in range(sig.size):
        f, o = fold[:, j], opp[:, j]
        for i in flips(f):
            if o[i] >= 0.0 and o[i + 1] >= 0.0:
                continue
            a, b = float(f[i]), float(f[i + 1])
            if a == b:
                continue
            t = float(T[i] - a * (T[i + 1] - T[i]) / (b - a))
            xs.append(float(sig[j]))
            ys.append(t)
    return np.array(xs), np.array(ys)


def draw_equal(ax, data):
    sig, T = data["sig"], data["T"]
    ax.contour(sig, T, _mask_ps(data["g_ps"], data["sden"]),
               levels=[0.0], colors=[BLUE], linewidths=1.45)
    ax.contour(sig, T, data["g_ak"], levels=[0.0],
               colors=[GREEN], linewidths=1.45)
    ax.contour(sig, T, data["g_rs"], levels=[0.0],
               colors=[PURPLE], linewidths=1.45)
    ax.plot([], [], color=BLUE, lw=1.6, label=r"PS")
    ax.plot([], [], color=GREEN, lw=1.6, label=r"AK")
    ax.plot([], [], color=PURPLE, lw=1.6, label=r"$R/2$")


def draw_folded(ax, data):
    sig, T = data["sig"], data["T"]
    styles = (
        ("ps", RED, ".", 2.4, "PS"),
        ("rs", PURPLE, "o", 2.2, r"$R/2$"),
        ("ak", ORANGE, ".", 2.4, "AK"),
    )
    for k, col, mkr, ms, lab in styles:
        x, y = _fold_roots(sig, T, data["fold_" + k], data["opp_" + k])
        if k == "rs":
            ax.plot(x, y, mkr, ms=ms, mfc="none", mec=col, mew=0.7,
                    rasterized=True, zorder=4, label=lab)
        else:
            ax.plot(x, y, mkr, color=col, ms=ms, rasterized=True,
                    zorder=5, label=lab)


def plot_all(datasets):
    fig, axes = plt.subplots(2, 2, figsize=(7.6, 7.4), layout="constrained")
    for row, ov in enumerate(OVALS):
        data = datasets[ov["tag"]]
        T = data["T"]
        zeros = np.asarray(data["zeros"], float)
        for col, (drawer, title) in enumerate((
            (draw_equal, r"Equal legs ($L_1=L_2$)"),
            (draw_folded, r"Folded legs ($\vartheta_2=\pi$)"),
        )):
            ax = axes[row, col]
            drawer(ax, data)
            ax.axvline(0.5, color=BLUE, lw=1.15, zorder=2)
            for z in zeros:
                ax.plot(0.5, z, "o", color=ZEROCOLOR, ms=5.2,
                        mec="white", mew=0.45, zorder=6)
            ax.set_xlim(0.22, 0.78)
            ax.set_ylim(T[0], T[-1])
            ax.yaxis.set_major_formatter(
                FuncFormatter(lambda v, _p: f"{v:.6f}"))
            ax.grid(True, ls=":", alpha=0.35)
            ax.set_title(f"{ov['title']}: {title}", fontsize=9)
            if row == 1:
                ax.set_xlabel(r"$\sigma$")
            if col == 0:
                ax.set_ylabel(r"index $T$")
                ax.legend(loc="upper right", fontsize=7, framealpha=0.92)
            else:
                ax.legend(loc="upper right", fontsize=7, framealpha=0.92)

    fig.suptitle("Two-zero equal-leg components are hourglasses",
                 fontsize=11)
    pdf = os.path.join(FIGDIR, BASENAME + ".pdf")
    png = os.path.join(FIGDIR, BASENAME + ".png")
    fig.savefig(pdf, dpi=300, bbox_inches="tight")
    fig.savefig(png, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print("wrote", pdf)
    print("wrote", png)
    write_status(stage="plotted", pdf=pdf, png=png)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--plot-only", action="store_true")
    p.add_argument("--status", action="store_true")
    p.add_argument("--workers", type=int, default=N_WORKERS)
    args = p.parse_args()

    if args.status:
        if os.path.isfile(STATUS):
            print(open(STATUS).read())
        else:
            print("no status yet")
        return

    os.makedirs(CACHEDIR, exist_ok=True)
    write_status(stage="start", workers=args.workers, n_sig=N_SIG, n_t=N_T)
    datasets = {}
    for ov in OVALS:
        if args.plot_only and not os.path.isfile(cache_path(ov["tag"])):
            raise SystemExit(f"missing cache for {ov['tag']}")
        print(f"oval {ov['tag']}", flush=True)
        datasets[ov["tag"]] = compute_oval(ov, args.workers)
    plot_all(datasets)
    write_status(stage="done")


if __name__ == "__main__":
    main()
