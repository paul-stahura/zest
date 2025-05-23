using System;
using System.Collections;
using System.Collections.Generic;
using System.Numerics;
using UnityEngine;

public enum YinYangCalculationMethod
{
    Approximate = 0,
    Symbolic = 1,
    Numeric = 2
}
public class ZpsGeneral : MonoBehaviour
{
    private const double Fine = 1e-4;
    private const double PI = Math.PI;
    private const double TWO_PI = 2 * Math.PI;

    // needs to be double checked
    private static readonly double[] c = 
    {
        0.382683432365,
        0,
        1.74896187231,
        0,
        2.11802520769,
        0,
        -0.870721667051,
        0,
        -3.47331122434,
        0,
        -1.66269473095,
        0,
        1.21673128847,
        0,
        1.30143041909,
        0,
        0.0305113792419,
        0,
        -0.375583648682,
        0,
        -0.108642578125
    };

    public static Vector ForwardBisector(double real, double index, double imag, Complex chi)
    {
        var (cj1, cj2) = Cj(real, index, imag);

        Vector yinSpecial = YinSpecial(index);
        Vector yangSpecial = YangSpecial(index);

        var (yin, yang) = YinYang(real, index, chi, yinSpecial, yangSpecial);
        double djf = L_sectx(yang, yin) + 0.5f;

        return Vector.Lerp(cj1, cj2, djf);
    }

    public static Vector InverseBisector(double real, double index, double imag, Func<Complex, Complex> chiFunc)
    {
        var s = new Complex(real, imag);
        var (cji1, cji2) = Cji(index, s, chiFunc);
        var chi = chiFunc(s);

        Vector yinSpecial = YinSpecial(index);
        Vector yangSpecial = YangSpecial(index);

        double linkLength = B_linkLength(real, index, imag, chi);

        var (yin, yang) = YinYang(real, index, chi, yinSpecial, yangSpecial);

        var l = L_sectx(yang, yin) + 0.5;
        double dji = Vector.Distance(new Vector(l - 0.5, 0), yin) / linkLength;

        return Vector.Lerp(cji1.ToVector(), cji2.ToVector(), dji);
    }

    static double L_sectx(Vector p1, Vector p2)
    {
        return p1.x - p1.y * ((p2.x - p1.x) / (p2.y - p1.y));
    }
    
    public static (Vector yin, Vector yang) YinYang(double real, double index, Complex chi, Vector yinSpecial, Vector yangSpecial, YinYangCalculationMethod method = YinYangCalculationMethod.Approximate)
    {
        var imag = Zeta.IndexToImag(index);

        double linkLength = B_linkLength(real, index, imag, chi);

        Vector yinNormal = new Vector(0, 0);
        Vector yangNormal = new Vector(0, 0);

        switch (method)
        {
            case YinYangCalculationMethod.Approximate:
                Vector yinPrimeApprox = YinPrime(index);
                Vector yangPrimeApprox = YangPrime(index);
                yinNormal = new Vector(-yinPrimeApprox.y, yinPrimeApprox.x) * 0.2 / 2 * Math.Sqrt(yinPrimeApprox.x * yinPrimeApprox.x + yinPrimeApprox.y * yinPrimeApprox.y);
                yangNormal = new Vector(-yangPrimeApprox.y, yangPrimeApprox.x) * 0.2 / 2 * Math.Sqrt(yangPrimeApprox.x * yangPrimeApprox.x + yangPrimeApprox.y * yangPrimeApprox.y);
                break;
                
            case YinYangCalculationMethod.Symbolic:
                Vector yinPrime = YinPrime(index, false);
                Vector yangPrime = YangPrime(index, false);
                yinNormal = new Vector(-yinPrime.y, yinPrime.x) * 0.2 / 2 * Math.Sqrt(yinPrime.x * yinPrime.x + yinPrime.y * yinPrime.y);
                yangNormal = new Vector(-yangPrime.y, yangPrime.x) * 0.2 / 2 * Math.Sqrt(yangPrime.x * yangPrime.x + yangPrime.y * yangPrime.y);
                break;

            case YinYangCalculationMethod.Numeric:
                yinNormal = ComputeNormal(MiddleLinkTeardrop.Yin, index) * 0.5;
                yangNormal = ComputeNormal(MiddleLinkTeardrop.Yang, index) * 0.5;
                break;
        }

        Vector yin1 = yinSpecial + yinNormal;
        Vector yin2 = yinSpecial - yinNormal;
        
        Vector yang1 = yangSpecial + yangNormal;
        Vector yang2 = yangSpecial - yangNormal;

        Vector yin = SBisect(linkLength, yang1, yang2, yin1, yin2, yangSpecial, yinSpecial) + (yinSpecial - yangSpecial) * linkLength;
        Vector yang = SBisect(linkLength, yang1, yang2, yin1, yin2, yangSpecial, yinSpecial);
        return (yin, yang);
    }

    #region Yin and Yang Calculation
    /// <summary>
    /// Yin calculation for the special case where real = 0.5
    /// </summary>
    /// <param name="useApprox">useApprox = true to use approximations in place of actual PsiDerivatives</param>
    public static Vector YinSpecial(double index, bool useApprox = true)
    {
        double yin = Dyin(index, useApprox);
        double beta = Beta(index);

        Vector pt = new Vector
        (
            -yin * Math.Cos(beta) - 0.5, 
            -yin * Math.Sin(beta)
        );

        return pt;
    }

    private static double Dyin(double index, bool useApprox)
    {
        int n = (int)Math.Floor(index);
        return -2.0*Square(index) * Math.Cos(Beta(index)) + (1.0 - 2.0*Square(index)) * Math.Sqrt(n+1)* R(index, useApprox);
    }

    /// <summary>
    /// yang calculation for the special case where real = 0.5
    /// </summary>
    /// <param name="useApprox">useApprox = true to use approximations in place of actual PsiDerivatives</param>
    public static Vector YangSpecial(double index, bool useApprox = true)
    {
        double yang = Dyang(index, useApprox);
        double beta = Beta(index);

        Vector pt = new Vector
        (
            yang * Math.Cos(beta) + 0.5,
            yang * Math.Sin(beta)
        );

        return pt;
    }

    private static double Dyang(double index, bool useApprox)
    {
        return -2*Math.Cos(Beta(index)) - Dyin(index, useApprox);
    }

    private static double Beta(double index)
    {
        int n = (int)Math.Floor(index);
        double imag = Zeta.IndexToImag(index);
        return Math.Log(n + 1)*imag - Theta(imag) - PI*(n*n + 2*n);
    }

    private static double Theta(double imag)
    {
        return imag / 2 * Math.Log(imag / TWO_PI) - (PI / 8) - (imag / 2) + (1 / (48 * imag));
        // more terms do not result in significant changes
        // + (7 / (5760 * Math.Pow(x, 3))) + (31 / (80640 * Math.Pow(x, 5))) + (127 / (430080 * Math.Pow(x, 7))) + (511 / (1216512 * Math.Pow(x, 9)));
    }

    private static int Square(double index)
    {
        return (int)(Math.Floor(Math.Sqrt(Zeta.IndexToImag(index) / TWO_PI)) - (int)Math.Floor(index));
    }

    private static double R(double index, bool useApprox)
    {
        double psi = useApprox ? PsiApprox(index, 0) : Psi(index);
        double psiPrime3 = useApprox ? PsiApprox(index, 3) : PsiPrime3(index);
        double imag = Zeta.IndexToImag(index);

        double C1 = -(psiPrime3 / (96 * PI * PI)) * Math.Pow(imag / TWO_PI, -0.5);

        return Math.Pow(imag / TWO_PI, -0.25) * (psi + C1);
    }
    
    private static double P(double index)
    {
        return Math.Sqrt(Zeta.IndexToImag(index) / TWO_PI) % 1;
    }
    #endregion

    #region Psi and Derivatives
    /// <summary>
    /// <param name="order">order is the number of derivatives</param>
    /// <param name="maxN">maxN can be at most 20</param>
    /// <summary>
    private static double PsiApprox(double index, int order, int maxN = 12)
    {
        double t = P(index);

        double result = 0.0;

        for (int n = 0; n <= maxN; n++)
        {
            // Skip terms where the exponent would be negative
            if (n < order) continue;

            // Compute the coefficient multiplier for the derivative (n * (n-1) * ... * (n - order + 1))
            double coeff = 1.0;
            for (int k = 0; k < order; k++)
            {
                coeff *= (n - k);
            }

            // Apply the term: coeff * c[n] * (t - 0.5)^(n - order)
            result += coeff * c[n] * Math.Pow(t - 0.5, n - order);
        }

        return result;
    }

    private static double Psi(double index)
    {
        double t = P(index);

        return Math.Cos(TWO_PI * (t*t - t - (1.0/16.0))) / Math.Cos(TWO_PI * t);
    }

    private static double PsiPrime(double index)
    {
        double t = P(index);

        double v = TWO_PI * (t*t - t - (1.0/16.0));

        double Sec(double x) {
            double cosX = Math.Cos(x);
            const double epsilon = 1e-12; // Tolerance for "close to zero"
            if (Math.Abs(cosX) < epsilon)
            {
                return double.PositiveInfinity;
            }
            return 1.0 / cosX;
        }

        return TWO_PI * Sec(TWO_PI * t) * ((1 - 2*t) * Math.Sin(v) + Math.Cos(v) * Math.Tan(TWO_PI * t));
    }

    private static double PsiPrime3(double index)
    {
        double t = P(index);

        double twoPiT = TWO_PI * t;
        double fourPiT = 4 * PI * t;
        double sixPiT = 6 * PI * t;

        double cos2PiT = Math.Cos(twoPiT);
        double sin2PiT = Math.Sin(twoPiT);
        double sin6PiT = Math.Sin(sixPiT);
        double cos4PiT = Math.Cos(fourPiT);
        double sec2PiT = 1.0 / cos2PiT;
        double tan2PiT = Math.Tan(twoPiT);

        double exprInner = -1.0 / 16.0 - t + t * t;
        double angle = TWO_PI * exprInner;

        double cosAngle = Math.Cos(angle);
        double sinAngle = Math.Sin(angle);

        double term1 = -Math.Pow(PI, 2) * cosAngle * Math.Pow(sec2PiT, 3) * (-23 * sin2PiT + sin6PiT);
        double term2 = 6 * Math.Pow(PI, 2) * (2 * t - 1) * (-3 + cos4PiT) * Math.Pow(sec2PiT, 2) * sinAngle;
        double term3 = 4 * PI * (2 * t - 1) * (-3 * cosAngle + PI * Math.Pow(1 - 2 * t, 2) * sinAngle);
        double term4 = 3 * (-4 * Math.Pow(PI, 2) * Math.Pow(1 - 2 * t, 2) * cosAngle - 4 * PI * sinAngle) * tan2PiT;

        double result = TWO_PI * sec2PiT * (term1 + term2 + term3 + term4);
        return result;
    }

    private static double PsiPrime4(double index)
    {
        double t = P(index);

        double tp = TWO_PI * t;
        double cosTp = Math.Cos(tp);
        double sinTp = Math.Sin(tp);
        double secTp = 1.0 / cosTp;
        double tanTp = Math.Tan(tp);

        double sec2 = secTp * secTp;
        double sec3 = sec2 * secTp;
        double sec4 = sec2 * sec2;

        double cos4pt = Math.Cos(4 * PI * t);
        double cos8pt = Math.Cos(8 * PI * t);
        double sin6pt = Math.Sin(6 * PI * t);

        double u = -1.0 / 16.0 - t + t * t;
        double u2p = TWO_PI * u;
        double cosU = Math.Cos(u2p);
        double sinU = Math.Sin(u2p);

        double a = 1 - 2 * t;
        double a2 = a * a;
        double a4 = a2 * a2;

        double pi2 = PI * PI;

        double term1 = pi2 * (115 - 76 * cos4pt + cos8pt) * cosU * sec4;
        double term2 = 8 * pi2 * -a * sec3 * (-23 * sinTp + sin6pt) * sinU;
        double term3 = -6 * (cos4pt - 3) * sec2 * (-4 * pi2 * a2 * cosU - 4 * PI * sinU);
        double term4 = 8 * (-3 * cosU + pi2 * a4 * cosU + 6 * PI * a2 * sinU);
        double term5 = 32 * PI * -a * (-3 * cosU + PI * a2 * sinU) * tanTp;

        return 2 * pi2 * secTp * (term1 + term2 + term3 + term4 + term5);
    }
    #endregion

    #region Yin and Yang Derivatives
    /// <param name="useApprox">useApprox = true to use approximations in place of symbolic derivatives</param>
    private static Vector YinPrime(double index, bool useApprox = true)
    {
        double yin = Dyin(index, useApprox);
        double yinPrime = DyinPrime(index, useApprox);
        double beta = Beta(index);
        double betaPrime = BetaPrime(index);

        Vector pt = new Vector
        (
            -yinPrime * Math.Cos(beta) + yin * Math.Sin(beta) * betaPrime, 
            -yinPrime * Math.Sin(beta) - yin * Math.Cos(beta) * betaPrime
        );

        return pt;
    }

    private static double DyinPrime(double index, bool useApprox)
    {
        return 2*Square(index) * Math.Sin(Beta(index)) * BetaPrime(index) + (1.0 - 2.0*Square(index)) * Math.Sqrt((int)Math.Floor(index) + 1)* RPrime(index, useApprox);
    }

    /// <param name="n">n = index integer part</param>
    /// <param name="t">t = index fractional part</param>
    /// <param name="useApprox">useApprox = true to use approximations in place of symbolic derivatives</param>
    private static Vector YangPrime(double index, bool useApprox = true)
    {
        double yang = Dyang(index, useApprox);
        double yangPrime = DyangPrime(index, useApprox);
        double beta = Beta(index);
        double betaPrime = BetaPrime(index);

        Vector pt = new Vector
        (
            -yang * Math.Sin(beta) * betaPrime + yangPrime * Math.Cos(beta), 
            yang * Math.Cos(beta) * betaPrime + yangPrime * Math.Sin(beta)
        );

        return pt;
    }

    private static double DyangPrime(double index, bool useApprox)
    {
        return 2 * Math.Sin(Beta(index)) * BetaPrime(index) - DyinPrime(index, useApprox);
    }

    private static double BetaPrime(double index)
    {
        return (Math.Log((int)Math.Floor(index) + 1) - ThetaPrime(Zeta.IndexToImag(index))) * IndexToImagPrime(index);
    }

    private static double IndexToImagPrime(double index)
    {
        double log = Math.Log(1 + 1/index);
        return PI * (1 + 2*index + 2*index*(index + 1) * log) / (index * (index + 1) * Math.Pow(log, 2));
    }

    private static double ThetaPrime(double imag)
    {
        return 0.5 * Math.Log(imag / TWO_PI) - (1 / (48 * (imag * imag)));
    }

    private static double RPrime(double index, bool useApprox)
    {
        double psi = useApprox ? PsiApprox(index, 0) : Psi(index);
        double psiPrime = useApprox ? PsiApprox(index, 1) : PsiPrime(index);
        double psiPrime3 = useApprox ? PsiApprox(index, 3) : PsiPrime3(index);
        double psiPrime4 = useApprox ? PsiApprox(index, 4) : PsiPrime4(index);

        double imag = Zeta.IndexToImag(index);
        double imagPrime = IndexToImagPrime(index);

        double pPrime = PPrime(index);

        double term1 = -(Math.Pow(PI, 0.25) * psi * imagPrime) / (Math.Pow(2, 7.0/4.0) * Math.Pow(imag, 5.0/4.0));
        double term2 = (psiPrime3 * imagPrime) / (96 * Math.Sqrt(2) * Math.Pow(PI, 3.0/2.0) * Math.Pow(imag, 3.0/2.0));
        double term3 = (Math.Pow(TWO_PI, 0.25) * psiPrime * pPrime) / Math.Pow(imag, 0.25);
        double term4 = -(psiPrime4 * pPrime) / (48 * Math.Sqrt(2) * Math.Pow(PI, 3.0/2.0) * Math.Pow(imag, 1.0/2.0));

        return term1 + term2 + term3 + term4;
    }

    private static double PPrime(double index)
    {
        int n = (int)Math.Floor(index);
        double mod = index % 1;
        double log = Math.Log(1 + 1 / index);
        return (1 + 2*index + 2*(n*n + index + 2*n * mod + mod*mod) * log) /
               (2 * index * (1 + index) * Math.Sqrt((2 + 4*index) / log) * (log * log));
    }
    #endregion

    #region Yin and Yang Numerical Derivative
    private static Vector ComputeNormal(Func<double, Vector> func, double point, double epsilon = Fine)
    {
        var yangDeriv = new Vector(0, 0); // Initialize yangDeriv to zero

        // get the first digit of point
        int firstDigit = (int)Math.Floor(point);
        if((int)Math.Floor(point - epsilon) != firstDigit)
        {
            // Compute the gradient using one small step forward
            Vector now = func(point);
            Vector next = func(point + epsilon);
            yangDeriv = new Vector(
                (next.x - now.x) / epsilon,  // Gradient in x-direction
                (next.y - now.y) / epsilon   // Gradient in y-direction
            );
        }
        else if((int)Math.Floor(point + epsilon) != firstDigit)
        {
            // Compute the gradient using one small step backward
            Vector now = func(point);
            Vector prev = func(point - epsilon);
            yangDeriv = new Vector(
                (now.x - prev.x) / epsilon,  // Gradient in x-direction
                (now.y - prev.y) / epsilon   // Gradient in y-direction
            );
        }
        else
        {
            // Compute the gradient using two small steps (forward and backward) in each direction
            yangDeriv = new Vector(
                (func(point + epsilon).x - func(point - epsilon).x) / (2 * epsilon),  // Gradient in x-direction
                (func(point + epsilon).y - func(point - epsilon).y) / (2 * epsilon)   // Gradient in y-direction
            );
        }

        // Calculate the magnitude (or norm) of the vector
        double magnitude = Math.Sqrt(yangDeriv.x * yangDeriv.x + yangDeriv.y * yangDeriv.y);
        
        // Return the normalized vector as N_ormalYang(t)
        return new Vector(
            -yangDeriv.y / magnitude,
            yangDeriv.x / magnitude
        );
    }
    #endregion

    private static double B_linkLength(double real, double index, double imag, Complex chi)
    {
        (Vector cj1, Vector cj2) = Cj(1 - real, index, imag);

        Complex delta = cj2 - cj1; // Calculate the difference

        // Apply the complex multiplication with chi
        Complex result = Complex.Abs(chi * delta); // Take absolute value after multiplication

        double ceilT = Math.Ceiling(index);
        double powerTerm = Math.Pow(ceilT, real);

        return result.Real * powerTerm;
    }

    private static Vector SBisect(
        double d,
        Vector O1,
        Vector O2,
        Vector T1,
        Vector T2,
        Vector L1,
        Vector L2)
    {
        double T2x_T1x = T2.x - T1.x;
        double T2y_T1y = T2.y - T1.y;
        double O2x_O1x = O2.x - O1.x;
        double O2y_O1y = O2.y - O1.y;

        double numerator = T2y_T1y * (O1.x - T1.x + d * (L2.x - L1.x))
                        - T2x_T1x * (O1.y - T1.y + d * (L2.y - L1.y));

        double denominator = O2y_O1y * T2x_T1x
                          - O2x_O1x * T2y_T1y;

        double fraction = numerator / denominator;

        double x = O1.x + fraction * O2x_O1x;
        double y = O1.y + fraction * O2y_O1y;

        return new Vector(x, y);
    }

    private static (Vector cj1, Vector cj2) Cj(double real, double index, double imag)
    {
        Vector p1 = new Vector(0, 0);
        Vector p2 = new Vector(0, 0);
        int nLimit = (int)Math.Ceiling(index);
        for (int n = 1; n <= nLimit; n++)
        {
            if(n != nLimit)
            {
                p1.x += (float)(Math.Cos(-imag * Math.Log(n)) / Math.Pow(n, real));
                p1.y += (float)(Math.Sin(-imag * Math.Log(n)) / Math.Pow(n, real));
            }
            else
            {
                p2.x = p1.x + (float)(Math.Cos(-imag * Math.Log(n)) / Math.Pow(n, real));
                p2.y = p1.y + (float)(Math.Sin(-imag * Math.Log(n)) / Math.Pow(n, real));
            }
        }

        return (p1, p2);
    }

    private static (Complex cji1, Complex cji2) Cji(double index, Complex s, Func<Complex, Complex> chifunc)
    {
        Complex p1 = Complex.Zero;
        Complex p2 = Complex.Zero;
        int nLimit = (int)Math.Ceiling(index);
        for (int n = 1; n <= nLimit; n++)
        {
            Complex next = Complex.Pow(n, s - 1) * chifunc(s);

            if(n != nLimit)
            {
                p1 += next;
            }
            else
            {
                p2 = p1 + next;
            }
        }

        return (p1, p2);
    }
}
