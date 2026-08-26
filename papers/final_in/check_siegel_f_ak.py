#!/usr/bin/env python3
"""Test eq. (42), f(s) = Sigma_1 + R_1ak, directly.

f(s) is Siegel's (58) by contour quadrature (see check_siegel_f.py); R_1ak is
Kuznetsov's 8-coefficient half-remainder as implemented in
fig4_kuznetsov_zoom.py.  We test the claim for both term counts:
the paper's m = floor(T) and Siegel's m_1 = floor(T + 1/2).
"""

import mpmath as mp

from check_siegel_f import I, chi, f_siegel, partial_sum, set_precision
from fig4_kuznetsov_zoom import I1_of


def R1ak_of(s, m):
    """Kuznetsov's R_1ak = -1/2 (-1)^m I_1, with his half-integer parameter m+1/2."""
    return -0.5 * ((-1.0) ** m) * I1_of(complex(s), m + 0.5)


def report(sigma, T):
    mp.mp.dps = 40
    T = mp.mpf(T)
    t = I(T)
    set_precision(t)
    sigma = mp.mpf(sigma)
    T = mp.mpf(T)
    t = I(T)
    s = mp.mpc(sigma, t)

    f = f_siegel(s)
    z = mp.zeta(s)
    m_paper = int(mp.floor(T))
    m_siegel = int(mp.floor(T + mp.mpf(1) / 2))

    print(f"sigma={float(sigma)}, T={float(T)}   frac T = {float(T) - m_paper:.2f}")
    for name, m in (("floor(T)     ", m_paper), ("floor(T+1/2) ", m_siegel)):
        S1 = partial_sum(s, m)
        R1ak = mp.mpc(R1ak_of(s, m))
        resid = abs(f - S1 - R1ak)
        print(
            f"  m = {name} = {m:2d}:  |f - Sigma1|      = {float(abs(f - S1)):.9f}"
            f"   |R_1ak| = {float(abs(R1ak)):.9f}"
        )
        print(f"                       |f - Sigma1 - R_1ak| = {float(resid):.3e}")
    # is f - Sigma1 instead just half the exact remainder?
    S1 = partial_sum(s, m_paper)
    S2 = chi(s) * partial_sum(1 - s, m_paper)
    R = z - S1 - S2
    print(f"  for reference: |f - Sigma1 - R/2| = {float(abs(f - S1 - R / 2)):.3e}  (R/2 = Riemann-Siegel half-split)")
    print()


if __name__ == "__main__":
    for sigma, T in [
        ("0.5", "2.4"),
        ("0.5", "2.72"),
        ("0.72", "2.4"),
        ("0.5", "6.18"),
        ("0.5", "6.72"),
        ("0.3", "6.18"),
    ]:
        report(sigma, T)
