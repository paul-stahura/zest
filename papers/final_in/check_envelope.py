#!/usr/bin/env python3
"""Two envelopes for |zeta(1/2 + it)|, one from each reflection-symmetric split.

For any split zeta = B1 + B2 with B2 = chi conj(B1), the critical line gives
|B2| = |B1| (Corollary 9.1).  Writing L = |B1| and u = theta2/pi in [0,2) with
theta2 = arg(B2/B1),

    zeta = B1 (1 + e^{i pi u})  =>  |zeta| = 2 L |cos(pi u / 2)|,

so |cos| <= 1 gives the upper envelope 2L, and the chord |cos(pi u/2)| >= |1-u|
gives the lower envelope 2 L |1 - u|.  Both hold for every split; what differs
is where they are attained, since 2L = sqrt(Z^2 + 4 h^2) and the upper envelope
is touched exactly where the offset h vanishes.

  * partial-summand split: h = Im(e^{i theta}(Sigma1 + R1ps)) vanishes only in
    those gaps whose ends have opposite h, so the envelope is touched in some
    gaps and not others;
  * velocity split: h* = -Z'/(2 theta') vanishes at every extremum of Z, so
    2 L* = sqrt(Z^2 + (Z'/theta')^2) touches |Z| once in every gap.  This is the
    usual envelope of an oscillation of instantaneous frequency theta'.

Run:  python3 check_envelope.py [T_lo T_hi npts]
"""

from __future__ import annotations

import statistics as st
import sys

import mpmath as mp

from check_counting_curve import (bisector, count_curve, offset,
                                  theta_prime)
from fig_counting_index import I_of_T

mp.mp.dps = 25

SPLITS = ("ps", "star")


def parts(t, which):
    """|zeta|, the leg length L, and u = theta2/pi for one split."""
    z = mp.zeta(mp.mpc(0.5, t))
    B1 = bisector(t, which)
    B2 = z - B1
    u = mp.fmod(mp.arg(B2 / B1) + 2 * mp.pi, 2 * mp.pi) / mp.pi
    return abs(z), abs(B1), abs(B2), u


def zeros_in(t_lo, t_hi, npts=4000):
    """Zeros of Z in a band, by sign change then bisection."""
    out = []
    prev_t, prev_Z = t_lo, mp.siegelz(t_lo)
    for j in range(1, npts + 1):
        t = t_lo + (t_hi - t_lo) * mp.mpf(j) / npts
        Z = mp.siegelz(t)
        if prev_Z * Z < 0:
            out.append(mp.findroot(mp.siegelz, (prev_t, t), solver="bisect",
                                   tol=1e-22))
        prev_t, prev_Z = t, Z
    return out


def report_identities(t_lo, t_hi, npts) -> None:
    print(f"scan of {npts + 1} points, t = {float(t_lo):.1f}"
          f" .. {float(t_hi):.1f}")
    stat = {k: dict(ident=0.0, legs=0.0, up=1e9, dn=1e9, ratio=[]) for k in SPLITS}
    for j in range(npts + 1):
        t = t_lo + (t_hi - t_lo) * mp.mpf(j) / npts
        for k in SPLITS:
            az, L1, L2, u = parts(t, k)
            s = stat[k]
            s["ident"] = max(s["ident"],
                             float(abs(az - 2 * L1 * abs(mp.cos(u * mp.pi / 2)))))
            s["legs"] = max(s["legs"], float(abs(L1 - L2)))
            s["up"] = min(s["up"], float(2 * L1 - az))
            s["dn"] = min(s["dn"], float(az - 2 * L1 * abs(1 - u)))
            s["ratio"].append(float(az / (2 * L1)))
    for k in SPLITS:
        s = stat[k]
        print(f"  {k:>4}: |zeta| = 2L|cos(theta2/2)| to {s['ident']:.1e},"
              f" |L1|-|L2| to {s['legs']:.1e}")
        print(f"        2L - |zeta| >= {s['up']:+.2e},"
              f" |zeta| - 2L|1-u| >= {s['dn']:+.2e},"
              f" mean |zeta|/2L = {st.mean(s['ratio']):.4f}")

    print("\n  velocity split in closed form: 2L* = sqrt(Z^2 + (Z'/theta')^2)")
    for t in (300.0, 700.0, 1070.0):
        L = abs(bisector(mp.mpf(t), "star"))
        Z, Z1 = mp.siegelz(t), mp.diff(mp.siegelz, t)
        closed = mp.sqrt(Z ** 2 + (Z1 / theta_prime(mp.mpf(t))) ** 2)
        print(f"    t={t:8.1f}  2L* = {float(2 * L):.10f}"
              f"  closed form {float(closed):.10f}"
              f"  gap {float(abs(2 * L - closed)):.1e}")


def report_touches(T_lo, T_hi) -> None:
    """How often each upper envelope is attained, gap by gap."""
    t_lo, t_hi = I_of_T(mp.mpf(T_lo)), I_of_T(mp.mpf(T_hi))
    zs = zeros_in(t_lo, t_hi)
    print(f"\n{len(zs)} zeros over {T_lo} <= T <= {T_hi}"
          f" (t = {float(t_lo):.1f} .. {float(t_hi):.1f})")
    for k in SPLITS:
        h = [float(offset(t, k)) for t in zs]
        flips = sum(1 for a, b in zip(h, h[1:]) if a * b < 0)
        print(f"  {k:>4}: h alternates in {flips} of {len(h) - 1} gaps,"
              f" so the upper envelope is touched in {flips} of them")
    # for the velocity split the touch is at the extremum of Z itself
    worst = 0.0
    for a, b in zip(zs, zs[1:]):
        e = mp.findroot(lambda u: mp.diff(mp.siegelz, u), (a + b) / 2,
                        solver="secant", tol=1e-20)
        az, L1, _, _ = parts(e, "star")
        worst = max(worst, float(abs(az - 2 * L1)))
    print(f"  star: at the {len(zs) - 1} extrema of Z between those zeros,"
          f" 2L* - |zeta| is at most {worst:.1e}")


def report_factorization() -> None:
    """W = e^{i theta} B1* carries the envelope and the counting curve at once.

    Its modulus is L*, its argument is pi(N* - 3/2), and Z = 2 Re W, so
    Z = -2|W| sin(pi N*) exactly.
    """
    print("\nZ = -2|W| sin(pi N*) with W = Z/2 - i Z'/(2 theta')")
    for T in (6.13, 6.19, 9.75, 12.5473):
        t = I_of_T(mp.mpf(T))
        Z, Z1 = mp.siegelz(t), mp.diff(mp.siegelz, t)
        W = Z / 2 - 1j * Z1 / (2 * theta_prime(t))
        Ns = count_curve(T, "star")
        rhs = -2 * abs(W) * mp.sin(mp.pi * mp.mpf(Ns))
        print(f"  T={T:8.4f}  Z={float(Z):+12.6f}  -2|W|sin(pi N*)"
              f"={float(rhs):+12.6f}  gap {float(abs(Z - rhs)):.1e}"
              f"  2|W|={float(2 * abs(W)):9.5f}  N*={Ns:11.5f}")


def main() -> None:
    T_lo, T_hi, npts = 6.0, 13.0, 2000
    if len(sys.argv) > 3:
        T_lo, T_hi, npts = float(sys.argv[1]), float(sys.argv[2]), int(sys.argv[3])
    report_identities(I_of_T(mp.mpf(T_lo)), I_of_T(mp.mpf(T_hi)), npts)
    report_factorization()
    report_touches(12.5, 12.6)
    report_touches(6.125, 6.275)


if __name__ == "__main__":
    main()
