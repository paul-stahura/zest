import mpmath as mp
mp.mp.dps = 30

def I(T):
    return mp.pi * (2*T + 1) / mp.log(1/T + 1)

def chi(s):
    return 2**s * mp.pi**(s-1) * mp.sin(mp.pi*s/2) * mp.gamma(1-s)

# --- 1. the margin function Phi(p) = C0(p) / (2 cos(pi(1/8 - 2 p^2))) on [0, 1/2] ---
def C0(p):
    p = mp.mpf(p)
    num = mp.cos(2*mp.pi*(p*p - p - mp.mpf(1)/16))
    den = mp.cos(2*mp.pi*p)
    if abs(den) < mp.mpf('1e-12'):
        # removable point: L'Hopital
        nump = -mp.sin(2*mp.pi*(p*p-p-mp.mpf(1)/16))*2*mp.pi*(2*p-1)
        denp = -2*mp.pi*mp.sin(2*mp.pi*p)
        return nump/denp
    return num/den

print("=== Phi(p) = C0(p)/(2 cos(pi(1/8-2p^2))) on [0,1/2]; need < 1 ===")
worst = 0
for k in range(0, 501):
    p = mp.mpf(k)/1000
    phi = C0(p)/(2*mp.cos(mp.pi*(mp.mpf(1)/8 - 2*p*p)))
    if phi > worst: worst, argw = phi, p
print(f"max Phi on [0,1/2] = {mp.nstr(worst,6)} at p = {mp.nstr(argw,4)}")

# also check C0 > 0 and its min on [1/2, 1] (case {T}<1/2)
mn = mp.inf
for k in range(500, 1001):
    p = mp.mpf(k)/1000
    c = C0(p)
    if c < mn: mn, argm = c, p
print(f"min C0 on [1/2,1] = {mp.nstr(mn,6)} at p = {mp.nstr(argm,4)}")

# --- 2. off the line: how close is e^{-i psi/2} R to real? ---
print()
print("=== sigma = 0.3: nu = arg(e^{-i psi/2} R) mod pi  (deviation from real) ===")
print(f"{'T':>9} {'dev (rad)':>12} {'t':>10} {'dev*t':>10} {'d1':>12} {'d2':>12}")
def full(T, sigma):
    t = I(T)
    s = mp.mpc(sigma, t)
    m = int(mp.floor(T))
    S1 = mp.fsum(mp.power(n, -s) for n in range(1, m+1))
    ch = chi(s)
    S2 = ch * mp.fsum(mp.power(n, s-1) for n in range(1, m+1))
    R  = mp.zeta(s) - S1 - S2
    om  = t * mp.log(m+1)
    psi = mp.arg(ch)
    ph  = mp.arg(R)
    den = mp.sin(2*om + psi)
    d1 = abs(R)*mp.sin(om - ph + psi)/den
    d2 = abs(R)*mp.sin(om + ph)/den
    w = R * mp.e**(-1j*psi/2)
    dev = mp.atan2(w.imag, w.real)
    dev = ((dev + mp.pi/2) % mp.pi) - mp.pi/2   # fold mod pi to [-pi/2, pi/2)
    return t, dev, d1, d2

for T in ['5.1','5.4','5.6','5.9','10.1','10.6','20.1','20.6','40.1','40.6','80.1','80.6']:
    T = mp.mpf(T)
    t, dev, d1, d2 = full(T, mp.mpf('0.3'))
    print(f"{float(T):9.2f} {float(dev):12.4e} {float(t):10.1f} {float(dev*t):10.4f} {float(d1):12.4e} {float(d2):12.4e}")

# --- 3. width of the negative windows at sigma=0.3: scan {T} finely near 1/4, 3/4 ---
print()
print("=== negative windows of d1,d2 near {T}=1/4, 3/4, sigma=0.3 ===")
for N in [5, 10, 20, 40]:
    for center in [mp.mpf('0.25'), mp.mpf('0.75')]:
        lo = hi = None
        step = mp.mpf('0.0002')
        f = center - mp.mpf('0.03')
        while f <= center + mp.mpf('0.03'):
            T = N + f
            t, dev, d1, d2 = full(T, mp.mpf('0.3'))
            if d1 < 0 or d2 < 0:
                if lo is None: lo = f
                hi = f
            f += step
        w = (hi - lo + step) if lo is not None else 0
        cen = (lo+hi)/2 if lo is not None else mp.mpf('nan')
        t = I(mp.mpf(N)+center)
        print(f"N={N:3d} near {float(center):.2f}: window width ~ {mp.nstr(w,3)}  center {mp.nstr(cen,5)}  width*t = {mp.nstr(w*t,3)}")
