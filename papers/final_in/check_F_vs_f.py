#!/usr/bin/env python3
"""How the yin-yang function F of eq. (103) relates to Siegel's f(s) of eq. (43).

Two claims, both checked numerically:

(A) F(u) of (103) is the closed form of Siegel's section-1 integral (his (5)):
        Phi(u) = int_{0 <^ 1} e^{-pi i x^2 + 2 pi i u x}/(e^{pi i x} - e^{-pi i x}) dx
               = 1/(1 - e^{-2 pi i u}) - e^{pi i u^2}/(e^{pi i u} - e^{-pi i u}) = F(u).

(B) Siegel builds f(s) from that same F: in his section 3 he multiplies (5) by
    u^{-s} and integrates along the first-quadrant bisector.  The first term of F
    produces zeta(1-s); the second term, B(u) = e^{pi i u^2}/(e^{pi i u} - e^{-pi i u}),
    produces f(s):
        f(s) = (e^{pi i s} - 1) * int_0^{e^{i pi/4} infinity} u^{-s} B(u) du   (sigma < 0).
"""

import mpmath as mp

from check_siegel_f import f_siegel, sin_factor

mp.mp.dps = 30

EPS_BAR = mp.exp(1j * mp.pi / 4)  # Siegel's eps-bar, the first-quadrant bisector
DIR_PHI = mp.exp(3j * mp.pi / 4)  # the 0 <^ 1 path direction


def F(u):
    """Eq. (103): Siegel's evaluated section-1 integral."""
    return 1 / (1 - mp.exp(-2j * mp.pi * u)) - mp.exp(1j * mp.pi * u**2) / sin_factor(u)


def B(u):
    """The second term of F alone."""
    return mp.exp(1j * mp.pi * u**2) / sin_factor(u)


def Phi(u):
    """Siegel's (1): the integral that (103) evaluates, on the path 0 <^ 1."""

    def integrand(v):
        x = mp.mpf(1) / 2 + v * DIR_PHI
        return mp.exp(-1j * mp.pi * x**2 + 2j * mp.pi * u * x) / sin_factor(x) * DIR_PHI

    return mp.quad(integrand, [-12, 0, 12])


def f_from_F(s):
    """Claim (B): f(s) as a u^{-s} moment of the second term of F."""

    def integrand(r):
        u = r * EPS_BAR
        return u ** (-s) * B(u) * EPS_BAR

    # u^{-s} = u^{-sigma} e^{-i t log u} oscillates ever faster as u -> 0, so
    # subdivide geometrically into the endpoint.
    pts = [mp.mpf(0)] + [mp.mpf(2) ** (-k) for k in range(24, -1, -1)] + [mp.mpf(24)]
    tail = mp.quad(integrand, pts, maxdegree=10)
    return (mp.exp(1j * mp.pi * s) - 1) * tail


print("(A) is F of eq.(103) the closed form of Siegel's section-1 integral?")
for u in ("0.3", "0.5+0.2j", "1.4-0.3j", "2.25"):
    uu = mp.mpmathify(u)
    print(f"    u={u:10s}  |Phi(u) - F(u)| = {float(abs(Phi(uu) - F(uu))):.3e}   (|F|={float(abs(F(uu))):.4f})")

print()
print("(B) is Siegel's f(s) the u^{-s} moment of F's second term?   (needs sigma < 0)")
for sigma, t in (("-0.5", "20.0"), ("-0.5", "6.0"), ("-1.3", "12.0"), ("-0.2", "3.0")):
    s = mp.mpc(mp.mpf(sigma), mp.mpf(t))
    lhs = f_siegel(s)
    rhs = f_from_F(s)
    print(
        f"    s={sigma}+{t}i:  |f(s) - (e^{{pi i s}}-1) * moment| = {float(abs(lhs - rhs)):.3e}"
        f"   (|f(s)|={float(abs(lhs)):.6f})"
    )
