using System;
using System.Collections;
using System.Collections.Generic;
using System.Numerics;
using UnityEngine;

public class ZpsGeneral : MonoBehaviour
{
    private const double Fine = 1e-4;
    private const double PI = Math.PI;
    private const double TWO_PI = 2 * Math.PI;
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

        Vector yin = MiddleLinkTeardrop.Yin(index);
        Vector yang = MiddleLinkTeardrop.Yang(index);

        double linkLength = B_linkLength(real, index, imag, chi);

        Vector p1 = P_yinGenNumericalDerivative(index, yin, yang, linkLength);
        Vector p2 = P_yangGenNumericalDerivative(p1, yin, yang, linkLength);
        double djf = L_sectx(p1, p2) + 0.5f;

        return Vector.Lerp(cj1, cj2, djf);
    }

    public static Vector InverseBisector(double real, double index, double imag, Func<Complex, Complex> chiFunc)
    {
        var s = new Complex(real, imag);
        var (cji1, cji2) = Cji(index, s, chiFunc);
        var chi = chiFunc(s);

        Vector yin = MiddleLinkTeardrop.Yin(index);
        Vector yang = MiddleLinkTeardrop.Yang(index);

        double linkLength = B_linkLength(real, index, imag, chi);

        Vector p1 = P_yinGenNumericalDerivative(index, yin, yang, linkLength);
        Vector p2 = P_yangGenNumericalDerivative(p1, yin, yang, linkLength);
        double djf = L_sectx(p1, p2) + 0.5f;

        double dji = Vector.Distance(new Vector (djf - 0.5, 0), p2) / linkLength;

        return Vector.Lerp(cji1.ToVector(), cji2.ToVector(), dji);
    }

    static double L_sectx(Vector p1, Vector p2)
    {
        return p1.x - p1.y * ((p2.x - p1.x) / (p2.y - p1.y));
    }

    public static Vector Yin(double real, double index, Complex chi, Vector yinSpecial, Vector yangSpecial)
    {
        var imag = Zeta.IndexToImag(index);

        double linkLength = B_linkLength(real, index, imag, chi);

        return P_yinGenNumericalDerivative(index, yinSpecial, yangSpecial, linkLength);
    }

    public static Vector Yang(double real, double index, Complex chi, Vector yinGen, Vector yinSpecial, Vector yangSpecial)
    {
        var imag = Zeta.IndexToImag(index);

        double linkLength = B_linkLength(real, index, imag, chi);

        return P_yangGenNumericalDerivative(yinGen, yinSpecial, yangSpecial, linkLength);
    }

    #region Yin and Yang Calculation
    public static Vector YinSpecial(double index)
    {
        int n = (int)Math.Floor(index);
        double t = index - n;

        double yin = Dyin(n, t);
        double beta = Beta(n, t);

        Vector pt = new Vector
        (
            -yin * Math.Cos(beta) - 0.5, 
            -yin * Math.Sin(beta)
        );

        return pt;
    }

    private static double Dyin(int n, double t)
    {
        return -2*Square(n, t) * Math.Cos(Beta(n, t)) + (1 - 2*Square(n, t)) * Math.Sqrt(n+1)*R(t);
    }

    public static Vector YangSpecial(double index)
    {
        int n = (int)Math.Floor(index);
        double t = index - n;

        double yang = Dyang(n, t);
        double beta = Beta(n, t);

        Vector pt = new Vector
        (
            yang * Math.Cos(beta) + 0.5,
            yang * Math.Sin(beta)
        );

        return pt;
    }

    private static double Dyang(int n, double t)
    {
        return -2*Math.Cos(Beta(n, t)) - Dyin(n, t);
    }

    private static double Beta(int n, double t)
    {
        double imag = Zeta.IndexToImag(t);
        return Math.Log(n + 1)*imag - Theta(imag) - Math.PI*(n*n - 2*n);
    }

    private static double Theta(double t)
    {
        return t / 2 * Math.Log(t / (2 * Math.PI)) - t / 2 - Math.PI / 8 + 1 / (48 * t) + 7 / (5760 * Math.Pow(t, 3)) + 31 / (80640 * Math.Pow(t, 5)) + 127 / (430080 * Math.Pow(t, 7)) + 511 / (1216512 * Math.Pow(t, 9));
    }

    private static int Square(int n, double t)
    {
        return (int)(Math.Floor(Math.Sqrt(Zeta.IndexToImag(t) / TWO_PI)) - n);
    }

    /// <param name="t">t = index fractional part</param>
    private static double R(double t)
    {
        double psi(double x) => Math.Cos(TWO_PI * (x*x - x - 1.0 / 16.0)) / Math.Cos(TWO_PI * x);

        double tRoot = Math.Sqrt(Zeta.IndexToImag(t) / TWO_PI);
        double tFrac = tRoot - (int)Math.Floor(tRoot);

        return Math.Sqrt(tRoot) * psi(tFrac) - PsiPrime3(tFrac) / (96.0 * Math.Pow(Math.PI, 2.0)) * tRoot;
        // C1 == PsiPrime3(tFrac) / (96.0 * Math.Pow(Math.PI, 2.0)) * tRoot
    }

    /// <param name="tFrac">t = sqrt(imag(index) / 2PI), tFrac is the fractional part of t</param>
    private static double PsiPrime3(double tFrac)
    {
        double t2 = tFrac * tFrac;
        double oneMinus2t = 1.0 - 2.0 * tFrac;
        double oneMinus2tSq = oneMinus2t * oneMinus2t;
        double neg1Plus2t = -1.0 + 2.0 * tFrac;

        double twoPiT = TWO_PI * tFrac;
        double fourPiT = 4.0 * PI * tFrac;
        double sixPiT = 6.0 * PI * tFrac;
        double quadTerm = -1.0 / 16.0 - tFrac + t2;
        double twoPiQuad = TWO_PI * quadTerm;

        // Trig evaluations
        double cos2PiT = Math.Cos(twoPiT);
        double sin2PiT = Math.Sin(twoPiT);
        double cos4PiT = Math.Cos(fourPiT);
        double sin6PiT = Math.Sin(sixPiT);

        double cosQuad = Math.Cos(twoPiQuad);
        double sinQuad = Math.Sin(twoPiQuad);

        // Inverses and powers
        double sec2PiT = 1.0 / cos2PiT;
        double sec2PiT2 = sec2PiT * sec2PiT;
        double sec2PiT3 = sec2PiT2 * sec2PiT;
        double tan2PiT = sin2PiT / cos2PiT;

        // Components
        double term1 = -TWO_PI * cosQuad * sec2PiT3 * (-23.0 * sin2PiT + sin6PiT);
        double term2 = 6.0 * TWO_PI * neg1Plus2t * (-3.0 + cos4PiT) * sec2PiT2 * sinQuad;
        double term3 = 4.0 * PI * neg1Plus2t * (-3.0 * cosQuad + PI * oneMinus2tSq * sinQuad);
        double term4 = 3.0 * (-4.0 * TWO_PI * oneMinus2tSq * cosQuad - 4.0 * PI * sinQuad) * tan2PiT;

        return TWO_PI * sec2PiT * (term1 + term2 + term3 + term4);
    }
    #endregion

    #region Yin and Yang Aproximation
    /// <summary>
    /// <param name="maxN">maxN can be at most 20</param>
    /// <param name="tFrac">t = sqrt(imag(index) / 2PI), tFrac is the fractional part of t</param>
    /// <param name="order">order is the order of the derivative</param>
    /// <summary>
    private static double PsiApprox(double tFrac, int order, int maxN = 12)
    {
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

            // Apply the term: coeff * c[n + 1] * (t - 0.5)^(n - order)
            result += coeff * c[n + 1] * Math.Pow(tFrac - 0.5, n - order);
        }

        return result;
    }
    
    /// <summary>
    /// /// <param name="t">t = sqrt(imag(index) / 2PI)</param>
    private static double RApprox(double t)
    {
        double tFrac = t - Math.Floor(t);
        return Math.Pow(t, -0.5) * PsiApprox(tFrac, 0) - PsiApprox(tFrac, 3)*t;
    }

    private static double YinApprox(double index)
    {
        int n = (int)Math.Floor(index);
        double t = index - n;
        return -2 * Square(t) * Math.Cos(Beta())
    }

    // private static double PImagFractional(double index)
    // {
    //     double real = index - (int)Math.Floor(index);
    //     double imag = Zeta.IndexToImag(real);

    //     const double TWO_PI = 2 * Math.PI;

    //     double t = Math.Pow(imag / TWO_PI, -0.5);

    //     return t - (int)Math.Floor(t);
    // }
    #endregion

    #region Yin and Yang Numerical Derivative
    // calculate Yin with numerical derivative
    static Vector P_yinGenNumericalDerivative(double index, Vector yin, Vector yang, double linkLength)
    {
        Vector yinNormal = ComputeNormal(MiddleLinkTeardrop.Yin, index) * 0.5;
        Vector yin1 = yin + yinNormal;
        Vector yin2 = yin - yinNormal;

        Vector yangNormal = ComputeNormal(MiddleLinkTeardrop.Yang, index) * 0.5;
        Vector yang1 = yang + yangNormal;
        Vector yang2 = yang - yangNormal;

        return SBisect(linkLength, yang1, yang2, yin1, yin2, yang, yin);
    }

    public static Vector ComputeNormal(Func<double, Vector> func, double point, double epsilon = Fine)
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

    // calculate Yang with numerical derivative
    static Vector P_yangGenNumericalDerivative(Vector pYinGen, Vector yin, Vector yang, double linkLength)
    {
        Vector diff = yin - yang;
        return pYinGen + (diff * linkLength);
    }
    #endregion

    public static double B_linkLength(double real, double index, double imag, Complex chi)
    {
        (Vector cj1, Vector cj2) = Cj(1 - real, index, imag);

        Complex delta = cj2 - cj1; // Calculate the difference

        // Apply the complex multiplication with chi
        Complex result = Complex.Abs(chi * delta); // Take absolute value after multiplication

        double ceilT = Math.Ceiling(index);
        double powerTerm = Math.Pow(ceilT, real);

        return result.Real * powerTerm;
    }

    public static Vector SBisect(
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
