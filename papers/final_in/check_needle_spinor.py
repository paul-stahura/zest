#!/usr/bin/env python3
"""
Belt-trick / spinor check for the needle and its reverse-chain tail.

In the bisector frame, over two units of T, measure:

  * the needle heading (arg of Y_ang1 - Y_in1)
  * the last outer-tail link (reverse link m-1) heading
  * the attachment angle t log((m+1)/m) at the needle's near end
  * the handoff fold (2m+1)π modulo 2π and 4π

Finding: nothing about the tail undoes on the second unit. The needle
heading rocks through a half-revolution and returns every single unit;
the tail-end keeps turning (~2.15 turns per unit); the attachment angle
grows; only the 4π-class of the integer fold alternates, which is the
I(T) clock already in the paper, not a ribbon that untwists.

Run:  python3 check_needle_spinor.py
"""

import mpmath as mp
import numpy as np

from fig1_spiral_summands import I_of_T, chi, C

mp.mp.dps = 25


def unwrap(angles):
    out = [angles[0]]
    for a in angles[1:]:
        d = a - out[-1]
        d -= 2 * np.pi * np.round(d / (2 * np.pi))
        out.append(out[-1] + d)
    return np.array(out)


def headings(sigma, T):
    T = mp.mpf(T)
    t = I_of_T(T)
    s = mp.mpc(sigma, t)
    m = int(mp.floor(T))
    m1 = mp.mpf(m + 1)
    ch = chi(s)
    needle = C(-ch * m1 ** (2 * s - 1))
    neigh = C(-ch * (mp.mpf(m) ** (s - 1)) * (m1 ** s))
    return np.angle(needle), np.angle(neigh), float(t * mp.log(m1 / m))


def unit_report(sigma, T0):
    Ts = np.linspace(T0, T0 + 1 - 1e-8, 60)
    n, h, a = zip(*(headings(sigma, T) for T in Ts))
    n, h, a = unwrap(n), unwrap(h), np.array(a)
    print(f"  T in [{T0},{T0 + 1}):")
    print(
        f"    needle heading   net {(n[-1] - n[0]) / np.pi:+.3f}π   "
        f"excursion {(n.max() - n.min()) / np.pi:.3f}π   "
        f"[{n.min() / np.pi:+.3f}π, {n.max() / np.pi:+.3f}π]"
    )
    print(
        f"    tail-end heading net {(h[-1] - h[0]) / np.pi:+.3f}π   "
        f"({(h[-1] - h[0]) / (2 * np.pi):+.3f} turns)"
    )
    print(
        f"    attachment       {a[0] / np.pi:.3f}π → {a[-1] / np.pi:.3f}π   "
        f"net {(a[-1] - a[0]) / np.pi:+.3f}π"
    )


def main():
    print("Needle / tail spinor check (bisector frame)\n")
    for sigma in (mp.mpf("0.5"), mp.mpf("0.25")):
        print(f"========== sigma = {float(sigma)} ==========")
        unit_report(sigma, 6)
        unit_report(sigma, 7)
        print("  handoff fold (2m+1)π:")
        for m in range(6, 11):
            ang = (2 * m + 1) * np.pi
            print(
                f"    T={m}: {2 * m + 1}π   "
                f"mod 2π = {ang % (2 * np.pi) / np.pi:.0f}π   "
                f"mod 4π = {ang % (4 * np.pi) / np.pi:.0f}π"
            )
        print()


if __name__ == "__main__":
    main()
