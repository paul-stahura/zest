using System;
using System.Linq;
using System.Collections.Generic;
using UnityEngine;
using Complex = System.Numerics.Complex;
using MoonSharp.Interpreter;
using System.Drawing.Drawing2D;
using UnityEditor;
using SRDebugger.UI.Controls.Data;
using UnityEngine.UI;

public class Zeta
{
    const int MIN_N = 100;
    const int MAX_N = 1000000;
    const double TWO_PI = (Math.PI * 2);
    static readonly double SQRT_TWO_PI = Math.Sqrt(TWO_PI);
    const double CABS_Z_MAX = 10000.0;
    const int MAX_ITS = 5000;
    const double MAX_GAMMA = 450;

    static List<int> primes;

    static double[] b_coeff = {
        1.0000000000000000000000000000000,
        0.0833333333333333333333333333333,
        -0.0013888888888888888888888888888,
        3.3068783068783068783068783068783E-5,
        -8.2671957671957671957671957671958E-7,
        2.0876756987868098979210090321201E-8,
        -5.2841901386874931848476822021796E-10,
        1.3382536530684678832826980975129E-11,
        -3.3896802963225828668301953912494E-13,
        8.5860620562778445641359054504256E-15,
        -2.1748686985580618730415164238659E-16,
        5.5090028283602295152026526089023E-18,
        -1.3954464685812523340707686264064E-19,
        3.5347070396294674716932299778038E-21,
        -8.9535174266605480875210207537274E-23,
        2.2679524523376830603109507388682E-24,
        -5.7447906688722024452638819876070E-26,
        1.4551724756148649018662648672713E-27,
        -3.6859949406653101781817824799086E-29,
        9.3367342570950446720325551527856E-31
    };

    static double[] g_coeff = {
        0.99999999999999709182,
        57.15623566586292351700,
        -59.59796035547549124800,
        14.13609797474174717400,
        -0.491913816097620199780,
        0.33994649984811888699E-4,
        0.46523628927048575665E-4,
        -0.98374475304879564677E-4,
        0.15808870322491248884E-3,
        -0.21026444172410488319E-3,
        0.21743961811521264320E-3,
        -0.16431810653676389022E-3,
        0.84418223983852743293E-4,
        -0.26190838401581408670E-4,
        0.36899182659531622704E-5
    };


    public static Complex[] EulersProduct(Complex s, int depth)
    {
        if (Zeta.primes == null)
        {
            string path = "primes.csv";
            Zeta.primes = FileUtils.LoadFromFile(path);
        }

        Complex[] result = new Complex[depth];
        result[0] = 1 / (1 - Complex.Pow(2, -s));

        for (var i = 1; i < depth; i++)
        {
            var p = primes[i];
            var c = 1 / (1 - Complex.Pow(p, -s));
            result[i] = result[i - 1] * c;
        }

        return result;
    }

    /// <summary>
    /// returns a point on the infinity Tdrop
    /// set TdropA to false for TdropB
    /// </summary>
    /// <param name="index"></param>
    /// <param name="TdropA"></param>
    /// <returns></returns>
    public static Vector InfinityTdrop(double index, bool TdropA)
    {
        double psi(double t) => Math.Cos(2 * Math.PI * (t*t - t - 1.0 / 16.0)) / Math.Cos(2 * Math.PI * t);
        Vector a(double t) => new Vector(-Math.Cos(2*Math.PI * (t*t - 1.0/16.0)), Math.Sin(2*Math.PI * (t*t - 1.0/16.0)));
        Vector tDropa(double t) => a(t) * psi(t);
        Vector tDropb(double t) => tDropa(t) * Math.Cos(Math.PI);

        return TdropA ? tDropa(index) : tDropb(index);
    }

    public static double LinkRad(Spiral s, int idx)
    {
        Vector3 start = s.joints[idx];
        Vector3 end = s.joints[idx + 1];

        var temp = end - start;
        return Mathf.Atan2(temp.y, temp.x);
    }

    /// <summary>
    /// returns a point on a tear drop at a given index, index starts at 1
    /// </summary>
    /// <param name="index"></param>
    /// <param name="imaginary"></param>
    /// <returns></returns>
    public static Vector TearDrop(int index, double real, double imaginary, bool second = false)
    {
        Complex Pow(int a, Complex b)
        {
            var cx = Math.Pow(a*a, b.Real / 2);
            var cy = b.Imaginary * Math.Log(a*a) / 2;

            return new Complex(cx * Math.Cos(cy), cx * Math.Sin(cy));
        }

        Vector J(int n, Complex s)
        {
            // if(second)
            // {
            //     n += 1;
            // }

            Complex z = Complex.Zero;
            for (int k = 1; k < n; k++)
            {
                z += Pow(k, -s);
            }
            return z.ToVector();
        }

        // Vector opoint = Opoint(index, imaginary);
        Vector opoint = Opoint(index + (second ? 1 : 0), real, imaginary);

        var s = new Complex(real, imaginary);
        Vector j0 = J(index, s);
        Vector j1 = J(index + 1, s);
        double dopoint = Vector.Distance(j0, opoint);
        double aopoint = Math.Atan2(j1.y - j0.y, j1.x - j0.x) - Math.Atan2(opoint.y - j0.y, opoint.x - j0.x);

        Vector tDrop = new Vector(Math.Cos(aopoint) * dopoint, -Math.Sin(aopoint) * dopoint) * Math.Sqrt(index);
        return tDrop;
    }

    public static Vector Opoint(int n, double real, double imaginary)
    {
        double V(double t)
        {
            var fewerTerms = false;

            var result = t / 2 * Math.Log(t / (2 * Math.PI)) - t / 2 - Math.PI / 8;  // fewer terms      
            return fewerTerms ? result : result + 1 / (48 * t) + 7 / (5760 * Math.Pow(t, 3)) + 31 / (80640 * Math.Pow(t, 5)) + 127 / (430080 * Math.Pow(t, 7)) + 511 / (1216512 * Math.Pow(t, 9));
        }

        Vector sRev = new Vector(0.0, 0.0);
        for (int i = 1; i < n; i++)
        {
            var fx = Math.Cos(imaginary * Math.Log(i)) / Math.Pow(i, real);
            var gy = -Math.Sin(imaginary * Math.Log(i)) / Math.Pow(i, real);
            // x and y flipped for reverse spiral
            sRev += new Vector(gy, fx);
        }

        Complex em = EulerMaclauren(new Complex(real, imaginary));
        // I think I could be using this instead, but the V seams to do the trick
        // Complex emAngle = EulerMaclauren(new Complex(0.5, Zeta.IndexToImag(n)));
        // return RotateAround(new Vector(0, 0), sRev, -Math.Atan2(emAngle.Imaginary, emAngle.Real)) + em.ToVector();
        // 
        return RotateAround(new Vector(0, 0), sRev, -2.0 * V(imaginary) + (Math.PI / 2.0)) + em.ToVector();
    }

    public static Vector RotateAround(Vector pivot, Vector point, double rad)
    {
        return new Vector ((point.x - pivot.x) * Math.Cos(rad) - (point.y - pivot.y) * Math.Sin(rad) + pivot.x, (point.x - pivot.x) * Math.Sin(rad) + (point.y - pivot.y) * Math.Cos(rad) + pivot.y);
    }

    public static Complex EulerMaclauren(Complex s)
    {
        Complex z, g;
        if (s.Real < 0.0)
        {
            if (Math.Abs(s.Imaginary) < MAX_GAMMA)
            {
                s = 1.0 - s;
                g = complex_gamma(s);
                z = ems(s);
                z *= g * 2.0 * Complex.Pow(TWO_PI, -s) * Complex.Cos(Math.PI / 2 * s);
            }
            else
            {
                z = ems(s);
            }
        }
        else
        {
            z = ems(s);
        }
        return z;
    }

    // euler maclaurin summation
    static Complex ems(Complex s)
    {
        int N = (int)Complex.Abs(s), k;
        Complex z = 0.0, t = 0.0, temp = 0.0;
        if (N > MAX_N) N = MAX_N;
        if (N < MIN_N) N = MIN_N;
        for (k = 1; k < N; k++)
        {
            z += Complex.Pow(k, -s);
        }
        z += Complex.Pow(N, 1 - s) / (s - 1) + 0.5 * Complex.Pow(N, -s);
        for (k = 1; k < 20; k++)
        {
            t += b_coeff[k] * pochhammer(s, (2 * k) - 1) * Complex.Pow(N, 1 - s - (2 * k));
            if (t - temp == 0.0) break;
            temp = t;
        }
        return z + t;
    }

    static Complex pochhammer(Complex s, int n)
    {
        int i;
        Complex poch_val = 1.0;
        for (i = 0; i < n; i++)
        {
            poch_val *= (s + i);
        }
        return poch_val;
    }

    static Complex complex_gamma(Complex s)
    {
        int i;
        Complex g = g_coeff[0];
        if (s.Real < 0.5)
        {
            if (s.Real == Math.Floor(s.Real) && s.Imaginary == 0.0)
            {
                return double.PositiveInfinity;
            }
            else
            {
                return Math.PI / (Complex.Sin(s * Math.PI) * complex_gamma(1.0 - s));
            }
        }
        else
        {
            s -= 1.0;
            for (i = 1; i < 15; i++)
            {
                g += g_coeff[i] / (s + i);
            }
            g *= SQRT_TWO_PI * Complex.Pow(s + 5.2421875, s + 0.5) * Complex.Exp(-5.2421875 - s);
            return g;
        }
    }

    public static int Iterate(Complex s, double epsilon = 1e-15)
    {
        int i = 0;
        double cabs_z = 0.0, diff = 100;
        Complex z = 0.0;
        // if (verb == 1) printf("0: %.16lG + %.16lG\n", s.Real, s.Imaginary);
        while (diff > epsilon && cabs_z < CABS_Z_MAX && i < MAX_ITS)
        {
            z = EulerMaclauren(s);
            diff = Complex.Abs(z.Real - s.Real);
            cabs_z = Complex.Abs(z);
            i++;
            s = z;
        }
        if (cabs_z >= CABS_Z_MAX)
        {
            if (z.Real < 0.0)
            {
                i += 1;
            }
            else
            {
                i += 2;
            }
        }

        return i;
    }

    public static double IndexToImag(double index, bool useNew=false)  // n is the index of the link in question.  
    {
        //. This is from Zzrob
        // "Einstein" becasue it is exact
        // return ((float_index*2 +1)*Pi/denominator)
        // TODO: denominator lookup
        // this is where it is chris   ( π (2 n + 1))/( log(n + 1) - log(n))   
        var n = index;

        if(useNew)
        {
            // new
            // 2pi*(t^2+t+1/6)
            return 2.0 * Math.PI * ((n*n) + n + (1.0/6.0));
        }
        else
        {
            // ( π (2 n + 1))/( log(n + 1) - log(n))
            return (n * 2.0 + 1.0) * Math.PI / (Math.Log(n + 1.0) - Math.Log(n));
        }

        



        // from dfold: Exact conversion from index to imaginary
        // return Math.PI * (2.0 * index + 1.0) / Math.Log(1.0/index + 1.0);
    }

    public static double ImagToIndex(double imag)  //given imag, what is the index of the segment?
    {


        //best so far -- this is from Zzrob
        double gamma = 0.57721566490153286060651209008240243104215933593992;
        double e = 2.7182818284590452353602874713526624977572;
        double gamma_to_the_e = Math.Pow(gamma, e);   // = .2245172519832320
        double two_root_3_pi = 2 * Math.Sqrt(3 * Math.PI);
        double return_this = Math.Sqrt(6 * gamma_to_the_e / imag + 6 * imag + Math.PI) / two_root_3_pi - 1.0 / 2.0;

        return (return_this);



        // from dfold
        // Returns the approximate middle index of the spiral given the imaginary 
        // part of the of the input to the Zeta function
        // return Math.Sqrt(
        //     1 / (2 * Math.PI) * (
        //         1 / (2 * Math.Atan(Math.Sqrt(2))) + 
        //         imag + 
        //         1 / (imag * (2 * Math.E - 1))
        //     ) - .5
        // );
    }

    /// <summary>
    /// Only works when the real part is .5
    /// </summary>
    /// <param name="s"></param>
    /// <returns></returns>
    public static Complex ReimannSiegel(Complex s)
    {
        double Ereal(double a, double b) => Math.Pow(Math.E, a) * Math.Cos(b);
        double Eimag(double a, double b) => Math.Pow(Math.E, a) * Math.Sin(b);

        double V(double t)
        {
            var fewerTerms = false;

            var result = t / 2 * Math.Log(t / (2 * Math.PI)) - t / 2 - Math.PI / 8;  // fewer terms      
            return fewerTerms ? result : result + 1 / (48 * t) + 7 / (5760 * Math.Pow(t, 3)) + 31 / (80640 * Math.Pow(t, 5)) + 127 / (430080 * Math.Pow(t, 7)) + 511 / (1216512 * Math.Pow(t, 9));
        }


        double Z(double t)
        {
            int v(double t) => (int)Math.Floor(Math.Sqrt(t / (2 * Math.PI)));
            // double P(double t) =>  Math.Sqrt(t/(2*Math.PI)) - Math.Floor(Math.Sqrt(t/2*Math.PI));
            double T(double t) => Math.Sqrt(t / (2 * Math.PI)) - v(t);
            double phi(double t) => Math.Cos(2 * Math.PI * (t * t - t - 1.0 / 16.0)) / Math.Cos(2 * Math.PI * t);
            double c0(double t) => phi(T(t));
            double c1(double t) => -PsiThirdDerivative(T(t)) / (96.0 * Math.Pow(Math.PI, 2.0)) * Math.Pow(t/(2*Math.PI), -0.5);

            var a = new double[v(t)];
            for (var k = 0; k < a.Length; k++)
                a[k] = 1 / Math.Sqrt(k + 1) * Math.Cos(V(t) - t * Math.Log(k + 1));

            var b = Math.Pow(-1, v(t) - 1) * Math.Pow(2 * Math.PI / t, .25) * (
                    c0(t) +
                    // Math.Sqrt(2 * Math.PI / t) *
                    // c2(t)
                    c1(t)
                );

            return 2 * a.Sum() + b;
        }

        double Zx(double i) => Z(i) * Ereal(0, -V(i));
        double Zy(double i) => Z(i) * Eimag(0, -V(i));

        var imag = s.Imaginary;

        return new Complex(Zx(imag), Zy(imag));
    }

    public static double PsiThirdDerivative(double imag)
    {
        // Constants
        double pi = Math.PI;

        // Terms in the formula
        double term1 = Math.Pow(pi, 3) * Math.Pow(4 * imag - 2, 3) * Math.Sin(pi * (2 * imag * imag - 2 * imag - 1.0 / 8)) / Math.Cos(2 * pi * imag);
        double term2 = -6 * Math.Pow(pi, 3) * Math.Pow(4 * imag - 2, 2) * Math.Sin(2 * pi * imag) * Math.Cos(pi * (2 * imag * imag - 2 * imag - 1.0 / 8)) / Math.Pow(Math.Cos(2 * pi * imag), 2);
        double term3 = -24 * Math.Pow(pi, 3) * (4 * imag - 2) * Math.Pow(Math.Sin(2 * pi * imag), 2) * Math.Sin(pi * (2 * imag * imag - 2 * imag - 1.0 / 8)) / Math.Pow(Math.Cos(2 * pi * imag), 3);
        double term4 = -12 * Math.Pow(pi, 3) * (4 * imag - 2) * Math.Sin(pi * (2 * imag * imag - 2 * imag - 1.0 / 8)) / Math.Cos(2 * pi * imag);
        double term5 = -4 * Math.Pow(pi, 2) * (4 * imag - 2) * Math.Cos(pi * (2 * imag * imag - 2 * imag - 1.0 / 8)) / Math.Cos(2 * pi * imag);
        double term6 = -Math.Pow(pi, 2) * (32 * imag - 16) * Math.Cos(pi * (2 * imag * imag - 2 * imag - 1.0 / 8)) / Math.Cos(2 * pi * imag);
        double term7 = 48 * Math.Pow(pi, 3) * Math.Pow(Math.Sin(2 * pi * imag), 3) * Math.Cos(pi * (2 * imag * imag - 2 * imag - 1.0 / 8)) / Math.Pow(Math.Cos(2 * pi * imag), 4);
        double term8 = -24 * Math.Pow(pi, 2) * Math.Sin(2 * pi * imag) * Math.Sin(pi * (2 * imag * imag - 2 * imag - 1.0 / 8)) / Math.Pow(Math.Cos(2 * pi * imag), 2);
        double term9 = 40 * Math.Pow(pi, 3) * Math.Sin(2 * pi * imag) * Math.Cos(pi * (2 * imag * imag - 2 * imag - 1.0 / 8)) / Math.Pow(Math.Cos(2 * pi * imag), 2);

        // Return the sum of all terms
        return term1 + term2 + term3 + term4 + term5 + term6 + term7 + term8 + term9;
    }

    // https://www.desmos.com/calculator/xyhvjwzk2q
    public static Complex EtaFormula(Complex s)
    {
        double Ex = 0;
        double Ey = 0;
        int iterations = 100000;
        double a = s.Real;
        double b = s.Imaginary;
        for(int n = 1; n < iterations; n++) {
            Ex += Math.Pow(-1, n+1) * (Math.Cos(-b * Math.Log(n)) / Math.Pow(n, a));
            Ey += Math.Pow(-1, n+1) * (Math.Sin(-b * Math.Log(n)) / Math.Pow(n, a));
        }
        
        return new Complex(Ex, Ey);
    }

    public static Vector ZetFormula(double r, double t)
    {
        //https://www.desmos.com/calculator/blmlbsd2xb
        Vector Z1 (double x, double y)
        {
            double zx = -Math.Pow(2.0, 1.0 - x) * Math.Cos(y * Math.Log(2.0)) + 1.0;
            double zy = -Math.Pow(2.0, 1.0 - x) * Math.Sin(y * Math.Log(2.0));
            double den = Math.Pow(2.0, 2.0*(1.0-x)) + (2.0 * (-Math.Pow(2.0, 1.0 - x) * Math.Cos(y * Math.Log(2.0)) + 1.0)) - 1.0;
            return new Vector(zx, zy) / den;
        }

        Vector Z2 (double x, double y)
        {
            Vector sum = new Vector (0.0, 0.0);
            int k = 400;
            for(int n = 1; n <= k; n++)
            {
                Vector pt = new Vector(Math.Cos(y * Math.Log(n)), -Math.Sin(y * Math.Log(n)));
                sum += pt * (Math.Pow(-1, n - 1) / Math.Pow(n, x));
            }
            return sum;
        }

        Vector z1 = Z1(r, t);
        Vector z2 = Z2(r, t);
        return new Vector(z1.x * z2.x - z1.y * z2.y, z1.x * z2.y + z1.y * z2.x);
    }

    [MoonSharpUserData]
    public class Spiral
    {
        public double real = 0.5;
        public double index = 1;
        public int middleIndex => (int)index;
        private bool _useNewImag = true;
        public double imaginary => IndexToImag(index, _useNewImag);
        public Vector middlePoint;
        public int numLinks;
        public Vector[] joints;
        public Complex zeta;
        public Vector[] spirals;

        public int extendSpiralCount = 0;

        public Spiral(double real, double index, SpiralFormulas formula, bool useNewImag)
        {
            _useNewImag = useNewImag;

            this.numLinks = (int)(imaginary / Math.PI + 1);

            this.joints = new Vector[numLinks];
            for (var i = 0; i < this.joints.Length; i++)
                this.joints[i] = new Vector();

            this.middlePoint = new Vector();

            spirals = new Vector[middleIndex + 2];
            for (var i = 0; i < spirals.Length; i++)
                this.spirals[i] = new Vector();

            Update(real, index, formula, useNewImag);
        }

        public void Update(double realValue, double indexValue, SpiralFormulas formula, bool useNewImag)
        {
            switch (formula)
            {
                case SpiralFormulas.ReimannSiegel:
                    UpdateReimannSiegel(realValue, indexValue, useNewImag);
                    break;

                case SpiralFormulas.EulerMaclauren:
                    UpdateEulerMaclauren(realValue, indexValue, useNewImag);
                    break;

                case SpiralFormulas.EtaFormula:
                    UpdateEtaFormula(realValue, indexValue, useNewImag);
                    break;

                case SpiralFormulas.ZetFormula:
                    UpdateZetFormula(realValue, indexValue, useNewImag);
                    break;

                default:
                    this.zeta = Zeta.ReimannSiegel(new Complex(realValue, Zeta.IndexToImag(indexValue, useNewImag)));
                    break;
            }
        }

        public void UpdateReimannSiegel(double realValue, double indexValue, bool useNewImag)
        {
            this.real = realValue;
            this.index = indexValue;
            var imag = imaginary;

            this.numLinks = (int)SpiralMiddleIndex(this.index, 0) + 2 + extendSpiralCount; // need to an extra for proper final link tracking

            this.zeta = Zeta.ReimannSiegel(new Complex(this.real, Zeta.IndexToImag(index, useNewImag)));

            this.joints = new Vector[numLinks];

            var start = new Vector();
            this.joints[0] = start;


            for (int i = 1; i < numLinks; i++)
            {
                var x = Math.Cos(imag * Math.Log(i)) / Math.Pow(i, real);
                var y = -Math.Sin(imag * Math.Log(i)) / Math.Pow(i, real);
                var end = new Vector(start.x + x, start.y + y);
                this.joints[i] = end;

                if (i == this.middleIndex + 1)
                {
                    this.middlePoint = start + (end - start) / 2;
                }

                start = end;
            }

            findSpirals();
        }

        public void UpdateEulerMaclauren(double realValue, double indexValue, bool useNewImag)
        {
            this.real = realValue;
            this.index = indexValue;
            var imag = imaginary;

            this.numLinks = (int)SpiralMiddleIndex(index, 0) + 2 + extendSpiralCount; // need to an extra for proper final link tracking

            this.zeta = Zeta.EulerMaclauren(new Complex(real, Zeta.IndexToImag(index, useNewImag)));

            this.joints = new Vector[numLinks];

            var start = new Vector();
            this.joints[0] = start;


            for (int i = 1; i < numLinks; i++)
            {
                var x = Math.Cos(imag * Math.Log(i)) / Math.Pow(i, real);
                var y = -Math.Sin(imag * Math.Log(i)) / Math.Pow(i, real);
                var end = new Vector(start.x + x, start.y + y);
                this.joints[i] = end;

                if (i == this.middleIndex + 1)
                {
                    this.middlePoint = start + (end - start) / 2;
                }

                start = end;
            }

            findSpirals();
        }

        public void UpdateEtaFormula(double realValue, double indexValue, bool useNewImag)
        {
            this.real = realValue;
            this.index = indexValue;
            var imag = imaginary;

            this.numLinks = ((int)SpiralMiddleIndex(index, 0) + 2) * 2 + extendSpiralCount; // need to an extra for proper final link tracking

            this.zeta = Zeta.EtaFormula(new Complex(real, Zeta.IndexToImag(index, useNewImag)));

            this.joints = new Vector[numLinks];

            var start = new Vector();
            this.joints[0] = start;

            for (int i = 1; i < numLinks; i++)
            {
                var x = Math.Pow(-1, i+1) * (Math.Cos(-imag * Math.Log(i)) / Math.Pow(i, real));
                var y = Math.Pow(-1, i+1) * (Math.Sin(-imag * Math.Log(i)) / Math.Pow(i, real));
                var end = new Vector(start.x + x, start.y + y);
                this.joints[i] = end;

                if (i == this.middleIndex + 1)
                {
                    this.middlePoint = start + (end - start) / 2;
                }

                start = end;
            }

            findSpirals();
        }

        private void UpdateZetFormula(double realValue, double indexValue, bool useNewImag)
        {
            this.real = realValue;
            this.index = indexValue;
            var imag = imaginary;

            this.numLinks = (int)Math.Ceiling(imag) * 5;

            this.zeta = Zeta.ZetFormula(real, imag);

            this.joints = new Vector[numLinks];
            for (int i = 0; i < numLinks; i++)
            {
                double curvedPosition = Math.Pow(i / (double)(numLinks - 1), 2);
                double t = imag * curvedPosition;
                this.joints[i] = ZetFormula(real, t);
            }

            findSpirals();
        }

        public Vector PointOnLink(int idx, double dist)
        {
            var link = joints[idx];
            link = link.Normalized();
            return link * dist;
        }

        
        /// <summary>
        /// Calculates the link that is the approximate center of a spiral.
        /// </summary>
        /// <param name="index">The middle index of the spiral</param>
        /// <param name="spiral">Spiral number where 0 is the last spiral, 
        /// 1 is the second to last spiral etc.</param>
        /// <returns>Approximate index of the link that is the middle spiral link</returns>
        public double SpiralMiddleIndex(double index, double spiral)
        {
            // given index and joint/spiral num, return index/number of the 
            // Spiral Middle Link, works for any spiral (last spiral is number j=0)

            // S_{mlink}\left(i,j\right)=\frac{2i\left(i+1\right)}{\left(2j+1\right)}+\frac{1}{3\left(2j+1\right)}

            // GPT 3.5
            // (2index^2 + 3index + 2spiral)/(2spiral + 1)
            // GPT4:
            // (2 * index^2 + 2 * index - 2 * spiral + 2) / (3 * (2 * spiral + 1))

            var i = (2*index * (index + 1)) / (2 * spiral + 1) + 1/(3 * (2 * spiral + 1)) - 1;

            return i;
        }

        void findSpirals()
        {
            // Zeta is a complex number 
            // Convert the complex number to a vector 
            // then scale it by 2.
            // 
            // zeta / 2
            var zeta = this.zeta.ToVector();
            var z2 = zeta / 2; 

            // Copy zeta vector and normalize it.
            var norm = zeta.Normalized();

            spirals = new Vector[middleIndex + 2];

            // Loop through all the joints up to the middle index.
            //
            for (var i = 0; i < spirals.Length; i++)
            {
                var joint = this.joints[i];
                
                var dot = joint.Dot(norm);
                this.spirals[i] = zeta + joint - norm * 2 * dot; // reflect from about a normal (z2)
            }
        }
    }
}