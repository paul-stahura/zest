"""N_* between T=6 and T=7, drawn in zero-unit coordinates.

X axis: piecewise-linear map sending the k-th ordinate in the window to k,
so consecutive zeros are exactly one unit apart. Y axis: N_*(t) shifted so
the first ordinate sits at 0. The curve then passes through (k, k).
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


T_LO, T_HI = 6.0, 7.0
t_lo, t_hi = I_of(T_LO), I_of(T_HI)
print(f"t range: {t_lo:.6f} .. {t_hi:.6f}")

STEP = 0.02
pad = 2.0  # margin so the curve extends slightly past the outer zeros
t = np.arange(t_lo - pad, t_hi + pad, STEP)
Z = np.array([float(mp.siegelz(x)) for x in t])

# theta'(t) = 0.5*log(t/2pi) + O(t^-2); exact enough at t ~ 300
thp = 0.5 * np.log(t / (2 * math.pi))
Zp = np.gradient(Z, t)

w = Z - 1j * Zp / thp
Nstar = np.unwrap(np.angle(w)) / math.pi + 1.5

# ordinates inside the window, refined by bisection on Z
zeros = []
for i in range(len(t) - 1):
    if Z[i] == 0.0:
        zeros.append(t[i])
    elif Z[i] * Z[i + 1] < 0:
        a, b = mp.mpf(t[i]), mp.mpf(t[i + 1])
        r = float(mp.findroot(mp.siegelz, (a + b) / 2))
        zeros.append(r)
zeros = [g for g in zeros if t_lo <= g <= t_hi]
print(f"zeros in [I(6), I(7)]: {len(zeros)}")
print(f"first: {zeros[0]:.6f}, last: {zeros[-1]:.6f}")

# x: gamma_k -> k, linear in t between zeros, extended linearly outside
g = np.array(zeros)
k = np.arange(len(g), dtype=float)
first_slope = 1.0 / (g[1] - g[0])
last_slope = 1.0 / (g[-1] - g[-2])
x = np.interp(t, g, k)
below, above = t < g[0], t > g[-1]
x[below] = (t[below] - g[0]) * first_slope
x[above] = k[-1] + (t[above] - g[-1]) * last_slope

# y: N_* shifted so the first ordinate reads 0
y = Nstar - np.interp(g[0], t, Nstar)

n = len(g)
fig, ax = plt.subplots(figsize=(9.5, 9.5))
ax.plot([-1, n], [-1, n], color="0.8", lw=0.8, zorder=1)
ax.plot(x, y, color="#1f77b4", lw=1.0, zorder=3)
ax.plot(k, k, "o", ms=2.5, color="#d62728", zorder=4)
ax.set_aspect("equal")
ax.set_xlim(-1, n)
ax.set_ylim(-1, n)
ax.set_xticks(np.arange(0, n + 1, 5))
ax.set_yticks(np.arange(0, n + 1, 5))
ax.grid(True, lw=0.3, alpha=0.4)
ax.set_xlabel("zeros, one unit apart (piecewise-linear in $t$)")
ax.set_ylabel(r"$N_{*}-N_{*}(\gamma_{\rm first})$")
ax.set_title(rf"$N_*$ over $6\leq T\leq 7$  ($t\in[{t_lo:.1f},{t_hi:.1f}]$), "
             rf"{n} ordinates, unit spacing on both axes")
fig.tight_layout()
fig.savefig("/tmp/_nstar_unit_6_7.png", dpi=150)
shutil.copy("/tmp/_nstar_unit_6_7.png", "figures/_nstar_unit_6_7.png")
print("saved figures/_nstar_unit_6_7.png")
