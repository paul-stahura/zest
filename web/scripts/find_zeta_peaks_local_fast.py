"""Fast local |ζ(½+it)| peak finder using numpy float64.

Z(t) = 2 · Σ_{n=1}^{N} cos(θ(t) − t·log(n)) / √n      (NO remainder)
where  N = floor(√(t/(2π)))
and θ(t) = (t/2)·log(t/(2π)) − t/2 − π/8 + 1/(48t) + 7/(5760·t³) + …

NB the approximation drops the Riemann-Siegel R(t) remainder. Error ≈ O(t^{-1/4}).
For peak FINDING (not exact values), this should still locate the local maxima
accurately.

Kill-safe streaming output of peaks to per-chunk CSV.
"""
from __future__ import annotations
import argparse, csv, multiprocessing as mp, os, sys, time
from pathlib import Path
import numpy as np

DT_DEFAULT = 0.005
TWO_PI = 2.0 * np.pi


def theta_t(t: np.ndarray) -> np.ndarray:
    """Riemann-Siegel θ(t) asymptotic.
    θ(t) ≈ (t/2)·log(t/(2π)) − t/2 − π/8 + 1/(48t) + 7/(5760·t³) + 31/(80640·t⁵)
    For t ≥ 100 this is accurate to many digits."""
    tt = t
    out = (0.5 * tt) * np.log(tt / TWO_PI) - 0.5 * tt - np.pi / 8.0
    out += 1.0 / (48.0 * tt)
    out += 7.0 / (5760.0 * tt ** 3)
    out += 31.0 / (80640.0 * tt ** 5)
    return out


def z_main_sum(ts: np.ndarray, log_n: np.ndarray, inv_sqrt_n: np.ndarray) -> np.ndarray:
    """Compute Z(t) = 2 · Σ_{n=1..N(t)} cos(θ(t) − t·log(n)) / √n for vector ts.

    Vectorized: ts has shape (T,), log_n has shape (N_max,).
    Returns Z values of shape (T,).
    Masks out terms where n > floor(√(t/2π))."""
    theta = theta_t(ts)  # (T,)
    # Compute upper bound N(t) for each t
    N_per_t = np.floor(np.sqrt(ts / TWO_PI)).astype(np.int64)  # (T,)
    # Build phase matrix: (T, N_max) of (theta_t − t · log(n))
    # Use broadcasting: ts[:, None] * log_n[None, :]
    phases = theta[:, None] - ts[:, None] * log_n[None, :]  # (T, N_max)
    cos_vals = np.cos(phases)  # (T, N_max)
    # Weight each by 1/√n
    weighted = cos_vals * inv_sqrt_n[None, :]  # (T, N_max)
    # Mask: include n where n <= N(t), i.e. column index < N_per_t[t]
    col_idx = np.arange(log_n.shape[0])
    mask = col_idx[None, :] < N_per_t[:, None]
    z = 2.0 * np.where(mask, weighted, 0.0).sum(axis=1)
    return z


def process_chunk(args):
    """Compute Z(t) on the grid t ∈ [t_lo, t_hi] step dt; find local maxima."""
    t_lo, t_hi, dt, prefix, idx = args
    dl = Path.home() / "Downloads"
    out = dl / f"{prefix}_chunk{idx:07d}.csv"
    t_lo = max(t_lo, 0.5)
    n = int(np.ceil((t_hi - t_lo) / dt)) + 1
    ts = t_lo + np.arange(n) * dt
    # N_max for this t-range: based on largest t
    N_max = int(np.floor(np.sqrt(t_hi / TWO_PI))) + 1
    n_arr = np.arange(1, N_max + 1)
    log_n = np.log(n_arr).astype(np.float64)
    inv_sqrt_n = (1.0 / np.sqrt(n_arr)).astype(np.float64)
    # Compute Z in batches to manage memory
    batch_size = max(64, min(50000, 200_000_000 // max(N_max, 1)))
    z_vals = np.empty(n, dtype=np.float64)
    for i in range(0, n, batch_size):
        j = min(i + batch_size, n)
        z_vals[i:j] = z_main_sum(ts[i:j], log_n, inv_sqrt_n)
    abs_z = np.abs(z_vals)
    # Local maxima of |Z|: abs_z[i-1] < abs_z[i] > abs_z[i+1]
    peaks_idx = np.where((abs_z[1:-1] > abs_z[:-2]) & (abs_z[1:-1] > abs_z[2:]))[0] + 1
    # Parabolic refinement (numerically safe: use h offset coords)
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
    ap.add_argument("--prefix", default="zeta_local_fast")
    args = ap.parse_args()

    chunks = []
    t = max(0.5, args.tMin)
    idx = 0
    while t < args.tMax:
        t_hi = min(t + args.chunk, args.tMax)
        chunks.append((t, t_hi, args.dt, args.prefix, idx))
        t = t_hi
        idx += 1
    print(f"Workers={args.workers}, chunks={len(chunks)} ({args.chunk} unit-t each), dt={args.dt}")
    t0 = time.time()
    completed = 0
    total_peaks = 0
    with mp.Pool(args.workers) as pool:
        for t_lo, t_hi, n_peaks, path in pool.imap_unordered(process_chunk, chunks, chunksize=1):
            completed += 1
            total_peaks += n_peaks
            elapsed = time.time() - t0
            rate = completed / elapsed
            eta = (len(chunks) - completed) / rate / 60 if rate > 0 else 0
            if completed % 10 == 0 or completed == len(chunks):
                print(f"  [{completed}/{len(chunks)}] tHi={t_hi:.0f} peaks={n_peaks} cumul={total_peaks} elapsed={elapsed:.0f}s eta={eta:.1f}min", flush=True)
    elapsed = time.time() - t0
    print(f"\nDone in {elapsed/60:.1f} min ({total_peaks:,} peaks total)")


if __name__ == "__main__":
    main()
