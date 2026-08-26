"""Add T column (inverse i-function) to champions_3e8.txt."""
from __future__ import annotations
import csv, math
from pathlib import Path

TWO_PI = 2.0 * math.pi


def t_to_T(t: float) -> float:
    """Inverse of indexToImag (non-poly form, src/shared/math/zetaEms.ts):
        t = (2T+1)*pi / (log(T+1) - log(T))
    Solved numerically via Newton's method.
    """
    T = max(1.0, math.sqrt(max(t, 1.0) / TWO_PI))  # leading-order seed
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


src = Path.home() / "Downloads" / "champions_3e8.txt"
dst = Path.home() / "Downloads" / "champions_3e8_with_T.csv"
out = [["n", "t", "log_t_over_sqrt_n", "Z", "T"]]
for line in open(src):
    line = line.strip()
    if not line or line.startswith("#"):
        continue
    parts = line.split()
    n = int(parts[0]); t = float(parts[1]); ratio = float(parts[2]); z = float(parts[3])
    out.append([n, f"{t:.10f}", f"{ratio:.10f}", f"{z:.10f}", f"{t_to_T(t):.10f}"])
with open(dst, "w", newline="") as f:
    csv.writer(f).writerows(out)
print(f"wrote {len(out)-1} rows -> {dst}")
