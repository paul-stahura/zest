"""Find "champion t-values" — t-values at which max_{0 ≤ x ≤ t} |ζ(½+ix)|
sets a new record. Uses mpmath for ζ on the critical line.

Strategy:
  Per t-chunk (handled by 1 worker), sample |ζ(½+it)| at fine spacing dt,
  identify local maxima (peaks), refine each peak with brent minimization,
  stream all peaks to a per-chunk CSV.

After all chunks done (or whenever you kill it), a separate merge step:
  - Concatenate all per-chunk CSVs
  - Sort peaks by t
  - Walk the sorted list, recording any peak whose value > all previous
    → those are the running-max records ("champions")

Kill-safe: each peak streams to disk as it's found. Stopping the script
mid-run loses only the in-flight chunk's tail.

Usage:
  python3 scripts/find_zeta_champions.py --tMax 100000 --workers 8
"""
from __future__ import annotations

import argparse, csv, multiprocessing as mp, os, sys, time
from pathlib import Path

import numpy as np
from mpmath import mp as mpctx, mpc, zeta
from scipy.optimize import minimize_scalar

DT_GRID = 0.005      # sample spacing
CHUNK_SIZE = 50      # unit-t per worker invocation
MP_DPS = 25          # mpmath decimal precision

dl = Path.home() / "Downloads"


def zmag(t: float) -> float:
    """|ζ(½+it)|"""
    return float(abs(zeta(mpc(0.5, float(t)))))


def neg_zmag(t: float) -> float:
    return -zmag(t)


def process_chunk(args):
    """Find local maxima of |ζ(½+it)| in t ∈ (t_lo, t_hi]. Returns list of
    (t_peak, peak_value) sorted by t."""
    t_lo, t_hi, prefix, chunk_idx = args
    mpctx.dps = MP_DPS
    out_path = dl / f"{prefix}_peaks_chunk{chunk_idx:05d}.csv"
    # Sample on a grid, find local maxima (sample > both neighbors).
    ts = np.arange(max(0.5, t_lo), t_hi + DT_GRID * 0.5, DT_GRID)
    n = len(ts)
    vals = np.empty(n)
    for i, t in enumerate(ts):
        vals[i] = zmag(float(t))
    peaks_idx = []
    for i in range(1, n - 1):
        if vals[i] > vals[i - 1] and vals[i] > vals[i + 1]:
            peaks_idx.append(i)
    # Refine each peak by Brent on a small bracket.
    with open(out_path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["t_peak", "zeta_mag"])
        for i in peaks_idx:
            t_lo_b = float(ts[max(0, i - 1)])
            t_hi_b = float(ts[min(n - 1, i + 1)])
            try:
                res = minimize_scalar(
                    neg_zmag,
                    bracket=(t_lo_b, float(ts[i]), t_hi_b),
                    method="brent",
                    options={"xtol": 1e-9},
                )
                t_p = float(res.x)
                v_p = float(-res.fun)
            except Exception:
                t_p = float(ts[i])
                v_p = float(vals[i])
            w.writerow([f"{t_p:.10f}", f"{v_p:.10f}"])
            f.flush()
    return out_path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tMin", type=float, default=0.5)
    ap.add_argument("--tMax", type=float, default=100000)
    ap.add_argument("--workers", type=int, default=min(8, os.cpu_count() or 4))
    ap.add_argument("--prefix", default="zeta_champions")
    args = ap.parse_args()

    print(f"Champion-t search: t ∈ ({args.tMin}, {args.tMax}], dt={DT_GRID}, workers={args.workers}")
    chunks = []
    t = args.tMin
    idx = 0
    while t < args.tMax:
        t_hi = min(t + CHUNK_SIZE, args.tMax)
        chunks.append((t, t_hi, args.prefix, idx))
        t = t_hi
        idx += 1
    print(f"Chunks: {len(chunks)} of size ≤ {CHUNK_SIZE}")

    progress_path = dl / f"{args.prefix}_progress.csv"
    with open(progress_path, "w", newline="") as f:
        w = csv.writer(f); w.writerow(["chunk_idx", "t_lo", "t_hi", "peaks_found", "elapsed_s", "chunks_done"])

    t_start = time.time()
    done = 0
    with mp.Pool(args.workers) as pool:
        for out_path in pool.imap_unordered(process_chunk, chunks, chunksize=1):
            done += 1
            n_peaks = sum(1 for _ in open(out_path)) - 1
            elapsed = time.time() - t_start
            print(f"  [{done}/{len(chunks)}] {out_path.name} peaks={n_peaks} elapsed={elapsed:.0f}s", flush=True)
            with open(progress_path, "a", newline="") as f:
                w = csv.writer(f)
                w.writerow([out_path.name, "", "", n_peaks, f"{elapsed:.1f}", done])
    elapsed = time.time() - t_start
    print(f"\nDone in {elapsed/60:.1f} min. Run merge step now.")


if __name__ == "__main__":
    main()
