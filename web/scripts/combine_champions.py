"""Combine champion CSVs from multiple t-ranges into one file, adding T
(spiral index) computed via the inverse of the project i-function.

Two i-functions exist (see src/shared/math/zetaEms.ts indexToImag):
  poly:  t = 2*pi*(T^2 + T + 1/6)        -> closed-form inverse
  log:   t = (2T+1)*pi / (log(T+1)-log(T)) -> numerical inverse (Newton)
Both are written so user can pick.
"""
from __future__ import annotations
import csv, math, sys
from pathlib import Path

TWO_PI = 2.0 * math.pi


def t_to_T_poly(t: float) -> float:
    # t = 2*pi*(T^2 + T + 1/6) ; solve quadratic, take positive root
    # T = (-1 + sqrt(2t/pi + 1/3)) / 2
    return (-1.0 + math.sqrt(2.0 * t / math.pi + 1.0 / 3.0)) / 2.0


def t_to_T_log(t: float) -> float:
    # Newton on f(T) = (2T+1)*pi / (log(T+1) - log(T)) - t
    T = max(1.0, math.sqrt(max(t, 1.0) / TWO_PI))  # leading-order seed
    for _ in range(50):
        d = math.log(T + 1.0) - math.log(T)
        f = (2.0 * T + 1.0) * math.pi / d - t
        # f' = [2*pi*d - (2T+1)*pi*(1/(T+1) - 1/T)] / d^2
        dprime = 1.0 / (T + 1.0) - 1.0 / T
        fprime = (2.0 * math.pi * d - (2.0 * T + 1.0) * math.pi * dprime) / (d * d)
        if fprime == 0.0:
            break
        step = f / fprime
        T -= step
        if abs(step) < 1e-12 * max(1.0, T):
            break
    return T


def main():
    sources = [Path(p).expanduser() for p in sys.argv[1:-1]]
    out = Path(sys.argv[-1]).expanduser()
    rows = []
    for src in sources:
        if not src.exists():
            print(f"skip (missing): {src}")
            continue
        with open(src) as f:
            rdr = csv.reader(f)
            next(rdr, None)  # header
            for row in rdr:
                if not row or len(row) < 2:
                    continue
                t = float(row[0]); z = float(row[1])
                rows.append((t, z, src.name))
    rows.sort(key=lambda r: r[0])
    with open(out, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["t", "zeta_mag", "T_poly", "T_log", "source"])
        for t, z, src in rows:
            w.writerow([f"{t:.10f}", f"{z:.6f}",
                        f"{t_to_T_poly(t):.10f}", f"{t_to_T_log(t):.10f}", src])
    print(f"wrote {len(rows)} rows -> {out}")


if __name__ == "__main__":
    main()
