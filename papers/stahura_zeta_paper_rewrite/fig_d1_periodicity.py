"""Plot d1 and d1hat on the critical line for 0 < T < 7.

Uses the exact critical-line reduction d1 = r / (2 cos u) with
r = Z(t) - 2 sum_{n<=m} n^{-1/2} cos(theta - t log n), u = omega - theta,
omega = t log(m+1), t = I(T); and d1hat = sqrt(m+1) * d1.
Writes figures/fig_d1_periodicity.{pdf,png}.
"""
import math
import shutil

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from mpmath import mp

mp.dps = 15


def I_of(T):
    return math.pi * (2 * T + 1) / math.log(1 / T + 1)


def d1_of(T):
    t = mp.mpf(I_of(T))
    m = int(math.floor(T))
    th = mp.siegeltheta(t)
    r = mp.siegelz(t)
    for n in range(1, m + 1):
        r -= 2 * mp.cos(th - t * mp.log(n)) / mp.sqrt(n)
    omega = t * mp.log(m + 1)
    u = omega - th
    d1 = r / (2 * mp.cos(u))
    return float(d1), float(mp.sqrt(m + 1) * d1)


# sample each unit interval densely, stopping just inside the integers so
# the handoff jumps appear as breaks rather than vertical lines
segs = []
for m in range(1, 7):
    lo = m + 1e-4
    hi = m + 1 - 1e-4
    Ts = np.linspace(lo, hi, 420)
    d1s = np.empty_like(Ts)
    d1hats = np.empty_like(Ts)
    for i, T in enumerate(Ts):
        d1s[i], d1hats[i] = d1_of(T)
    segs.append((Ts, d1s, d1hats))

fig, ax = plt.subplots(figsize=(8.6, 3.4))
# one color per unit interval, matching the top panel of fig_pinned_waves
INTERVAL_COLORS = ["gold", "#1f77b4", "C2", "C3", "C4", "C5"]
for k, (Ts, d1s, d1hats) in enumerate(segs):
    color = INTERVAL_COLORS[k]
    ax.plot(Ts, d1hats, color=color, lw=1.4)
    ax.plot(Ts, d1s, color=color, lw=1.2, ls="--")
for m in range(2, 7):
    ax.axvline(m, color="gray", lw=0.5, ls=":", alpha=0.6)
ax.set_xlabel(r"$T$")
ax.set_xlim(1, 7)
ax.set_ylim(0, 0.85)
from matplotlib.lines import Line2D
ax.legend([Line2D([], [], color="k", lw=1.4),
           Line2D([], [], color="k", lw=1.2, ls="--")],
          [r"$\hat d_1=\sqrt{m+1}\,d_1$", r"$d_1$"],
          loc="upper right")
ax.set_title(r"$d_1$ and $\hat d_1$ on the critical line, $1<T<7$")
fig.tight_layout()
fig.savefig("/tmp/fig_d1_periodicity.pdf")
fig.savefig("/tmp/fig_d1_periodicity.png", dpi=150)
shutil.copy("/tmp/fig_d1_periodicity.pdf", "figures/fig_d1_periodicity.pdf")
shutil.copy("/tmp/fig_d1_periodicity.png", "figures/fig_d1_periodicity.png")
print("done")
