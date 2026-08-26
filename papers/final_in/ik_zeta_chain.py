#!/usr/bin/env python3
"""
ik_zeta_chain.py
================

Inverse kinematics for the zeta serial chain  Z = P1 T_R1 T_R2 P2.

Forward map (N = 2m+2 links, signed lengths l_k, joint rotations theta_k):

    phi_k = theta_0 + ... + theta_k          (cumulative heading)
    z     = sum_k l_k exp(i phi_k)           (endpoint)
    Phi   = phi_{N-1}                        (final orientation)

Given: all link lengths l_k (including d1, -d2, and the -|chi| k^(sigma-1)
of P2), a target endpoint z* (e.g. 0+0i), and a target orientation
Phi* = pi + arg chi.  Unknown: the theta array.

With N unknowns and 3 constraints the problem is redundant; two solvers:

  1. ik_3r_tail  -- closed form.  Freeze all thetas at their nominal zeta
     values except the last three; solve those three exactly (planar 3R
     wrist: law of cosines + atan2).  Works when the target is within
     reach of the last three links; two elbow branches.

  2. ik_dls      -- damped least squares (Levenberg-Marquardt), spreads
     the correction over ALL joints, converging to the solution nearest
     the nominal thetas.  Uses the exact planar-chain Jacobian
         dz/dtheta_k = i (z - p_k),   dPhi/dtheta_k = 1,
     where p_k is the position of joint k (rotating joint k pivots the
     whole distal chain about p_k).

Run:  python3 ik_zeta_chain.py
"""

import numpy as np
import mpmath as mp

SIGMA = mp.mpf('0.5')
T_INDEX = mp.mpf('6.18')
M = 6

mp.mp.dps = 50


def I_of_T(T):
    return (2 * T + 1) * mp.pi / (mp.log(T + 1) - mp.log(T))


def chi(s):
    return mp.mpf(2) ** s * mp.pi ** (s - 1) * mp.sin(mp.pi * s / 2) * mp.gamma(1 - s)


def build_chain():
    """Signed link lengths and nominal thetas of Z = P1 T_R1 T_R2 P2."""
    t = I_of_T(T_INDEX)
    s = mp.mpc(SIGMA, t)
    m = M
    w = t * mp.log(m + 1)
    ch = chi(s)
    psi = float(mp.arg(ch))
    achi = float(mp.fabs(ch))

    Sigma1 = mp.nsum(lambda n: mp.mpf(n) ** (-s), [1, m])
    Sigma2 = ch * mp.nsum(lambda n: mp.mpf(n) ** (s - 1), [1, m])
    zeta = mp.zeta(s)
    R = zeta - Sigma1 - Sigma2

    u1, u2 = mp.exp(-1j * w), mp.exp(1j * (w + psi))
    det = mp.re(u1) * mp.im(u2) - mp.re(u2) * mp.im(u1)
    d1 = (mp.re(R) * mp.im(u2) - mp.re(u2) * mp.im(R)) / det
    d2 = (mp.re(u1) * mp.im(R) - mp.re(R) * mp.im(u1)) / det

    tf, sf, d1f, d2f = float(t), float(SIGMA), float(d1), float(d2)
    wf = float(w)

    lengths, thetas = [], []
    # P1: links n = 0..m-1, length (n+1)^-sigma
    for n in range(m):
        lengths.append((n + 1) ** (-sf))
        thetas.append(0.0 if n == 0 else -tf * np.log((n + 1) / n))
    # T_R1
    lengths.append(d1f)
    thetas.append(-tf * np.log((m + 1) / m))
    # T_R2: merged joint, backward translation
    lengths.append(-d2f)
    thetas.append(2 * wf + psi + np.pi)
    # P2: k = m..1, backward links
    for k in range(m, 0, -1):
        lengths.append(-achi * k ** (sf - 1))
        thetas.append(-tf * np.log((k + 1) / k))

    return (np.array(lengths), np.array(thetas),
            complex(zeta), psi, dict(t=tf, d1=d1f, d2=d2f))


def fk(theta, L):
    """Joint positions p_0..p_N (p_N = endpoint) and final heading."""
    phi = np.cumsum(theta)
    pts = np.concatenate([[0j], np.cumsum(L * np.exp(1j * phi))])
    return pts, phi[-1]


def wrap(a):
    return (a + np.pi) % (2 * np.pi) - np.pi


def ik_dls(theta0, L, z_t, phi_t, iters=500, lam=1e-8, max_step=0.3):
    """Damped least squares over all joints; returns thetas and error."""
    th = theta0.copy()
    N = len(L)
    for _ in range(iters):
        pts, phi_end = fk(th, L)
        z = pts[-1]
        e = np.array([z_t.real - z.real, z_t.imag - z.imag,
                      wrap(phi_t - phi_end)])
        if np.linalg.norm(e) < 1e-14:
            break
        J = np.empty((3, N))
        for k in range(N):
            v = 1j * (z - pts[k])
            J[0, k], J[1, k], J[2, k] = v.real, v.imag, 1.0
        dth = J.T @ np.linalg.solve(J @ J.T + lam * np.eye(3), e)
        big = np.max(np.abs(dth))
        if big > max_step:
            dth *= max_step / big
        th += dth
    pts, phi_end = fk(th, L)
    return th, abs(pts[-1] - z_t), abs(wrap(phi_t - phi_end))


def ik_3r_tail(theta_nom, L, z_t, phi_t, elbow=+1):
    """Closed form: nominal thetas except the last three, solved exactly."""
    N = len(L)
    th = theta_nom.copy()
    # base of the 3R tail: position and heading after links 0..N-4
    phi = np.cumsum(th)
    base_pts = np.concatenate([[0j], np.cumsum(L[:N - 3] * np.exp(1j * phi[:N - 3]))])
    p, hdg = base_pts[-1], phi[N - 4]
    a, b, c = L[N - 3], L[N - 2], L[N - 1]

    w = z_t - c * np.exp(1j * phi_t)        # last link pinned by orientation
    v = w - p
    cosd = (abs(v) ** 2 - a * a - b * b) / (2 * a * b)
    if abs(cosd) > 1:
        return None                          # out of reach of the tail
    dlt = elbow * np.arccos(cosd)
    alpha = np.angle(v) - np.angle(a + b * np.exp(1j * dlt))
    th[N - 3] = wrap(alpha - hdg)
    th[N - 2] = wrap(dlt)
    th[N - 1] = wrap(phi_t - (alpha + dlt))
    return th


def main():
    L, th_nom, zeta, psi, info = build_chain()
    N = len(L)
    phi_t = np.pi + psi

    pts, phi_end = fk(th_nom, L)
    print('chain: N = %d links, sigma = %.2f, t = %.5f, m = %d'
          % (N, float(SIGMA), info['t'], M))
    print('forward check: endpoint = %.10f%+.10fi' % (pts[-1].real, pts[-1].imag))
    print('               zeta     = %.10f%+.10fi' % (zeta.real, zeta.imag))
    print('               |diff| = %.2e,  heading err = %.2e'
          % (abs(pts[-1] - zeta), abs(wrap(phi_t - phi_end))))

    # ---- IK 1: damped least squares to the far target 0 + 0i ----
    z_t = 0 + 0j
    th, perr, oerr = ik_dls(th_nom, L, z_t, phi_t)
    print('\n[DLS, all joints]  target 0+0i, Phi* = pi + arg chi')
    print('  endpoint error = %.2e,  orientation error = %.2e' % (perr, oerr))
    d = wrap(th - th_nom)
    print('  theta changes vs nominal: max |dtheta| = %.4f rad, rms = %.4f rad'
          % (np.max(np.abs(d)), np.sqrt(np.mean(d ** 2))))
    print('  solved thetas (rad):')
    names = (['P1 n=%d' % n for n in range(M)] + ['T_R1', 'T_R2']
             + ['P2 k=%d' % k for k in range(M, 0, -1)])
    for nm, a, b_ in zip(names, th_nom, th):
        print('    %-8s nominal %+9.4f  ->  solved %+9.4f  (d %+8.4f)'
              % (nm, wrap(a), wrap(b_), wrap(b_ - a)))

    # ---- IK 2: closed-form 3R tail, near target ----
    z_t2 = zeta + 0.15 * np.exp(0.4j)
    print('\n[3R tail, closed form]  target = zeta + 0.15 e^{0.4i}')
    for elbow in (+1, -1):
        th2 = ik_3r_tail(th_nom, L, z_t2, phi_t, elbow=elbow)
        if th2 is None:
            print('  elbow %+d: out of reach' % elbow)
            continue
        pts2, phi2 = fk(th2, L)
        print('  elbow %+d: endpoint error = %.2e, orientation error = %.2e'
              % (elbow, abs(pts2[-1] - z_t2), abs(wrap(phi_t - phi2))))


if __name__ == '__main__':
    main()
