#!/usr/bin/env python3
"""
Pin forward link 1, overlay its yin/yang, and look for a reverse-chain
link that stays parallel as T runs a unit — the analogue of the
§14.2 follower, which was parallel to the bisector yin/yang chord.

Two chords in the frame of link 1 (multiply world vectors by 2^s):
  (A) yin/yang of link 1: the reverse link that currently crosses it
  (B) reverse bisector, seen in that same frame

A world reverse summand n is exactly parallel to (B) when n = 2*ceil(T),
because the two vectors differ by the real factor 2.  For (A) the
product law says n = 2 * n'(T), which steps when the crossing does.
"""

import mpmath as mp
from fig1_spiral_summands import I_of_T, chi
from fig_yinyang_link5 import remainder_at, yin_yang_at

mp.mp.dps = 30


def angle_lines(u, v):
    """Acute angle between two complex directions, in degrees."""
    if abs(u) < 1e-30 or abs(v) < 1e-30:
        return float("nan")
    th = float(mp.arg(u / v))
    th = abs(th) % mp.pi
    if th > mp.pi / 2:
        th = mp.pi - th
    return float(th * 180 / mp.pi)


def world_reverse(ch, s, n):
    return -ch * (mp.mpf(n) ** (s - 1))


def scan_unit(m, n_T=21, k_frame=1):
    eps = 1e-4
    Ts = [m + eps + (1 - 2 * eps) * i / (n_T - 1) for i in range(n_T)]
    n_frame = k_frame + 1
    rows = []
    for T in Ts:
        info = remainder_at(T)
        s, ch, a2 = info["s"], info["ch"], info["a2"]
        nmax = int(mp.floor(info["t"] / mp.pi)) + 2
        yin, yang, j = yin_yang_at(info, k_frame)
        chord_A = complex(yang - yin)
        n_cross = j + 1
        M1 = mp.mpf(info["m"] + 1)
        chord_B = complex((-ch * (M1 ** (s - 1))) * (mp.mpf(n_frame) ** s))

        best_A = (99.0, None)
        best_B = (99.0, None)
        for n in range(1, nmax + 1):
            w = complex(world_reverse(ch, s, n))
            aA = angle_lines(w, chord_A)
            aB = angle_lines(w, chord_B)
            if aA < best_A[0]:
                best_A = (aA, n)
            if aB < best_B[0]:
                best_B = (aB, n)

        n_exact_B = int(n_frame * int(mp.ceil(T)))
        n_prod_A = n_frame * n_cross
        wB = complex(world_reverse(ch, s, n_exact_B))
        wA = complex(world_reverse(ch, s, n_prod_A))
        rows.append(dict(
            T=float(T),
            n_cross=n_cross,
            j=j,
            best_A=best_A,
            best_B=best_B,
            n_exact_B=n_exact_B,
            ang_exact_B=angle_lines(wB, chord_B),
            ratio_B=abs(wB) / abs(chord_B) if abs(chord_B) else float("nan"),
            n_prod_A=n_prod_A,
            ang_prod_A=angle_lines(wA, chord_A),
            ratio_A=abs(wA) / abs(chord_A) if abs(chord_A) else float("nan"),
        ))
    return rows


def report(m, rows):
    print("=" * 72)
    print("forward link 1 pinned, unit %d < T < %d, sigma = 1/2" % (m, m + 1))
    print("=" * 72)
    print(
        "  T      n'  | best||A  n_A  angA   2n'  ang(2n',A) |"
        " best||B  n_B  angB   2ceilT  ang(2ceilT,B)"
    )
    for r in rows:
        print(
            " %6.3f  %3d  | %6.2e %4d %6.2f  %4d %8.1e |"
            " %6.2e %4d %6.2f   %4d  %8.1e"
            % (
                r["T"], r["n_cross"],
                r["best_A"][0], r["best_A"][1], r["best_A"][0],
                r["n_prod_A"], r["ang_prod_A"],
                r["best_B"][0], r["best_B"][1], r["best_B"][0],
                r["n_exact_B"], r["ang_exact_B"],
            )
        )
    nBs = [r["best_B"][1] for r in rows]
    nAs = [r["best_A"][1] for r in rows]
    print()
    print("chord A = yin/yang of link 1 (reverse link that crosses it)")
    print("chord B = reverse bisector, seen in link 1's frame")
    print("best||A summands over the unit:", sorted(set(nAs)))
    print("best||B summands over the unit:", sorted(set(nBs)))
    print(
        "exact B candidate 2*ceil(T)=%d is constant; max angle %.3e deg; "
        "length ratio vs 1/2: %s"
        % (
            rows[0]["n_exact_B"],
            max(r["ang_exact_B"] for r in rows),
            ", ".join("%.6f" % (2 * r["ratio_B"]) for r in rows[:: max(1, len(rows) // 4)]),
        )
    )
    print(
        "product A candidate 2*n' steps: %s; max angle %.3e deg"
        % (
            sorted(set(r["n_prod_A"] for r in rows)),
            max(r["ang_prod_A"] for r in rows),
        )
    )


def main():
    for m in (6, 12, 17):
        rows = scan_unit(m, n_T=21)
        report(m, rows)
        print()


if __name__ == "__main__":
    main()
