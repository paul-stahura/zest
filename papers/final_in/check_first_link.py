"""Spot check of the any-link cut, and of the first-link formula.

For a forward link k and its crossing reverse link j = C_l(k,T), the crossing
point lies on both links, so walking to it from the origin along the forward
chain and from zeta along the reverse chain must give the same point:

    zeta = sum_{n<=k} n^-s + d1hat(k,T) (k+1)^-s
           + chi(s) [ sum_{n<=j} n^(s-1) + d2hat(k,T) (j+1)^(s-1) ].

At k = m this is the boxed formula with both cutoffs at floor(T).  At k = 0 the
forward sum is empty and the first piece is the real number d1hat(0,T) in (0,1).

The script solves for the two crossing fractions as the intersection of the two
links, then rebuilds zeta from the right-hand side and reports the error.  It
also records whether the nearest-integer rule j0 = [a^2/(k+1)] - 1 names the
reverse link that actually crosses.

Usage:  python3 check_first_link.py            # 500 samples, plus off-line set
        python3 check_first_link.py --fast     # 60 samples, for a quick look
"""
import sys

import mpmath as mp

mp.mp.dps = 30

SIG_OFF = ['0.25', '0.35', '0.7', '0.9']


def I_of_T(T):
    return mp.pi * (2 * T + 1) / mp.log(1 / T + 1)


def chi_of(s):
    return 2**s * mp.pi**(s - 1) * mp.sin(mp.pi * s / 2) * mp.gamma(1 - s)


def state(sig, T):
    t = I_of_T(T)
    s = mp.mpc(sig, t)
    return s, chi_of(s), mp.zeta(s)


def rev_sum(j, s):
    """chi-free reverse partial sum, sum_{n<=j} n^(s-1)."""
    return mp.fsum([mp.power(n, s - 1) for n in range(1, j + 1)]) if j >= 1 else mp.mpc(0)


def fwd_sum(k, s):
    return mp.fsum([mp.power(n, -s) for n in range(1, k + 1)]) if k >= 1 else mp.mpc(0)


def cross(k, j, s, chi, z):
    """Real fractions (lam, u) with J_k + lam (k+1)^-s = K_j - u chi (j+1)^(s-1)."""
    A = mp.power(k + 1, -s)
    B = chi * mp.power(j + 1, s - 1)
    C = z - chi * rev_sum(j, s) - fwd_sum(k, s)
    det = A.real * B.imag - A.imag * B.real
    return ((C.real * B.imag - C.imag * B.real) / det,
            (A.real * C.imag - A.imag * C.real) / det)


def sample(sig, T, k=0):
    """Return (j, j0, lam, u, err) for forward link k, or None if no crossing."""
    s, chi, z = state(sig, T)
    if k == int(mp.floor(T)):
        j0 = k                      # the self-pair, first line of the crossing rule
    else:
        j0 = int(mp.nint(I_of_T(T) / (2 * mp.pi) / (k + 1))) - 1
    for j in (j0, j0 - 1, j0 + 1):
        if j < 0:
            continue
        lam, u = cross(k, j, s, chi, z)
        if 0 <= lam <= 1 and 0 <= u <= 1:
            rebuilt = (fwd_sum(k, s) + lam * mp.power(k + 1, -s)
                       + chi * (rev_sum(j, s) + u * mp.power(j + 1, s - 1)))
            return j, j0, lam, u, abs(rebuilt - z)
    return None


def run(name, cases, k=0):
    miss, named, err = [], 0, mp.mpf(0)
    lams, us = [], []
    for sig, T in cases:
        got = sample(sig, T, k)
        if got is None:
            miss.append((sig, T))
            continue
        j, j0, lam, u, e = got
        named += (j == j0)
        err = max(err, e)
        lams.append(lam)
        us.append(u)
    n = len(cases)
    print(f"{name}: {n} samples, link k={k}")
    print(f"  crossing inside both links   {n - len(miss)}/{n}")
    print(f"  worst |zeta - rebuilt|       {mp.nstr(err, 3)}")
    print(f"  d1hat({k}) range               "
          f"[{mp.nstr(min(lams), 8)}, {mp.nstr(max(lams), 8)}]")
    print(f"  d2hat({k}) range               "
          f"[{mp.nstr(min(us), 8)}, {mp.nstr(max(us), 8)}]")
    print(f"  rule j0 named the link       {named}/{n - len(miss)}")
    for sig, T in miss:
        print(f"  NO CROSSING at sigma={sig}, T={T}")
    return len(miss)


def main():
    fast = '--fast' in sys.argv
    n_line = 60 if fast else 500
    lo, hi = mp.mpf('2.05'), mp.mpf(60)
    step = (hi - lo) / (n_line - 1)
    line = [(mp.mpf('0.5'), lo + i * step) for i in range(n_line)]
    bad = run("critical line, 2.05 <= T <= 60", line)

    n_off = 5 if fast else 25
    step = (hi - lo) / (n_off - 1)
    off = [(mp.mpf(sig), lo + i * step + mp.mpf('0.037'))
           for sig in SIG_OFF for i in range(n_off)]
    print()
    bad += run("off the critical line, sigma in " + ", ".join(SIG_OFF), off)

    print()
    print("drift of the first crossing toward 1/2 (critical line):")
    for T in (['20.5', '40.5'] if fast else ['10.5', '20.5', '40.5', '80.5']):
        j, j0, lam, u, e = sample(mp.mpf('0.5'), mp.mpf(T))
        print(f"  T={T:>6}  j={j:>6}  d1hat(0)={mp.nstr(lam, 12):>15}"
              f"  T*(d1hat(0)-1/2)={mp.nstr(mp.mpf(T) * (lam - mp.mpf('0.5')), 6)}")

    print()
    print("the same cut at other links, sigma=1/2, T=6.18:")
    for k in range(7):
        j, j0, lam, u, e = sample(mp.mpf('0.5'), mp.mpf('6.18'), k)
        print(f"  k={k}  j={j:>3}  d1hat={mp.nstr(lam, 10):>13}"
              f"  d2hat={mp.nstr(u, 10):>13}  |err|={mp.nstr(e, 3)}")

    print()
    print("FAIL" if bad else "OK")
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
