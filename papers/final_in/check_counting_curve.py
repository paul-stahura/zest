#!/usr/bin/env python3
"""Why N_ps skips ordinates, and a counting curve that does not.

Every reflection-symmetric split zeta = B1 + B2 with B2 = chi conj(B1) obeys,
on the critical line,

    exp(i theta(t)) B1 = Z(t)/2 + i h,      h real,                      (*)

which is the projection corollary.  An ordinate is therefore a crossing of the
imaginary axis by w = exp(i theta) B1, and there

    d/dt arg w = -Z'/(2h),

so consecutive crossings turn the same way only when sign(h) alternates, since
sign(Z') alternates by Rolle.  Where h nearly vanishes the alternation fails,
the angle retrogrades, and N_ps reads one too high.

Reading theta_2 instead changes nothing: theta_2 = -2(theta + theta_1) mod 2pi
for every such split, so the ps, R/2 and ak sawtooths are the same function of
their own theta_1 and all retrograde.

The cure changes the split.  With theta' the derivative of the Riemann-Siegel
theta, take the velocity split

    B1* = zeta + zeta'/(2 theta'),   B2* = -zeta'/(2 theta') = (i/2 theta') dzeta/dt,

whose transverse offset is h* = -Z'/(2 theta'), alternating by Rolle.  Then

    N*(T) = theta(I(T))/pi + arg(B1*)/pi + 3/2

is integer exactly at the ordinates, advances by exactly one between them, and
crosses each integer at rate theta'/pi, the mean density.

Run:  python3 check_counting_curve.py [n_lo] [n_hi]
"""

from __future__ import annotations

import math
import sys

import mpmath as mp
import numpy as np

from fig1_spiral_summands import chi
from fig_counting_index import I_of_T, T_of_I
from fig4_kuznetsov_zoom import I1_of

mp.mp.dps = 25


def theta_prime(t):
    """theta'(t) = Re psi(1/4 + i t/2)/2 - log(pi)/2."""
    return mp.re(mp.digamma(mp.mpf(1) / 4 + 1j * t / 2)) / 2 - mp.log(mp.pi) / 2


def sums_and_remainder(t, sig=0.5):
    """Sigma1, Sigma2, R and the two partial-summand directions at height t."""
    m = int(math.floor(T_of_I(t)))
    s = mp.mpc(sig, t)
    S1 = mp.fsum(mp.mpf(n) ** (-s) for n in range(1, m + 1))
    ch = chi(s)
    S2 = ch * mp.fsum(mp.mpf(n) ** (s - 1) for n in range(1, m + 1))
    R = mp.zeta(s) - S1 - S2
    w = t * mp.log(m + 1)
    return S1, S2, R, mp.exp(-1j * w), mp.exp(1j * (w + mp.arg(ch))), m


def bisector(t, which, sig=0.5):
    """B1 for the ps, R/2, ak or velocity split."""
    s = mp.mpc(sig, t)
    if which == "star":
        return mp.zeta(s) + mp.zeta(s, derivative=1) / (2 * theta_prime(t))
    S1, _, R, u1, u2, m = sums_and_remainder(t, sig)
    if which == "rs":
        return S1 + R / 2
    if which == "ak":
        return S1 + mp.mpc(-0.5 * (-1.0) ** m * I1_of(complex(s), m + 0.5))
    a, b, c, d = mp.re(u1), mp.re(u2), mp.im(u1), mp.im(u2)
    d1 = (mp.re(R) * d - b * mp.im(R)) / (a * d - b * c)
    return S1 + d1 * u1


def offset(t, which):
    """h in (*), the transverse offset of the bisector point."""
    return mp.im(mp.exp(1j * mp.siegeltheta(t)) * bisector(t, which))


def count_curve(T, which):
    """theta/pi + arg(B1)/pi + 3/2 for a given split."""
    t = I_of_T(T)
    return float(mp.siegeltheta(t) / mp.pi + mp.arg(bisector(t, which)) / mp.pi
                 + mp.mpf(3) / 2)


def report_structure() -> None:
    print("theta_2 = -2(theta + theta_1) mod 2pi, for every split")
    for t in (94.6513, 169.0945, 210.0):
        s = mp.mpc(0.5, t)
        th = mp.siegeltheta(t)
        out = []
        for which in ("ps", "rs", "ak", "star"):
            B1 = bisector(t, which)
            th1 = mp.arg(B1)
            th2 = mp.arg((mp.zeta(s) - B1) / B1)
            resid = mp.fmod(th2 + 2 * (th + th1) + mp.pi, 2 * mp.pi) - mp.pi
            out.append(f"{which} {float(abs(resid)):.0e}")
        print(f"  t={t:9.4f}:  " + "   ".join(out))

    print("\nthe velocity split is reflection-symmetric with exactly equal legs")
    for t in (30.0, 100.0, 500.0):
        s = mp.mpc(0.5, t)
        zeta, zp = mp.zeta(s), mp.zeta(s, derivative=1)
        thp = theta_prime(t)
        B1 = zeta + zp / (2 * thp)
        B2 = zeta - B1
        rot = mp.exp(1j * mp.siegeltheta(t)) * B1
        print(f"  t={t:7.1f}  |B2 - chi conj B1| = "
              f"{float(abs(B2 - chi(s) * mp.conj(B1))):.1e}"
              f"   |B1|-|B2| = {float(abs(abs(B1) - abs(B2))):.1e}"
              f"   Re(zeta conj zeta') + theta'|zeta|^2 = "
              f"{float(abs(mp.re(zeta * mp.conj(zp)) + thp * abs(zeta) ** 2)):.1e}")
        print(f"            rotated: |w - (Z/2 - i Z'/(2 theta'))| = "
              f"{float(abs(rot - (mp.siegelz(t) / 2 - 1j * mp.siegelz(t, derivative=1) / (2 * thp)))):.1e}"
              f"   h_rs - Im(e^(i th) Sigma1) = "
              f"{float(abs(offset(t, 'rs') - mp.im(mp.exp(1j * mp.siegeltheta(t)) * sums_and_remainder(t)[0]))):.1e}")


def report_retrograde(lo, hi) -> None:
    """Direction of each crossing, split by split, over a band of ordinates.

    The crossing turns with sign(-h Z'); the ordinates where that disagrees
    with the prevailing direction are the retrograde ones.
    """
    print(f"\nretrograde crossings among ordinates {lo}..{hi}")
    dirs = {k: [] for k in ("ps", "rs", "ak", "star")}
    ns = []
    for n in range(lo, hi + 1):
        t = float(mp.zetazero(n).imag)
        ns.append(n)
        zp = math.copysign(1.0, float(mp.siegelz(t, derivative=1)))
        for k in dirs:
            dirs[k].append(-math.copysign(1.0, float(offset(t, k))) * zp)
    for k, vals in dirs.items():
        keep = 1.0 if sum(vals) > 0 else -1.0
        back = [ns[i] for i, v in enumerate(vals) if v != keep]
        print(f"  {k:>4}: {len(back):3d} of {len(vals)} crossings retrograde"
              + (f", at n = {back}" if back else ""))


def report_high(ns=(10_000, 10_001, 50_000, 50_001)) -> None:
    """The same formula, same constant, at much greater height."""
    print("\nN* at high ordinates, no branch correction")
    for n in ns:
        t = float(mp.zetazero(n).imag)
        v = count_curve(T_of_I(t), "star")
        print(f"  n={n:6d}  t={t:12.4f}  T={T_of_I(t):8.4f}  N*={v:.6f}"
              f"  distance to n: {abs(v - n):.1e}")


def main() -> None:
    lo = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    hi = int(sys.argv[2]) if len(sys.argv) > 2 else 400

    report_structure()
    report_retrograde(max(lo, 20), min(hi, 82))
    report_high()

    print(f"\nvalue at the ordinates, n = {lo}..{hi}")
    miss_ps, miss_star, hits, misses = [], [], [], []
    worst, tap_gap, rate = 0.0, 0.0, []
    for n in range(lo, hi + 1):
        t = float(mp.zetazero(n).imag)
        T = T_of_I(t)
        h_ps = abs(float(offset(t, "ps")))
        v_ps, v_star = count_curve(T, "ps"), count_curve(T, "star")
        worst = max(worst, abs(v_star - round(v_star)))
        if round(v_ps) != n:
            miss_ps.append(n)
            misses.append(h_ps)
        else:
            hits.append(h_ps)
        if round(v_star) != n:
            miss_star.append(n)
        if n % 40 == 0:
            thp = theta_prime(t)
            th = mp.siegeltheta(t)
            m = int(math.floor(T))
            tap = mp.fsum(mp.mpf(k) ** mp.mpf(-0.5) * (1 - mp.log(k) / thp)
                          * mp.sin(th - t * mp.log(k)) for k in range(1, m + 1))
            tap_gap = max(tap_gap, float(abs(tap - offset(t, "star"))))
            # crossing rate of the star curve against theta'
            rate.append(float(abs(-mp.siegelz(t, derivative=1)
                                  / (2 * offset(t, "star")) - thp)))
    print(f"  N_ps misses {len(miss_ps)}/{hi - lo + 1} at n = {miss_ps}")
    print(f"  N*   misses {len(miss_star)}/{hi - lo + 1}")
    print(f"  N* largest distance to an integer at an ordinate: {worst:.1e}")
    print(f"  |h_ps| median {np.median(hits):.3f} where it hits,"
          f" {np.median(misses):.3f} where it misses (max {max(misses):.3f})")
    print(f"  link-only tapered surrogate for h*: max gap {tap_gap:.1e}")
    print(f"  crossing rate -Z'/(2h*) against theta': max gap {max(rate):.1e}")

    print("\ndense scan of N*")
    for window, npts in (((0.6, 8.0), 3000), ((3.0, 5.0), 1600)):
        T = np.linspace(*window, npts)
        V = np.array([count_curve(x, "star") for x in T])
        dV = np.diff(V)
        print(f"  {window[0]:.2f}<=T<={window[1]:.2f}: rise {V[-1] - V[0]:8.3f},"
              f" decreasing steps {(dV < 0).sum()}, branch wraps"
              f" {(np.abs(dV) > 1).sum()}, max |arg B1*|/pi"
              f" {np.abs(V - np.array([float(mp.siegeltheta(I_of_T(x)) / mp.pi) for x in T]) - 1.5).max():.3f}")


if __name__ == "__main__":
    main()
