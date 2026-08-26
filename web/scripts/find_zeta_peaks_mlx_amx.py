"""MLX float64 on CPU (using Apple Accelerate/AMX) for the Z(t) sum.

MLX's float64 CPU path is ~10× faster than numpy for this workload thanks
to Apple's hardware matrix multiply extensions. Pure CPU — no GPU.
"""
from __future__ import annotations
import argparse, csv, multiprocessing as mp, os, resource, sys, threading, time
from pathlib import Path
import numpy as np

DT_DEFAULT = 0.005
TWO_PI = 2.0 * np.pi
WORKER_MEM_CAP_BYTES = 2 * 1024 * 1024 * 1024  # 2 GB per worker
SYSTEM_MEM_ABORT_PERCENT = 75.0                # parent aborts if RAM usage exceeds this
MAX_TASKS_PER_CHILD = 50                       # recycle workers to free MLX-accumulated state


def _worker_init():
    # Guardrail 1: cap each worker's address space so a runaway allocation
    # kills the worker, not the machine.
    try:
        resource.setrlimit(resource.RLIMIT_AS, (WORKER_MEM_CAP_BYTES, WORKER_MEM_CAP_BYTES))
    except (ValueError, OSError):
        pass
    # Guardrail 2: lower scheduling priority so the UI scheduler stays ahead
    # of our compute — keyboard and Ctrl-C remain responsive under load.
    try:
        os.nice(10)
    except OSError:
        pass
    # Guardrail 3: pin BLAS/Accelerate threads to 1 per worker to prevent
    # thread oversubscription across the pool.
    for var in ("VECLIB_MAXIMUM_THREADS", "OMP_NUM_THREADS", "MKL_NUM_THREADS", "OPENBLAS_NUM_THREADS"):
        os.environ.setdefault(var, "1")


def _process_chunk_amx(args):
    import mlx.core as mx
    mx.set_default_device(mx.cpu)
    t_lo, t_hi, dt = args
    t_lo = max(t_lo, 0.5)
    n_samples = int(np.ceil((t_hi - t_lo) / dt)) + 1
    ts_np = t_lo + np.arange(n_samples) * dt
    N = max(1, int(np.floor(np.sqrt(t_hi / TWO_PI))))
    log_n_np = np.log(np.arange(1, N + 1, dtype=np.float64))
    inv_sqrt_n_np = 1.0 / np.sqrt(np.arange(1, N + 1, dtype=np.float64))

    # MLX float64 on CPU (Accelerate / AMX)
    ts = mx.array(ts_np, dtype=mx.float64)
    log_n = mx.array(log_n_np, dtype=mx.float64)
    inv_sqrt_n = mx.array(inv_sqrt_n_np, dtype=mx.float64)
    theta = (0.5 * ts) * mx.log(ts / TWO_PI) - 0.5 * ts - np.pi / 8.0
    theta = theta + 1.0 / (48.0 * ts) + 7.0 / (5760.0 * ts ** 3)
    # Build phase matrix and sum.
    # CRITICAL: MLX's vectorized cos loses accuracy on huge arguments because
    # its CPU SIMD path doesn't do proper range reduction. We pre-reduce
    # phases into [-pi, pi] in float64 before calling mx.cos. Without this,
    # |Z| at t ~ 10^7 comes back wildly wrong (off by 10000x).
    phases = theta[:, None] - ts[:, None] * log_n[None, :]
    two_pi_mx = mx.array(TWO_PI, dtype=mx.float64)
    phases = phases - two_pi_mx * mx.round(phases / two_pi_mx)
    z = 2.0 * (mx.cos(phases) * inv_sqrt_n[None, :]).sum(axis=1)
    mx.eval(z)
    z_arr = np.asarray(z, dtype=np.float64)

    abs_z = np.abs(z_arr)
    peaks_idx = np.where((abs_z[1:-1] > abs_z[:-2]) & (abs_z[1:-1] > abs_z[2:]))[0] + 1
    peaks = []
    for i in peaks_idx:
        v0, v1, v2 = abs_z[i - 1], abs_z[i], abs_z[i + 1]
        denom = v0 - 2.0 * v1 + v2
        if denom < 0:
            delta = dt * (v0 - v2) / (2.0 * denom)
            if abs(delta) <= dt:
                v_max = v1 - (v0 - v2) ** 2 / (8.0 * denom)
                peaks.append((float(ts_np[i] + delta), float(v_max)))
                continue
        peaks.append((float(ts_np[i]), float(v1)))
    return (t_lo, t_hi, peaks)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tMin", type=float, default=0.5)
    ap.add_argument("--tMax", type=float, default=10000)
    ap.add_argument("--dt", type=float, default=DT_DEFAULT)
    ap.add_argument("--chunk", type=float, default=25.0)
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--prefix", default="zeta_amx")
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
    print(f"workers={args.workers}, chunks={len(chunks)} (MLX float64 CPU via Accelerate/AMX)")
    t0 = time.time()
    completed = 0; total_peaks = 0
    running_max = float(args.startingBest)
    last_print = t0
    fpeaks = open(peaks_path, "a", newline="") if args.writePeaks else None
    wpeaks = csv.writer(fpeaks) if fpeaks else None

    # Guardrail 4: parent-side watchdog — if aggregate system memory crosses
    # the abort threshold, terminate the pool before the OS starts swapping.
    abort_flag = {"tripped": False}
    pool_ref = {"pool": None}
    def _watchdog():
        try:
            import psutil
        except ImportError:
            print("  [watchdog] psutil not installed — system-memory guardrail disabled", flush=True)
            return
        while not abort_flag["tripped"] and pool_ref["pool"] is not None:
            pct = psutil.virtual_memory().percent
            if pct >= SYSTEM_MEM_ABORT_PERCENT:
                abort_flag["tripped"] = True
                print(f"\n  [watchdog] ABORT — system memory at {pct:.0f}% (threshold {SYSTEM_MEM_ABORT_PERCENT:.0f}%). Terminating pool.", flush=True)
                try:
                    pool_ref["pool"].terminate()
                except Exception:
                    pass
                # Give the main loop a moment to notice; then force-exit so the
                # parent doesn't hang on a stuck imap iterator.
                time.sleep(2.0)
                print(f"  [watchdog] force-exiting parent (partial results in {champs_path.name})", flush=True)
                os._exit(2)
            time.sleep(1.0)

    with mp.Pool(args.workers, initializer=_worker_init, maxtasksperchild=MAX_TASKS_PER_CHILD) as pool:
        pool_ref["pool"] = pool
        threading.Thread(target=_watchdog, daemon=True).start()
        with open(champs_path, "a", newline="") as fchamp:
            wchamp = csv.writer(fchamp)
            for t_lo, t_hi, peaks in pool.imap(_process_chunk_amx, chunks, chunksize=1):
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
                    print(f"  [{completed}/{len(chunks)}] tHi={t_hi:.0f} cumul={total_peaks} elapsed={elapsed:.3f}s eta={eta:.2f}min", flush=True)
    if fpeaks: fpeaks.close()
    elapsed = time.time() - t0
    print(f"\nDone in {elapsed:.3f}s ({total_peaks:,} peaks)")


if __name__ == "__main__":
    main()
