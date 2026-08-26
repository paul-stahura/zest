#!/usr/bin/env python3
"""
ik_m2_closed_form.py
====================

Closed-form inverse kinematics for the m = 2 zeta chain (six matrices,
three links per chain):

    Z = T(0,1) T(th1,a) T(th2,d1) T(-2(th1+th2)+psi+pi,-d2) T(th2,-b) T(th1,-c)

with a = 2^-sigma, b = |chi| 2^(sigma-1), c = |chi|, psi = arg chi.
Position equation (orientation is automatically psi + pi):

    zeta = 1 + c e^{i psi}
         + a e^{i th1} + b e^{i(psi - th1)}         (ellipse in th1)
         + d1 e^{i(th1+th2)} + d2 e^{i(psi-th1-th2)} (ellipse in u = th1+th2)

Half-angle rotation by psi/2 turns both ellipses axis-aligned:
    X = A cos(alpha) + P cos(beta)
    Y = B sin(alpha) + Q sin(beta)
with alpha = th1 - psi/2, beta = th1 + th2 - psi/2,
A = a+b, B = a-b, P = d1+d2, Q = d1-d2, and
X + iY = (zeta - 1 - c e^{i psi}) e^{-i psi/2}.

Eliminating beta and substituting tau = tan(alpha/2) yields a quartic;
each real root is a candidate posture.  th1 = alpha + psi/2, th2 = beta - alpha.

Run:  python3 ik_m2_closed_form.py
"""

import numpy as np
import mpmath as mp

mp.mp.dps = 40


def I_of_T(T):
    return (2 * T + 1) * mp.pi / (mp.log(T + 1) - mp.log(T))


def chi(s):
    return mp.mpf(2) ** s * mp.pi ** (s - 1) * mp.sin(mp.pi * s / 2) * mp.gamma(1 - s)


def setup(sigma, T):
    """All chain data for m = 2 at (sigma, T)."""
    t = I_of_T(mp.mpf(T))
    s = mp.mpc(sigma, t)
    ch = chi(s)
    psi, achi = float(mp.arg(ch)), float(mp.fabs(ch))
    w = t * mp.log(3)

    Sigma1 = sum(mp.mpf(n) ** (-s) for n in (1, 2))
    Sigma2 = ch * sum(mp.mpf(n) ** (s - 1) for n in (1, 2))
    zeta = mp.zeta(s)
    R = zeta - Sigma1 - Sigma2
    u1, u2 = mp.exp(-1j * w), mp.exp(1j * (w + psi))
    det = mp.re(u1) * mp.im(u2) - mp.re(u2) * mp.im(u1)
    d1 = float((mp.re(R) * mp.im(u2) - mp.re(u2) * mp.im(R)) / det)
    d2 = float((mp.re(u1) * mp.im(R) - mp.re(R) * mp.im(u1)) / det)

    tf = float(t)
    th1_true = np.angle(np.exp(-1j * (tf * np.log(2))))       # -t ln2 mod 2pi
    th2_true = np.angle(np.exp(-1j * (tf * np.log(1.5))))     # -t ln(3/2) mod 2pi
    return dict(sigma=float(sigma), t=tf, psi=psi, achi=achi, d1=d1, d2=d2,
                zeta=complex(zeta), th1_true=th1_true, th2_true=th2_true)


def forward(th1, th2, p):
    a, b, c = 2 ** (-p['sigma']), p['achi'] * 2 ** (p['sigma'] - 1), p['achi']
    psi, d1, d2 = p['psi'], p['d1'], p['d2']
    return (1 + c * np.exp(1j * psi)
            + a * np.exp(1j * th1) + b * np.exp(1j * (psi - th1))
            + d1 * np.exp(1j * (th1 + th2))
            + d2 * np.exp(1j * (psi - th1 - th2)))


def ik(zx, zy, p):
    """All real (th1, th2) postures reaching zx + i zy.  Closed form."""
    a, b, c = 2 ** (-p['sigma']), p['achi'] * 2 ** (p['sigma'] - 1), p['achi']
    psi, d1, d2 = p['psi'], p['d1'], p['d2']

    w = (complex(zx, zy) - 1 - c * np.exp(1j * psi)) * np.exp(-1j * psi / 2)
    X, Y = w.real, w.imag
    A, B, P, Q = a + b, a - b, d1 + d2, d1 - d2

    K = Q * Q * X * X + P * P * Y * Y - P * P * Q * Q
    c4 = K + 2 * A * Q * Q * X + A * A * Q * Q
    c3 = -4 * B * P * P * Y
    c2 = 2 * K - 2 * A * A * Q * Q + 4 * B * B * P * P
    c1 = c3
    c0 = K - 2 * A * Q * Q * X + A * A * Q * Q

    sols = []
    for tau in np.roots([c4, c3, c2, c1, c0]):
        if abs(tau.imag) > 1e-8:
            continue
        al = 2 * np.arctan(tau.real)
        cb = (X - A * np.cos(al)) / P
        sb = (Y - B * np.sin(al)) / Q
        be = np.arctan2(sb, cb)
        sols.append((al + psi / 2, be - al))
    return sols


def report(sigma, T):
    p = setup(sigma, T)
    print('sigma = %.2f, T = %.2f  (t = %.6f, |chi| = %.6f, d1 = %.6f, d2 = %.6f)'
          % (sigma, T, p['t'], p['achi'], p['d1'], p['d2']))
    fw = forward(p['th1_true'], p['th2_true'], p)
    print('  forward(true thetas) = %.10f%+.10fi   zeta = %.10f%+.10fi   |diff| = %.1e'
          % (fw.real, fw.imag, p['zeta'].real, p['zeta'].imag, abs(fw - p['zeta'])))
    print('  true (th1, th2) mod 2pi = (%+.6f, %+.6f)' % (p['th1_true'], p['th2_true']))
    for th1, th2 in ik(p['zeta'].real, p['zeta'].imag, p):
        err = abs(forward(th1, th2, p) - p['zeta'])
        match = (abs(np.angle(np.exp(1j * (th1 - p['th1_true'])))) < 1e-6 and
                 abs(np.angle(np.exp(1j * (th2 - p['th2_true'])))) < 1e-6)
        print('  IK posture (th1, th2) = (%+.6f, %+.6f)  endpoint err = %.1e%s'
              % (th1, th2, err, '   <-- true zeta posture' if match else ''))
    print()


if __name__ == '__main__':
    report(0.60, 2.40)
    report(0.30, 2.75)
    report(0.95, 2.10)
