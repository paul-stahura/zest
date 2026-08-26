# Verify: lim_{T->oo, {T}=x} sqrt(m+1) * d1(T) = d(x), with
#   d(x) = g(x)          on (0,1/2)
#   d(x) = 1 - g(1-x)    on (1/2,1)
#   g(y) = -cos(2 pi y^2 - 5 pi/8) / ( 2 cos(2 pi y) cos(2 pi y(1-y) - 3 pi/8) )
# (removable point at y=1/4 filled by continuity, value 1/4).
import mpmath as mp
mp.mp.dps = 30

def I(T):
    return mp.pi*(2*T+1)/mp.log(1/T+1)

def chi(s):
    return 2**s*mp.pi**(s-1)*mp.sin(mp.pi*s/2)*mp.gamma(1-s)

def d1hat(T, sigma=mp.mpf('0.5')):
    t = I(T); s = mp.mpc(sigma,t); m = int(mp.floor(T))
    S1 = mp.fsum(mp.power(n,-s) for n in range(1,m+1))
    ch = chi(s); S2 = ch*mp.fsum(mp.power(n,s-1) for n in range(1,m+1))
    R = mp.zeta(s)-S1-S2
    om = t*mp.log(m+1); psi = mp.arg(ch)
    d1 = abs(R)*mp.sin(om-mp.arg(R)+psi)/mp.sin(2*om+psi)
    return mp.sqrt(m+1)*d1

def g(y):
    y = mp.mpf(y)
    num = -mp.cos(2*mp.pi*y*y - 5*mp.pi/8)
    den = 2*mp.cos(2*mp.pi*y)*mp.cos(2*mp.pi*y*(1-y) - 3*mp.pi/8)
    if abs(mp.cos(2*mp.pi*y)) < mp.mpf('1e-12'):     # removable at y=1/4
        return mp.mpf(1)/4 / (2*mp.cos(2*mp.pi*y*(1-y)-3*mp.pi/8)) * 2
    return num/den

def d(x):
    x = mp.mpf(x)
    return g(x) if x < mp.mpf('0.5') else 1 - g(1-x)

print("x, d(x), then |d1hat - d(x)| at N = 50, 200, 800 (expect ~1/N):")
for x in ['0.1','0.25','0.35','0.5','0.65','0.75','0.9']:
    xx = mp.mpf(x)
    row = f"x={x:>5}  d(x)={mp.nstr(d(xx),6):>9}"
    prev = None
    for N in (50, 200, 800):
        err = abs(d1hat(N+xx) - d(xx))
        ratio = f" (x{mp.nstr(prev/err,2)})" if prev else ""
        row += f"  N={N}: {mp.nstr(err,3)}{ratio}"
        prev = err
    print(row)

# range of d on (0,1)
mn, mx = mp.inf, -mp.inf
for k in range(1, 1000):
    v = d(mp.mpf(k)/1000)
    mn, mx = min(mn,v), max(mx,v)
print(f"\nrange of d on (0,1): [{mp.nstr(mn,5)}, {mp.nstr(mx,5)}]")
print("special values: d(1/4) =", mp.nstr(d(mp.mpf('0.25')),8),
      " d(1/2) =", mp.nstr(d(mp.mpf('0.5')),8),
      " d(3/4) =", mp.nstr(d(mp.mpf('0.75')),8),
      " d(0+)=d(1-) =", mp.nstr(g(mp.mpf('1e-9')),8))
