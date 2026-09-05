import mpmath as mp
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

mp.mp.dps = 25

def I(T):  return mp.pi*(2*T+1)/mp.log(1/T+1)
def chi(s): return 2**s*mp.pi**(s-1)*mp.sin(mp.pi*s/2)*mp.gamma(1-s)

def d1hat(T):
    t = I(T); s = mp.mpc(mp.mpf('0.5'),t); m = int(mp.floor(T))
    S1 = mp.fsum(mp.power(n,-s) for n in range(1,m+1))
    ch = chi(s); S2 = ch*mp.fsum(mp.power(n,s-1) for n in range(1,m+1))
    R = mp.zeta(s)-S1-S2
    om = t*mp.log(m+1); psi = mp.arg(ch)
    return float(mp.sqrt(m+1)*abs(R)*mp.sin(om-mp.arg(R)+psi)/mp.sin(2*om+psi))

def g(y):
    num = -np.cos(2*np.pi*y**2 - 5*np.pi/8)
    den = 2*np.cos(2*np.pi*y)*np.cos(2*np.pi*y*(1-y) - 3*np.pi/8)
    out = np.where(np.abs(np.cos(2*np.pi*y)) < 1e-9, 0.25, num/np.where(den==0,1,den))
    return out

def d(x):
    x = np.asarray(x)
    return np.where(x < 0.5, g(x), 1 - g(1-x))

xs = np.linspace(0.001, 0.999, 2000)
fig, ax = plt.subplots(figsize=(8, 4.6))
h_dx, = ax.plot(xs, d(xs), 'b-', lw=1.8, label=r'$d(x)$ (closed form)', zorder=3)

sample_handles, sample_labels = [], []
for N, c, mk in ((10, '#cc7722', 'x'), (50, '#22aa55', '+'), (400, 'r', '.')):
    grid = np.arange(0.02, 1.0, 0.02)
    vals = [d1hat(mp.mpf(N)+mp.mpf(f'{x:.3f}')) for x in grid]
    t_lo = f'{float(I(N)):,.2f}'.replace(',', '{,}')
    t_hi = f'{float(I(N + 1)):,.2f}'.replace(',', '{,}')
    h, = ax.plot(grid, vals, mk, color=c, ms=5)
    sample_handles.append(h)
    sample_labels.append(fr'$T={N}+x$ (${t_lo}<t<{t_hi}$)')

m0 = 0.2268951718
ax.axhline(m0,   color='r', ls='--', lw=1.3)
ax.axhline(1-m0, color='r', ls='--', lw=1.3)
ax.text(0.995, m0,  r'$m_0=0.2268951$',   va='bottom', ha='right', color='r', fontsize=9)
ax.text(0.575, 1-m0, r'$1-m_0=0.7731048$', va='bottom', ha='left', color='r', fontsize=9)

for px, py in ((0.25,0.25),(0.5,0.5),(0.75,0.75)):
    ax.plot([px],[py],'ks', ms=4, zorder=4)
ax.annotate(r'$(\frac{1}{4},\frac{1}{4})$', (0.25,0.25), textcoords='offset points', xytext=(8,-12))
ax.annotate(r'$(\frac{1}{2},\frac{1}{2})$', (0.5,0.5),  textcoords='offset points', xytext=(8,-12))
ax.annotate(r'$(\frac{3}{4},\frac{3}{4})$', (0.75,0.75),textcoords='offset points', xytext=(8,-12))
ax.set_xlabel(r'$x=\{T\}$'); ax.set_ylabel(r'fraction of the next summand')
ax.set_title(r'$\lim_{T\to\infty,\ \{T\}=x}\hat{d}_1 = d(x) = \frac{1}{2}+\mathcal{W}_\infty(x)'
             r' = \frac{1}{2}-\frac{1}{2}\tan(2\pi x)\,\tan\!\left(2\pi(x-\frac{1}{4})(x-\frac{3}{4})\right)$',
             fontsize=11)
ax.grid(alpha=0.3)
from matplotlib.lines import Line2D
blank = Line2D([], [], linestyle='none')
ax.legend([h_dx, blank] + sample_handles,
          [r'$d(x)$ (closed form)', r'$\sqrt{m+1}\,d_1$ at:'] + sample_labels,
          loc='upper left', fontsize=8)
fig.tight_layout()
import shutil
fig.savefig('/tmp/fig_d_limit.png', dpi=160)
shutil.copy('/tmp/fig_d_limit.png', 'figures/fig_d_limit.png')
print("saved figures/fig_d_limit.png")
