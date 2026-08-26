"""Refine each champion in a CSV by searching for the true local |Z(t)| max
nearby via mpmath, then write a *_refined.csv next to the input."""
from __future__ import annotations
import csv, sys, time
from pathlib import Path
import mpmath


def refine(t_seed: float, half_window: float = 0.3, coarse: float = 0.005, fine: float = 1e-5):
    mpmath.mp.dps = 25
    t_seed_mp = mpmath.mpf(repr(t_seed))
    # Coarse pass: scan ±half_window at step `coarse`
    best_t, best_z = t_seed_mp, mpmath.mpf(0)
    k = 0
    while True:
        t = t_seed_mp + mpmath.mpf(k) * mpmath.mpf(repr(coarse))
        if t > t_seed_mp + mpmath.mpf(repr(half_window)):
            break
        for sign in (1, -1) if k != 0 else (1,):
            tt = t_seed_mp + mpmath.mpf(sign * k) * mpmath.mpf(repr(coarse))
            z = abs(mpmath.zeta(mpmath.mpc('0.5', tt)))
            if z > best_z:
                best_z, best_t = z, tt
        k += 1
    # Fine pass: golden-section-ish refinement around best_t via small grid
    coarse_mp = mpmath.mpf(repr(coarse))
    fine_mp = mpmath.mpf(repr(fine))
    lo = best_t - coarse_mp
    hi = best_t + coarse_mp
    steps = int(float((hi - lo) / fine_mp))
    for i in range(steps + 1):
        t = lo + mpmath.mpf(i) * fine_mp
        z = abs(mpmath.zeta(mpmath.mpc('0.5', t)))
        if z > best_z:
            best_z, best_t = z, t
    return float(best_t), float(best_z)


def main():
    src = Path(sys.argv[1])
    dst = src.with_name(src.stem + "_refined.csv")
    rows = list(csv.reader(open(src)))
    header, data = rows[0], rows[1:]
    print(f"refining {len(data)} champions from {src.name}")
    t0 = time.time()
    out_rows = [["t_script", "zeta_script", "t_refined", "zeta_refined", "delta_t", "delta_zeta"]]
    with open(dst, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(out_rows[0])
        f.flush()
        for i, (t_str, z_str) in enumerate(data, 1):
            t_s = float(t_str); z_s = float(z_str)
            t_r, z_r = refine(t_s)
            row = [f"{t_s:.10f}", f"{z_s:.6f}", f"{t_r:.10f}", f"{z_r:.6f}",
                   f"{t_r - t_s:+.6f}", f"{z_r - z_s:+.4f}"]
            w.writerow(row); f.flush()
            print(f"  [{i}/{len(data)}] t={t_s:.4f}  script={z_s:.3f}  true={z_r:.3f}  "
                  f"dt={t_r-t_s:+.4f}  dz={z_r-z_s:+.3f}  ({time.time()-t0:.0f}s)",
                  flush=True)
    print(f"\nwrote {dst}")


if __name__ == "__main__":
    main()
