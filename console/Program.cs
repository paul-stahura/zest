using System;
using MathNet.Numerics;
using MathNet.Numerics.IntegralTransforms;
using MathNet.Numerics.Differentiation;
using Complex = System.Numerics.Complex;

class InverseZetaFunction
{
    public static Complex ZetaDerivative(Complex s, int order)
    {
        var numericalDerivative = new NumericalDerivative(10, 5);
        Func<double, double> zetaReal = x => Zeta.EulerMaclauren(x).Real;
        Func<double, double> zetaImag = x => Zeta.EulerMaclauren(x).Imaginary;

        return new Complex(
            numericalDerivative.EvaluateDerivative(zetaReal, s.Real, order),
            numericalDerivative.EvaluateDerivative(zetaImag, s.Imaginary, order)
        );
    }

    public static Complex ZetaInverse(Complex s, int maxIter = 100, double tol = 1e-10)
    {
        Complex NewtonStep(Complex guess, Complex target)
        {
            return guess - (Zeta.EulerMaclauren(guess) - target) / ZetaDerivative(guess, 2);
        }

        Complex guess = new Complex(1, 0);
        Complex target = s;

        for (int i = 0; i < maxIter; i++)
        {
            Complex newGuess = NewtonStep(guess, target);
            if (Complex.Abs(newGuess - guess) < tol)
            {
                return newGuess;
            }
            guess = newGuess;
        }

        throw new InvalidOperationException($"Inverse Zeta function did not converge after {maxIter} iterations.");
    }

    static void Main(string[] args)
    {
        Complex s = new Complex(2, 0);
        Complex inverseZetaS = ZetaInverse(s);
        Console.WriteLine($"The inverse of zeta({s}) is approximately {inverseZetaS}");
    }
}

