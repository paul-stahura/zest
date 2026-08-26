#!/usr/bin/env python3
"""Hunt a closed pairing that names a real crossing in every sampled case."""

import math
import numpy as np
import mpmath as mp
from fig1_spiral_summands import I_of_T

mp.mp.dps = 30
MS = [8, 17, 40, 123, 400]
NFRAC = 199


def frame(T):
    m = int(math.floor(T))
    t = float(I_of_T(mp.mpf(T)))
    th = float(mp.siegeltheta(t))
    Z = float(mp.siegelz(t))
    nmax = int(t / math.pi) + 1
    n = np.arange(1, nmax + 1, dtype=np.float64)
    step = np.exp(1j * (th - t * np.log(n))) / np.sqrt(n)
    P = np.empty(nmax + 1, dtype=np.complex128)
    P[0] = 0
    np.cumsum(step, out=P[1:])
    return dict(T=T, m=m, t=t, P=P, Q=Z - np.conj(P), nmax=nmax,
                a2=t / (2 * math.pi), a=math.sqrt(t / (2 * math.pi)))


def hits(f, k, i):
    if not (0 <= i < f["nmax"]):
        return False
    a, b = f["P"][k], f["P"][k + 1]
    c, d = f["Q"][i], f["Q"][i + 1]
    bax, bay = b.real - a.real, b.imag - a.imag
    dcx, dcy = d.real - c.real, d.imag - c.imag
    den = bax * dcy - bay * dcx
    if den == 0:
        return False
    cax, cay = c.real - a.real, c.imag - a.imag
    p = (cax * dcy - cay * dcx) / den
    q = (cax * bay - cay * bax) / den
    return 0 <= p <= 1 and 0 <= q <= 1


def actual_i(f, k):
    named = int(round(f["a2"] / (k + 1) - 1))
    for off in (0, -1, 1, -2, 2):
        if hits(f, k, named + off):
            return named + off
    return None


def score(name, fn, frames):
    ok = tot = 0
    bad = []
    for f in frames:
        for k in range(f["m"] + 1):
            tot += 1
            i = fn(f, k)
            if hits(f, k, i):
                ok += 1
            elif len(bad) < 6:
                bad.append((round(f["T"], 4), k, i, actual_i(f, k)))
    print("  %-40s %6d/%d (%.4f%%)  %s" % (name, ok, tot, 100 * ok / tot, bad[:3]))
    return ok, tot


def main():
    frames = []
    for m in MS:
        for j in range(1, NFRAC + 1):
            frames.append(frame(m + j / (NFRAC + 1)))
    print("cached", len(frames), "heights")

    # Residuals vs n, and miss offsets.
    offs = []
    rows = []
    for f in frames:
        for k in range(f["m"] + 1):
            i = actual_i(f, k)
            if i is None:
                continue
            n = k + 1
            x = f["a2"] / n
            named = int(round(x)) - 1
            offs.append(i - named)
            rows.append((i + 1 - x, n, f["a"], f["T"], k, x))
    offs = np.array(offs)
    print("offsets from current:",
          {int(v): int((offs == v).sum()) for v in sorted(set(offs))})
    res = np.array([r[0] for r in rows])
    ns = np.array([r[1] for r in rows])
    print("residual n'-a2/n: mean=%+.5f  by n=1: mean=%+.5f  n~a: mean=%+.5f"
          % (res.mean(),
             res[ns == 1].mean() if np.any(ns == 1) else 0,
             res[ns > 0.7 * np.array([r[2] for r in rows])].mean()))

    print("\nclosed forms (bisector pinned unless noted)")

    def pin(f, k, i):
        return f["m"] if k == f["m"] else i

    score("current, no pin",
          lambda f, k: int(round(f["a2"] / (k + 1) - 1)), frames)
    score("current + bis",
          lambda f, k: pin(f, k, int(round(f["a2"] / (k + 1) - 1))), frames)
    score("round else -1 + bis",
          lambda f, k: (f["m"] if k == f["m"] else
                        (lambda i: i if hits(f, k, i) else i - 1)(
                            int(round(f["a2"] / (k + 1) - 1)))), frames)

    # T-based products (section 4.5: a vs T)
    score("T(T+1)/n + bis",
          lambda f, k: pin(f, k, int(round(f["T"] * (f["T"] + 1) / (k + 1) - 1))), frames)
    score("(T+1/2)^2/n + bis",
          lambda f, k: pin(f, k, int(round((f["T"] + 0.5) ** 2 / (k + 1) - 1))), frames)
    score("T^2+T+1/6 + bis",
          lambda f, k: pin(f, k, int(round((f["T"] ** 2 + f["T"] + 1 / 6) / (k + 1) - 1))), frames)
    score("floor(a)^2/n + bis",
          lambda f, k: pin(f, k, int(round(math.floor(f["a"]) ** 2 / (k + 1) - 1))), frames)

    # Discrete-turn middle, then add back 1/2 from the expansion
    score("log+1/2 + bis",
          lambda f, k: pin(f, k, int(round(1 / math.expm1((k + 1) / f["a2"]) + 0.5 - 1))), frames)

    # L_N-style: floor(2 a^2 / (2c+1)) middles
    def ln_mid(f, k):
        c = k + 1
        lo = math.floor(2 * f["a2"] / (2 * c + 1))
        hi = math.floor(2 * f["a2"] / (2 * c - 1)) if c > 0 else lo
        return pin(f, k, (lo + hi) // 2)

    score("arith middle of L_N(c),L_N(c-1)", ln_mid, frames)

    # Correction a2/n - alpha/n
    print("\ncorrection a2/n - alpha/n + bis")
    for alpha in (0.0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.08, 0.10, 0.15, 0.25, 0.5):
        score("  alpha=%.2f" % alpha,
              lambda f, k, a=alpha: pin(
                  f, k, int(round(f["a2"] / (k + 1) - a / (k + 1) - 1))), frames)

    # Correction a2/n - alpha (1/n - 1/a)
    print("\ncorrection a2/n - alpha(1/n-1/a) + bis")
    for alpha in (0.02, 0.03, 0.05, 0.08, 0.12, 0.20, 0.50):
        score("  alpha=%.2f" % alpha,
              lambda f, k, a=alpha: pin(
                  f, k,
                  int(round(f["a2"] / (k + 1) - a * (1 / (k + 1) - 1 / f["a"]) - 1))),
              frames)

    # floor(a2/n - beta) with small beta (prefer lower neighbour near .5)
    print("\nround(a2/n - beta) + bis")
    for beta in (0.0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.08, 0.10):
        score("  beta=%.2f" % beta,
              lambda f, k, b=beta: pin(
                  f, k, int(round(f["a2"] / (k + 1) - b - 1))), frames)

    # Verify: any non-bisector off = +1?
    plus = minus = 0
    plus_ex = []
    for f in frames:
        for k in range(f["m"]):
            named = int(round(f["a2"] / (k + 1) - 1))
            i = actual_i(f, k)
            if i is None:
                continue
            if i == named + 1:
                plus += 1
                if len(plus_ex) < 8:
                    plus_ex.append((round(f["T"], 4), k, named, i,
                                    f["a2"] / (k + 1)))
            elif i == named - 1:
                minus += 1
    print("\nnon-bisector neighbour misses: off=-1: %d  off=+1: %d" % (minus, plus))
    print("  +1 examples:", plus_ex)


if __name__ == "__main__":
    main()
