"""Check the general d1(k), d2(k) of §12.12 against the bisector formulas
and against the axis crossing of the §12.11 yin–yang pair.
"""
import mpmath as mp

mp.mp.dps = 30


def I(T):
    return mp.pi * (2 * T + 1) / mp.log(1 / T + 1)


def chi(s):
    return 2**s * mp.pi ** (s - 1) * mp.sin(mp.pi * s / 2) * mp.gamma(1 - s)


def remainder(sigma, T):
    t = I(T)
    s = mp.mpc(sigma, t)
    m = int(mp.floor(T))
    ch = chi(s)
    S1 = mp.fsum(mp.power(n, -s) for n in range(1, m + 1))
    S2 = ch * mp.fsum(mp.power(n, s - 1) for n in range(1, m + 1))
    return s, ch, mp.zeta(s) - S1 - S2, m, t


def crossing_link(k, T, t, m):
    a2 = t / (2 * mp.pi)
    if k == m:
        return m
    return int(mp.nint(a2 / (k + 1))) - 1


def W_and_weights(sigma, T, k):
    s, ch, R, m, t = remainder(sigma, T)
    i = crossing_link(k, T, t, m)
    head = mp.fsum(mp.power(n, -s) for n in range(k + 1, m + 1))
    tail = mp.fsum(mp.power(n, s - 1) for n in range(m + 1, i + 1))
    W = head + R - ch * tail
    n, np = k + 1, i + 1
    om_n = t * mp.log(n)
    om_np = t * mp.log(np)
    psi = mp.arg(ch)
    ph = mp.arg(W)
    den = mp.sin(om_n + om_np + psi)
    d1 = abs(W) * mp.sin(psi + om_np - ph) / den
    d2 = abs(W) * mp.sin(om_n + ph) / den
    return W, d1, d2, i, ch, R, om_n, om_np, psi


def bisector_weights(sigma, T):
    s, ch, R, m, t = remainder(sigma, T)
    om = t * mp.log(m + 1)
    psi = mp.arg(ch)
    ph = mp.arg(R)
    den = mp.sin(2 * om + psi)
    return (
        abs(R) * mp.sin(om - ph + psi) / den,
        abs(R) * mp.sin(om + ph) / den,
        R,
    )


def crossing_fraction(sigma, T, k):
    s, ch, R, m, t = remainder(sigma, T)
    i = crossing_link(k, T, t, m)
    head = mp.fsum(mp.power(n, -s) for n in range(k + 1, m + 1))
    tail = mp.fsum(mp.power(n, s - 1) for n in range(m + 1, i + 1))
    W = head + R - ch * tail
    Yin = mp.power(k + 1, s) * W
    v = ch * mp.power(k + 1, s) * mp.power(i + 1, s - 1)
    return mp.re(Yin) - mp.im(Yin) * mp.re(v) / mp.im(v)


def main():
    worst_bis = mp.mpf(0)
    worst_cut = mp.mpf(0)
    worst_sum = mp.mpf(0)
    for sigma in (mp.mpf("0.5"), mp.mpf("0.25"), mp.mpf("0.7")):
        for T in (mp.mpf("6.18"), mp.mpf("6.72"), mp.mpf("12.4"), mp.mpf("17.4")):
            m = int(mp.floor(T))
            d1b, d2b, R = bisector_weights(sigma, T)
            W, d1, d2, i, ch, _, om_n, om_np, psi = W_and_weights(sigma, T, m)
            worst_bis = max(worst_bis, abs(d1 - d1b), abs(d2 - d2b), abs(W - R))
            for k in (0, 1, max(0, m - 2), m - 1, m):
                W, d1, d2, i, ch, R, om_n, om_np, psi = W_and_weights(sigma, T, k)
                recon = d1 * mp.exp(-1j * om_n) + d2 * mp.exp(1j * (om_np + psi))
                worst_sum = max(worst_sum, abs(recon - W))
                lam = crossing_fraction(sigma, T, k)
                hat = (k + 1) ** sigma * d1
                worst_cut = max(worst_cut, abs(lam - hat))
    print(f"bisector reduction: {mp.nstr(worst_bis, 4)}")
    print(f"lambda vs (k+1)^sigma d1: {mp.nstr(worst_cut, 4)}")
    print("W reconstruction:", mp.nstr(worst_sum, 4))

    # A few explicit values at the running example.
    T = mp.mpf("6.18")
    print("\n sigma=1/2, T=6.18")
    for k in range(7):
        W, d1, d2, i, ch, R, om_n, om_np, psi = W_and_weights(mp.mpf("0.5"), T, k)
        lam = (k + 1) ** mp.mpf("0.5") * d1
        print(
            f"  k={k} i={i}  d1={mp.nstr(d1, 6)}  d2={mp.nstr(d2, 6)}"
            f"  hat d1={mp.nstr(lam, 6)}  |W|={mp.nstr(abs(W), 6)}"
        )


if __name__ == "__main__":
    main()
