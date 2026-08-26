"""MLX GPU version v2: each multiprocessing worker uses MLX GPU for cos + sum.

CPU does the precise float64 phase reduction (mandatory at our t scale —
float32 can't represent t·log(n) precisely enough), then GPU does the
batched float32 cos and weighted sum.

To use the GPU effectively with multiprocessing, each worker process gets
its own MLX context (MLX uses the same GPU but parallelism comes from CPU
phase computation).
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


def _process_chunk_mlx(args):
    # MLX imported inside worker so each process has independent state.
    import mlx.core as mx
    t_lo, t_hi, dt = args
    t_lo = max(t_lo, 0.5)
    n_samples = int(np.ceil((t_hi - t_lo) / dt)) + 1
    ts = t_lo + np.arange(n_samples) * dt
    N = max(1, int(np.floor(np.sqrt(t_hi / TWO_PI))))
    n_arr = np.arange(1, N + 1, dtype=np.float64)
    log_n = np.log(n_arr)
    inv_sqrt_n = 1.0 / np.sqrt(n_arr)

    # CPU: precise phase matrix in float64, then reduce mod 2π for safe cast.
    theta = theta_t(ts)
    # Build phase matrix one-shot (vectorized).
    phases64 = theta[:, None] - ts[:, None] * log_n[None, :]
    # Reduce mod 2π to [-π, π) so float32 cast preserves precision.
    phases64 = np.remainder(phases64 + np.pi, TWO_PI) - np.pi
    phases32 = phases64.astype(np.float32)
    inv_sqrt_n32 = inv_sqrt_n.astype(np.float32)

    # GPU: cos + weighted sum.
    p_gpu = mx.array(phases32)
    w_gpu = mx.array(inv_sqrt_n32)
    z_gpu = 2.0 * (mx.cos(p_gpu) * w_gpu[None, :]).sum(axis=1)
    mx.eval(z_gpu)
    z = np.asarray(z_gpu, dtype=np.float64)

    abs_z = np.abs(z)
    peaks_idx = np.where((abs_z[1:-1] > abs_z[:-2]) & (abs_z[1:-1] > abs_z[2:]))[0] + 1
    peaks = []
    for i in peaks_idx:
        v0, v1, v2 = abs_z[i - 1], abs_z[i], abs_z[i + 1]
        denom = v0 - 2.0 * v1 + v2
        if denom < 0:
            delta = dt * (v0 - v2) / (2.0 * denom)
            if abs(delta) <= dt:
                v_max = v1 - (v0 - v2) ** 2 / (8.0 * denom)
                peaks.append((float(ts[i] + delta), float(v_max)))
                continue
        peaks.append((float(ts[i]), float(v1)))
    return (t_lo, t_hi, peaks)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tMin", type=float, default=0.5)
    ap.add_argument("--tMax", type=float, default=10000)
    ap.add_argument("--dt", type=float, default=DT_DEFAULT)
    ap.add_argument("--chunk", type=float, default=100.0)
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--prefix", default="zeta_mlx")
    ap.add_argument("--startingBest", type=float, default=0.0)
    ap.add_argument("--writePeaks", action="store_true")
    args = ap.parse_args()

    dl = Path.home() / "Downloads"
    peaks_path = dl / f"{args.prefix}_peaks.csv"
    champs_path = dl / f"{args.prefix}_champions.csv"
    if args.writePeaks:
        with open(peaks_path, "w", newline="") as f:
            csv.writer(f).writerow(["t_peak", "zeta_mag"])
    with open(champs_path, "w", newline="") as f:
        csv.writer(f).writerow(["t_champion", "zeta_mag"])

    chunks = []
    t = max(0.5, args.tMin)
    while t < args.tMax:
        t_hi = min(t + args.chunk, args.tMax)
        chunks.append((t, t_hi, args.dt))
        t = t_hi
    print(f"workers={args.workers}, chunks={len(chunks)} (size {args.chunk}), GPU per worker (MLX)")
    t0 = time.time()
    completed = 0
    total_peaks = 0
    running_max = float(args.startingBest)
    last_print = t0
    fpeaks = open(peaks_path, "a", newline="") if args.writePeaks else None
    wpeaks = csv.writer(fpeaks) if fpeaks else None
    with mp.Pool(args.workers) as pool:
        with open(champs_path, "a", newline="") as fchamp:
            wchamp = csv.writer(fchamp)
            for t_lo, t_hi, peaks in pool.imap(_process_chunk_mlx, chunks, chunksize=1):
                for t_peak, v_peak in peaks:
                    if wpeaks:
                        wpeaks.writerow([f"{t_peak:.10f}", f"{v_peak:.10f}"])
                    if v_peak > running_max:
                        running_max = v_peak
                        wchamp.writerow([f"{t_peak:.10f}", f"{v_peak:.10f}"])
                        fchamp.flush()
                        print(f"    CHAMPION  t={t_peak:>14.6f}  |ζ|={v_peak:>10.4f}", flush=True)
                total_peaks += len(peaks)
                completed += 1
                if time.time() - last_print > 5.0 or completed == len(chunks):
                    last_print = time.time()
                    elapsed = last_print - t0
                    rate = completed / elapsed
                    eta = (len(chunks) - completed) / rate / 60 if rate > 0 else 0
                    print(f"  [{completed}/{len(chunks)}] tHi={t_hi:.0f} cumul={total_peaks} elapsed={elapsed:.0f}s eta={eta:.1f}min", flush=True)
    if fpeaks:
        fpeaks.close()
    elapsed = time.time() - t0
    print(f"\nDone in {elapsed:.0f}s ({total_peaks:,} peaks)")


if __name__ == "__main__":
    main()
