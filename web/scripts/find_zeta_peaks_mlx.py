"""MLX GPU version of the Z(t) peak finder.

Strategy: precompute the phase matrix `(theta − ts·log_n) mod 2π` in float64
on CPU (numpy), cast to float32, then move to GPU for the cos + weighted sum.

The CPU phase computation is unavoidable because float32 can't represent
`t·log(n)` precisely at our t (ulp ~1.4 radians at t=4M). Once we've reduced
modulo 2π in float64, the float32 cast loses no meaningful precision.

Speedup vs numpy: GPU's vectorized cos and sum-reduce are faster than numpy's
serialized inner loops.
"""
from __future__ import annotations
import argparse, csv, multiprocessing as mp, os, sys, time
from pathlib import Path
import numpy as np
import mlx.core as mx

DT_DEFAULT = 0.005
TWO_PI = 2.0 * np.pi


def theta_t(t):
    out = (0.5 * t) * np.log(t / TWO_PI) - 0.5 * t - np.pi / 8.0
    out += 1.0 / (48.0 * t)
    out += 7.0 / (5760.0 * t ** 3)
    out += 31.0 / (80640.0 * t ** 5)
    return out


def z_main_sum_mlx(ts_np, log_n_np, inv_sqrt_n_np):
    """ts: (T,) numpy float64.  log_n: (N,) numpy float64.
    Returns Z(t) of shape (T,) as a numpy float64 array."""
    theta = theta_t(ts_np)
    # Phase matrix in float64 (CPU); reduce mod 2π.
    # phases[t,n] = theta[t] - ts[t] * log_n[n]
    phases64 = theta[:, None] - ts_np[:, None] * log_n_np[None, :]
    # Wrap to [-π, π) so float32 cast is precision-safe.
    phases64 = np.remainder(phases64 + np.pi, TWO_PI) - np.pi
    # Cast to float32 and send to GPU
    phases32 = mx.array(phases64.astype(np.float32))
    inv_sqrt_n32 = mx.array(inv_sqrt_n_np.astype(np.float32))
    cos_vals = mx.cos(phases32)
    weighted = cos_vals * inv_sqrt_n32[None, :]
    z = 2.0 * weighted.sum(axis=1)
    # Force eval, transfer back to numpy
    mx.eval(z)
    return np.asarray(z, dtype=np.float64)


def process_chunk(args):
    t_lo, t_hi, dt, prefix, idx = args
    dl = Path.home() / "Downloads"
    out = dl / f"{prefix}_chunk{idx:07d}.csv"
    t_lo = max(t_lo, 0.5)
    n_samples = int(np.ceil((t_hi - t_lo) / dt)) + 1
    ts = t_lo + np.arange(n_samples) * dt
    N = max(1, int(np.floor(np.sqrt(t_hi / TWO_PI))))
    n_arr = np.arange(1, N + 1, dtype=np.float64)
    log_n = np.log(n_arr)
    inv_sqrt_n = 1.0 / np.sqrt(n_arr)
    z_vals = z_main_sum_mlx(ts, log_n, inv_sqrt_n)
    abs_z = np.abs(z_vals)
    peaks_idx = np.where((abs_z[1:-1] > abs_z[:-2]) & (abs_z[1:-1] > abs_z[2:]))[0] + 1
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
    ap.add_argument("--prefix", default="zeta_mlx")
    args = ap.parse_args()
    # GPU code: a single process is fine (GPU is the shared resource).
    chunks = []
    t = max(0.5, args.tMin); idx = 0
    while t < args.tMax:
        t_hi = min(t + args.chunk, args.tMax)
        chunks.append((t, t_hi, args.dt, args.prefix, idx))
        t = t_hi; idx += 1
    print(f"GPU sequential, chunks={len(chunks)} (size {args.chunk} unit-t)")
    t0 = time.time()
    total_peaks = 0
    for ci, c in enumerate(chunks, 1):
        _, _, n_peaks, _ = process_chunk(c)
        total_peaks += n_peaks
        if ci % 500 == 0 or ci == len(chunks):
            elapsed = time.time() - t0
            rate = ci / elapsed
            eta = (len(chunks) - ci) / rate / 60 if rate > 0 else 0
            print(f"  [{ci}/{len(chunks)}] tHi={c[1]:.0f} cumul={total_peaks} elapsed={elapsed:.0f}s eta={eta:.1f}min", flush=True)
    elapsed = time.time() - t0
    print(f"\nDone in {elapsed/60:.2f} min ({total_peaks:,} peaks)")


if __name__ == "__main__":
    main()
