import mpmath as mp
mp.mp.dps = 25

def I(T):  return mp.pi*(2*T+1)/mp.log(1/T+1)
def chi(s): return 2**s*mp.pi**(s-1)*mp.sin(mp.pi*s/2)*mp.gamma(1-s)

def d1hat(T):
    t = I(T); s = mp.mpc(mp.mpf('0.5'),t); m = int(mp.floor(T))
    S1 = mp.fsum(mp.power(n,-s) for n in range(1,m+1))
    ch = chi(s); S2 = ch*mp.fsum(mp.power(n,s-1) for n in range(1,m+1))
    R = mp.zeta(s)-S1-S2
    om = t*mp.log(m+1); psi = mp.arg(ch)
    return mp.sqrt(m+1)*abs(R)*mp.sin(om-mp.arg(R)+psi)/mp.sin(2*om+psi)

gmin, gmax = mp.inf, -mp.inf
argmin = argmax = None
# dense sweep; extra density on (1,3) where corrections are largest
def sweep(lo, hi, step):
    lo, hi, step = mp.mpf(lo), mp.mpf(hi), mp.mpf(step)
    global gmin, gmax, argmin, argmax
    T = mp.mpf(lo)
    while T < hi:
        if abs(T-mp.nint(T)) > mp.mpf('1e-9'):
            v = d1hat(T)
            if v < gmin: gmin, argmin = v, T
            if v > gmax: gmax, argmax = v, T
        T += step

sweep('1.0005','3','0.0005')
sweep('3','12','0.001')
sweep('12','40','0.002')
sweep('40','60','0.005')
print(f"global min d1hat = {mp.nstr(gmin,6)} at T = {mp.nstr(argmin,8)}")
print(f"global max d1hat = {mp.nstr(gmax,6)} at T = {mp.nstr(argmax,8)}")

# refine around the extremes
for c, lab in ((argmin,'min'), (argmax,'max')):
    lo, hi = c-mp.mpf('0.002'), c+mp.mpf('0.002')
    best = None; T = lo
    while T < hi:
        if abs(T-mp.nint(T)) > mp.mpf('1e-9'):
            v = d1hat(T)
            if best is None or (v<best[0] if lab=='min' else v>best[0]):
                best = (v, T)
        T += mp.mpf('0.00002')
    print(f"refined {lab}: {mp.nstr(best[0],8)} at T = {mp.nstr(best[1],9)}")

# also behavior at the left edge T -> 1+ and near handoffs at small m
for T in ('1.001','1.01','1.05','1.1','1.5','1.9','1.99','1.999','2.001','2.5','2.999'):
    print(f"  T={T:>6}: d1hat = {mp.nstr(d1hat(mp.mpf(T)),6)}")
