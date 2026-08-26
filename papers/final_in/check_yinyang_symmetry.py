#!/usr/bin/env python3
"""
check_yinyang_symmetry.py
=========================

Every number quoted in §11.4, "The yin and yang curves are not symmetrical".

  1. the in-frame length of the revolving link, |chi| ceil(T)^(2 sigma - 1),
     pinned to 1 only on the critical line
  2. the separation between the yin family and the reflected yang family,
     period by period, at sigma = 1/2
  3. the two lobe areas at sigma = 1/2, straddling the limit area of (120)
  4. the lobe-area ratio across sigma, and the sigma at which it crosses 1
  5. the exact frame mirror conj(Y_in1) = Y_in2, conj(Y_ang1) = Y_ang2 at
     sigma = 1/2, and its failure off the line
  6. the two places per period where a loop does meet its reflected partner,
     refined by root-finding on Y_in1(T) + Y_ang1(T) = 1, against the two
     limit points 1/2 -+ exp(i pi/4)/2 of §11.4

Run:  python3 check_yinyang_symmetry.py     (a few minutes)
"""

import mpmath as mp
import numpy as np

from fig1_spiral_summands import I_of_T, chi

mp.mp.dps = 25

NPTS = 801
LIMIT_AREA = 1.0341672002955850005      # (120), the limit-curve enclosed area


def curves(sigma, m, npts=NPTS):
    """Both frames' curve pairs, and the offset vector, over [m, m+1]."""
    sigma = mp.mpf(sigma)
    out = {k: [] for k in ("yin1", "yang1", "yin2", "yang2", "off")}
    for T in np.linspace(m, m + 1, npts):
        t = I_of_T(mp.mpf(T))
        s = mp.mpc(sigma, t)
        ch = chi(s)
        S1 = mp.fsum(mp.mpf(n) ** (-s) for n in range(1, m + 1))
        S2 = ch * mp.fsum(mp.mpf(n) ** (s - 1) for n in range(1, m + 1))
        R = mp.zeta(s) - S1 - S2
        M1 = mp.mpf(m + 1)
        e = mp.exp(mp.mpc(0, 1) * t * mp.log(M1))
        y1 = R * M1 ** s
        v = ch * M1 ** (2 * s - 1)
        out["yin1"].append(complex(y1))
        out["yang1"].append(complex(y1 - v))
        out["yin2"].append(complex(R * M1 ** (1 - sigma) / (ch * e)))
        out["yang2"].append(complex(R * M1 ** (1 - sigma) / (ch * e)
                                    - M1 ** (1 - 2 * sigma) / (ch * e ** 2)))
        out["off"].append(complex(v))
    return {k: np.array(v) for k, v in out.items()}


def one_T(sigma, m, T):
    """(Y_in1, Y_ang1) at a single index, in mp arithmetic."""
    s = mp.mpc(mp.mpf(sigma), I_of_T(mp.mpf(T)))
    ch = chi(s)
    R = (mp.zeta(s)
         - mp.fsum(mp.mpf(n) ** (-s) for n in range(1, m + 1))
         - ch * mp.fsum(mp.mpf(n) ** (s - 1) for n in range(1, m + 1)))
    M1 = mp.mpf(m + 1)
    y = R * M1 ** s
    return y, y - ch * M1 ** (2 * s - 1)


def area(z):
    """Enclosed area by the shoelace rule, the loop closed."""
    x, y = z.real, z.imag
    return abs(0.5 * float(np.sum(x * np.roll(y, -1) - np.roll(x, -1) * y)))


def separation(a, b):
    """Largest distance from a point of either curve to the other curve."""
    d = np.abs(a[:, None] - b[None, :])
    return max(d.min(axis=1).max(), d.min(axis=0).max())


def crossings(p, q):
    """Where the two closed polylines actually intersect."""
    a, r = p, np.roll(p, -1) - p
    c, s = q, np.roll(q, -1) - q
    out = []
    for i in range(len(a)):
        den = r[i].real * s.imag - r[i].imag * s.real
        ok = np.abs(den) > 1e-14
        den = np.where(ok, den, 1.0)
        w = c - a[i]
        u = (w.real * s.imag - w.imag * s.real) / den
        v = (w.real * r[i].imag - w.imag * r[i].real) / den
        hit = ok & (u >= 0) & (u <= 1) & (v >= 0) & (v <= 1)
        out.extend(a[i] + u[j] * r[i] for j in np.where(hit)[0])
    return out


print("1. the revolving link in frame, over one handoff period")
for sig in ('0.25', '0.5', '0.75'):
    for m in (6, 20):
        v = curves(sig, m)["off"]
        a = np.unwrap(np.angle(v))
        print(f"   sigma={sig:>4}, {m} <= T <= {m + 1}: |offset| in"
              f" [{abs(v).min():.4f}, {abs(v).max():.4f}], arg swings"
              f" {a.max() - a.min():.4f} rad, net {a[-1] - a[0]:+.4f} rad")

print("\n2. yin against reflected yang at sigma=1/2, period by period")
for m in range(1, 10):
    c = curves(mp.mpf('0.5'), m, npts=320)
    yin, refl = c["yin1"], 1.0 - c["yang1"]
    where = ", ".join(f"{z.real:.3f}{z.imag:+.3f}i" for z in crossings(yin, refl))
    print(f"   {m} <= T <= {m + 1}: separation {separation(yin, refl):.4f},"
          f" crossings at {where}")

print(f"\n3. lobe areas at sigma=1/2 against the limit {LIMIT_AREA:.7f}")
for m in (6, 80):
    c = curves(mp.mpf('0.5'), m)
    ay, ag = area(c["yin1"]), area(c["yang1"])
    print(f"   {m} <= T <= {m + 1}: yin {ay:.6f}  yang {ag:.6f}"
          f"  gap {ay - ag:.6f}  mean-limit {(ay + ag) / 2 - LIMIT_AREA:+.2e}")

print("\n4. lobe-area ratio (yang/yin) across sigma over 20 <= T <= 21")
for sig in ('0.1', '0.25', '0.4', '0.5', '0.53', '0.54', '0.6', '0.75', '0.9'):
    c = curves(sig, 20)
    ay, ag = area(c["yin1"]), area(c["yang1"])
    print(f"   sigma={sig:>4}: yin {ay:.6f}  yang {ag:.6f}"
          f"  ratio {ag / ay:.5f}")

print("\n5. the frame mirror over 6 <= T <= 7")
for sig in ('0.25', '0.5', '0.75'):
    c = curves(sig, 6)
    d1 = np.abs(np.conj(c["yin1"]) - c["yin2"]).max()
    d2 = np.abs(np.conj(c["yang1"]) - c["yang2"]).max()
    print(f"   sigma={sig:>4}: max |conj(yin1)-yin2| {d1:.3e},"
          f"  max |conj(yang1)-yang2| {d2:.3e}")

print("\n6. where the loops meet: the roots of Y_in1 + Y_ang1 = 1")
TARGETS = [mp.mpf(1) / 2 - mp.exp(mp.mpc(0, mp.pi / 4)) / 2,
           mp.mpf(1) / 2 + mp.exp(mp.mpc(0, mp.pi / 4)) / 2]
print("   limit points " + ", ".join(f"{complex(z):.6f}" for z in TARGETS))
for m in (1, 9, 20):
    for guess in (m + 0.01, m + 0.51):
        def centered(T):
            a, b = one_T('0.5', m, T)
            return a + b - 1

        # One real unknown against a complex condition: solve the real part
        # and let the imaginary part vanish on its own, which it does.
        T = mp.findroot(lambda x: mp.re(centered(x)), mp.mpf(guess))
        z = one_T('0.5', m, T)[0]
        d = min(abs(complex(z - tg)) for tg in TARGETS)
        print(f"   {m} <= T <= {m + 1}: crossing at T={float(T):.6f},"
              f" z={complex(z):.8f}, {d:.1e} from its limit point,"
              f" residual {float(abs(centered(T))):.1e}")
