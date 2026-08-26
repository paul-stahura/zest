#!/usr/bin/env python3
"""Try closed-form partners that name a real crossing in every sampled case."""

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
                a2=t / (2 * math.pi))


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


def round_half_down(x):
    frac = x - math.floor(x)
    return math.floor(x) if frac <= 0.5 else math.ceil(x)


def main():
    frames = []
    for m in MS:
        for j in range(1, NFRAC + 1):
            frames.append(frame(m + j / (NFRAC + 1)))
    print("cached", len(frames), "heights")

    res = {"a2/n": [], "a2/n-1/2": [], "1/(e^{n/a2}-1)": []}
    for f in frames:
        for k in range(f["m"] + 1):
            i = actual_i(f, k)
            if i is None:
                continue
            n, np_ = k + 1, i + 1
            res["a2/n"].append(np_ - f["a2"] / n)
            res["a2/n-1/2"].append(np_ - (f["a2"] / n - 0.5))
            res["1/(e^{n/a2}-1)"].append(np_ - 1 / math.expm1(n / f["a2"]))
    print("crossings", len(res["a2/n"]))
    for name, arr in res.items():
        a = np.array(arr)
        print("  %-18s mean=%+.4f med=%+.4f mad=%.4f p95=%.4f"
              % (name, a.mean(), np.median(a), np.median(np.abs(a)),
                 np.percentile(np.abs(a), 95)))

    def log_np(f, k):
        return 1 / math.expm1((k + 1) / f["a2"])

    rules = {
        "current": lambda f, k: int(round(f["a2"] / (k + 1) - 1)),
        "current+bis": lambda f, k: f["m"] if k == f["m"]
        else int(round(f["a2"] / (k + 1) - 1)),
        "halfdown(a2/n-1)": lambda f, k: round_half_down(f["a2"] / (k + 1) - 1),
        "halfdown+bis": lambda f, k: f["m"] if k == f["m"]
        else round_half_down(f["a2"] / (k + 1) - 1),
        "round(log)-1": lambda f, k: int(round(log_np(f, k))) - 1,
        "round(log)-1+bis": lambda f, k: f["m"] if k == f["m"]
        else int(round(log_np(f, k))) - 1,
        "round(log)": lambda f, k: int(round(log_np(f, k))),
        "round(log)+bis": lambda f, k: f["m"] if k == f["m"]
        else int(round(log_np(f, k))),
        "floor(log)": lambda f, k: math.floor(log_np(f, k)),
        "floor(log)+bis": lambda f, k: f["m"] if k == f["m"]
        else math.floor(log_np(f, k)),
        "floor(a2/n-1/2)+bis": lambda f, k: f["m"] if k == f["m"]
        else math.floor(f["a2"] / (k + 1) - 0.5),
        "floor(a2/n)-1+bis": lambda f, k: f["m"] if k == f["m"]
        else math.floor(f["a2"] / (k + 1)) - 1,
        "halfdown(log-1)+bis": lambda f, k: f["m"] if k == f["m"]
        else round_half_down(log_np(f, k) - 1),
    }

    print("\nrules")
    for name, fn in rules.items():
        ok = tot = 0
        bad = []
        for f in frames:
            for k in range(f["m"] + 1):
                tot += 1
                i = fn(f, k)
                if hits(f, k, i):
                    ok += 1
                elif len(bad) < 4:
                    bad.append((round(f["T"], 4), k, i, actual_i(f, k)))
        print("  %-24s %6d/%d (%.3f%%)  %s"
              % (name, ok, tot, 100 * ok / tot, bad[:2]))

    # Fractional part of a^2/n versus which integer actually crosses.
    # x = a^2/n; named n' = round(x); actual n' = i+1.
    down, up = [], []
    for f in frames:
        for k in range(f["m"] + 1):
            i = actual_i(f, k)
            if i is None:
                continue
            x = f["a2"] / (k + 1)
            frac = x - math.floor(x)
            if i + 1 == math.floor(x):
                down.append((frac, f["T"], k, x, i))
            elif i + 1 == math.ceil(x) or (frac == 0 and i + 1 == int(x)):
                up.append((frac, f["T"], k, x, i))
    down.sort()
    up.sort()
    down_nb = [r for r in down if r[2] != int(math.floor(r[1]))]
    up_nb = [r for r in up if r[2] != int(math.floor(r[1]))]
    print("\nactual n' = floor(a2/n): %d  frac min/med/max %.4f / %.4f / %.4f"
          % (len(down), down[0][0], down[len(down)//2][0], down[-1][0]))
    print("actual n' = ceil(a2/n):  %d  frac min/med/max %.4f / %.4f / %.4f"
          % (len(up), up[0][0], up[len(up)//2][0], up[-1][0]))
    print("  excluding bisector, floor: %d  frac max %.4f"
          % (len(down_nb), down_nb[-1][0] if down_nb else -1))
    print("  excluding bisector, ceil:  %d  frac min %.4f"
          % (len(up_nb), up_nb[0][0] if up_nb else -1))
    print("  largest-frac floor cases:",
          ["T=%.3f k=%d x=%.4f" % (t, k, x) for _, t, k, x, _ in down[-5:]])
    print("  smallest-frac ceil non-bis:",
          ["T=%.3f k=%d x=%.4f" % (t, k, x) for _, t, k, x, _ in up_nb[:8]])
    up0 = [r for r in up_nb if r[2] == 0]
    down0 = [r for r in down_nb if r[2] == 0]
    print("  k=0 only: floor max frac %.4f (n=%d), ceil min frac %.4f (n=%d)"
          % (down0[-1][0] if down0 else -1, len(down0),
             up0[0][0] if up0 else -1, len(up0)))
    # k-dependent threshold: n' = floor(a2/n + 1/2 + c/(k+1))
    print("\nk-dependent tau = 1/2 + c/(k+1), plus bisector")
    for c in (0.0, 0.01, 0.02, 0.03, -0.01, -0.02, 0.25, -0.25):
        ok = tot = 0
        for f in frames:
            for k in range(f["m"] + 1):
                tot += 1
                tau = 0.5 + c / (k + 1)
                i = f["m"] if k == f["m"] else math.floor(f["a2"] / (k + 1) + tau) - 1
                ok += hits(f, k, i)
        print("  c=%+.3f  %d/%d (%.3f%%)" % (c, ok, tot, 100 * ok / tot))
    # try-then-lower-neighbour (always 100% if all remaining misses are -1)
    ok = tot = 0
    for f in frames:
        for k in range(f["m"] + 1):
            tot += 1
            if k == f["m"]:
                i = f["m"]
            else:
                i = int(round(f["a2"] / (k + 1) - 1))
                if not hits(f, k, i):
                    i -= 1
            ok += hits(f, k, i)
    print("round, else -1, plus bis: %d/%d (%.3f%%)" % (ok, tot, 100 * ok / tot))

    # threshold scan: n' = floor(a2/n + tau)
    print("\nthreshold n' = floor(a2/n + tau), plus bisector pin")
    for tau in (0.48, 0.49, 0.495, 0.50, 0.505, 0.51, 0.52, 0.53):
        ok = tot = 0
        for f in frames:
            for k in range(f["m"] + 1):
                tot += 1
                i = f["m"] if k == f["m"] else math.floor(f["a2"] / (k + 1) + tau) - 1
                ok += hits(f, k, i)
        print("  tau=%.3f  %d/%d (%.3f%%)" % (tau, ok, tot, 100 * ok / tot))

    f = frame(6.18)
    print("\nT=6.18")
    for k in range(7):
        print("  k=%d cur=%s log-1=%s log=%s halfdown=%s actual=%s"
              % (k, rules["current"](f, k), rules["round(log)-1"](f, k),
                 rules["round(log)"](f, k), rules["halfdown(a2/n-1)"](f, k),
                 actual_i(f, k)))


if __name__ == "__main__":
    main()
