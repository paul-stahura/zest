#!/usr/bin/env python3
"""
check_needle_area_finiteT.py
============================

The Kakeya question of the subsection "The area swept out by the unit
bisector link at infinity" (eq. area-value), asked at FINITE index T on
the critical line.

At infinity the needle is the chord [Y_inf(t), Y_inf(t-1/2)] and the
paper's Green's-theorem computation gives

    A_signed = -2 pi Int_0^1 t Psi(t)^2 dt,   |A_signed| = 1.0341672003,
    needle sweep = 2 |A_signed| = 2.0683344006.

At finite T the needle is the reverse bisector link seen in the bisector
frame, i.e. the chord

    [ Y_in1(1/2, T), Y_ang1(1/2, T) ],
    Y_in1  = R ceil(T)^s,
    Y_ang1 = Y_in1 - chi ceil(T)^{2s-1},       s = 1/2 + i I(T),

exactly as in fig_yinyang.py and fig_conveyor_follower.py.  On the
critical line |chi| = 1 and 2 sigma - 1 = 0, so |Y_ang1 - Y_in1| = 1
identically: the needle has unit length at every finite T, not merely in
the limit.  One handoff period is T in [m, m+1] (ceil(T) = m+1
throughout), so period m is one full revolution of the needle around the
stationary unit link [0, 1].

For each m = 1, ..., 10 the script computes

 (a) the signed and geometric enclosed area of the finite-T yin lobe over
     the period, from the paper's Green integral
     A = (1/2) Int Im(conj z z') dT with the exact analytic z'(T) (no
     finite differencing), by mpmath quadrature split at T = m + 1/4 and
     m + 3/4 -- the finite-T analogues of the limit curve's removable
     points, where at finite T the integrand is in fact analytic, so the
     split changes nothing (verified).  At finite T the yin path does not
     close up, the gap being O(1/m^2), so the closing chord z(m+1)->z(m)
     is included, as it is in the shoelace cross-checks.
 (b) the needle sweep as 2 x (a), the paper's half-period-lag value.
 (c) the needle sweep computed DIRECTLY, with no appeal to that argument,
     as the area of the UNION of all needle positions.  Method: the
     needle family is sampled on a dense T-grid, consecutive needles are
     joined into swept quadrilaterals, each quad is cut into two
     triangles, and the union area is obtained by an exact vertical-line
     scan -- per scan line the triangle cross-sections are intervals in
     closed form, which are then merged -- followed by midpoint
     quadrature in x.  The samples come from cubic Hermite interpolation
     of exactly evaluated (z, z') nodes, so refinement is nearly free.
     The union area converges like O(1/N^2) in the needle count N and
     like O(nx^-1.585) in the scan-line count nx; both limits are taken
     by Richardson extrapolation off a 2x2 grid of resolutions, and the
     whole scheme is calibrated against the limit curve, whose answer is
     known in closed form (it reproduces it to 5e-8).
 (d) the yang lobe as well, signed, so the orientation of each lobe is
     recorded.

Findings (see the printout):

  * The sweep is the union of the two lobes of the yin-yang.  In the limit
    the lobes are exactly congruent with opposite orientation -- the point
    reflection z -> 1 - z through the midpoint of the stationary link maps
    one to the other, since Y_inf(u) + Y_inf(1/2 - u) = 1 identically --
    and they meet without overlapping, so union = 2 x enclosed exactly.
  * At finite T that symmetry is broken by O(1/m): |A_yang| < |A_yin|, the
    lobes overlap slightly near the waist, and the needle also sweeps a
    thin sliver outside both lobes.  So "swept = 2 x enclosed" holds only
    approximately at finite T -- too big by 0.052 at m = 1 and by 0.011 at
    m = 10, dying out only like O(1/m).  The two-lobe form
    "swept ~ |A_yin| + |A_yang|" is an order more accurate.
  * The directly computed sweep increases monotonically with m and
    converges to 2.0683344 like O(1/m^2), an order faster than the
    single-lobe area, which converges to 1.0341672 like O(1/m).
  * For m <= 5 the closed yin and yang lobes are not simple: the path
    crosses itself once, right at the handoff, where the finite-T path
    fails to close by O(1/m^2).

Run:  python3 check_needle_area_finiteT.py     (about 6 minutes)
"""

from __future__ import annotations

import time

import mpmath as mp
import numpy as np

from fig1_spiral_summands import I_of_T, chi

SIGMA = mp.mpf('0.5')
PERIODS = list(range(1, 11))
RATE_PERIODS = (16, 20, 32)      # extra m, lobe area only, to pin the rate

# the subsection yinyang-area: |A_signed| for Y_inf, and the sweep 2 x that
LIMIT_AREA = mp.mpf('1.0341672002955850005')
LIMIT_SWEEP = 2 * LIMIT_AREA

DPS = 25                  # working precision for the curve and the quadrature
MAXDEGREE = 7             # mpmath.quad degree cap
N_NODES = 320             # exactly evaluated (z, z') nodes per period
UNION_N = (8, 16)         # Hermite refinements -> 2560 and 5120 needles
UNION_NX = (6000, 12000)  # scan lines
NX_ORDER = 1.585          # observed order of the scan-line error
N_SHOELACE = 250          # direct-evaluation shoelace, doubled for Richardson
N_ROWS = 4000             # rows for the even-odd / lobe-overlap scan

mp.mp.dps = DPS


# --------------------------------------------------------------------------
# The finite-T yin and yang curves and their exact T-derivatives
# --------------------------------------------------------------------------
def dI_dT(T):
    """d/dT of I(T) = (2T+1) pi / (log(T+1) - log(T))."""
    L = mp.log(T + 1) - mp.log(T)
    return mp.pi * (2 / L + (2 * T + 1) / (T * (T + 1) * L ** 2))


def chi_prime(s):
    """chi'(s), from chi(s) = 2^s pi^{s-1} sin(pi s/2) Gamma(1-s)."""
    return chi(s) * (mp.log(2) + mp.log(mp.pi)
                     + (mp.pi / 2) * mp.cot(mp.pi * s / 2)
                     - mp.digamma(1 - s))


def needle(T, m):
    """(Y_in1, Y_in1', Y_ang1, Y_ang1') at index T of the period [m, m+1].

    m is passed in rather than read off as floor(T) so that both closed
    endpoints T = m and T = m+1 use this period's branch ceil(T) = m+1.
    """
    T = mp.mpf(T)
    t = I_of_T(T)
    s = mp.mpc(SIGMA, t)
    M1 = mp.mpf(m + 1)
    lg = mp.log(M1)
    ch = chi(s)
    chp = chi_prime(s)

    S1 = mp.fsum(mp.mpf(n) ** (-s) for n in range(1, m + 1))
    dS1 = mp.fsum(-mp.log(n) * mp.mpf(n) ** (-s) for n in range(1, m + 1))
    Sb = mp.fsum(mp.mpf(n) ** (s - 1) for n in range(1, m + 1))
    dSb = mp.fsum(mp.log(n) * mp.mpf(n) ** (s - 1) for n in range(1, m + 1))

    R = mp.zeta(s) - S1 - ch * Sb
    dRds = mp.zeta(s, 1, 1) - dS1 - (chp * Sb + ch * dSb)

    dsdT = 1j * dI_dT(T)
    yin = R * M1 ** s
    dyin = dsdT * M1 ** s * (dRds + R * lg)
    link = ch * M1 ** (2 * s - 1)                 # the needle vector, |.| = 1
    dlink = dsdT * (chp + 2 * lg * ch) * M1 ** (2 * s - 1)
    return yin, dyin, yin - link, dyin - dlink


def pick(vals, which):
    return (vals[0], vals[1]) if which == 'yin' else (vals[2], vals[3])


def to_complex(z):
    return complex(float(mp.re(z)), float(mp.im(z)))


# --------------------------------------------------------------------------
# (a) enclosed area by Green's theorem
# --------------------------------------------------------------------------
def green_area(m, which, split=True):
    """Signed enclosed area of one lobe over T in [m, m+1]:

        (1/2) Int_m^{m+1} Im(conj z z') dT
      + (1/2) Im(conj z(m+1) z(m)),        the closing chord z(m+1) -> z(m).
    """
    def f(T):
        z, dz = pick(needle(T, m), which)
        return mp.im(mp.conj(z) * dz)

    pts = [mp.mpf(m)]
    if split:
        pts += [m + mp.mpf(1) / 4, m + mp.mpf(3) / 4]
    pts.append(mp.mpf(m + 1))
    body = mp.fsum(mp.quad(f, [pts[i], pts[i + 1]], maxdegree=MAXDEGREE)
                   for i in range(len(pts) - 1))
    z0 = pick(needle(m, m), which)[0]
    z1 = pick(needle(m + 1, m), which)[0]
    return (body + mp.im(mp.conj(z1) * z0)) / 2


def shoelace(zs):
    """Signed shoelace area of the closed polygon zs; the closing edge from
    zs[-1] back to zs[0] is exactly the closing chord of green_area."""
    zs = np.asarray(zs)
    return 0.5 * float(np.sum(np.imag(np.conj(zs) * np.roll(zs, -1))))


def shoelace_direct(m, which, n=N_SHOELACE):
    """Shoelace areas from direct evaluation at n+1 and 2n+1 vertices and
    their Richardson combination (the polygon error is O(1/n^2)).  Uses no
    derivative and no quadrature, so it is wholly independent of
    green_area."""
    fine = [to_complex(pick(needle(mp.mpf(m) + mp.mpf(k) / (2 * n), m),
                            which)[0]) for k in range(2 * n + 1)]
    a_n = shoelace(fine[::2])
    a_2n = shoelace(fine)
    return (4 * a_2n - a_n) / 3


# --------------------------------------------------------------------------
# Cubic Hermite refinement of the exactly evaluated nodes
# --------------------------------------------------------------------------
def nodes(m, n=N_NODES):
    """n+1 exact nodes across [m, m+1]: T, yin, yin', yang, yang'."""
    vals = [needle(mp.mpf(m) + mp.mpf(k) / n, m) for k in range(n + 1)]
    arr = lambda j: np.array([to_complex(v[j]) for v in vals])
    Ts = np.array([m + k / n for k in range(n + 1)])
    return Ts, arr(0), arr(1), arr(2), arr(3)


def hermite(Ts, z, dz, refine):
    """Cubic Hermite interpolation, `refine` sub-steps per node interval."""
    h = np.diff(Ts)[:, None]
    tau = (np.arange(refine) / refine)[None, :]
    h00 = 2 * tau ** 3 - 3 * tau ** 2 + 1
    h10 = tau ** 3 - 2 * tau ** 2 + tau
    h01 = -2 * tau ** 3 + 3 * tau ** 2
    h11 = tau ** 3 - tau ** 2
    seg = (h00 * z[:-1, None] + h10 * h * dz[:-1, None]
           + h01 * z[1:, None] + h11 * h * dz[1:, None])
    return np.concatenate([seg.ravel(), [z[-1]]])


# --------------------------------------------------------------------------
# (c) area of the union of all needle positions
# --------------------------------------------------------------------------
def _triangles(P, Q):
    """Two triangles per swept quad (P_k, Q_k, Q_{k+1}, P_{k+1})."""
    tri = np.concatenate([np.stack([P[:-1], Q[:-1], Q[1:]], axis=1),
                          np.stack([P[:-1], Q[1:], P[1:]], axis=1)], axis=0)
    return np.ascontiguousarray(tri.real), np.ascontiguousarray(tri.imag)


def _merge(lo, hi):
    """Measure of the union of the intervals [lo_i, hi_i]."""
    order = np.argsort(lo, kind='stable')
    lo, hi = lo[order], hi[order]
    total = 0.0
    cur_lo, cur_hi = lo[0], hi[0]
    for i in range(1, lo.size):
        if lo[i] > cur_hi:
            total += cur_hi - cur_lo
            cur_lo, cur_hi = lo[i], hi[i]
        elif hi[i] > cur_hi:
            cur_hi = hi[i]
    return total + cur_hi - cur_lo


def _scan_triangles(xs, ys, c):
    """Measure of the union of the triangle cross-sections on x = c.  Each
    triangle is convex, so its cross-section is the single interval spanned
    by the crossings of its three edges."""
    lo = np.full(xs.shape[0], np.inf)
    hi = np.full(xs.shape[0], -np.inf)
    for a, b in ((0, 1), (1, 2), (2, 0)):
        xa, xb, ya, yb = xs[:, a], xs[:, b], ys[:, a], ys[:, b]
        dx = xb - xa
        with np.errstate(divide='ignore', invalid='ignore'):
            y = ya + (c - xa) * (yb - ya) / dx
        ok = (np.minimum(xa, xb) <= c) & (c <= np.maximum(xa, xb)) & (dx != 0)
        lo = np.where(ok, np.minimum(lo, y), lo)
        hi = np.where(ok, np.maximum(hi, y), hi)
        flat = (dx == 0) & (xa == c)           # edge lying on the scan line
        if flat.any():
            lo = np.where(flat, np.minimum(lo, np.minimum(ya, yb)), lo)
            hi = np.where(flat, np.maximum(hi, np.maximum(ya, yb)), hi)
    live = np.isfinite(lo) & np.isfinite(hi) & (hi > lo)
    return _merge(lo[live], hi[live]) if live.any() else 0.0


def union_area(P, Q, nx):
    """Area of the union of the swept quads, i.e. of the swept region."""
    xs, ys = _triangles(np.asarray(P), np.asarray(Q))
    tri_lo, tri_hi = xs.min(axis=1), xs.max(axis=1)
    xmin, xmax = tri_lo.min(), tri_hi.max()
    dx = (xmax - xmin) / nx
    total = 0.0
    for k in range(nx):
        c = xmin + (k + 0.5) * dx
        sel = (tri_lo <= c) & (c <= tri_hi)
        if sel.any():
            total += _scan_triangles(xs[sel], ys[sel], c)
    return total * dx


def union_extrapolated(P_lo, Q_lo, P_hi, Q_hi, nxs=UNION_NX):
    """Union area with both discretization errors removed by Richardson.

    The quad-union error is O(1/N^2) in the needle count N (the chords cut
    the corners of the swept slivers) and O(nx^-1.585) in the scan-line
    count (the union measure has square-root behaviour at the vertical
    tangents of the region).  Returns (grid values, extrapolated value).
    """
    grid = {}
    for nx in nxs:
        grid[(len(P_lo) - 1, nx)] = union_area(P_lo, Q_lo, nx)
        grid[(len(P_hi) - 1, nx)] = union_area(P_hi, Q_hi, nx)
    n_lo, n_hi = len(P_lo) - 1, len(P_hi) - 1
    inN = {nx: grid[(n_hi, nx)] + (grid[(n_hi, nx)] - grid[(n_lo, nx)]) / 3
           for nx in nxs}
    best = (inN[nxs[1]]
            + (inN[nxs[1]] - inN[nxs[0]]) / (2 ** NX_ORDER - 1))
    return grid, best


# --------------------------------------------------------------------------
# Geometry diagnostics: self-crossing and lobe overlap
# --------------------------------------------------------------------------
def _row_intervals(z, y):
    """Even-odd interior of the closed polygon z on the row at height y."""
    x0, y0 = z.real, z.imag
    x1, y1 = np.roll(x0, -1), np.roll(y0, -1)
    dy = y1 - y0
    ok = (dy != 0) & (np.minimum(y0, y1) <= y) & (y < np.maximum(y0, y1))
    xs = np.sort(x0[ok] + (y - y0[ok]) * (x1[ok] - x0[ok]) / dy[ok])
    return xs[0::2], xs[1::2]


def lobe_diagnostics(P, Q, ny=N_ROWS):
    """(even-odd area of P, of Q, area of their overlap).  The even-odd area
    exceeds |shoelace| exactly when the polygon crosses itself."""
    ylo = min(P.imag.min(), Q.imag.min())
    yhi = max(P.imag.max(), Q.imag.max())
    dy = (yhi - ylo) / ny
    aP = aQ = ov = 0.0
    for k in range(ny):
        y = ylo + (k + 0.5) * dy
        pa, pb = _row_intervals(P, y)
        qa, qb = _row_intervals(Q, y)
        aP += float(np.sum(pb - pa))
        aQ += float(np.sum(qb - qa))
        for lo, hi in zip(pa, pb):
            d = np.minimum(qb, hi) - np.maximum(qa, lo)
            ov += float(np.sum(d[d > 0]))
    return aP * dy, aQ * dy, ov * dy


def self_crossings(z):
    """(number of crossing pairs of non-adjacent edges, one example pair) for
    the closed polygon z."""
    n = z.size
    a, b = z, np.roll(z, -1)
    cross = lambda u, v: u.real * v.imag - u.imag * v.real
    hits, example = 0, None
    for i in range(n):
        j = np.arange(n)
        ok = (j != i) & (j != (i + 1) % n) & (j != (i - 1) % n)
        p, q, r, s = a[i], b[i], a[ok], b[ok]
        h = ((cross(q - p, r - p) * cross(q - p, s - p) < 0)
             & (cross(s - r, p - r) * cross(s - r, q - r) < 0))
        if h.any():
            hits += int(h.sum())
            if example is None:
                example = (i, int(j[ok][h][0]))
    return hits // 2, example


# --------------------------------------------------------------------------
# The limit curve, for calibration
# --------------------------------------------------------------------------
def psi_fn(u):
    return np.cos(2 * np.pi * (u ** 2 - u - 1 / 16)) / np.cos(2 * np.pi * u)


def y_inf(u):
    return 1 - psi_fn(u) * np.exp(-2j * np.pi * (u ** 2 - 1 / 16))


def psi_mp(u):
    return (mp.cos(2 * mp.pi * (u ** 2 - u - mp.mpf(1) / 16))
            / mp.cos(2 * mp.pi * u))


def y_inf_mp(u):
    return 1 - psi_mp(u) * mp.exp(-2j * mp.pi * (u ** 2 - mp.mpf(1) / 16))


def limit_calibration():
    print('=== calibration on the limit curve Y_inf ===')
    quarter = mp.mpf(1) / 4
    f = lambda x: x * psi_mp(x) ** 2
    J_yin = mp.quad(f, [0, quarter, 3 * quarter, 1])
    J_yang = mp.quad(f, [-2 * quarter, -quarter, quarter, 2 * quarter])
    print('  yin lobe,  -2 pi Int_0^1      u Psi^2 du = %s'
          % mp.nstr(-2 * mp.pi * J_yin, 20))
    print('  yang lobe, -2 pi Int_{-1/2}^{1/2} ...    = %s'
          % mp.nstr(-2 * mp.pi * J_yang, 20))
    print('  paper value, eq. area-value              = %s'
          % mp.nstr(-LIMIT_AREA, 20))
    print('  the two lobe integrals cancel exactly: sum = %s'
          % mp.nstr(-2 * mp.pi * (J_yin + J_yang), 6))
    sym = max(abs(y_inf_mp(mp.mpf(k) / 37 + mp.mpf('0.0013'))
                  + y_inf_mp(mp.mpf(1) / 2 - mp.mpf(k) / 37 - mp.mpf('0.0013'))
                  - 1) for k in range(1, 30))
    print('  and the reason: max |Y_inf(u) + Y_inf(1/2 - u) - 1| = %.2e,'
          % float(sym))
    print('  i.e. the point reflection z -> 1 - z about the midpoint of the')
    print('  stationary unit link swaps the two lobes and reverses winding.')

    u = np.linspace(0, 1, 5121) + 1e-9         # dodge u = 1/4, 3/4 exactly
    P, Q = y_inf(u), y_inf(u - 0.5)
    grid, best = union_extrapolated(P[::2], Q[::2], P, Q)
    for key in sorted(grid):
        print('  union: N=%5d nx=%5d -> %.9f' % (key[0], key[1], grid[key]))
    print('  union extrapolated                       = %.9f' % best)
    print('  2 x |A_yin| (exact)                      = %.9f'
          % float(LIMIT_SWEEP))
    print('  ==> the union of the needle positions IS twice the enclosed')
    print('      area, to %.1e: at infinity the sweep is exactly the two'
          % abs(best - float(LIMIT_SWEEP)))
    print('      lobes of the yin-yang, meeting without overlap.')
    ev_in, _, ov = lobe_diagnostics(P, Q)
    print('  row-scan calibration: even-odd |A_yin| - |shoelace| = %+.1e '
          '(bias),\n      lobe overlap at infinity = %.1e (they only touch)\n'
          % (ev_in - abs(shoelace(P)), ov))


# --------------------------------------------------------------------------
def power_fit(ms, errs):
    """Least squares |err| ~ C m^-p."""
    x = np.log(np.array(ms, dtype=float))
    y = np.log(np.abs(np.array(errs, dtype=float)))
    p, c = np.polyfit(x, y, 1)
    return float(np.exp(c)), float(-p)


def two_term_fit(ms, errs, p1, p2):
    """Least squares err ~ c1 m^-p1 + c2 m^-p2, fitted in the scaled variable
    err m^p1 = c1 + c2 m^-(p2-p1) so that small and large m weigh alike.
    Returns (c1, c2, worst relative residual)."""
    m = np.array(ms, dtype=float)
    e = np.array(errs, dtype=float)
    A = np.stack([np.ones_like(m), m ** -(p2 - p1)], axis=1)
    c, *_ = np.linalg.lstsq(A, e * m ** p1, rcond=None)
    model = (c[0] + c[1] * m ** -(p2 - p1)) * m ** -p1
    return float(c[0]), float(c[1]), float(np.max(np.abs(model / e - 1)))


def main():
    global MAXDEGREE
    t_start = time.time()
    print('check_needle_area_finiteT.py -- unit-needle swept area at finite T')
    print('sigma = 1/2, dps = %d, %d exact nodes per period\n'
          % (DPS, N_NODES))

    limit_calibration()

    print('=== the needle has unit length at every finite T ===')
    worst = mp.mpf(0)
    for m in (1, 5, 10):
        for k in (1, 7, 13, 19):
            v = needle(m + mp.mpf(k) / 20, m)
            worst = max(worst, abs(abs(v[2] - v[0]) - 1))
    print('  max | |Y_ang1 - Y_in1| - 1 | over a grid = %.2e  '
          '(|chi| = 1, 2 sigma - 1 = 0)\n' % float(worst))

    rows = []
    print('=== per-period computation ===')
    for m in PERIODS:
        t0 = time.time()
        a_in = green_area(m, 'yin')
        a_ang = green_area(m, 'yang')

        Ts, yin, dyin, yang, dyang = nodes(m)
        P_lo = hermite(Ts, yin, dyin, UNION_N[0])
        Q_lo = hermite(Ts, yang, dyang, UNION_N[0])
        P_hi = hermite(Ts, yin, dyin, UNION_N[1])
        Q_hi = hermite(Ts, yang, dyang, UNION_N[1])

        d_in = shoelace_direct(m, 'yin')
        d_ang = shoelace_direct(m, 'yang')
        grid, union = union_extrapolated(P_lo, Q_lo, P_hi, Q_hi)
        ev_in, ev_ang, overlap = lobe_diagnostics(P_hi, Q_hi)
        cross_in, where_in = self_crossings(P_lo[:-1])
        gap = abs(yin[-1] - yin[0])

        rows.append(dict(m=m, a_in=a_in, a_ang=a_ang, union=union, gap=gap,
                         grid=grid, overlap=overlap, ev_in=ev_in,
                         ev_ang=ev_ang, cross=cross_in, where=where_in,
                         nseg=P_lo.size - 1, d_in=d_in, d_ang=d_ang))

        print('  m=%2d  T in [%d,%d]   t = I(T) in [%.1f, %.1f]      (%.1f s)'
              % (m, m, m + 1, float(I_of_T(mp.mpf(m))),
                 float(I_of_T(mp.mpf(m + 1))), time.time() - t0))
        print('     Green    A_yin = %s   A_yang = %s'
              % (mp.nstr(a_in, 13), mp.nstr(a_ang, 13)))
        print('     shoelace A_yin = %+.11f   A_yang = %+.11f   '
              '(vs Green: %.1e / %.1e)'
              % (d_in, d_ang, abs(d_in - float(a_in)),
                 abs(d_ang - float(a_ang))))
        print('     union %s -> %.9f'
              % ('  '.join('%.8f' % grid[k] for k in sorted(grid)), union))
        print('     closure gap %.3e;  lobe overlap %.3e;  self-crossings '
              '%d%s' % (gap, overlap, cross_in,
                        '' if not cross_in else
                        ' (edges %d and %d of %d, i.e. at the handoff)'
                        % (where_in[0], where_in[1], P_lo.size - 1)))
    print()

    print('=== TABLE: unit needle over one handoff period, sigma = 1/2 ===')
    print('   m   T range    enclosed |A_yin|   2 x enclosed      direct '
          'union    |A_yin|+|A_yang|   union - 2.0683344')
    for r in rows:
        enc = abs(r['a_in'])
        print('  %2d  [%2d, %2d]     %.9f      %.9f     %.9f      %.9f'
              '        %+.4e'
              % (r['m'], r['m'], r['m'] + 1, float(enc), float(2 * enc),
                 r['union'], float(enc + abs(r['a_ang'])),
                 r['union'] - float(LIMIT_SWEEP)))
    print('  inf     --        %.9f      %.9f     %.9f      %.9f'
          '         0'
          % (float(LIMIT_AREA), float(LIMIT_SWEEP), float(LIMIT_SWEEP),
             float(LIMIT_SWEEP)))
    print()

    print('=== signed areas: the two lobes wind oppositely ===')
    for r in rows:
        print('  m=%2d  A_yin = %+.9f   A_yang = %+.9f   |A_yang|/|A_yin| ='
              ' %.6f   sum = %+.3e'
              % (r['m'], float(r['a_in']), float(r['a_ang']),
                 float(abs(r['a_ang']) / abs(r['a_in'])),
                 float(r['a_in'] + r['a_ang'])))
    print('  (yin negative = clockwise, yang positive = counter-clockwise.')
    print('   The sum tends to 0, so the signed swept area counted WITH')
    print('   MULTIPLICITY tends to 0 and is not the quantity asked for;')
    print('   the union is.  The lobe asymmetry |A_yang|/|A_yin| -> 1 only')
    print('   like O(1/m): at finite T the point symmetry is broken.)\n')

    print('=== does "swept = 2 x enclosed" hold at finite T? ===')
    print('   m    2|A_yin|      union       2|A_yin| - union    '
          '(|A_yin|+|A_yang|) - union   lobe overlap')
    for r in rows:
        two = float(2 * abs(r['a_in']))
        lobes = float(abs(r['a_in']) + abs(r['a_ang']))
        print('  %2d  %.8f  %.8f     %+.4e            %+.4e         %.3e'
              % (r['m'], two, r['union'], two - r['union'],
                 lobes - r['union'], r['overlap']))
    ms = [r['m'] for r in rows]
    C, p = power_fit(ms, [float(2 * abs(r['a_in'])) - r['union']
                          for r in rows])
    print('  NO, only approximately: fit |2|A_yin| - union| ~ %.4f m^-%.3f'
          % (C, p))
    C, p = power_fit(ms, [float(abs(r['a_in']) + abs(r['a_ang'])) - r['union']
                          for r in rows])
    print('  the two-lobe form is an order better: '
          'fit |(|A_yin|+|A_yang|) - union| ~ %.4f m^-%.3f' % (C, p))
    print()

    print('=== are the closed lobes simple? (even-odd interior vs shoelace)'
          ' ===')
    for r in rows:
        print('  m=%2d  yin even-odd %.7f vs |A_yin| %.7f (excess %+.2e)   '
              'self-crossings %d'
              % (r['m'], r['ev_in'], float(abs(r['a_in'])),
                 r['ev_in'] - float(abs(r['a_in'])), r['cross']))
    print('  (for m <= 5 the path really does cross itself once, at the')
    print('   handoff where it fails to close; the excess area is the little')
    print('   doubly counted loop.  The row scan itself biases high by ~1e-6,')
    print('   which is all that is left for m >= 8.)\n')

    print('=== convergence to the T -> infinity limit ===')
    print('   m   |A_yin| - 1.0341672003   union - 2.0683344006   '
          'err ratio to m-1')
    prev = None
    for r in rows:
        e1 = float(abs(r['a_in']) - LIMIT_AREA)
        e2 = r['union'] - float(LIMIT_SWEEP)
        print('  %2d      %+.4e              %+.4e           %s'
              % (r['m'], e1, e2, '  --' if prev is None else '%.4f'
                 % (e1 / prev)))
        prev = e1
    errs_a = [float(abs(r['a_in']) - LIMIT_AREA) for r in rows]
    errs_u = [r['union'] - float(LIMIT_SWEEP) for r in rows]
    for name, errs in (('|A_yin| - limit    ', errs_a),
                       ('union  - 2 x limit ', errs_u)):
        C, p = power_fit(ms, errs)
        Ct, pt = power_fit(ms[4:], errs[4:])
        print('  fit %s ~ %.5f m^-%.3f   (m >= 5 only: %.5f m^-%.3f)'
              % (name, C, p, Ct, pt))
    print('  Those single powers are only effective exponents over m = 1..10;')
    print('  the sequence of error ratios above is still drifting upward, so')
    print('  neither is the true rate.  Two-term fits identify the rates:')
    c1, c2, res = two_term_fit(ms, errs_a, 1.0, 1.5)
    print('    lobe:  %+.5f/m %+.5f/m^1.5   (worst relative residual %.1e)'
          '  => O(1/m)' % (c1, c2, res))
    c1u, c2u, resu = two_term_fit(ms, errs_u, 2.0, 2.5)
    print('    union: %+.5f/m^2 %+.5f/m^2.5 (worst relative residual %.1e)'
          '  => O(1/m^2)' % (c1u, c2u, resu))
    print('  The lobe rate O(1/m) matches the O(1/T) convergence of the curve')
    print('  itself; the union does better because the two lobe errors have')
    print('  opposite signs and cancel to leading order.')

    print('\n  confirmation of the lobe rate at larger m (independent rows):')
    big_ms, big_errs = list(ms), list(errs_a)
    for m in RATE_PERIODS:
        e = float(abs(green_area(m, 'yin')) - LIMIT_AREA)
        big_ms.append(m)
        big_errs.append(e)
        print('    m=%2d  |A_yin| - limit = %+.4e   m x err = %.5f   '
              'model from m<=10 %+.4e'
              % (m, e, m * e, c1 / m + c2 * m ** -1.5))
    c1b, c2b, resb = two_term_fit(big_ms, big_errs, 1.0, 1.5)
    print('    refit over m = 1..32:  %+.5f/m %+.5f/m^1.5   (worst relative '
          'residual %.1e)' % (c1b, c2b, resb))
    print('    so |A_yin| - 1.0341672 ~ %.4f/m asymptotically.' % c1b)

    print('\n=== numerical accuracy achieved ===')
    print('  Green quadrature: identical to %d digits with the interval split'
          % DPS)
    for m in (1, 10):
        base = green_area(m, 'yin')
        nosplit = green_area(m, 'yin', split=False)
        keep_deg, MAXDEGREE = MAXDEGREE, 9
        mp.mp.dps = 40
        tighter = green_area(m, 'yin')
        mp.mp.dps = DPS
        MAXDEGREE = keep_deg
        print('    m=%2d  |split - unsplit| = %.1e;  '
              '|dps25,deg7 - dps40,deg9| = %.1e'
              % (m, float(abs(base - nosplit)), float(abs(base - tighter))))
    print('  so the lobe areas are exact to far more than the 10 digits')
    print('  quoted; the independent derivative-free shoelace, which knows')
    print('  nothing of the quadrature, agrees with them to ~1e-8.')
    print('  Union areas: the extrapolation reproduces the exact limit-curve')
    print('  value to 5e-8 and the raw 2x2 resolution grid spans ~1e-5, so')
    print('  the quoted unions are good to about 1e-7 (7 significant '
          'figures).')
    print('\ntotal runtime %.1f s' % (time.time() - t_start))


if __name__ == '__main__':
    main()
