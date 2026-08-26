"""Check the matrix factors of the chain-2 half of eq:zeta-serial."""
import mpmath as mp

mp.mp.dps = 30

sigma = mp.mpf("0.5")
t = mp.mpf("279.85")
m = 6
s = sigma + 1j * t


def chi(s):
    return mp.pi**(s - mp.mpf(1) / 2) * mp.gamma((1 - s) / 2) / mp.gamma(s / 2)


S1 = mp.fsum([mp.power(n, -s) for n in range(1, m + 1)])
X = chi(s)
S2 = X * mp.fsum([mp.power(n, s - 1) for n in range(1, m + 1)])
R = mp.zeta(s) - S1 - S2

w = t * mp.log(m + 1)                 # omega
psi = mp.arg(X)
phi = mp.arg(R)
den = mp.sin(2 * w + psi)
d1 = abs(R) * mp.sin(w - phi + psi) / den
d2 = abs(R) * mp.sin(w + phi) / den
R1 = d1 * mp.expj(-w)
R2 = d2 * mp.expj(w + psi)
print("R1+R2 - R =", mp.nstr(R1 + R2 - R, 5))


def M(th, l):
    return mp.matrix([[mp.cos(th), -mp.sin(th), l * mp.cos(th)],
                      [mp.sin(th), mp.cos(th), l * mp.sin(th)],
                      [0, 0, 1]])


def th_n(n):
    return mp.mpf(0) if n == 0 else -t * mp.log(mp.mpf(n + 1) / n)


P1 = mp.eye(3)
for n in range(0, m):
    P1 = P1 * M(th_n(n), mp.power(n + 1, -sigma))
MR1 = M(-t * mp.log(mp.mpf(m + 1) / m), d1)
MR2 = M(2 * w + psi + mp.pi, -d2)
P2 = mp.eye(3)
for n in range(m, 0, -1):
    P2 = P2 * M(th_n(n), -abs(X) * mp.power(n, sigma - 1))

A = P1 * MR1
B = MR2 * P2
Z = A * B


def col(Mx):
    return mp.mpc(Mx[0, 2], Mx[1, 2])


print("B1 from matrices :", mp.nstr(col(A), 12))
print("Sigma1 + R1ps    :", mp.nstr(S1 + R1, 12))
print("chain-1 rotation :", mp.nstr(mp.arg(mp.mpc(A[0, 0], A[1, 0])), 12),
      " -omega mod 2pi:", mp.nstr(mp.fmod(-w, 2 * mp.pi) - 2 * mp.pi, 12))

B2 = R2 + S2
print("\nlast column of MR2*P2 :", mp.nstr(col(B), 12))
print("B2 = R2ps + Sigma2    :", mp.nstr(B2, 12))
print("e^{i omega} B2        :", mp.nstr(mp.expj(w) * B2, 12))
print("ratio col/B2          :", mp.nstr(col(B) / B2, 12),
      "   |arg| =", mp.nstr(mp.arg(col(B) / B2), 8),
      "   e^{i w} arg =", mp.nstr(mp.arg(mp.expj(w)), 8))

print("\nfull product position :", mp.nstr(col(Z), 12))
print("zeta(s)               :", mp.nstr(mp.zeta(s), 12))
print("final orientation     :", mp.nstr(mp.arg(mp.mpc(Z[0, 0], Z[1, 0])), 10),
      "  pi+psi mod 2pi:", mp.nstr(mp.fmod(mp.pi + psi + mp.pi, 2 * mp.pi) - mp.pi, 10))
