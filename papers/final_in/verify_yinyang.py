#!/usr/bin/env python3
"""
verify_yinyang.py
=================

Numerical verification of every claim slated for the new yin-and-yang
section (rewrite of the original paper's Section 5).

Checks
------
 1. Frame map: Y_in1 / Y_ang1 are the images of the two ends of the
    reverse bisector link under z -> (z - Sigma1) * ceil(T)^s.
 2. Segment/axis crossing formula -> ceil(T)^sigma * d1 (real), and the
    intermediate simplification steps (yang3lin / compact5 forms).
 3. Other forms of R1ps (original eq:combined2, eq:combined).
 4. Reverse side: Y_in2 / Y_ang2 frame images, crossing ->
    d2 * ceil(T)^{1-sigma} / |chi|, and other forms of R2ps.
 5. Identity d1 + d2 = |R| cos(phi - psi/2) / cos(w + psi/2)
    (so the genuine poles, at 2w+psi = 2 pi k, cancel in the sum).
 6. Convergence of Y_in1 to Y_inf(p^) = 1 - C0(p^) e^{-2 pi i (p^2 - 1/16)}
    as T -> infinity (p^ = frac(sqrt(t/2pi))), for several sigma; and
    Y_ang1 to the conjugate-Siegel function.
 7. Y_inf vs Siegel's "desired result" F(u); relation between the two.
 8. Area enclosed by Y_inf = 2 pi Int_0^1 t Psi(t)^2 dt ~ 1.0341672...
 9. The follower-link claim: link floor(T)*floor(T+2) parallel to the
    bisector link (checked in several interpretations).

Run:  python3 verify_yinyang.py
"""

import mpmath as mp

from fig1_spiral_summands import I_of_T, chi

mp.mp.dps = 30


def data(sigma, T):
    """All the basic quantities at (sigma, T)."""
    t = I_of_T(mp.mpf(T))
    s = mp.mpc(sigma, t)
    m = int(mp.floor(T))
    w = t * mp.log(m + 1)
    ch = chi(s)
    psi = mp.arg(ch)
    S1 = mp.fsum(mp.mpf(n) ** (-s) for n in range(1, m + 1))
    S2 = ch * mp.fsum(mp.mpf(n) ** (s - 1) for n in range(1, m + 1))
    R = mp.zeta(s) - S1 - S2
    # Cramer solve
    u1 = mp.exp(-1j * w)
    u2 = mp.exp(1j * (w + psi))
    det = mp.re(u1) * mp.im(u2) - mp.re(u2) * mp.im(u1)
    d1 = (mp.re(R) * mp.im(u2) - mp.re(u2) * mp.im(R)) / det
    d2 = (mp.re(u1) * mp.im(R) - mp.re(R) * mp.im(u1)) / det
    return dict(t=t, s=s, m=m, w=w, ch=ch, psi=psi, S1=S1, S2=S2, R=R,
                d1=d1, d2=d2)


def crossing(yin, yang):
    """Segment/axis intersection formula (a complex number, ~real)."""
    return yin - mp.im(yin) / (mp.im(yang) - mp.im(yin)) * (yang - yin)


def check(label, err, tol=1e-15):
    flag = 'OK ' if abs(err) < tol else 'FAIL'
    print('  [%s] %-58s err=%.3e' % (flag, label, float(abs(err))))


def checks_at(sigma, T):
    print('sigma=%s  T=%s' % (sigma, T))
    D = data(sigma, T)
    s, m, w, ch, psi, R = D['s'], D['m'], D['w'], D['ch'], D['psi'], D['R']
    d1, d2, S1 = D['d1'], D['d2'], D['S1']
    M1 = mp.mpf(m + 1)

    # ---- 1. frame images ------------------------------------------------
    frame = lambda z: (z - S1) * M1 ** s
    yin1 = R * M1 ** s
    yang1 = yin1 - ch * M1 ** (-1 + 2 * s)
    check('Y_in1 = frame(Sigma1 + R)', frame(S1 + R) - yin1)
    far = S1 + R - ch * M1 ** (s - 1)      # far end of reverse bisector link
    check('Y_ang1 = frame(far end)', frame(far) - yang1)

    # ---- 2. crossing -> ceil(T)^sigma d1, and intermediate forms --------
    cr = crossing(yin1, yang1)
    check('crossing real', mp.im(cr))
    check('crossing = ceil(T)^sigma d1', cr - M1 ** sigma * d1)
    # yang3lin form
    y3 = R * M1 ** s - mp.im(R * M1 ** s) / mp.im(ch * M1 ** (2 * s - 1)) \
        * ch * M1 ** (2 * s - 1)
    check('yang3lin form', y3 - cr)
    # compact5 (component) form
    c5 = R * M1 ** s - M1 ** (1 - sigma) \
        * (mp.re(R) * mp.sin(w) + mp.im(R) * mp.cos(w)) \
        / (mp.re(ch) * mp.sin(2 * w) + mp.im(ch) * mp.cos(2 * w)) \
        * ch * M1 ** (-1 + 2 * s)
    check('compact5 form', c5 - cr)
    # final sine form
    fin = abs(R) * M1 ** sigma * mp.sin(w - mp.arg(R) + psi) \
        / mp.sin(2 * w + psi)
    check('final sine form', fin - cr)

    # ---- 3. other forms of R1ps -----------------------------------------
    R1ps = d1 * M1 ** (-1j * D['t'])
    check('R1ps = d1 ceil^{-i t}', R1ps - d1 * mp.exp(-1j * w))
    of1 = R - abs(R) * mp.sin(w + mp.arg(R)) / mp.sin(psi + 2 * w) \
        * mp.exp(1j * (psi + w))
    check('other form R - d2 e^{i(psi+w)}', of1 - R1ps)
    of2 = R - ch * mp.exp(1j * w) * mp.im(R * mp.exp(1j * w)) \
        / mp.im(ch * mp.exp(2j * w))
    check('other form via Im ratios', of2 - R1ps)

    # ---- 4. reverse side --------------------------------------------------
    # frame2: translate joint m of the reverse chain (Sigma1 + R) to the
    # origin and divide by the reverse link vector  -chi (m+1)^{s-1} --
    # try both sign conventions.
    linkv = ch * M1 ** (s - 1)
    for sign, name in ((1, '+chi link'), (-1, '-chi link')):
        frame2 = lambda z: (z - (S1 + R)) / (sign * linkv)
        yin2 = frame2(S1)
        yang2 = frame2(S1 + M1 ** (-s))
        cr2 = crossing(yin2, yang2)
        target = d2 * M1 ** (1 - sigma) / abs(ch)
        print('    reverse frame %s: yin2 vs original formula err=%.2e, '
              'crossing-target err=%.2e (im %.1e)'
              % (name,
                 float(abs(yin2 - R * M1 ** (1 - sigma) / (ch * mp.exp(1j * w)))),
                 float(abs(cr2 - target)), float(abs(mp.im(cr2)))))
    # original Y_in2 / Y_ang2 formulas as printed
    yin2o = R * M1 ** (1 - sigma) / (ch * mp.exp(1j * w))
    yang2o = yin2o - M1 ** (1 - 2 * sigma) / (ch * mp.exp(2j * w))
    cr2o = crossing(yin2o, yang2o)
    check('orig Y2 crossing = d2 ceil^{1-sigma}/|chi|',
          cr2o - d2 * M1 ** (1 - sigma) / abs(ch), tol=1e-14)
    # R2ps other forms
    R2ps = d2 * mp.exp(1j * w) * ch / abs(ch)
    check('R = R1ps + R2ps', R1ps + R2ps - R)
    of3 = ch / M1 ** (1 - 2 * sigma) * abs(R) / mp.exp(-1j * w) \
        * mp.sin(w + mp.arg(R)) / mp.sin(2 * w + psi) / M1 ** (2 * sigma - 1) \
        / abs(ch)
    check('R2ps modulus*direction form', of3 - R2ps)

    # ---- 5. d1 + d2 identity ---------------------------------------------
    phi = mp.arg(R)
    ident = abs(R) * mp.cos(phi - psi / 2) / mp.cos(w + psi / 2)
    check('d1 + d2 = |R| cos(phi-psi/2)/cos(w+psi/2)', ident - (d1 + d2))
    print()


def psi_fn(x):
    return mp.cos(2 * mp.pi * (x ** 2 - x - mp.mpf(1) / 16)) / mp.cos(2 * mp.pi * x)


def y_inf(u):
    return 1 - psi_fn(u) * mp.exp(-2j * mp.pi * (u ** 2 - mp.mpf(1) / 16))


def siegel_F(u):
    return 1 / (1 - mp.exp(-2j * mp.pi * u)) \
        - mp.exp(1j * mp.pi * u ** 2) / (mp.exp(1j * mp.pi * u) - mp.exp(-1j * mp.pi * u))


def conj_siegel(u):
    return (mp.exp(-1j * mp.pi * u ** 2) - mp.exp(-1j * mp.pi * u)) \
        / (2j * mp.sin(mp.pi * u))


def convergence_checks():
    print('=== convergence of yin/yang to the limit curves ===')
    for sigma in (mp.mpf('0.5'), mp.mpf('0.9'), mp.mpf('0.2')):
        for T0 in (10, 30, 80):
            errs_in, errs_ang = [], []
            for k in range(1, 20):
                T = mp.mpf(T0) + mp.mpf(k) / 20
                D = data(sigma, T)
                M1 = mp.mpf(D['m'] + 1)
                yin1 = D['R'] * M1 ** D['s']
                yang1 = yin1 - D['ch'] * M1 ** (-1 + 2 * D['s'])
                a = mp.sqrt(D['t'] / (2 * mp.pi))
                p = a - mp.floor(a)
                errs_in.append(abs(yin1 - y_inf(p)))
                errs_ang.append(abs(yang1 - conj_siegel(p)))
            print('  sigma=%s T~%-3d: max|Y_in1 - Y_inf(p^)| = %.4f,'
                  '  max|Y_ang1 - conjSiegel(p^)| = %.4f'
                  % (sigma, T0, float(max(errs_in)), float(max(errs_ang))))
    # relations among the limit functions
    print('=== limit-function identities (grid u in (0,1)) ===')
    e1 = e2 = e3 = 0
    for k in range(1, 40):
        u = mp.mpf(k) / 40 + mp.mpf(1) / 1000
        e1 = max(e1, abs(y_inf(u) - mp.conj(siegel_F(u))))
        e2 = max(e2, abs(y_inf(u) - siegel_F(u)))
        e3 = max(e3, abs(y_inf(u - mp.mpf(1) / 2) - conj_siegel(u)))
    print('  max|Y_inf(u) - conj F(u)|      = %.3e' % float(e1))
    print('  max|Y_inf(u) - F(u)|           = %.3e' % float(e2))
    print('  max|Y_inf(u-1/2) - conjSg(u)|  = %.3e' % float(e3))
    # Psi = C0 (identical expressions -- sanity only)
    print('  Psi(0.3) - C0(0.3) = %.3e (same formula)' %
          float(abs(psi_fn(mp.mpf('0.3'))
                    - mp.cos(2 * mp.pi * (mp.mpf('0.09') - mp.mpf('0.3')
                                          - mp.mpf(1) / 16))
                    / mp.cos(2 * mp.pi * mp.mpf('0.3')))))


def area_check():
    print('=== area of Y_inf ===')
    f = lambda u: u * psi_fn(u) ** 2
    val = 2 * mp.pi * (mp.quad(f, [0, mp.mpf(1) / 4, mp.mpf(3) / 4, 1]))
    print('  2 pi Int t Psi^2 = %s' % mp.nstr(val, 20))
    # signed-area cross check by direct contour integral
    def integrand(u):
        z = y_inf(u)
        h = mp.mpf(1) / 10 ** 12
        dz = (y_inf(u + h) - y_inf(u - h)) / (2 * h)
        return mp.im(mp.conj(z) * dz)
    signed = mp.quad(integrand, [mp.mpf(1) / 1000, mp.mpf(1) / 4 - mp.mpf(1) / 1000]) \
        + mp.quad(integrand, [mp.mpf(1) / 4 + mp.mpf(1) / 1000, mp.mpf(3) / 4 - mp.mpf(1) / 1000]) \
        + mp.quad(integrand, [mp.mpf(3) / 4 + mp.mpf(1) / 1000, 1 - mp.mpf(1) / 1000])
    print('  signed area (direct, ~-above)  = %s' % mp.nstr(signed / 2, 12))


def follower_check():
    print('=== follower link (link floor(T)*floor(T+2)) parallelism ===')
    for sigma, T in ((mp.mpf('0.1'), mp.mpf('6.38')),
                     (mp.mpf('0.85'), mp.mpf('7.92')),
                     (mp.mpf('0.1'), mp.mpf('6.10')),
                     (mp.mpf('0.1'), mp.mpf('6.70'))):
        D = data(sigma, T)
        m, t, w, psi = D['m'], D['t'], D['w'], D['psi']
        nstar = m * (m + 2)
        # angle of forward link k = arg (k+1)^{-s} = -t ln(k+1) (mod 2pi)
        rel_fwd = mp.fmod(-t * mp.log(nstar + 1) + t * mp.log(m + 1), mp.pi)
        # vs reverse bisector link (angle pi + psi + t ln(m+1) in world... )
        ang_rev_bis = mp.pi + psi + t * mp.log(m + 1)
        rel_rev = mp.fmod(-t * mp.log(nstar + 1) - ang_rev_bis, mp.pi)
        norm = lambda x: float(min(abs(x), mp.pi - abs(x)) / mp.pi)
        print('  sigma=%s T=%s m=%d n*=%d: fwd-link%d vs fwd bisector '
              'angle = %.3f pi;  vs rev bisector = %.3f pi'
              % (sigma, T, m, nstar, nstar, norm(rel_fwd), norm(rel_rev)))


if __name__ == '__main__':
    for sig, T in (('0.25', '6.18'), ('0.5', '4.31'), ('0.7', '3.62'),
                   ('0.1', '9.85')):
        checks_at(mp.mpf(sig), mp.mpf(T))
    convergence_checks()
    area_check()
    follower_check()
