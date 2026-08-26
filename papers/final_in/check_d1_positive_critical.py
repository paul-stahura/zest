"""Verify that d1 = d2 > 0 everywhere on the critical line.

The claim being checked (for the note after eq:R-as-cone in main.tex):
on sigma = 1/2 the weights d1, d2 of the partial-summand split are always
positive, i.e. R never leaves the cone spanned by e^{-i omega} and
e^{i(omega+psi)}.  Off the line this fails in narrow windows around the
poles of sin(2 omega + psi) (Remark rem:d-ratio), so the check also
samples the near-parallel instants (fractional parts ~0.25, ~0.75) on
the line at extra density, where the cancellation is most delicate.

Sweeps:
  1. dense grid  T in [1, 30], step 0.005          (both weights, exact R)
  2. magnified windows +-0.02 around every T = n +- 1/4, n <= 30, step 1e-4
  3. spot windows at T ~ 100, 300, 1000 (one unit each, step 0.002)

Prints the minimum of d1 and of d2 over each sweep and fails loudly if
either is ever <= 0.  Also reports max |d1 - d2| as a sanity check of
Corollary cor:equal.
"""
import mpmath as mp

mp.mp.dps = 25

def I(T):
    return mp.pi * (2 * T + 1) / mp.log(1 / T + 1)

def chi(s):
    return 2**s * mp.pi**(s - 1) * mp.sin(mp.pi * s / 2) * mp.gamma(1 - s)

def weights(T, sigma=mp.mpf('0.5')):
    """Exact d1, d2 via the Cramer solution eq:d1--eq:d2 with R = zeta - S1 - S2."""
    t = I(T)
    s = mp.mpc(sigma, t)
    m = int(mp.floor(T))
    S1 = mp.fsum(mp.power(n, -s) for n in range(1, m + 1))
    ch = chi(s)
    S2 = ch * mp.fsum(mp.power(n, s - 1) for n in range(1, m + 1))
    R = mp.zeta(s) - S1 - S2
    om = t * mp.log(m + 1)
    psi = mp.arg(ch)
    ph = mp.arg(R)
    den = mp.sin(2 * om + psi)
    d1 = abs(R) * mp.sin(om - ph + psi) / den
    d2 = abs(R) * mp.sin(om + ph) / den
    return d1, d2

def sweep(name, Ts):
    mind1 = mind2 = mp.inf
    argmin = None
    maxdiff = mp.mpf(0)
    for T in Ts:
        if abs(T - mp.nint(T)) < 1e-9:   # skip exact integers (handoff instants)
            continue
        d1, d2 = weights(T)
        if d1 < mind1:
            mind1, argmin = d1, T
        mind2 = min(mind2, d2)
        maxdiff = max(maxdiff, abs(d1 - d2))
    ok = mind1 > 0 and mind2 > 0
    print(f"{name}: {len(Ts)} samples  min d1 = {mp.nstr(mind1, 6)} at T = {mp.nstr(argmin, 8)}"
          f"  min d2 = {mp.nstr(mind2, 6)}  max|d1-d2| = {mp.nstr(maxdiff, 3)}"
          f"  -> {'OK, all positive' if ok else 'FAIL: nonpositive weight found'}")
    return ok

def frange(a, b, step):
    out = []
    x = mp.mpf(a)
    while x <= b + 1e-12:
        out.append(x)
        x += step
    return out

ok = True

# 1. dense grid over 1 <= T <= 30
ok &= sweep("grid [1,30] step 0.005", frange(1.0, 30.0, mp.mpf('0.005')))

# 2. magnified near-parallel windows around n + 1/4 and n + 3/4
pts = []
for n in range(1, 30):
    for q in (mp.mpf('0.25'), mp.mpf('0.75')):
        pts += frange(n + q - mp.mpf('0.02'), n + q + mp.mpf('0.02'), mp.mpf('0.0001'))
ok &= sweep("pole windows n+1/4, n+3/4 (+-0.02, step 1e-4)", pts)

# 3. spot windows at larger T
for T0 in (100, 300, 1000):
    ok &= sweep(f"window [{T0},{T0}+1] step 0.002", frange(T0, T0 + 1, mp.mpf('0.002')))

print("ALL OK" if ok else "FAILURES FOUND")
