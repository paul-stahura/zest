"""Verification for the remark on the monotonicity of N_star.

    pi N_star = arg W + 3 pi / 2,   W = e^{i theta} B_1^* = Z/2 - i Z'/(2 theta'),

so with  rho = (1/theta') d(arg W)/dt  of eq:nstar-rho,

    rho = [ Z'^2 - Z Z'' + (theta''/theta') Z Z' ] / [ theta'^2 Z^2 + Z'^2 ],

whose denominator is positive: dN_star/dT > 0 iff the numerator is, and up to
the theta'' term the numerator is the Laguerre expression Z'^2 - Z Z''.

With  Xi(t) = xi(1/2 + it) = -c(t) Z(t),  c > 0, pure algebra gives

    Xi'^2 - Xi Xi'' = c^2 [ (Z'^2 - Z Z'') - (log c)'' Z^2 ],

and under RH the Hadamard product of Xi over its real zeros gives
-(log Xi)'' = sum_k (t - gamma_k)^{-2}, hence

    Z'^2 - Z Z'' = Z^2 [ sum_k (t - gamma_k)^{-2} + (log c)'' ].

Run:  python3 check_nstar_mono.py
"""
import mpmath as mp

mp.mp.dps = 25


def parts(t):
    t = mp.mpf(t)
    z0 = mp.siegelz(t)
    z1 = mp.siegelz(t, derivative=1)
    z2 = mp.siegelz(t, derivative=2)
    t1 = mp.siegeltheta(t, derivative=1)
    t2 = mp.siegeltheta(t, derivative=2)
    return z0, z1, z2, t1, t2


def rho(t):
    z0, z1, z2, t1, t2 = parts(t)
    return (z1**2 - z0 * z2 + (t2 / t1) * z0 * z1) / (t1**2 * z0**2 + z1**2)


def laguerre(t):
    z0, z1, z2, _, _ = parts(t)
    return z1**2 - z0 * z2


def c(t):
    t = mp.mpf(t)
    return (mp.mpf(1) / 2) * (mp.mpf(1) / 4 + t**2) * mp.pi**(mp.mpf(-1) / 4) \
        * abs(mp.gamma(mp.mpf(1) / 4 + 1j * t / 2))


def Xi(t):
    s = mp.mpf(1) / 2 + 1j * t
    return mp.re(mp.mpf(1) / 2 * s * (s - 1) * mp.pi**(-s / 2)
                 * mp.gamma(s / 2) * mp.zeta(s))


def refine_min(t0, half, step):
    """Local minimum of rho near t0."""
    best = (t0, rho(t0))
    t = t0 - half
    while t <= t0 + half:
        r = rho(t)
        if r < best[1]:
            best = (t, r)
        t += step
    return best


def scan(lo, hi, step, label):
    best = (None, mp.inf)
    neg = 0
    t = mp.mpf(lo)
    while t <= hi:
        r = rho(t)
        if r < best[1]:
            best = (t, r)
        if r <= 0:
            neg += 1
        t += step
    tm, rm = refine_min(best[0], step, step / 20)
    print(f"{label:22s} min rho = {float(rm):.4f} at t = {float(tm):9.4f}"
          f"    rho <= 0 at {neg} of the grid points", flush=True)


print(__doc__.splitlines()[0])
print("\n--- 1. rho on grids of spacing 0.1 (rho > 0 <=> N_star increasing)\n")
scan(10, 200, mp.mpf("0.1"), "10 <= t <= 200")
scan(200, 300, mp.mpf("0.1"), "200 <= t <= 300")
scan(1000, 1030, mp.mpf("0.05"), "1000 <= t <= 1030")
scan(9877, 9880, mp.mpf("0.01"), "9877 <= t <= 9880")

print("\n--- 2. Xi = -c Z, and the transfer of the Laguerre expression\n")
for t in ["10.7", "100.5", "1000.5"]:
    t = mp.mpf(t)
    print(f"  t={float(t):8.1f}   Xi = {mp.nstr(Xi(t), 12):>16s}"
          f"   -c Z = {mp.nstr(-c(t) * mp.siegelz(t), 12):>16s}")
print()
for t in ["10.7", "100.5", "1000.5"]:
    t = mp.mpf(t)
    X1 = mp.diff(Xi, t, 1)
    X2 = mp.diff(Xi, t, 2)
    d2logc = mp.diff(lambda u: mp.log(c(u)), t, 2)
    z0 = mp.siegelz(t)
    rebuilt = c(t)**2 * (laguerre(t) - d2logc * z0**2)
    print(f"  t={float(t):8.1f}   Xi'^2-Xi Xi'' = {mp.nstr(X1**2 - Xi(t) * X2, 10):>15s}"
          f"   c^2[(Z'^2-ZZ'')-(log c)''Z^2] = {mp.nstr(rebuilt, 10):>15s}"
          f"   (log c)'' = {mp.nstr(d2logc, 4)}")

print("\n--- 3. the RH bracket  (Z'^2-ZZ'')/Z^2 = sum_k (t-g_k)^-2 + (log c)''\n")
zeros = [mp.zetazero(k).imag for k in range(1, 301)]
for t in ["10.7", "100.5"]:
    t = mp.mpf(t)
    z0 = mp.siegelz(t)
    d2logc = mp.diff(lambda u: mp.log(c(u)), t, 2)
    S = mp.fsum([1 / (t - g)**2 + 1 / (t + g)**2 for g in zeros])
    bracket = laguerre(t) / z0**2
    print(f"  t={float(t):8.1f}   bracket = {float(bracket):.6f}"
          f"   truncated sum (|g| <= {float(zeros[-1]):.0f}) = {float(S):.6f}"
          f"   (log c)'' = {float(d2logc): .3e}"
          f"   tail = {float(bracket - S - d2logc):.2e}")

def N_star(t):
    """N_star of eq:N-star, read in t rather than T, principal branch of arg."""
    t = mp.mpf(t)
    z0 = mp.siegelz(t)
    z1 = mp.siegelz(t, derivative=1)
    th = mp.siegeltheta(t)
    t1 = mp.siegeltheta(t, derivative=1)
    W = z0 / 2 - 1j * z1 / (2 * t1)
    th1s = mp.arg(W * mp.expj(-th))          # vartheta_1^*
    return (th + th1s) / mp.pi + mp.mpf(3) / 2, th1s


def floor_check(lo, hi, step, zeros, label):
    bad = 0
    n = 0
    maxth = mp.mpf(0)
    t = mp.mpf(lo)
    while t <= hi:
        ns, th1s = N_star(t)
        count = sum(1 for g in zeros if g <= t)
        if int(mp.floor(ns)) != count:
            bad += 1
            if bad <= 3:
                print(f"    mismatch at t={float(t):.4f}: floor(N*)="
                      f"{int(mp.floor(ns))} vs N={count}", flush=True)
        maxth = max(maxth, abs(th1s))
        n += 1
        t += step
    print(f"{label:22s} {n} grid points, {bad} mismatches of floor(N*) with N,"
          f"  max |vartheta_1^*| = {float(maxth / mp.pi):.3f} pi", flush=True)


print("\n--- 4. floor(N_star) against the zero count\n")
zs300 = []
k = 1
while True:
    g = mp.zetazero(k).imag
    if g > 301:
        break
    zs300.append(g)
    k += 1
floor_check(14, 300, mp.mpf("0.05"), zs300, "14 <= t <= 300")

# the same test two decades up, around gamma_10000
zs10k = [mp.zetazero(k).imag for k in range(9995, 10006)]
n0 = sum(1 for k in range(1, 9995))  # zeros below the window, by index
print(f"    (window around gamma_10000: gamma_9999 = {mp.nstr(zs10k[4], 12)},"
      f" gamma_10000 = {mp.nstr(zs10k[5], 12)})")
bad = 0
t = mp.mpf(9877)
while t <= 9880:
    ns, _ = N_star(t)
    count = 9994 + sum(1 for g in zs10k if g <= t)
    if int(mp.floor(ns)) != count:
        bad += 1
        if bad <= 3:
            print(f"    mismatch at t={float(t):.4f}: floor(N*)="
                  f"{int(mp.floor(ns))} vs N={count}", flush=True)
    t += mp.mpf("0.01")
print(f"{'9877 <= t <= 9880':22s} 301 grid points, {bad} mismatches", flush=True)

print("\n--- 5. the Lehmer pair near t = 7005.06\n")
for k in (6708, 6709, 6710, 6711):
    print(f"  gamma_{k} = {mp.nstr(mp.zetazero(k).imag, 12)}")
g1 = mp.zetazero(6709).imag
g2 = mp.zetazero(6710).imag
tm = mp.findroot(lambda u: mp.siegelz(u, derivative=1), (g1 + g2) / 2)
print(f"\n  hump between them at t = {mp.nstr(tm, 12)},  Z = {mp.nstr(mp.siegelz(tm), 6)}")
print(f"  rho there            = {float(rho(tm)):.2f}   (= -Z''/theta'^2 Z, since Z'=0)")
print(f"  Z'^2 - Z Z'' there   = {float(laguerre(tm)):.4f}")
for t in ["7005.00", "7005.15"]:
    print(f"  Z'^2 - Z Z'' at t={t}  = {float(laguerre(t)):.4f}"
          f"   rho = {float(rho(t)):.4f}")
