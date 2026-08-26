# Numerical verification of the yin-curve convergence theorem:
#  (1) reflection identity  1 - Psi(x) e^{-iA(x)} = Psi(x+1/2) e^{i theta(x)}
#  (2) half-lag identity    Yinf(q) - Yinf(q-1/2) = e^{2 i theta(q)}
#  (3) Y_in1 -> Yinf(q), Y_ang1 -> Yinf(q-1/2) at sigma = 0.5, 0.3, 0.9
#  (4) chord of the limit curve crosses the axis at d(q) (limit profile)
import mpmath as mp
mp.mp.dps = 30

def I(T):   return mp.pi*(2*T+1)/mp.log(1/T+1)
def chi(s): return 2**s*mp.pi**(s-1)*mp.sin(mp.pi*s/2)*mp.gamma(1-s)
def C0(x):  return mp.cos(2*mp.pi*(x*x-x-mp.mpf(1)/16))/mp.cos(2*mp.pi*x)
def A(x):   return 2*mp.pi*(x*x-mp.mpf(1)/16)
def th(x):  return 2*mp.pi*x*(1-x)-3*mp.pi/8
def Yinf(q): return 1 - C0(q)*mp.e**(-1j*A(q))

print("(1) reflection identity, |LHS-RHS|:")
for x in ('0.05','0.2','0.35','0.45','0.55','0.7','0.9','-0.2','-0.45'):
    x = mp.mpf(x)
    print(f"   x={x}: {mp.nstr(abs((1-C0(x)*mp.e**(-1j*A(x))) - C0(x+mp.mpf('0.5'))*mp.e**(1j*th(x))),3)}")

print("(2) half-lag identity, |Yinf(q)-Yinf(q-1/2)-e^{2i th(q)}|:")
for q in ('0.1','0.3','0.6','0.85'):
    q = mp.mpf(q)
    print(f"   q={q}: {mp.nstr(abs(Yinf(q)-Yinf(q-mp.mpf('0.5'))-mp.e**(2j*th(q))),3)}")

def yin_yang(sig, T):
    t = I(T); s = mp.mpc(sig, t); m = int(mp.floor(T))
    S1 = mp.fsum(mp.power(n,-s) for n in range(1,m+1))
    ch = chi(s); S2 = ch*mp.fsum(mp.power(n,s-1) for n in range(1,m+1))
    R = mp.zeta(s)-S1-S2
    F = mp.power(m+1, mp.mpc(sig, t))       # frame factor (m+1)^{sigma+iI(T)}
    Yin  = R*F
    Yang = Yin - ch*mp.power(m+1, mp.mpc(2*sig-1, 2*t))
    return Yin, Yang

print("(3) convergence |Y_in1 - Yinf(q)| and |Y_ang1 - Yinf(q-1/2)|:")
for sig in ('0.5','0.3','0.9'):
    for N in (40, 160):
        for q in ('0.2','0.35','0.65','0.8'):
            Yin, Yang = yin_yang(mp.mpf(sig), N+mp.mpf(q))
            e1 = abs(Yin - Yinf(mp.mpf(q)))
            e2 = abs(Yang - Yinf(mp.mpf(q)-mp.mpf('0.5')))
            print(f"   sigma={sig} T={N}+{q}: yin {mp.nstr(e1,3)}  yang {mp.nstr(e2,3)}")

print("(4) chord crossing vs limit profile d(q):")
def d_profile(x):
    W = mp.tan(2*mp.pi*x)*mp.tan(2*mp.pi*(x-mp.mpf('0.25'))*(x-mp.mpf('0.75')))/2
    return mp.mpf('0.5') - W
for q in ('0.15','0.3','0.45','0.6','0.85'):
    q = mp.mpf(q)
    z1, z2 = Yinf(q), Yinf(q-mp.mpf('0.5'))
    lam = mp.im(z1)/(mp.im(z1)-mp.im(z2))
    cross = mp.re(z1) + lam*(mp.re(z2)-mp.re(z1))
    print(f"   q={q}: crossing {mp.nstr(cross,12)}  d(q) {mp.nstr(d_profile(q),12)}  diff {mp.nstr(cross-d_profile(q),3)}")

print("(5) point symmetry |Yinf(1/2-x) - (1-Yinf(x))|:")
for x in ('0.05','0.2','0.45','0.7','0.9'):
    x = mp.mpf(x)
    print(f"   x={x}: {mp.nstr(abs(Yinf(mp.mpf('0.5')-x)-(1-Yinf(x))),3)}")

print("(6) naive lag Yang(T)~Yin(T-1/2) vs flipped Yang(T)~1-Yin(2m+1-T):")
for q in ('0.2','0.8'):
    T = 80 + mp.mpf(q); m = 80
    _, Yang = yin_yang(mp.mpf('0.5'), T)
    Yin_lag, _ = yin_yang(mp.mpf('0.5'), T - mp.mpf('0.5'))
    Yin_ref, _ = yin_yang(mp.mpf('0.5'), 2*m + 1 - T)
    print(f"   q={q}: naive {mp.nstr(abs(Yang-Yin_lag),3)}   flipped {mp.nstr(abs(Yang-(1-Yin_ref)),3)}")
