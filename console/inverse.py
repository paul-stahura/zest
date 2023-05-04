import mpmath

def zeta_inverse1(s, max_iter=100, tol=1e-10):
    def zeta_derivative(s):
        return mpmath.diff(mpmath.zetac, s) + 1

    def newton_step(s, target):
        return s - (mpmath.zetac(s) + 1 - target) / zeta_derivative(s)

    s_guess = mpmath.mpc(.5, 0)
    target = mpmath.mpc(s)

    for _ in range(max_iter):
        new_s_guess = newton_step(s_guess, target)
        if abs(new_s_guess - s_guess) < tol:
            return new_s_guess
        s_guess = new_s_guess

    raise ValueError(f'Inverse Zeta function did not converge after {max_iter} iterations')

import mpmath

def zeta_inverse(s, max_iter=100, tol=1e-10):
    def zeta_derivative(s):
        return mpmath.diff(mpmath.zeta, s)

    def newton_step(s, target):
        return s - (mpmath.zeta(s) - target) / zeta_derivative(s)

    s_guess = mpmath.mpc(.5, 0)
    target = mpmath.mpc(s)

    for _ in range(max_iter):
        new_s_guess = newton_step(s_guess, target)
        if abs(new_s_guess - s_guess) < tol:
            return new_s_guess
        s_guess = new_s_guess

    raise ValueError(f'Inverse Zeta function did not converge after {max_iter} iterations')


# Example usage:
s = complex(.5, 14.1)
zeta = mpmath.zeta(s)
inverse_zeta_s = zeta_inverse(s)
print(f'The inverse of zeta({s}): {zeta} is approximately {inverse_zeta_s}')
