"""Overlay the pinned waves of the normalized weight against q = {T}.

Standalone version of the bottom panel of fig_pinned_waveform.py from the
companion paper, with the sign flipped so the waves have the same
orientation as d1hat itself (dip first, then peak).  On [m, m+1] the
centered coordinate is

    P(T) = T^{1/2} ( d1(T) - Phi(-1, 1/2, m+1) ),

measuring d1 against the alternating sum of the remaining summand lengths;
subtracting the chord through the endpoint values +eps_m, -eps_{m+1}, where

    eps_n = n^{1/2} ( Phi(-1, 1/2, n) - d1(n^-) ),

pins each wave to zero at the integers.  The pinned waves W converge to the
tangent waveform  Winf(q) = -1/2 tan(2 pi q) tan(2 pi (q-1/4)(q-3/4)).
Writes figures/fig_pinned_waves.{pdf,png}.
"""
import math
import shutil

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from mpmath import mp

mp.dps = 20

T_MIN, T_MAX = 1, 7
EPS = 1e-9
# one color per unit interval: [1,2] yellow, [2,3] blue, the rest as before
INTERVAL_COLORS = ["gold", "#1f77b4", "C2", "C3", "C4", "C5"]
_tail, _eps = {}, {}


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
    return float(r / (2 * mp.cos(omega - th)))


def tail(m):
    if m not in _tail:
        _tail[m] = float(mp.lerchphi(-1, mp.mpf("0.5"), m + 1))
    return _tail[m]


def P_of(T, m):
    return T ** 0.5 * (d1_of(T) - tail(m))


def eps_of(n):
    if n not in _eps:
        _eps[n] = n ** 0.5 * (tail(n - 1) - d1_of(n - EPS))
    return _eps[n]


def w_limit(q):
    return (-0.5 * np.tan(2 * np.pi * q)
            * np.tan(2 * np.pi * (q - 0.25) * (q - 0.75)))


fig, (ax_t, ax) = plt.subplots(2, 1, figsize=(6.8, 6.4),
                               gridspec_kw={"height_ratios": [0.85, 1]})
for m in range(T_MIN, T_MAX):
    q = np.linspace(0, 1, 200)
    q[0], q[-1] = EPS, 1 - EPS
    Pr = np.array([P_of(float(m + x), m) for x in q])
    chord = (1 - q) * eps_of(m) - q * eps_of(m + 1)
    color = INTERVAL_COLORS[m - T_MIN]
    ax_t.plot(m + q, Pr - chord, "-", lw=1.2, color=color)
    ax.plot(q, Pr - chord, "-", lw=1.0, color=color, label=rf"$[{m},{m+1}]$")

ax_t.axhline(0, color="0.6", lw=0.8)
for n in range(T_MIN + 1, T_MAX):
    ax_t.axvline(n, color="gray", lw=0.5, ls=":", alpha=0.6)
ax_t.set_xlim(T_MIN, T_MAX)
ax_t.set_ylim(-0.35, 0.35)
ax_t.set_xlabel(r"$T$")
ax_t.set_title(r"$\mathcal{W}(T)$ continuous and periodic", fontsize=10)
ax_t.grid(True, ls=":", alpha=0.35)

q = np.linspace(0, 1, 1500)
ax.plot(q, w_limit(q), "b--", lw=1.4, label="tangent limit")
ax.set_ylim(-0.35, 0.35)
ax.set_xlim(0, 1)
ax.set_xlabel(r"$x=\{T\}$")
ax.set_title(r"$\mathcal{W}(T)$ overlaid, against the tangent limit",
             fontsize=10)
ax.legend(fontsize=8, ncol=4, loc="lower right")
ax.grid(True, ls=":", alpha=0.35)
fig.tight_layout()
fig.savefig("/tmp/fig_pinned_waves.pdf")
fig.savefig("/tmp/fig_pinned_waves.png", dpi=150)
shutil.copy("/tmp/fig_pinned_waves.pdf", "figures/fig_pinned_waves.pdf")
shutil.copy("/tmp/fig_pinned_waves.png", "figures/fig_pinned_waves.png")
print("done")
