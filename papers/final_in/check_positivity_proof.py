import mpmath as mp
mp.mp.dps = 30

def I(T):
    return mp.pi*(2*T+1)/mp.log(1/T+1)

def chi(s):
    return 2**s*mp.pi**(s-1)*mp.sin(mp.pi*s/2)*mp.gamma(1-s)

def C0(p):
    num = mp.cos(2*mp.pi*(p*p-p-mp.mpf(1)/16)); den = mp.cos(2*mp.pi*p)
    if abs(den) < mp.mpf('1e-10'):
        return -mp.sin(2*mp.pi*(p*p-p-mp.mpf(1)/16))*(2*p-1)/(-mp.sin(2*mp.pi*p))
    return num/den

def d1_exact(T, sigma=mp.mpf('0.5')):
    t = I(T); s = mp.mpc(sigma,t); m = int(mp.floor(T))
    S1 = mp.fsum(mp.power(n,-s) for n in range(1,m+1))
    ch = chi(s); S2 = ch*mp.fsum(mp.power(n,s-1) for n in range(1,m+1))
    R = mp.zeta(s)-S1-S2
    om = t*mp.log(m+1); psi = mp.arg(ch)
    return abs(R)*mp.sin(om-mp.arg(R)+psi)/mp.sin(2*om+psi)

def d1_proof(T):
    """Leading-order formula from the proof, both cases, driven only by a=sqrt(t/2pi)."""
    t = I(T); m = int(mp.floor(T)); a = mp.sqrt(t/(2*mp.pi)); N = int(mp.floor(a)); p = a-N
    if N == m:      # case A ({T}<1/2): p in (1/2,1)
        q = 4*p-2*p*p-mp.mpf(7)/8
        return -C0(p)/(2*mp.cos(mp.pi*q)*mp.sqrt(a))
    else:           # case B ({T}>1/2): N=m+1, p in (0,1/2)
        Phi = C0(p)/(2*mp.cos(mp.pi*(mp.mpf(1)/8-2*p*p)))
        return 1/mp.sqrt(m+1) - Phi/mp.sqrt(a)

print("dense sweep T in [20,21] and [40,41], step 0.01, sigma=1/2:")
for lo in (20, 40):
    worst = 0; mn = mp.inf
    T = mp.mpf(lo)+mp.mpf('0.005')
    while T < lo+1:
        de, dp_ = d1_exact(T), d1_proof(T)
        worst = max(worst, abs(de-dp_)/de); mn = min(mn, de)
        T += mp.mpf('0.01')
    print(f"  [{lo},{lo+1}]: max rel. error of proof formula = {mp.nstr(worst,3)},  min d1 exact = {mp.nstr(mn,4)}")

# lower bound from the proof: d1 >= 0.38*0.38/2 * a^{-1/2} (case A), >= (m+1)^{-1/2}/2-ish (case B)
for lo in (20, 40):
    t = I(mp.mpf(lo)+mp.mpf('0.5')); a = mp.sqrt(t/(2*mp.pi))
    print(f"  T~{lo}: proof lower bound caseA ~ {mp.nstr(mp.mpf('0.0732')/mp.sqrt(a),3)}")
