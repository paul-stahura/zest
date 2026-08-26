"""Numba JIT-compiled R-S Z(t) main-sum peak finder, writing TWO output files:

  ~/Downloads/<prefix>_peaks.csv       — every peak (one file, streamed in t-order)
  ~/Downloads/<prefix>_champions.csv   — running-max records (real-time, growing)

No per-chunk file proliferation.
"""
from __future__ import annotations
import argparse, csv, multiprocessing as mp, os, sys, time
from pathlib import Path
import numpy as np
from numba import njit

DT_DEFAULT = 0.005
TWO_PI = 2.0 * np.pi


@njit(cache=True, fastmath=True)
def z_main_sum_numba(ts, theta_vals, log_n, inv_sqrt_n):
    T = ts.shape[0]
    N = log_n.shape[0]
    z = np.zeros(T, dtype=np.float64)
    for ti in range(T):
        s = 0.0
        t_val = ts[ti]
        theta_val = theta_vals[ti]
        for ni in range(N):
            phase = theta_val - t_val * log_n[ni]
            s += np.cos(phase) * inv_sqrt_n[ni]
        z[ti] = 2.0 * s
    return z


@njit(cache=True, fastmath=True)
def theta_t_numba(t):
    out = np.empty_like(t)
    for i in range(t.shape[0]):
        tt = t[i]
        v = 0.5 * tt * np.log(tt / TWO_PI) - 0.5 * tt - np.pi / 8.0
        v += 1.0 / (48.0 * tt)
        v += 7.0 / (5760.0 * tt ** 3)
        v += 31.0 / (80640.0 * tt ** 5)
        out[i] = v
    return out


def process_chunk(args):
    """Returns (t_lo, t_hi, list_of_(t_peak, |z_peak|) tuples)."""
    t_lo, t_hi, dt = args
    t_lo = max(t_lo, 0.5)
    n_samples = int(np.ceil((t_hi - t_lo) / dt)) + 1
    ts = t_lo + np.arange(n_samples) * dt
    N = max(1, int(np.floor(np.sqrt(t_hi / TWO_PI))))
    n_arr = np.arange(1, N + 1, dtype=np.float64)
    log_n = np.log(n_arr)
    inv_sqrt_n = 1.0 / np.sqrt(n_arr)
    theta_vals = theta_t_numba(ts)
    z_vals = z_main_sum_numba(ts, theta_vals, log_n, inv_sqrt_n)
    abs_z = np.abs(z_vals)
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


def _warmup():
    ts = np.array([100.0, 100.005, 100.01])
    log_n = np.log(np.arange(1, 5, dtype=np.float64))
    inv_sqrt_n = 1.0 / np.sqrt(np.arange(1, 5, dtype=np.float64))
    theta_vals = theta_t_numba(ts)
    z_main_sum_numba(ts, theta_vals, log_n, inv_sqrt_n)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tMin", type=float, default=0.5)
    ap.add_argument("--tMax", type=float, default=10000)
    ap.add_argument("--dt", type=float, default=DT_DEFAULT)
    ap.add_argument("--chunk", type=float, default=100.0)
    ap.add_argument("--workers", type=int, default=12)
    ap.add_argument("--prefix", default="zeta_numba")
    ap.add_argument("--startingBest", type=float, default=0.0,
                    help="Seed champion running max (e.g. 43.107 to continue from rank 57)")
    ap.add_argument("--writePeaks", action="store_true",
                    help="Also write every peak to <prefix>_peaks.csv (large; default off)")
    args = ap.parse_args()

    dl = Path.home() / "Downloads"
    peaks_path = dl / f"{args.prefix}_peaks.csv"
    champions_path = dl / f"{args.prefix}_champions.csv"
    if args.writePeaks:
        with open(peaks_path, "w", newline="") as f:
            csv.writer(f).writerow(["t_peak", "zeta_mag"])
    with open(champions_path, "w", newline="") as f:
        csv.writer(f).writerow(["t_champion", "zeta_mag"])

    print(f"warming JIT…", flush=True)
    _warmup()
    print(f"  ready", flush=True)

    chunks = []
    t = max(0.5, args.tMin)
    while t < args.tMax:
        t_hi = min(t + args.chunk, args.tMax)
        chunks.append((t, t_hi, args.dt))
        t = t_hi
    print(f"workers={args.workers}, chunks={len(chunks)} (size {args.chunk} unit-t)")
    print(f"champions: {champions_path}" + (f"\npeaks: {peaks_path}" if args.writePeaks else "\n(peaks NOT written — pass --writePeaks for the full peak list)"))
    print()
    t0 = time.time()
    completed = 0
    total_peaks = 0
    running_max = float(args.startingBest)
    last_print = t0
    fpeaks = open(peaks_path, "a", newline="") if args.writePeaks else None
    wpeaks = csv.writer(fpeaks) if fpeaks else None
    with mp.Pool(args.workers) as pool:
        with open(champions_path, "a", newline="") as fchamp:
            wchamp = csv.writer(fchamp)
            for t_lo, t_hi, peaks in pool.imap(process_chunk, chunks, chunksize=1):
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
                    print(f"  [{completed}/{len(chunks)}] tHi={t_hi:.0f} cumul={total_peaks} max=|ζ|={running_max:.2f} elapsed={elapsed:.0f}s eta={eta:.1f}min", flush=True)
    if fpeaks:
        fpeaks.close()
    elapsed = time.time() - t0
    print(f"\nDone in {elapsed/60:.2f} min ({total_peaks:,} peaks, max |ζ|={running_max:.4f})")


if __name__ == "__main__":
    main()
