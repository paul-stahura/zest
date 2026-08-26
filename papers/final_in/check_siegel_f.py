#!/usr/bin/env python3
"""Check eq. (42), f(s) ~ Sigma_1 + R_1ak, against Siegel 1932.

Siegel's f(s) is his (58), an integral on the path 0 <- 1 (reflection of 0 <^ 1
in the real axis).  His (56) plus the functional equation (57) give the exact
identity zeta = f + chi*h, where h is the companion integral on 0 -> 1.  We
evaluate both integrals by quadrature and compare f(s) - Sigma_1 for the two
competing term counts: the paper's m = floor(T) and Siegel's m1 = floor(T+1/2).
"""

import mpmath as mp

# Path directions: |e^{+pi i x^2}| decays along e^{-3 pi i/4}; |e^{-pi i x^2}|
# decays along e^{-pi i/4}.  Both lines cross the real axis at x = 1/2.
DIR_F = mp.exp(-3j * mp.pi / 4)
DIR_H = mp.exp(-1j * mp.pi / 4)

# On these straight paths |x^{-s}| reaches ~e^{pi t/4} before the Gaussian
# e^{-pi u^2} takes over, so the O(1) answer is a cancellation of that size:
# carry enough guard digits for it.
def set_precision(t):
    mp.mp.dps = int(30 + float(t) * (mp.pi / 4) / mp.log(10)) + 10


def u_limit(t):
    return mp.mpf(8) + mp.sqrt(t)


def sin_factor(x):
    return mp.exp(1j * mp.pi * x) - mp.exp(-1j * mp.pi * x)


def f_siegel(s):
    """Siegel (58): f(s) = int_{0 <- 1} x^{-s} e^{pi i x^2} / (e^{pi i x} - e^{-pi i x}) dx."""

    U = u_limit(mp.im(s))

    def integrand(u):
        x = mp.mpf(1) / 2 + u * DIR_F
        return x ** (-s) * mp.exp(1j * mp.pi * x**2) / sin_factor(x) * DIR_F

    return mp.quad(integrand, [-U, 0, U], maxdegree=12)


def h_siegel(s):
    """Companion integral on 0 -> 1 appearing in Siegel (56)."""

    U = u_limit(mp.im(s))

    def integrand(u):
        x = mp.mpf(1) / 2 + u * DIR_H
        return x ** (s - 1) * mp.exp(-1j * mp.pi * x**2) / sin_factor(x) * DIR_H

    return mp.quad(integrand, [-U, 0, U], maxdegree=12)


def chi(s):
    return mp.pi ** (s - mp.mpf(1) / 2) * mp.gamma((1 - s) / 2) / mp.gamma(s / 2)


def I(T):
    return mp.pi * (2 * T + 1) / mp.log(1 / mp.mpf(T) + 1)


def partial_sum(s, m):
    return mp.nsum(lambda n: n ** (-s), [1, m]) if m >= 1 else mp.mpc(0)


def report(sigma, T):
    mp.mp.dps = 40
    T = mp.mpf(T)
    t = I(T)
    set_precision(t)
    sigma = mp.mpf(sigma)
    T = mp.mpf(T)
    t = I(T)
    s = mp.mpc(sigma, t)
    z = mp.zeta(s)
    f = f_siegel(s)
    h = h_siegel(s)
    ch = chi(s)

    m_paper = int(mp.floor(T))
    m_siegel = int(mp.floor(T + mp.mpf(1) / 2))
    S1_paper = partial_sum(s, m_paper)
    S1_siegel = partial_sum(s, m_siegel)
    S2_paper = ch * partial_sum(1 - s, m_paper)
    R = z - S1_paper - S2_paper

    print(f"sigma={float(sigma)}, T={float(T)}  (t={float(t):.4f}, frac T={float(T)-m_paper:.2f}, dps={mp.mp.dps})")
    print(f"  identity  |f + chi*h - zeta| = {float(abs(f + ch * h - z)):.3e}   (relative to |zeta|={float(abs(z)):.4f})")
    print(f"  |R| = {float(abs(R)):.6f},  |R|/2 = {float(abs(R))/2:.6f}")
    print(f"  m_paper  = floor(T)     = {m_paper:2d}   |f - Sigma1| = {float(abs(f - S1_paper)):.6f}")
    print(f"  m_siegel = floor(T+1/2) = {m_siegel:2d}   |f - Sigma1| = {float(abs(f - S1_siegel)):.6f}")
    if m_siegel != m_paper:
        extra = mp.mpf(m_siegel) ** (-sigma)
        print(f"  the disputed summand |{m_siegel}^-s| = {float(extra):.6f}")
    print()


if __name__ == "__main__":
    for sigma, T in [
        ("0.5", "1.3"),
        ("0.5", "1.72"),
        ("0.5", "2.4"),
        ("0.5", "2.72"),
        ("0.72", "2.4"),
        ("0.5", "6.18"),
        ("0.5", "6.72"),
        ("0.3", "6.72"),
    ]:
        report(sigma, T)
