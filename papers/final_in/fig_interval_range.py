# Per-unit-interval range of d1hat on the critical line, N = 1..29,
# with a right-hand scale marking the limit-profile extremes m0 and 1-m0.
# The (slow) sweep is cached in interval_ranges.csv; delete it to recompute.
import os
import mpmath as mp
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

mp.mp.dps = 20

def I(T):  return mp.pi*(2*T+1)/mp.log(1/T+1)
def chi(s): return 2**s*mp.pi**(s-1)*mp.sin(mp.pi*s/2)*mp.gamma(1-s)

def d1hat(T):
    t = I(T); s = mp.mpc(mp.mpf('0.5'),t); m = int(mp.floor(T))
    S1 = mp.fsum(mp.power(n,-s) for n in range(1,m+1))
    ch = chi(s); S2 = ch*mp.fsum(mp.power(n,s-1) for n in range(1,m+1))
    R = mp.zeta(s)-S1-S2
    om = t*mp.log(m+1); psi = mp.arg(ch)
    return float(mp.sqrt(m+1)*abs(R)*mp.sin(om-mp.arg(R)+psi)/mp.sin(2*om+psi))

CACHE = 'interval_ranges.csv'
if os.path.exists(CACHE):
    data = np.genfromtxt(CACHE, delimiter=',', names=True)
    mins, maxs = list(data['min']), list(data['max'])
else:
    mins, maxs = [], []
    with open(CACHE, 'w') as f:
        f.write("N,min,max\n")
        for N in range(1, 30):
            step = 0.0005 if N < 3 else 0.001
            lo, hi = np.inf, -np.inf
            x = step
            while x < 1:
                v = d1hat(mp.mpf(N)+mp.mpf(f'{x:.6f}'))
                lo, hi = min(lo, v), max(hi, v)
                x += step
            mins.append(lo); maxs.append(hi)
            f.write(f"{N},{lo:.5f},{hi:.5f}\n")
            print(f"N={N:2d}: [{lo:.5f}, {hi:.5f}]")

m0 = 0.2268951718

fig, ax = plt.subplots(figsize=(6.2, 4.8))
for N, (lo, hi) in enumerate(zip(mins, maxs), start=1):
    ax.fill_between([N, N+1], lo, hi, color='#9db8e8', alpha=0.55,
                    edgecolor='none')
    ax.plot([N, N+1], [hi, hi], '-', color='#1f4fa0', lw=1.8)
    ax.plot([N, N+1], [lo, lo], '-', color='#1f4fa0', lw=1.8)

ax.axhline(0.8, color='k', ls='--', lw=1.0, alpha=0.55)
ax.axhline(0.2, color='k', ls='--', lw=1.0, alpha=0.55)
ax.text(29.7, 0.8, r'$4/5$', va='bottom', ha='right', fontsize=9, alpha=0.7)
ax.text(29.7, 0.2, r'$1/5$', va='top', ha='right', fontsize=9, alpha=0.7)

ax.set_xlim(0, 30); ax.set_ylim(0.15, 0.85)
ax.set_xlabel(r'$T$'); ax.set_ylabel(r'$\hat d_1$')
ax.set_title(r'Range of $\hat d_1$ over each unit interval $(N,N+1)$, $\sigma=\frac{1}{2}$',
             fontsize=11)
ax.grid(alpha=0.25)

# right-hand scale: only the two limit-profile extremes
axr = ax.twinx()
axr.set_ylim(ax.get_ylim())
axr.set_yticks([m0, 1-m0])
axr.set_yticklabels([r'$m_0=0.2268951$', r'$1-m_0=0.7731048$'],
                    color='r', fontsize=9)
axr.tick_params(axis='y', colors='r', length=6)

fig.tight_layout()
fig.savefig('fig_interval_range.png', dpi=160)
print("saved fig_interval_range.png")
