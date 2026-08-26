#!/usr/bin/env python3
"""Hunting large |zeta| with the links alone, one unit of the index at a time.

Neither rho of Remark rem:nstar-slope nor the envelope 2L1 of (eq:env-bounds)
can scout: both are functions of zeta at the point already evaluated.  What is
cheap is the reason 2L1 grows.  Leg 1 is mostly the link sum, so the first few
links carry the alignment that makes it large, and

    S_K(t) = |sum_{n<=K} n^{-1/2} exp(-i t log n)|

costs K terms at any height.  For each unit interval of the index this script
measures

  * the true maximum M of |Z| over the interval, by dense sampling;
  * the link ceiling 2 sum_{n<=m} n^{-1/2}, which is 2L1 with every link aligned;
  * how much of M is captured by evaluating Z only at the strongest peaks of
    S_K, which is the search a cheap score would actually drive.

Run:  python3 check_large_values.py [T_lo T_hi]
"""

from __future__ import annotations

import json
import os
import sys
import time

import mpmath as mp
import numpy as np

from check_counting_curve import theta_prime
from fig_counting_index import I_of_T

mp.mp.dps = 15

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, "large_values_cache.json")

RANGE = (5, 24)
PER_GAP = 8                     # sample points per mean zero spacing
KS = tuple(range(2, 13))        # link truncations (K = 1 has no peaks)
TOPS = (1, 3, 5, 10)            # candidate peaks we are willing to test


def peaks_of(y):
    """Indices of local maxima, strongest first."""
    idx = [i for i in range(1, len(y) - 1)
           if y[i] >= y[i - 1] and y[i] > y[i + 1]]
    return sorted(idx, key=lambda i: -y[i])


def interval(T):
    """Everything measured on one unit interval of the index."""
    a, b = float(I_of_T(mp.mpf(T))), float(I_of_T(mp.mpf(T + 1)))
    dens = float(theta_prime(mp.mpf((a + b) / 2))) / np.pi
    npts = int(PER_GAP * dens * (b - a))
    tg = np.linspace(a, b, npts)
    Z = np.array([float(abs(mp.siegelz(mp.mpf(u)))) for u in tg])
    M = float(Z.max())
    m = int(np.floor(T))
    row = {"T": T, "t_lo": a, "t_hi": b, "zeros": int(dens * (b - a)),
           "npts": npts, "M": M, "argM": float(tg[int(Z.argmax())]),
           "ceiling": 2 * sum(k ** -0.5 for k in range(1, m + 1)),
           "peak": {}, "capture": {}}
    for K in KS:
        n = np.arange(1, K + 1)
        s = np.abs(((n ** -0.5) * np.exp(-1j * np.outer(tg, np.log(n))))
                   .sum(axis=1))
        pk = peaks_of(s)
        row["peak"][str(K)] = float(s.max())
        row["capture"][str(K)] = {str(top): float(max(Z[i] for i in pk[:top]) / M)
                                  for top in TOPS if pk}
    return row


def load(rng=RANGE):
    data = {}
    if os.path.exists(CACHE):
        with open(CACHE) as fh:
            data = json.load(fh)
    fresh = False
    t0 = time.time()
    for T in range(*rng):
        if str(T) not in data:
            data[str(T)] = interval(T)
            r = data[str(T)]
            print(f"  T={T:3d}  {r['zeros']:4d} zeros, {r['npts']:5d} samples,"
                  f" max|Z| {r['M']:7.3f}   [{time.time() - t0:4.0f}s]")
            fresh = True
    if fresh:
        with open(CACHE, "w") as fh:
            json.dump(data, fh)
    return [data[str(T)] for T in range(*rng)]


def spear(x, y):
    def rk(v):
        o = sorted(range(len(v)), key=lambda i: v[i])
        r = [0.0] * len(v)
        for k, i in enumerate(o):
            r[i] = float(k)
        return np.array(r)
    return float(np.corrcoef(rk(x), rk(y))[0, 1])


def main() -> None:
    rng = RANGE
    if len(sys.argv) > 2:
        rng = (int(sys.argv[1]), int(sys.argv[2]))
    rows = load(rng)
    T = np.array([float(r["T"]) for r in rows])
    M = np.array([r["M"] for r in rows])
    ceil = np.array([r["ceiling"] for r in rows])
    res = M / np.sqrt(T)

    print(f"\n{len(rows)} unit intervals, T = {int(T[0])} to {int(T[-1]) + 1},"
          f" t = {rows[0]['t_lo']:.0f} to {rows[-1]['t_hi']:.0f}")
    fit = np.polyfit(np.log(T), np.log(M), 1)
    print(f"  max|Z| ~ {np.exp(fit[1]):.3f} T^{fit[0]:.3f}")
    print(f"  max|Z|/sqrt(T): mean {res.mean():.3f}, sd {res.std():.3f},"
          f" range {res.min():.3f} to {res.max():.3f}")
    print(f"  max|Z| / link ceiling: {(M / ceil).max():.3f} down to"
          f" {(M / ceil).min():.3f}")
    ups = sum(1 for i in range(1, len(M)) if M[i] > M[i - 1])
    print(f"  the maximum rose in {ups} of {len(M) - 1} consecutive intervals")

    print("\nfraction of the interval maximum captured, mean over the intervals")
    print("  K   " + "".join(f"   top{t:<3d}" for t in TOPS))
    for K in KS:
        print(f"  {K:<3d} " + "".join(
            f"   {np.mean([r['capture'][str(K)][str(t)] for r in rows]):5.3f} "
            for t in TOPS))

    print("\nranking the intervals by the peak of S_K")
    for K in (3, 5, 10, 12):
        S = np.array([r["peak"][str(K)] for r in rows])
        print(f"  S{K:<3d} vs max|Z| {spear(S, M):+.3f},"
              f"  vs the detrended max|Z|/sqrt(T) {spear(S, res):+.3f},"
              f"  peak range {S.min():.3f} to {S.max():.3f}")


if __name__ == "__main__":
    main()
