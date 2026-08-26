"""Build master champions CSV:
  - under-10M entries from champions_3e8.csv (user's pre-existing reference)
  - 10M-50M entries from our scan (zeta_amx_10M_50M_champions.csv)

Output columns: t, zeta_mag, Z_signed (if known), T_poly, T_log, source.
"""
from __future__ import annotations
import csv, math
from pathlib import Path

TWO_PI = 2.0 * math.pi


def t_to_T_poly(t: float) -> float:
    return (-1.0 + math.sqrt(2.0 * t / math.pi + 1.0 / 3.0)) / 2.0


def t_to_T_log(t: float) -> float:
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


dl = Path.home() / "Downloads"
rows = []  # (t, zeta_mag, z_signed_str, source)

# under-10M entries from champions_3e8.csv
with open(dl / "champions_3e8.csv") as f:
    rdr = csv.DictReader(f)
    for r in rdr:
        t = float(r["t"])
        if t >= 10_000_000:
            continue
        rows.append((t, float(r["zeta_mag"]), r["Z_signed"], "champions_3e8.csv"))

# 10M-50M from our scan
with open(dl / "zeta_amx_10M_50M_champions.csv") as f:
    rdr = csv.reader(f)
    next(rdr, None)
    for row in rdr:
        if not row or len(row) < 2:
            continue
        t = float(row[0])
        rows.append((t, float(row[1]), "", "zeta_amx_10M_50M_champions.csv"))

rows.sort(key=lambda r: r[0])

out = dl / "champions_master.csv"
with open(out, "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["t", "zeta_mag", "Z_signed", "T_poly", "T_log", "source"])
    for t, zmag, zsign, src in rows:
        w.writerow([f"{t:.10f}", f"{zmag:.6f}", zsign,
                    f"{t_to_T_poly(t):.10f}", f"{t_to_T_log(t):.10f}", src])
print(f"wrote {len(rows)} rows -> {out}")
