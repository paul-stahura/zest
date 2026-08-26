#!/usr/bin/env python3
"""The slope of N* between ordinates, and the size of |Z| there.

Since exp(i theta) B1* = Z/2 - i Z'/(2 theta'), the counting curve of
(eq:N-star) satisfies pi N*(T) = arg W + 3 pi/2 with W = Z/2 - i Z'/(2 theta'),
so its slope is d(arg W)/dt taken in the index.  Measured against the local
mean density theta'/pi it becomes

    rho = (1/theta') d/dt arg W,

which is 1 at every ordinate, by (eq:crossing-rate) applied to h*.  Two things
are exact:

  * rho = 1 at an ordinate, where Z = 0;
  * rho = -Z''/(theta'^2 Z) at an extremum of Z, where Z' = 0 makes W real.

The second says flatness at a hump is a small curvature-to-height ratio, which
is why the flatness of N* ranks the size of |Z|.  The script measures that rank
correlation in three blocks of ordinates, and asks whether rho'(gamma_n), the
only local datum at an ordinate once rho = 1 is known, forecasts the hump ahead.

Run:  python3 check_nstar_slope.py [n0 ngaps]...
"""

from __future__ import annotations

import statistics as st
import sys

import mpmath as mp

from check_counting_curve import theta_prime
from fig_counting_index import I_of_T, T_of_I

mp.mp.dps = 30

BLOCKS = ((1, 100), (1000, 60), (10_000, 40))
WIN = 15          # half-width of the moving average that detrends the peaks
H = mp.mpf("1e-3")


def rho(t):
    """Slope of N* at height t, in units of the local mean density."""
    Z = mp.siegelz(t)
    Z1 = mp.diff(mp.siegelz, t)
    Z2 = mp.diff(mp.siegelz, t, 2)
    tp, tp2 = theta_prime(t), mp.diff(theta_prime, t)
    W = Z / 2 - 1j * Z1 / (2 * tp)
    W1 = Z1 / 2 - 1j * (Z2 / (2 * tp) - Z1 * tp2 / (2 * tp ** 2))
    return mp.im(W1 / W) / tp


def density_T(T):
    """dN*/dT at an ordinate: theta'(I(T)) I'(T)/pi."""
    return theta_prime(I_of_T(T)) * mp.diff(I_of_T, T) / mp.pi


def peak_between(a, b, npts=24):
    """The extremum of Z inside (a, b), refined on Z' = 0."""
    best, bt = mp.mpf(0), (a + b) / 2
    for j in range(1, npts):
        u = a + (b - a) * mp.mpf(j) / npts
        v = abs(mp.siegelz(u))
        if v > best:
            best, bt = v, u
    return mp.findroot(lambda u: mp.diff(mp.siegelz, u), bt, solver="secant",
                       tol=1e-20)


def corr(a, b):
    ma, mb = st.mean(a), st.mean(b)
    sa = sum((x - ma) ** 2 for x in a) ** 0.5
    sb = sum((y - mb) ** 2 for y in b) ** 0.5
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / (sa * sb)


def rank(v):
    order = sorted(range(len(v)), key=lambda i: v[i])
    out = [0.0] * len(v)
    for k, i in enumerate(order):
        out[i] = float(k)
    return out


def gaps(n0, ng):
    """One record per gap: the peak of |Z| in it, and rho at that peak."""
    gam = [mp.zetazero(n).imag for n in range(n0, n0 + ng + 1)]
    rows = []
    for n in range(ng):
        a, b = gam[n], gam[n + 1]
        bt = peak_between(a, b)
        Ta, Tb = T_of_I(float(a)), T_of_I(float(b))
        dens = float(density_T((Ta + Tb) / 2))
        # rho'(gamma_n) in units of the mean spacing pi/theta': how fast the
        # slope falls away as the gap opens, read at the ordinate behind it
        slope_fall = ((rho(a + H) - rho(a - H)) / (2 * H)
                      * mp.pi / theta_prime(a))
        rows.append(dict(n=n0 + n, tpk=float(bt),
                         peak=float(abs(mp.siegelz(bt))),
                         delta=float(Tb - Ta) * dens,
                         rho=float(rho(bt)), fall=float(slope_fall)))
    for i, r in enumerate(rows):
        lo, hi = max(0, i - WIN), min(len(rows), i + WIN + 1)
        r["p"] = r["peak"] / st.mean(x["peak"] for x in rows[lo:hi])
    return gam, rows


def report_exact() -> None:
    print("rho = 1 at every ordinate")
    for n in (1, 100, 1000, 10_000):
        g = mp.zetazero(n).imag
        print(f"  gamma_{n:<6d} t={float(g):12.4f}   rho = {float(rho(g)):.12f}")

    print("\nrho = -Z''/(theta'^2 Z) at every extremum of Z")
    for n in (1, 8, 30, 99, 1003):
        a, b = mp.zetazero(n).imag, mp.zetazero(n + 1).imag
        bt = peak_between(a, b)
        Z, Z2 = mp.siegelz(bt), mp.diff(mp.siegelz, bt, 2)
        tp = theta_prime(bt)
        print(f"  peak in gap {n:<5d} t={float(bt):11.4f}"
              f"   rho = {float(rho(bt)):+.10f}"
              f"   -Z''/(th'^2 Z) = {float(-Z2 / (tp ** 2 * Z)):+.10f}"
              f"   |Z| = {float(abs(Z)):7.3f}")


def report_block(n0, ng) -> None:
    gam, rows = gaps(n0, ng)
    delta = [r["delta"] for r in rows]
    rh = [r["rho"] for r in rows]
    p = [r["p"] for r in rows]
    fall = [r["fall"] for r in rows]
    lp = [float(mp.log(x)) for x in p]
    lr = [float(-mp.log(x)) for x in rh]
    expo = corr(lp, lr) * st.pstdev(lp) / st.pstdev(lr)
    print(f"\ngamma_{n0}..gamma_{n0 + ng}, t = {float(gam[0]):.2f}"
          f" .. {float(gam[-1]):.2f}, {ng} gaps")
    print(f"  rho at the peak vs peak height : spearman "
          f"{corr(rank(rh), rank(p)):+.3f}")
    print(f"  normalized gap vs peak height  : spearman "
          f"{corr(rank(delta), rank(p)):+.3f}")
    print(f"  peak height ~ rho^(-{expo:.3f})  (log-log r = {corr(lp, lr):.3f})")
    print(f"  rho'(gamma_n) vs the hump ahead: spearman "
          f"{corr(rank(fall), rank(p)):+.3f}")
    print(f"  rho'(gamma_n) vs the gap ahead : spearman "
          f"{corr(rank(fall), rank(delta)):+.3f}")
    print(f"  rho and the gap are collinear  : spearman "
          f"{corr(rank(rh), rank(delta)):+.3f}")
    print(f"  rho ranges {min(rh):.3f} to {max(rh):.3f}")


def main() -> None:
    blocks = BLOCKS
    if len(sys.argv) > 2:
        a = [int(x) for x in sys.argv[1:]]
        blocks = tuple(zip(a[::2], a[1::2]))
    report_exact()
    for n0, ng in blocks:
        report_block(n0, ng)


if __name__ == "__main__":
    main()
