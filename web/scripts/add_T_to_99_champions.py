"""Add T column to 99_champions.csv via inverse i-function."""
from __future__ import annotations
import csv, math
from pathlib import Path

TWO_PI = 2.0 * math.pi


def t_to_T(t: float) -> float:
    T = max(1.0, math.sqrt(max(t, 1.0) / TWO_PI))
    for _ in range(50):
        d = math.log(T + 1.0) - math.log(T)
        f = (2.0 * T + 1.0) * math.pi / d - t
        dprime = 1.0 / (T + 1.0) - 1.0 / T
        fprime = (2.0 * math.pi * d - (2.0 * T + 1.0) * math.pi * dprime) / (d * d)
        if fprime == 0.0:
            break
        step = f / fprime
        T -= step
        if abs(step) < 1e-12 * max(1.0, T):
            break
    return T


src = Path.home() / "Downloads" / "99_champions.csv"
dst = Path.home() / "Downloads" / "99_champions_with_T.csv"
with open(src) as f:
    rows = list(csv.reader(f))
header = rows[0] + ["T"]
out_rows = [header]
for row in rows[1:]:
    if not row:
        continue
    t = float(row[1])
    out_rows.append(row + [f"{t_to_T(t):.15f}"])
with open(dst, "w", newline="") as f:
    csv.writer(f).writerows(out_rows)
print(f"wrote {len(out_rows)-1} rows -> {dst}")
