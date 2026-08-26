#!/usr/bin/env python3
"""
check_links_crossing.py
=======================

Numerical support for the "Links crossing" subsection.

On sigma = 1/2, rotate by the Riemann-Siegel angle vartheta (chi = e^{-2i vartheta}).
The forward joints become

    P_n = sum_{n' <= n} e^{i(vartheta - t log n')} / sqrt(n'),      P_0 = 0,

and the reverse joints are their mirror image in the vertical line X = Z/2,

    Q_i = Z - conj(P_i),      Z = e^{i vartheta} zeta = Hardy's Z(t),

which is what makes the crossing pattern predictable.  Counting summands from
one, so that forward link k carries summand n = k+1 and reverse link i carries
n' = i+1, the claim is the product law

    n n' = a^2 = t / 2 pi,          i_0 = round(a^2/(k+1)) - 1,

and the exact integer readout C_l(k,T) = m at the bisector, else i_0 if that
link crosses, else i_0-1.  The linearization at the self-dual point n = n' = a
is the sum rule k + i = floor(2T) - 1 or floor(2T), good only while
(n-a)^2/a stays below half a link.

This script measures, over every strip 0 <= k <= m rather than only the ones
beside the fold:

    1. how often the product law, and the exact readout, name a link that
     really crosses forward link k, and how far the nearest real crossing is
     when the named integer alone does not;
  2. the same for the sum rule, split at the predicted range |n - a| = sqrt(a/2);
  3. where along the forward link the crossing sits, by distance from the fold;
  4. hat d_1 computed as a chain quantity, (Z/2 - X_m)/(X_{m+1} - X_m), against
     the weight sqrt(m+1) * r / (2 cos(omega - vartheta)) of the earlier sections.

The chains run to the end of the first turn, link floor(t/pi), so they are built
in double precision with numpy; t, vartheta and Z come from mpmath's
Riemann-Siegel routines, which is what keeps the m = 400 row affordable.

Run:  python3 check_links_crossing.py
"""

import math
import numpy as np
import mpmath as mp

from fig1_spiral_summands import I_of_T

mp.mp.dps = 30

MS = [8, 17, 40, 123, 400]      # integer parts sampled
NFRAC = 199                     # fractional parts per integer part: j/200
WINDOW = 2                      # reverse links searched either side of a rule's link


def frame(T):
    """Rotated chains at index T, out to the end of the first turn."""
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
    Q = Z - np.conj(P)
    lam = (Z / 2 - P[m].real) / (P[m + 1].real - P[m].real)
    d1_hat = math.sqrt(m + 1) * (Z - 2 * P[m].real) / (2 * math.cos(t * math.log(m + 1) - th))
    return dict(T=T, m=m, t=t, th=th, P=P, Q=Q, Z=Z, nmax=nmax, lam=lam, d1_hat=d1_hat,
                a=math.sqrt(t / (2 * math.pi)), a2=t / (2 * math.pi))


def cross(a, b, c, d):
    """Segment ab against segment cd; returns the two fractions or None."""
    bax, bay = b.real - a.real, b.imag - a.imag
    dcx, dcy = d.real - c.real, d.imag - c.imag
    den = bax * dcy - bay * dcx
    if den == 0:
        return None
    cax, cay = c.real - a.real, c.imag - a.imag
    p = (cax * dcy - cay * dcx) / den
    q = (cax * bay - cay * bax) / den
    if 0 <= p <= 1 and 0 <= q <= 1:
        return p, q
    return None


def hits(f, k, i):
    """Whether reverse link i crosses forward link k, and where along link k."""
    if not (0 <= i < f['nmax']):
        return None
    return cross(f['P'][k], f['P'][k + 1], f['Q'][i], f['Q'][i + 1])


def main():
    lam_err = 0.0
    rows = 0
    prod_named = prod_within = exact_named = 0
    sum_named = 0
    sum_in_range = sum_in_range_named = 0
    sum_out_range = sum_out_range_named = 0
    offsets = {}
    pos = {}
    angles = []
    ang_err = 0.0
    ang_min = 360.0
    ang_rows = 0

    for m in MS:
        for j in range(1, NFRAC + 1):
            T = m + j / (NFRAC + 1)
            f = frame(T)
            lam_err = max(lam_err, abs(f['lam'] - f['d1_hat']))
            a, a2 = f['a'], f['a2']
            two = int(math.floor(2 * T))
            reach = math.sqrt(a / 2)          # where the tangent is still within half a link

            for k in range(m + 1):
                rows += 1
                # --- the product law ---
                exact = a2 / (k + 1) - 1
                named = int(round(exact))
                got = hits(f, k, named)
                if k == m:
                    exact_i = m
                elif got is not None:
                    exact_i = named
                else:
                    exact_i = named - 1
                if hits(f, k, exact_i) is not None:
                    exact_named += 1
                if got is not None:
                    prod_named += 1
                    d = min(m - k, 4)
                    pos.setdefault(d, []).append(got[0])
                    u = f['P'][k + 1] - f['P'][k]
                    v = f['Q'][named + 1] - f['Q'][named]
                    ang = math.atan2((u.conjugate() * v).imag,
                                     (u.conjugate() * v).real)
                    if len(angles) < 40000:
                        angles.append(abs(math.degrees(ang)))
                    # the angle is forced: pi - 2 vartheta + t log(n n'), and since
                    # n n' is an integer that reduces to 5pi/4 minus a positive
                    # quadratic, so the unsigned angle cannot fall below 135 deg.
                    gap = (math.pi - 2 * f['th']
                           + f['t'] * math.log((k + 1) * (named + 1)) - ang)
                    gap %= 2 * math.pi
                    ang_err = max(ang_err, min(gap, 2 * math.pi - gap))
                    ang_min = min(ang_min, abs(math.degrees(ang)))
                    ang_rows += 1
                near = None
                for off in (0, -1, 1, -2, 2):
                    if hits(f, k, named + off) is not None:
                        near = off
                        break
                if near is not None:
                    prod_within += abs(near) <= 1
                    offsets[near] = offsets.get(near, 0) + 1
                # --- the sum rule of the tangent line ---
                rule = any(hits(f, k, s - k) is not None for s in (two - 1, two))
                sum_named += rule
                if abs((k + 1) - a) <= reach:
                    sum_in_range += 1
                    sum_in_range_named += rule
                else:
                    sum_out_range += 1
                    sum_out_range_named += rule

    print('samples: %d indices, every strip 0 <= k <= m: %d rows'
          % (len(MS) * NFRAC, rows))
    print()
    print('product law  i = round(a^2/(k+1)) - 1')
    print('   names a real crossing:      %6d/%d (%.1f%%)'
          % (prod_named, rows, 100 * prod_named / rows))
    print('   or one of its neighbours:   %6d/%d (%.1f%%)'
          % (prod_within, rows, 100 * prod_within / rows))
    print('   offset of the nearest real crossing: '
          + ', '.join('%+d: %d' % (o, offsets[o]) for o in sorted(offsets)))
    print()
    print('exact readout  C_l = m at the bisector, else named, else named-1')
    print('   names a real crossing:      %6d/%d (%.1f%%)'
          % (exact_named, rows, 100 * exact_named / rows))
    print()
    print('sum rule  i = floor(2T)-1-k or floor(2T)-k')
    print('   names a real crossing:      %6d/%d (%.1f%%)'
          % (sum_named, rows, 100 * sum_named / rows))
    print('   within  |n-a| <= sqrt(a/2): %6d/%d (%.1f%%)'
          % (sum_in_range_named, sum_in_range, 100 * sum_in_range_named / sum_in_range))
    print('   beyond  |n-a| >  sqrt(a/2): %6d/%d (%.1f%%)'
          % (sum_out_range_named, sum_out_range, 100 * sum_out_range_named / sum_out_range))
    print()
    print('where the crossing sits along the forward link, by distance from the fold:')
    for d in sorted(pos):
        col = sorted(pos[d])
        med = col[len(col) // 2]
        spread = sorted(abs(p - 0.5) for p in col)
        print('   m-k = %s: %6d crossings, median p = %.3f, median |p-1/2| = %.3f'
              % ('>=4' if d == 4 else ' %d ' % d, len(col), med,
                 spread[len(spread) // 2]))
    angles.sort()
    print('angle between the crossing links: median %.1f deg, 10th-90th pct %.1f-%.1f'
          % (angles[len(angles) // 2], angles[int(0.1 * len(angles))],
             angles[int(0.9 * (len(angles) - 1))]))
    print('   identity pi - 2 vartheta + t log(n n'
          "'"
          '): max error %.1e rad over %d crossings'
          % (ang_err, ang_rows))
    print('   smallest angle seen: %.2f deg (the floor is 135)' % ang_min)
    print()
    print('hat d_1 as a chain quantity vs as a weight: max difference %.2e' % lam_err)

    # The bisector strip: the mirror forces (m, m), whatever the law's rounding says.
    self_pair = law_is_m = samples = 0
    for m in MS:
        for j in range(1, NFRAC + 1):
            T = m + j / (NFRAC + 1)
            f = frame(T)
            samples += 1
            self_pair += hits(f, m, m) is not None
            law_is_m += int(round(f['a2'] / (m + 1))) - 1 == m
    print()
    print('bisector strip: (m, m) really crosses in %d/%d samples; '
          'the law names m in %d/%d (%.0f%%)'
          % (self_pair, samples, law_is_m, samples, 100 * law_is_m / samples))

    # The mechanism: the step of the reverse chain from spiral centre c to centre c-1
    # (eq. LN, the links where the turn angle is an odd multiple of pi) against the
    # forward chain's own link c-1, which it should reproduce reversed.
    print()
    print('centre-to-centre step of the reverse chain vs forward link c-1:')
    print('    c    median |sweep + link| / |link|   (over the sampled T)')
    for c in range(1, 5):
        rel = []
        for m in MS:
            for j in range(1, NFRAC + 1, 8):
                f = frame(m + j / (NFRAC + 1))
                lo = int(round(2 * f['a2'] / (2 * c + 1)))
                hi = int(round(2 * f['a2'] / (2 * c - 1)))
                if not (0 <= lo <= hi <= f['nmax']):
                    continue
                sweep = f['Q'][hi] - f['Q'][lo]
                link = f['P'][c] - f['P'][c - 1]
                rel.append(abs(sweep + link) / abs(link))
        rel.sort()
        print('   %2d          %.3f            (n = %d)'
              % (c, rel[len(rel) // 2], len(rel)))

    # the running example of the figure
    f = frame(6.18)
    print()
    print('T = 6.18:  a = %.4f,  a^2 = %.3f,  hat d_1 = %.6f,  links of the turn = %d'
          % (f['a'], f['a2'], f['lam'], f['nmax']))
    print("   k   n=k+1   law i   n'=i+1    n n'    p along link")
    for k in range(f['m'] + 1):
        i = int(round(f['a2'] / (k + 1))) - 1
        got = hits(f, k, i)
        print('  %2d    %3d    %4d     %4d     %6d    %s'
              % (k, k + 1, i, i + 1, (k + 1) * (i + 1),
                 '%.3f' % got[0] if got else 'no crossing'))


if __name__ == '__main__':
    main()
