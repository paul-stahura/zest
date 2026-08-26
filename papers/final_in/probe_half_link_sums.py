#!/usr/bin/env python3
"""Lengths of V1, V2 and the angle between them, T = 1 .. 30.

Each forward link is cut at its reverse crossing; V1 (V2) is the free-vector
sum of the first (second) parts. The bisector contributes only its stub, so
V1 + V2 = B1. This sweep asks whether |V1| = |V2|, how the angle between them
varies, and whether that angle is larger near a zeta zero or a theta_2
retrograde.

Run:  python3 probe_half_link_sums.py
"""

from __future__ import annotations

import json
import math
import os
import sys

import numpy as np
from scipy.special import loggamma

sys.path.insert(0, os.path.abspath(os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "..", "equal-leg-density")))
from eqleg_fast import I1_vec, block  # noqa: E402

from fig_d1_any_link import hat_d1 as hat_d1_mp, sample as sample_mp

LNPI = math.log(math.pi)
HERE = os.path.dirname(os.path.abspath(__file__))
ZERO_CSV = os.path.abspath(os.path.join(
    HERE, "..", "..", "..", "Assets", "Resources", "CriticalStripPoints",
    "00 Zeta Zeros.csv"))
OUT_JSON = os.path.join(HERE, "probe_half_link_sums.json")

N_SAMP = 10_000
T_LO, T_HI = 1.002, 29.998
SIGMA = 0.5


def I_of_T(T):
    T = np.asarray(T, float)
    return (2.0 * T + 1.0) * np.pi / np.log1p(1.0 / T)


def T_of_I(t):
    lo, hi = 1e-9, 1.0
    while I_of_T(hi) < t:
        hi *= 2.0
    for _ in range(80):
        mid = 0.5 * (lo + hi)
        if I_of_T(mid) < t:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)


def chi_of(s):
    return np.exp((s - 0.5) * LNPI + loggamma((1.0 - s) / 2.0)
                  - loggamma(s / 2.0))


def theta_rs(t):
    t = np.asarray(t, float)
    return loggamma(0.25 + 0.5j * t).imag - 0.5 * t * LNPI


def crossing_fraction(yin, yang):
    rise = yin.imag - yang.imag
    if rise == 0:
        return None
    u = yin.imag / rise
    if u < 0.0 or u > 1.0:
        return None
    return float((yin.real + u * (yang.real - yin.real)).real)


def Y(k, j, s, ch, R, m, fwd, rev):
    head = fwd[m] - fwd[k]
    tail = (rev[j] - rev[m]) if j >= m else (rev[m] - rev[j])
    return (k + 1) ** s * (head + R - ch * tail)


def named_link(k, m, a2):
    return m if k == m else int(round(a2 / (k + 1))) - 1


def hat_d1(k, s, ch, R, m, a2, fwd, rev, near):
    named = named_link(k, m, a2)
    cands = [named] if k == m else [named, named + 1, named - 1]
    best, best_gap = None, None
    for j in cands:
        if j < 0 or j + 1 >= len(rev):
            continue
        lam = crossing_fraction(
            Y(k, j, s, ch, R, m, fwd, rev),
            Y(k, j + 1, s, ch, R, m, fwd, rev),
        )
        if lam is None:
            continue
        gap = abs(lam - near)
        if best is None or gap < best_gap:
            best, best_gap = lam, gap
    return best


def remainder_and_zeta(s, S1, S2, ch, m):
    """Kuznetsov R, then zeta = S1 + S2 + R. Also the PS split of R."""
    t = s.imag
    mhalf = m + 0.5
    sign = (-1.0) ** m
    R1ak = -0.5 * sign * I1_vec(np.array([s]), mhalf)[0]
    R2ak = -0.5 * sign * ch * np.conj(
        I1_vec(np.array([1.0 - SIGMA + 1j * t]), mhalf)[0])
    R = R1ak + R2ak
    zeta = S1 + S2 + R
    om = t * math.log(m + 1.0)
    u1 = np.exp(-1j * om)
    u2 = np.exp(1j * (om + np.angle(ch)))
    sden = u1.real * u2.imag - u2.real * u1.imag
    d1 = (R.real * u2.imag - u2.real * R.imag) / sden
    B1 = S1 + d1 * u1
    return R, zeta, B1, sden, d1


def v1_v2_at(T, near):
    """One sample. near is a dict k -> last crossing fraction."""
    t = float(I_of_T(T))
    s = SIGMA + 1j * t
    m = int(math.floor(T))
    if m < 1:
        return None
    a2 = t / (2.0 * math.pi)
    ns = np.arange(1, m + 1, dtype=float)
    fwd_terms = ns ** (-s)
    fwd = np.concatenate(([0j], np.cumsum(fwd_terms)))
    v_bis = (m + 1.0) ** (-s)
    far = max(m + 1, int(round(a2)) + 3)
    ns_r = np.arange(1, far + 1, dtype=float)
    rev = np.concatenate(([0j], np.cumsum(ns_r ** (s - 1.0))))
    ch = complex(chi_of(s))
    S1 = fwd[m]
    S2 = ch * rev[m]
    R, zeta, B1, sden, d1 = remainder_and_zeta(s, S1, S2, ch, m)
    if not np.isfinite(sden) or abs(sden) < 1e-10:
        return None
    V1 = 0j
    V2 = 0j
    fracs = []
    for k in range(m + 1):
        hint = near.get(k, 0.5)
        p = hat_d1(k, s, ch, R, m, a2, fwd, rev, hint)
        if p is None:
            return None
        near[k] = p
        v = (fwd[k + 1] - fwd[k]) if k < m else v_bis
        V1 += p * v
        if k < m:
            V2 += (1.0 - p) * v
        fracs.append(p)
    th2 = float(np.angle((zeta - B1) / B1))
    return dict(
        T=float(T), t=t, m=m, V1=V1, V2=V2, B1=B1, zeta=zeta,
        sden=float(sden), d1=float(np.real(d1)), th2=th2,
        err=float(abs(V1 + V2 - B1)), nfrac=len(fracs),
    )


def load_zero_T(t_hi):
    """Zeta-zero ordinates as index T, from the Critical Strip CSV (σ, T)."""
    Ts = []
    with open(ZERO_CSV) as f:
        for line in f:
            if line.startswith("#") or not line.strip():
                continue
            parts = line.split(",")
            if len(parts) < 2:
                continue
            T = float(parts[1])
            if I_of_T(T) > t_hi:
                break
            if T >= T_LO:
                Ts.append(T)
    return np.array(Ts, float)


def h_ps_at_zeros(T_zeros):
    """Transverse offset h of the PS bisector at each ordinate."""
    h = np.empty(T_zeros.size)
    for m in range(int(math.floor(T_zeros[0])), int(math.floor(T_zeros[-1])) + 1):
        sl = (T_zeros >= m) & (T_zeros < m + 1)
        if not np.any(sl):
            continue
        b = block(m, T_zeros[sl], SIGMA, zeta_mode="ak")
        rot = np.exp(1j * theta_rs(b["t"])) * b["B1ps"]
        h[sl] = rot.imag
    return h


def retrogrades(T_zeros, h):
    """Ordinates where sign(h) fails to alternate."""
    signs = np.sign(h)
    signs[signs == 0] = 1.0
    back = np.zeros(T_zeros.size, dtype=bool)
    # Prevailing pattern: majority of sign(h) * (-1)^n.
    n = np.arange(1, T_zeros.size + 1)
    patterned = signs * ((-1.0) ** n)
    keep = 1.0 if np.sum(patterned) > 0 else -1.0
    back[1:] = signs[1:] == signs[:-1]
    # The first zero has no predecessor; mark by the global pattern instead.
    back[0] = patterned[0] != keep
    return back


def nearest_dist(T, marks):
    """|T - nearest mark| for each sample."""
    marks = np.asarray(marks, float)
    if marks.size == 0:
        return np.full(T.size, np.nan)
    i = np.searchsorted(marks, T)
    left = marks[np.clip(i - 1, 0, marks.size - 1)]
    right = marks[np.clip(i, 0, marks.size - 1)]
    return np.minimum(np.abs(T - left), np.abs(T - right))


def local_gap(T, marks):
    """Gap between the zeros that bracket T (right-left)."""
    marks = np.asarray(marks, float)
    i = np.searchsorted(marks, T)
    i = np.clip(i, 1, marks.size - 1)
    return marks[i] - marks[i - 1]


def bin_mean(x, y, edges):
    idx = np.digitize(x, edges) - 1
    centres = 0.5 * (edges[:-1] + edges[1:])
    mu = np.full(centres.size, np.nan)
    n = np.zeros(centres.size, int)
    for k in range(centres.size):
        sl = idx == k
        if np.any(sl):
            mu[k] = float(np.mean(y[sl]))
            n[k] = int(np.sum(sl))
    return centres, mu, n


def decimate_mean(T, y, n_bins):
    edges = np.linspace(T[0], T[-1], n_bins + 1)
    return bin_mean(T, y, edges)


def check_example():
    """Match the paper figure at σ=1/2, T=6.18."""
    s, ch, R, m, a2, fwd, rev = sample_mp(6.18)
    v_bis = (m + 1) ** (-s)
    parts1, parts2 = [], []
    for k in range(m + 1):
        p = hat_d1_mp(k, s, ch, R, m, a2, fwd, rev, 0.5)
        v = (fwd[k + 1] - fwd[k]) if k < m else v_bis
        parts1.append(p * v)
        if k < m:
            parts2.append((1 - p) * v)
    V1 = complex(sum(parts1))
    V2 = complex(sum(parts2))
    fast = v1_v2_at(6.18, {})
    print("check T=6.18 (mpmath figure vs fast sampler)")
    print(f"  mp  |V1|={abs(V1):.6f}  |V2|={abs(V2):.6f}  "
          f"angle={math.degrees(abs(np.angle(V2 / V1))):.3f} deg")
    print(f"  fast |V1|={abs(fast['V1']):.6f}  |V2|={abs(fast['V2']):.6f}  "
          f"angle={math.degrees(abs(np.angle(fast['V2'] / fast['V1']))):.3f} deg"
          f"  |V1+V2-B1|={fast['err']:.2e}")


def main():
    check_example()

    Ts = np.linspace(T_LO, T_HI, N_SAMP)
    near = {}
    last_m = None
    rows = []
    skipped = 0
    for i, T in enumerate(Ts):
        m = int(math.floor(T))
        if m != last_m:
            near = {k: near[k] for k in near if k < m}
            last_m = m
        rec = v1_v2_at(float(T), near)
        if rec is None:
            skipped += 1
            continue
        rows.append(rec)
        if (i + 1) % 2000 == 0:
            print(f"  sampled {i + 1}/{N_SAMP}  kept {len(rows)}  skipped {skipped}")

    T = np.array([r["T"] for r in rows])
    V1 = np.array([r["V1"] for r in rows])
    V2 = np.array([r["V2"] for r in rows])
    B1 = np.array([r["B1"] for r in rows])
    th2 = np.array([r["th2"] for r in rows])
    err = np.array([r["err"] for r in rows])
    L1 = np.abs(V1)
    L2 = np.abs(V2)
    LB = np.abs(B1)
    ratio = L1 / L2
    rel = np.abs(L1 - L2) / np.maximum(L1, L2)
    # Smaller angle between the two free vectors, degrees.
    ang = np.degrees(np.abs(np.angle(V2 / V1)))
    # Oriented turning of the V1→V2 path (the exterior angle at the joint).
    turn = np.degrees(np.angle(V2 / V1))

    t_hi = float(I_of_T(T_HI))
    T_zeros = load_zero_T(t_hi)
    h = h_ps_at_zeros(T_zeros)
    back = retrogrades(T_zeros, h)
    T_back = T_zeros[back]
    print(f"\nzeros with T in [{T_LO:.3f}, {T_HI:.3f}]: {T_zeros.size}")
    print(f"retrograde ordinates: {int(back.sum())} of {T_zeros.size}"
          f" ({100 * back.mean():.2f}%)")

    d_zero = nearest_dist(T, T_zeros)
    d_back = nearest_dist(T, T_back)
    gap = local_gap(T, T_zeros)
    u_zero = d_zero / gap
    u_back = d_back / gap

    # Retrograde stretches of unwrapped theta_2 (dθ2/dT > 0).
    raw = np.unwrap(th2)
    dth = np.gradient(raw, T)
    in_retro = dth > 0

    def summarize(name, sl):
        sl = np.asarray(sl)
        if sl.size != ang.size:
            sl = np.ones(ang.size, dtype=bool)
        return dict(
            n=int(np.sum(sl)),
            ang_mean=float(np.mean(ang[sl])),
            ang_med=float(np.median(ang[sl])),
            ang_p90=float(np.percentile(ang[sl], 90)),
            ratio_mean=float(np.mean(ratio[sl])),
            ratio_med=float(np.median(ratio[sl])),
            rel_mean=float(np.mean(rel[sl])),
            rel_med=float(np.median(rel[sl])),
            rel_p99=float(np.percentile(rel[sl], 99)),
        )

    all_s = summarize("all", np.ones(ang.size, bool))
    near_z = u_zero < 0.15
    far_z = u_zero > 0.35
    near_r = u_back < 0.15
    far_r = u_back > 0.35
    stats = {
        "all": all_s,
        "near_zero": summarize("near_zero", near_z),
        "far_zero": summarize("far_zero", far_z),
        "near_retro_ord": summarize("near_retro_ord", near_r),
        "far_retro_ord": summarize("far_retro_ord", far_r),
        "in_retro_stretch": summarize("in_retro_stretch", in_retro),
        "out_retro_stretch": summarize("out_retro_stretch", ~in_retro),
    }

    # Pearson / Spearman of angle vs closeness (1 - 2u, clipped).
    def corr(x, y):
        x, y = np.asarray(x, float), np.asarray(y, float)
        ok = np.isfinite(x) & np.isfinite(y)
        x, y = x[ok], y[ok]
        if x.size < 8:
            return None
        pear = float(np.corrcoef(x, y)[0, 1])
        rx, ry = np.argsort(np.argsort(x)), np.argsort(np.argsort(y))
        spear = float(np.corrcoef(rx, ry)[0, 1])
        return dict(pearson=pear, spearman=spear, n=int(x.size))

    corrs = {
        "ang_vs_u_zero": corr(u_zero, ang),
        "ang_vs_u_back": corr(u_back, ang),
        "ang_vs_closeness_zero": corr(1.0 - np.clip(2 * u_zero, 0, 1), ang),
        "ang_vs_closeness_back": corr(1.0 - np.clip(2 * u_back, 0, 1), ang),
        "ratio_vs_u_zero": corr(u_zero, ratio),
        "L1_vs_L2": corr(L1, L2),
    }

    # Equal-length? never, almost never, or sometimes.
    eq_1e3 = float(np.mean(rel < 1e-3))
    eq_1e2 = float(np.mean(rel < 1e-2))
    eq_5e2 = float(np.mean(rel < 0.05))

    u_edges = np.array([0, 0.05, 0.1, 0.15, 0.25, 0.35, 0.5])
    u_c, ang_u_z, n_u_z = bin_mean(u_zero, ang, u_edges)
    _, ang_u_r, n_u_r = bin_mean(u_back, ang, u_edges)
    _, ratio_u_z, _ = bin_mean(u_zero, ratio, u_edges)

    T_c, ang_T, _ = decimate_mean(T, ang, 240)
    _, ratio_T, _ = decimate_mean(T, ratio, 240)
    _, L1_T, _ = decimate_mean(T, L1, 240)
    _, L2_T, _ = decimate_mean(T, L2, 240)
    _, rel_T, _ = decimate_mean(T, rel, 240)
    _, th2_T, _ = decimate_mean(T, np.degrees(np.mod(th2, 2 * np.pi)), 240)

    # A zoom around the paper's known retrograde window.
    zsl = (T >= 6.10) & (T <= 6.30)
    zoom = None
    if np.any(zsl):
        zoom = dict(
            T=T[zsl][::2].tolist(),
            ang=ang[zsl][::2].tolist(),
            ratio=ratio[zsl][::2].tolist(),
            th2=np.degrees(np.mod(th2[zsl][::2], 2 * np.pi)).tolist(),
            zeros=[float(x) for x in T_zeros if 6.10 <= x <= 6.30],
            retro=[float(x) for x in T_back if 6.10 <= x <= 6.30],
        )

    out = dict(
        n_requested=N_SAMP,
        n_kept=int(T.size),
        n_skipped=skipped,
        T_range=[T_LO, T_HI],
        max_closure=float(err.max()),
        median_closure=float(np.median(err)),
        n_zeros=int(T_zeros.size),
        n_retro=int(back.sum()),
        equal_frac={"rel<1e-3": eq_1e3, "rel<1e-2": eq_1e2, "rel<5e-2": eq_5e2},
        ratio_minmax=[float(ratio.min()), float(ratio.max())],
        ang_minmax=[float(ang.min()), float(ang.max())],
        stats=stats,
        corrs=corrs,
        bins=dict(
            u_centres=u_c.tolist(),
            ang_near_zero=np.where(np.isfinite(ang_u_z), ang_u_z, None).tolist(),
            n_near_zero=n_u_z.tolist(),
            ang_near_retro=np.where(np.isfinite(ang_u_r), ang_u_r, None).tolist(),
            n_near_retro=n_u_r.tolist(),
            ratio_near_zero=np.where(np.isfinite(ratio_u_z), ratio_u_z, None).tolist(),
        ),
        series=dict(
            T=[round(float(x), 4) for x in T_c],
            ang=[None if not np.isfinite(v) else round(float(v), 3) for v in ang_T],
            ratio=[None if not np.isfinite(v) else round(float(v), 4) for v in ratio_T],
            L1=[None if not np.isfinite(v) else round(float(v), 4) for v in L1_T],
            L2=[None if not np.isfinite(v) else round(float(v), 4) for v in L2_T],
            rel=[None if not np.isfinite(v) else round(float(v), 4) for v in rel_T],
            th2=[None if not np.isfinite(v) else round(float(v), 2) for v in th2_T],
        ),
        zoom=zoom,
        retro_T=[round(float(x), 5) for x in T_back],
    )
    with open(OUT_JSON, "w") as f:
        json.dump(out, f)
    print(f"\nwrote {OUT_JSON}")
    print(f"kept {T.size}/{N_SAMP}  skipped {skipped}  "
          f"max |V1+V2-B1|={err.max():.2e}")
    print(f"|V1|/|V2|: min {ratio.min():.4f}  med {np.median(ratio):.4f}  "
          f"max {ratio.max():.4f}")
    print(f"rel |L1-L2|/max: med {np.median(rel):.4f}  "
          f"frac<1e-3 {eq_1e3:.4f}  frac<1e-2 {eq_1e2:.4f}")
    print(f"angle (deg): min {ang.min():.2f}  med {np.median(ang):.2f}  "
          f"mean {ang.mean():.2f}  max {ang.max():.2f}")
    print("angle near zero (u<0.15) vs far (u>0.35): "
          f"{stats['near_zero']['ang_mean']:.2f} vs {stats['far_zero']['ang_mean']:.2f}")
    print("angle near retro ordinate vs far: "
          f"{stats['near_retro_ord']['ang_mean']:.2f} vs {stats['far_retro_ord']['ang_mean']:.2f}")
    print("angle in retro stretch vs out: "
          f"{stats['in_retro_stretch']['ang_mean']:.2f} vs {stats['out_retro_stretch']['ang_mean']:.2f}")
    print("correlations:", json.dumps(corrs, indent=2))
    print("angle by distance-to-zero / gap:")
    for c, a, n in zip(u_c, ang_u_z, n_u_z):
        print(f"  u~{c:.3f}  n={n:5d}  ang={a:.2f}")
    print("angle by distance-to-retrograde / gap:")
    for c, a, n in zip(u_c, ang_u_r, n_u_r):
        print(f"  u~{c:.3f}  n={n:5d}  ang={a:.2f}")


if __name__ == "__main__":
    main()
