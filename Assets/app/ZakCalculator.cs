using System;
using System.Numerics;
using UnityEngine;

public class ZakCalculator : MonoBehaviour
{
    private static readonly Complex omega0 = new Complex(0.1926019633029103199063, 0.02472986965795651842299);

    private static readonly Complex[] omega = new Complex[]
    {
        new Complex(0.1582954327321094104502, 0.04149113569204600502105),
        new Complex(0.07826728293587305110862, 0.05215518667623989653254),
        new Complex(0.01940595049247490540621, 0.02977286598777633378610),
        new Complex(0.0016911847719027555036966, 0.008938933548999206800196),
        new Complex(-0.0002994777986686168319731, 0.001567541981830224487301),
        new Complex(-0.00009837202592542590210980, 0.0001502108057352792742070),
        new Complex(-0.000009346989286415688998740, 0.000005793852209955845432028),
        new Complex(-0.0000002451577304299235983015, 0.000000006134784898751456953524)
    };

    private static readonly Complex[] lambda = new Complex[]
    {
        new Complex(0.152845417613666702426, -0.119440685603870510384),
        new Complex(0.302346225128945757427, -0.243989695504400621268),
        new Complex(0.451119584531782942888, -0.378479770209444563858),
        new Complex(0.604563710297226464637, -0.523486888629095259770),
        new Complex(0.765965706759629396959, -0.678405572413543444272),
        new Complex(0.938371150977889047740, -0.845332361280975174880),
        new Complex(1.128148837845288402558, -1.030737947568157685685),
        new Complex(1.353030558654668162533, -1.252503278108132307164)
    };

    private static Complex I1(double r, double t)
    {
        double floorT = Math.Floor(t);
        double halfPlusT = floorT + 0.5;
        Complex z = new Complex(r, Zeta.IndexToImag(t));
        Complex baseExp = -z * Complex.Log(halfPlusT);

        Complex sum = omega0;

        for (int n = 0; n < omega.Length; n++)
        {
            Complex lambdaN = lambda[n];
            Complex zLnPlus = -2 * Math.PI * halfPlusT * lambdaN - z * Complex.Log(1 + Complex.ImaginaryOne * lambdaN / halfPlusT);
            Complex zLnMinus = 2 * Math.PI * halfPlusT * lambdaN - z * Complex.Log(1 - Complex.ImaginaryOne * lambdaN / halfPlusT);

            sum += omega[n] * (Complex.Exp(zLnPlus) + Complex.Exp(zLnMinus));
        }

        return Complex.Exp(baseExp) * sum;
    }

    private static Complex I2(double r, double t) => Complex.Conjugate(I1(1 - r, t));

    public static Complex Rak(double real, double index)
    {
        double floorT = Math.Floor(index);

        Complex chi = SpiralCalculator.ChiBrian(new Complex(real, Zeta.IndexToImag(index)));

        return -0.5 * Math.Pow(-1, floorT) * (I1(real, index) + chi * I2(real, index));
    }

    public static Vector[] CalcZakLinks(double real, double index)
    {
        // forward links
        double imag = Zeta.IndexToImag(index);

        int maxJ = (int)Math.Floor(index);

        var forwardLinks = new Vector[maxJ + 1];
        for (int j = 0; j <= maxJ; j++)
        {
            double sumX = 0.0;
            double sumY = 0.0;

            for (int n = 1; n <= j; n++)
            {
                double logn = Math.Log(n);
                double angle = imag * logn;
                double denominator = Math.Pow(n, real);

                sumX += Math.Cos(angle) / denominator;
                sumY += Math.Sin(angle) / denominator;
            }

            forwardLinks[j] = new Vector(sumX, -sumY);
        }

        // remainder link
        var remainderLink = Rak(real, index).ToVector();

        // inverse links
        var inverseLinks = new Vector[maxJ + 1];

        Complex z = new Complex(real, imag);
        Complex chiVal = SpiralCalculator.ChiBrian(z);

        for (int j = 0; j <= maxJ; j++)
        {
            double realSum = 0;
            double imagSum = 0;

            for (int n = 1; n <= j; n++)
            {
                double lnN = Math.Log(n);
                double denom = Math.Pow(n, 1 - real);
                realSum += Math.Cos(imag * lnN) / denom;
                imagSum += Math.Sin(imag * lnN) / denom;
            }

            Complex seriesSum = new Complex(realSum, imagSum);
            inverseLinks[j] = (chiVal * seriesSum).ToVector();
        }

        // Combine forward, remainder, and inverse links
        var prevInverse = new Vector(0, 0);

        var zakLinks = new Vector[forwardLinks.Length + inverseLinks.Length];
        for (int i = 0; i < zakLinks.Length; i++)
        {
            if (i < forwardLinks.Length)
            {
                zakLinks[i] = forwardLinks[i];
            }
            else if (i < forwardLinks.Length + 1)
            {
                zakLinks[i] = zakLinks[forwardLinks.Length - 1] + remainderLink;
            }
            else
            {
                // add in reverse order
                int startLink = inverseLinks.Length - 1 - (i - forwardLinks.Length - 1);
                int endLink = inverseLinks.Length - 2 - (i - forwardLinks.Length - 1);
                var inverseLink = inverseLinks[startLink] - inverseLinks[endLink];
                prevInverse += inverseLink;
                zakLinks[i] = zakLinks[forwardLinks.Length] + prevInverse;
            }
        }

        return zakLinks;
    }
    
    public static Vector[] CalcZakInverseLinks(double real, double index)
    {
        // forward links
        double imag = Zeta.IndexToImag(index);

        int maxJ = (int)Math.Floor(index);

        var forwardLinks = new Vector[maxJ + 1];
        for (int j = 0; j <= maxJ; j++)
        {
            double sumX = 0.0;
            double sumY = 0.0;

            for (int n = 1; n <= j; n++)
            {
                double logn = Math.Log(n);
                double angle = imag * logn;
                double denominator = Math.Pow(n, real);

                sumX += Math.Cos(angle) / denominator;
                sumY += Math.Sin(angle) / denominator;
            }

            forwardLinks[j] = new Vector(sumX, -sumY);
        }

        // remainder link
        var remainderLink = Rak(real, index).ToVector();

        // inverse links
        var inverseLinks = new Vector[maxJ + 1];

        Complex z = new Complex(real, imag);
        Complex chiVal = SpiralCalculator.ChiBrian(z);

        for (int j = 0; j <= maxJ; j++)
        {
            double realSum = 0;
            double imagSum = 0;

            for (int n = 1; n <= j; n++)
            {
                double lnN = Math.Log(n);
                double denom = Math.Pow(n, 1 - real);
                realSum += Math.Cos(imag * lnN) / denom;
                imagSum += Math.Sin(imag * lnN) / denom;
            }

            Complex seriesSum = new Complex(realSum, imagSum);
            inverseLinks[j] = (chiVal * seriesSum).ToVector();
        }

        // Combine forward, remainder, and inverse links
        var prevInverse = new Vector(0,0);

        var zakLinks = new Vector[forwardLinks.Length + inverseLinks.Length];
        for (int i = 0; i < zakLinks.Length; i++)
        {
            if (i < forwardLinks.Length)
            {
                // zakLinks[i] = forwardLinks[i];
                zakLinks[i] = inverseLinks[i];
            }
            else if (i < forwardLinks.Length + 1)
            {
                zakLinks[i] = zakLinks[forwardLinks.Length - 1] + remainderLink;
            }
            else
            {
                // add in reverse order
                int startLink = forwardLinks.Length - 1 - (i - forwardLinks.Length - 1);
                int endLink = forwardLinks.Length - 2 - (i - forwardLinks.Length - 1);
                var inverseLink = forwardLinks[startLink] - forwardLinks[endLink];
                prevInverse += inverseLink;
                zakLinks[i] = zakLinks[forwardLinks.Length] + prevInverse;
            }
        }

        return zakLinks;
    }
}
