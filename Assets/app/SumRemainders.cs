using System;
using System.Numerics;
using UnityEngine;

public class SumRemainders : MonoBehaviour
{
    #region ZpsRemainders
    public static Complex CalcZpsR1(double real, double index)
    {
        double imag = Zeta.IndexToImag(index);
        Complex R = ZakCalculator.Rak(real, index);
        double omega = Omega(index);
        double argChi = Arg(SpiralCalculator.ChiBrian(new Complex(real, imag)));

        double numerator = Math.Sin(omega - Arg(R) + argChi);
        double denominator = Math.Sin(2 * omega + argChi);

        Complex scalar = Complex.Pow(Math.Floor(index + 1), -Complex.ImaginaryOne * imag);

        Complex val = R.Magnitude * (numerator / denominator) * scalar;
        return val;
    }

    public static Complex CalcZpsR2(double real, double index)
    {
        double imag = Zeta.IndexToImag(index);
        Complex R = ZakCalculator.Rak(real, index);
        double omega = Omega(index);
        Complex chi = SpiralCalculator.ChiBrian(new Complex(real, imag));
        double argChi = Arg(chi);

        double numerator = Math.Sin(omega + Arg(R));
        double denominator = Math.Sin(2 * omega + argChi);

        Complex scalar = Complex.Pow(Math.Floor(index + 1), Complex.ImaginaryOne * imag) * chi / chi.Magnitude;

        Complex val = R.Magnitude * (numerator / denominator) * scalar;
        return val;
    }

    private static double Omega(double index)
    {
        return Zeta.IndexToImag(index) * Math.Log(Math.Ceiling(index));
    }

    private static double Arg(Complex z)
    {
        return Math.Atan2(z.Imaginary, z.Real);
    }
    #endregion

    #region ZakRemainders
    public static Complex CalcZakR1(double real, double index)
    {
        return -0.5 * Math.Pow(-1, Math.Floor(index)) * ZakCalculator.I1(real, index);
    }

    public static Complex CalcZakR2(double real, double index)
    {
        Complex chi = SpiralCalculator.ChiBrian(new Complex(real, Zeta.IndexToImag(index)));

        return -0.5 * Math.Pow(-1, Math.Floor(index)) * ZakCalculator.I2(real, index) * chi;
    }
    #endregion
}
