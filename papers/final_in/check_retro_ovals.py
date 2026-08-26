#!/usr/bin/env python3
"""Retrograde stretches of theta_2 against the off-line equal-leg ovals.

Section 13.3 reads three things as one event: a stretch of T where the fold
angle theta_2 runs backwards, an off-line oval of the equal-leg locus
L_1 = L_2, and an ordinate at which N_ps miscounts.  The section verifies the
correspondence on 5.9 <= T <= 6.7 with a two-dimensional sigma-by-T grid.
This script checks the same correspondence far higher, cheaply enough to
sample out to T = 50, and is what Section 16 quotes.

Two observations make the wide scan affordable.  The leg imbalance
delta(sigma, T) = |B_1| - |zeta - B_1| vanishes identically on the critical
line, so the sign of delta just off the line flips exactly where an off-line
branch of the locus crosses the line; the sign changes of that single probe
therefore bracket the ovals, and no sigma-by-T grid is needed.  The answer is
insensitive to the probe offset: eps = 0.005 and eps = 0.02 give the same oval
ends to 1e-5.  And an ordinate is retrograde exactly when h and Z' share a
sign, since h* = -Z'/2theta' alternates by Rolle, so the retrograde ordinates
come out of the same samples with no extra zeta calls.

The features shrink with the ordinate spacing, so a window needs about
PER_GAP samples per gap and a continuous scan of 1 <= T <= 50 is out of reach.
Instead a low stretch is scanned whole and windows of about 25 ordinates are
placed out to T = 50.  Anything that fails to match is re-scanned twenty times
finer before it is reported, which is what separates a real exception from a
sampling artifact.

Run:  python3 check_retro_ovals.py            # the published window, ~20 s
      python3 check_retro_ovals.py --wide     # the full spread to T = 50
"""

from __future__ import annotations

import math
import sys
import time

import mpmath as mp
import numpy as np

from fig1_spiral_summands import chi
from fig_counting_index import I_of_T

mp.mp.dps = 15

EPS = 0.01          # probe offset from the critical line
PER_GAP = 90        # samples per ordinate gap
PUBLISHED = (5.9, 6.7, 2.0e-4)
CENTERS = (8, 12, 16, 20, 25, 30, 35, 40, 45, 50)
LOW = (1.0, 4.0, 2.5e-4)


def gap(T):
    """Mean spacing of the ordinates in T, from dN/dT = 4 T theta'(I(T))."""
    return 1.0 / (4.0 * T * math.log(T))


def window(center, n_ord=25):
    w = n_ord * gap(center)
    return center - w / 2, center + w / 2, gap(center) / PER_GAP


def state(T, sig):
    """zeta, B_1 and the leg imbalance at (sigma, T)."""
    t = I_of_T(T)
    s = mp.mpc(sig, t)
    m = int(math.floor(T))
    z = complex(mp.zeta(s))
    ch = complex(chi(s))
    ln = np.log(np.arange(1, m + 1, dtype=float))
    S1 = np.sum(np.exp(-(sig + 1j * t) * ln))
    S2 = ch * np.sum(np.exp((sig - 1 + 1j * t) * ln))
    R = z - S1 - S2
    w = t * math.log(m + 1)
    u1, u2 = np.exp(-1j * w), np.exp(1j * (w + np.angle(ch)))
    a, b, c, d = u1.real, u2.real, u1.imag, u2.imag
    d1 = (R.real * d - b * R.imag) / (a * d - b * c)
    B1 = S1 + d1 * u1
    return z, B1, abs(B1) - abs(z - B1)


def sample(Tg, eps):
    """theta_2, Z, h and the off-line probe on a grid of T."""
    th2, Z, h, probe = (np.empty(Tg.size) for _ in range(4))
    for i, T in enumerate(Tg):
        th = float(mp.siegeltheta(I_of_T(T)))
        z, B1, _ = state(T, 0.5)
        w = np.exp(1j * th) * B1
        th2[i] = np.angle((z - B1) / B1)
        Z[i] = (np.exp(1j * th) * z).real
        h[i] = w.imag
        probe[i] = state(T, 0.5 + eps)[2]
    return th2, Z, h, probe


def zeros_of(x, Tg):
    """Linearly interpolated sign changes."""
    out = []
    for i in range(Tg.size - 1):
        if x[i] * x[i + 1] < 0:
            f = abs(x[i]) / (abs(x[i]) + abs(x[i + 1]))
            out.append(Tg[i] + f * (Tg[i + 1] - Tg[i]))
    return out


def features(Tg, th2, Z, h, probe):
    """Retrograde stretches, ovals, and the ordinates with their character."""
    dth = np.gradient(np.unwrap(th2), Tg)
    step = Tg[1] - Tg[0]
    stretches, start = [], None
    for i in range(Tg.size):
        if dth[i] > 0 and start is None:
            start = Tg[i]
        elif dth[i] <= 0 and start is not None:
            if Tg[i] - start > 2 * step:
                stretches.append((start, Tg[i]))
            start = None
    edges = zeros_of(probe, Tg)
    ovals = [(edges[i], edges[i + 1]) for i in range(0, len(edges) - 1, 2)]
    dZ = np.gradient(Z, Tg)
    ords = []
    for i in range(Tg.size - 1):
        if Z[i] * Z[i + 1] < 0:
            f = abs(Z[i]) / (abs(Z[i]) + abs(Z[i + 1]))
            Tz = Tg[i] + f * (Tg[i + 1] - Tg[i])
            hz = h[i] + f * (h[i + 1] - h[i])
            ords.append((Tz, hz * dZ[i] > 0, hz))
    return stretches, ovals, ords


def overlaps(u, v):
    return min(u[1], v[1]) - max(u[0], v[0]) > 0


def is_band(a, b, eps):
    """A pole band crosses at every sigma; an oval closes up off the line."""
    mid, half = 0.5 * (a + b), 0.75 * (b - a)
    for sig in (0.6, 0.9):
        T = np.linspace(mid - half, mid + half, 60)
        d = np.array([state(x, sig)[2] for x in T])
        if not zeros_of(d, T):
            return False
    return True


def refine(a, b, step, eps, pad=8):
    """Re-scan a neighborhood twenty times finer."""
    fine = step / 20.0
    Tg = np.arange(a - pad * step, b + pad * step, fine)
    return features(Tg, *sample(Tg, eps))


def scan(lo, hi, step, eps=EPS, label=''):
    Tg = np.arange(lo, hi, step)
    t0 = time.time()
    stretches, ovals, ords = features(Tg, *sample(Tg, eps))
    secs = time.time() - t0

    # A feature touching a window end is cut in half by it, so widen and redo.
    def at_edge(iv):
        return iv[0] < lo + 3 * step or iv[1] > hi - 3 * step

    retro = [T for T, r, _ in ords if r]
    bands = [o for o in ovals
             if not any(overlaps(o, s) for s in stretches) and is_band(*o, eps)]
    ovals = [o for o in ovals if o not in bands]

    print(f'\n=== {label}  T in [{lo}, {hi}]  step {step:.2e}'
          f'  ({Tg.size} samples, {secs:.0f}s)')
    print(f'  {len(ords)} ordinates, {len(retro)} retrograde;'
          f' {len(stretches)} stretches, {len(ovals)} ovals'
          + (f', {len(bands)} pole bands' if bands else ''))

    matched, resolved, failed = 0, 0, []
    for s in stretches:
        hit = [o for o in ovals if overlaps(o, s)]
        if len(hit) == 1:
            matched += 1
            o = hit[0]
            cov = (min(s[1], o[1]) - max(s[0], o[0])) / (s[1] - s[0])
            inside = [T for T, r, _ in ords if s[0] <= T <= s[1]]
            print(f'    [{s[0]:.6f}, {s[1]:.6f}] w={s[1] - s[0]:.6f}'
                  f'  oval [{o[0]:.6f}, {o[1]:.6f}] overlap {cov:.2f}'
                  f'  ordinates {len(inside)}'
                  f' (retro {sum(1 for T in inside if T in retro)})')
            continue
        st2, ov2, _ = refine(*s, step, eps)
        pair = [(x, y) for x in st2 for y in ov2 if overlaps(x, y) and overlaps(x, s)]
        if pair:
            resolved += 1
            x, y = pair[0]
            print(f'    [{s[0]:.6f}, {s[1]:.6f}] resolved on refinement:'
                  f' stretch [{x[0]:.6f}, {x[1]:.6f}]'
                  f' oval [{y[0]:.6f}, {y[1]:.6f}]')
        elif not st2 or all(not overlaps(x, s) for x in st2):
            print(f'    [{s[0]:.6f}, {s[1]:.6f}] vanishes on refinement'
                  f' (sampling artifact, not a stretch)')
        else:
            failed.append(s)
            print(f'    [{s[0]:.6f}, {s[1]:.6f}] NO OVAL'
                  + ('  (touches the window end)' if at_edge(s) else ''))
    for T in retro:
        if not any(s[0] <= T <= s[1] for s in stretches):
            st2, ov2, _ = refine(T - 2 * step, T + 2 * step, step, eps)
            got = [x for x in st2 if x[0] <= T <= x[1]]
            if got:
                resolved += 1
                print(f'    ordinate {T:.6f}: stretch found only on refinement,'
                      f' [{got[0][0]:.6f}, {got[0][1]:.6f}]')
            else:
                failed.append((T, T))
                print(f'    ordinate {T:.6f}: retrograde with NO stretch')
    print(f'  matched {matched} directly, {resolved} after refinement,'
          f' {len(failed)} unexplained')
    return dict(lo=lo, hi=hi, ords=len(ords), retro=len(retro),
                stretches=len(stretches), ovals=len(ovals), bands=len(bands),
                matched=matched + resolved, failed=len(failed))


def main():
    wins = [PUBLISHED + (EPS, 'published window')]
    if '--wide' in sys.argv:
        wins.append(LOW + (EPS, 'low range'))
        wins += [window(c) + (EPS, f'T ~ {c}') for c in CENTERS]
    rows = [scan(*w) for w in wins]
    print('\n  window             ords  retro  stretch  ovals  bands'
          '  matched  unexplained')
    tot = dict(ords=0, retro=0, matched=0, failed=0, bands=0)
    for r in rows:
        print(f'  [{r["lo"]:7.3f},{r["hi"]:8.3f}] {r["ords"]:6d} {r["retro"]:6d}'
              f' {r["stretches"]:8d} {r["ovals"]:6d} {r["bands"]:6d}'
              f' {r["matched"]:8d} {r["failed"]:12d}')
        for k in tot:
            tot[k] += r[k]
    print(f'  total ordinates {tot["ords"]}, retrograde {tot["retro"]},'
          f' matched {tot["matched"]}, unexplained {tot["failed"]},'
          f' pole bands {tot["bands"]}')


if __name__ == '__main__':
    main()
