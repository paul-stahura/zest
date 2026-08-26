"""Faster: avoid the materialized (T,N) phase matrix entirely. Within a
single chunk N is essentially constant (varies by ≤ 1 across the chunk),
so we drop masking and loop over n in a cache-friendly inner loop.

Z(t) = 2 · Σ_{n=1}^{N} cos(θ(t) − t·log(n)) / √n      (NO remainder)
"""
from __future__ import annotations
import argparse, csv, multiprocessing as mp, os, sys, time
from pathlib import Path
import numpy as np

DT_DEFAULT = 0.005
TWO_PI = 2.0 * np.pi


def theta_t(t):
    out = (0.5 * t) * np.log(t / TWO_PI) - 0.5 * t - np.pi / 8.0
    out += 1.0 / (48.0 * t)
    out += 7.0 / (5760.0 * t ** 3)
    out += 31.0 / (80640.0 * t ** 5)
    return out


def z_main_sum_v2(ts, log_n, inv_sqrt_n):
    """Cache-friendly: loop over n, accumulate cos terms in-place."""
    theta = theta_t(ts)
    z = np.zeros_like(ts)
    # Precompute t * (some accumulator) — but we'll just loop.
    for ni in range(log_n.shape[0]):
        # phases for all t: theta - ts * log_n[ni]
        phases = theta - ts * log_n[ni]
        z += np.cos(phases) * inv_sqrt_n[ni]
    z *= 2.0
    return z


def process_chunk(args):
    t_lo, t_hi, dt, prefix, idx = args
    dl = Path.home() / "Downloads"
    out = dl / f"{prefix}_chunk{idx:07d}.csv"
    t_lo = max(t_lo, 0.5)
    n_samples = int(np.ceil((t_hi - t_lo) / dt)) + 1
    ts = t_lo + np.arange(n_samples) * dt
    # N for this chunk (use t_hi to be safe; varies by ≤1 across chunk)
    N = int(np.floor(np.sqrt(t_hi / TWO_PI)))
    if N < 1:
        N = 1
    n_arr = np.arange(1, N + 1, dtype=np.float64)
    log_n = np.log(n_arr)
    inv_sqrt_n = 1.0 / np.sqrt(n_arr)
    # Compute Z
    z_vals = z_main_sum_v2(ts, log_n, inv_sqrt_n)
    abs_z = np.abs(z_vals)
    peaks_idx = np.where((abs_z[1:-1] > abs_z[:-2]) & (abs_z[1:-1] > abs_z[2:]))[0] + 1
    # Parabolic refinement
    refined_t = []
    refined_v = []
    for i in peaks_idx:
        v0, v1, v2 = abs_z[i - 1], abs_z[i], abs_z[i + 1]
        denom = v0 - 2.0 * v1 + v2
        if denom < 0:
            delta = dt * (v0 - v2) / (2.0 * denom)
            if abs(delta) <= dt:
                v_max = v1 - (v0 - v2) ** 2 / (8.0 * denom)
                refined_t.append(float(ts[i] + delta))
                refined_v.append(float(v_max))
                continue
        refined_t.append(float(ts[i]))
        refined_v.append(float(v1))
    with open(out, "w", newline="") as f:
        w = csv.writer(f); w.writerow(["t_peak", "zeta_mag"])
        for t, v in zip(refined_t, refined_v):
            w.writerow([f"{t:.10f}", f"{v:.10f}"])
    return (t_lo, t_hi, len(refined_t), out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tMin", type=float, default=0.5)
    ap.add_argument("--tMax", type=float, default=10000)
    ap.add_argument("--dt", type=float, default=DT_DEFAULT)
    ap.add_argument("--chunk", type=float, default=100.0)
    ap.add_argument("--workers", type=int, default=min(8, os.cpu_count() or 4))
    ap.add_argument("--prefix", default="zeta_local_fast_v2")
    args = ap.parse_args()

    chunks = []
    t = max(0.5, args.tMin); idx = 0
    while t < args.tMax:
        t_hi = min(t + args.chunk, args.tMax)
        chunks.append((t, t_hi, args.dt, args.prefix, idx))
        t = t_hi; idx += 1
    print(f"workers={args.workers}, chunks={len(chunks)} (size {args.chunk} unit-t), dt={args.dt}")
    t0 = time.time()
    completed = 0; total_peaks = 0
    with mp.Pool(args.workers) as pool:
        for t_lo, t_hi, n_peaks, path in pool.imap_unordered(process_chunk, chunks, chunksize=1):
            completed += 1; total_peaks += n_peaks
            if completed % 200 == 0 or completed == len(chunks):
                elapsed = time.time() - t0
                rate = completed / elapsed
                eta = (len(chunks) - completed) / rate / 60 if rate > 0 else 0
                print(f"  [{completed}/{len(chunks)}] tHi={t_hi:.0f} cumul={total_peaks} elapsed={elapsed:.0f}s eta={eta:.1f}min", flush=True)
    elapsed = time.time() - t0
    print(f"\nDone in {elapsed/60:.2f} min ({total_peaks:,} peaks total)")


if __name__ == "__main__":
    main()
