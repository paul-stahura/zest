"""Zero-to-zero stretches of N_* rescaled so the slope is 1 at both corners.

y = N_*(t) - N_*(gamma_k) runs 0 -> 1 as before. The x-coordinate uses a
per-gap monotone cubic Hermite map x(u), u = (t-gamma_k)/gap, with endpoint
derivatives s = gap * theta'(gamma)/pi, so that dy/dx = 1 exactly at (0,0)
and (1,1). Since s < 3 for every gap here, the cubic is monotone.
"""
import math
import shutil

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from mpmath import mp

mp.dps = 20


def I_of(T):
    return math.pi * (2 * T + 1) / math.log(1 / T + 1)


def T_of(tv):
    lo, hi = 5.5, 7.5
    for _ in range(60):
        mid = 0.5 * (lo + hi)
        if I_of(mid) < tv:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)


t_lo, t_hi = I_of(6.0), I_of(7.0)

STEP = 0.005
t = np.arange(t_lo - 1.0, t_hi + 1.0, STEP)
Z = np.array([float(mp.siegelz(x)) for x in t])
thp = 0.5 * np.log(t / (2 * math.pi))
Zp = np.gradient(Z, t)
Nstar = np.unwrap(np.angle(Z - 1j * Zp / thp)) / math.pi + 1.5

zeros = []
for i in range(len(t) - 1):
    if Z[i] * Z[i + 1] < 0:
        r = float(mp.findroot(mp.siegelz, (t[i] + t[i + 1]) / 2))
        zeros.append(r)
zeros = [g for g in zeros if t_lo <= g <= t_hi]
print(f"zeros: {len(zeros)}, intervals: {len(zeros) - 1}")

cmap = plt.cm.viridis
fig, ax = plt.subplots(figsize=(8.2, 7.5))
ax.plot([0, 1], [0, 1], color="0.75", lw=1.0, zorder=1)
smax = 0.0
for k in range(len(zeros) - 1):
    a, b = zeros[k], zeros[k + 1]
    gap = b - a
    s0 = gap * 0.5 * math.log(a / (2 * math.pi)) / math.pi
    s1 = gap * 0.5 * math.log(b / (2 * math.pi)) / math.pi
    smax = max(smax, s0, s1)
    sel = (t >= a) & (t <= b)
    ts = np.concatenate([[a], t[sel], [b]])
    ys = np.interp(ts, t, Nstar)
    ys -= ys[0]
    u = (ts - a) / gap
    # Hermite basis: x(0)=0, x(1)=1, x'(0)=s0, x'(1)=s1
    xs = (u**2 * (3 - 2 * u)
          + s0 * (u**3 - 2 * u**2 + u)
          + s1 * (u**3 - u**2))
    Tmid = T_of(0.5 * (a + b))
    ax.plot(xs, ys, color=cmap(Tmid - 6.0), lw=0.9, alpha=0.75, zorder=3)
print(f"max endpoint derivative s = {smax:.3f} (monotone iff < 3)")

ax.plot([0], [0], "o", ms=7, color="#d62728", zorder=5)
ax.plot([1], [1], "o", ms=7, color="#d62728", zorder=5)
sm = plt.cm.ScalarMappable(cmap=cmap, norm=plt.Normalize(6.0, 7.0))
cbar = fig.colorbar(sm, ax=ax, fraction=0.046, pad=0.03)
cbar.set_ticks([6.0, 6.25, 6.5, 6.75, 7.0])
cbar.set_label("$T$ at the middle of the gap")
ax.set_aspect("equal")
ax.set_xlabel("per-gap rescaled position (slope forced to 1 at both ends)")
ax.set_ylabel(r"$N_{*}-N_{*}(\gamma_k)$")
ax.set_title(rf"The {len(zeros)-1} stretches of $N_*$, $6\leq T\leq7$: "
             rf"unit square with slope $1$ at $(0,0)$ and $(1,1)$")
ax.grid(True, lw=0.3, alpha=0.4)
fig.tight_layout()
fig.savefig("/tmp/_nstar_overlay_slope1.png", dpi=150)
shutil.copy("/tmp/_nstar_overlay_slope1.png",
            "figures/_nstar_overlay_slope1.png")
print("saved figures/_nstar_overlay_slope1.png")
