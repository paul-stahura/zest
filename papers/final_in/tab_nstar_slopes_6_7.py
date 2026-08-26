"""Slope of N_* at each zero with T in [6,7].

At an ordinate Z=0, so dN_*/dt = theta'(gamma)/pi exactly. Verify by
evaluating the full closed form with Z' and Z'' from mpmath.
"""
import math

import numpy as np
from mpmath import mp

mp.dps = 25


def I_of(T):
    return math.pi * (2 * T + 1) / math.log(1 / T + 1)


t_lo, t_hi = I_of(6.0), I_of(7.0)

t = np.arange(t_lo - 0.5, t_hi + 0.5, 0.02)
Z = np.array([float(mp.siegelz(x)) for x in t])
zeros = []
for i in range(len(t) - 1):
    if Z[i] * Z[i + 1] < 0:
        r = mp.findroot(mp.siegelz, (t[i] + t[i + 1]) / 2)
        if t_lo <= float(r) <= t_hi:
            zeros.append(r)

print(f"{len(zeros)} zeros")
print("| k | gamma | raw slope dN*/dt | normalized slope rho |")
for j, g in enumerate(zeros, 1):
    thp = mp.diff(mp.siegeltheta, g)
    # full closed form (collapses to theta'/pi at a zero, but evaluate anyway)
    Zp = mp.diff(mp.siegelz, g)
    Zpp = mp.diff(mp.siegelz, g, 2)
    Zv = mp.siegelz(g)
    thpp = mp.diff(mp.siegeltheta, g, 2)
    num = thp * (Zp**2 - Zv * Zpp) + thpp * Zv * Zp
    den = thp**2 * Zv**2 + Zp**2
    raw = num / den / mp.pi
    rho = raw * mp.pi / thp
    print(f"| {j} | {mp.nstr(g, 10)} | {mp.nstr(raw, 8)} "
          f"| {mp.nstr(rho, 8)} |")
