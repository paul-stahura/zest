using System;
using System.Linq;
using UnityEngine;
using Complex = System.Numerics.Complex;
using MoonSharp.Interpreter;

public class Zeta
{
    const int MIN_N = 100;
    const int MAX_N = 1000000;
    const double TWO_PI = (Math.PI * 2);
    static readonly double SQRT_TWO_PI = Math.Sqrt(TWO_PI);
    const double CABS_Z_MAX = 10000.0;
    const int MAX_ITS = 5000;
    const double MAX_GAMMA = 450;

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

    public static Complex Compute(Complex s)
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
            z = Compute(s);
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

    public static double IndexToImag(double index)  // n is the index of the link in question.  
    {
        //. This is from Zzrob
        // "Einstein" becasue it is exact
        // return ((float_index*2 +1)*Pi/denominator)
        // TODO: denominator lookup
        // this is where it is chris   ( π (2 n + 1))/( log(n + 1) - log(n))   
        var n = index;
        return (n * 2 + 1) * Math.PI / (Math.Log(n + 1) - Math.Log(n));



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
            double c2(double t) => 0;

            var a = new double[v(t)];
            for (var k = 0; k < a.Length; k++)
                a[k] = 1 / Math.Sqrt(k + 1) * Math.Cos(V(t) - t * Math.Log(k + 1));

            var b = Math.Pow(-1, v(t) - 1) * Math.Pow(2 * Math.PI / t, .25) * (
                    c0(t) +
                    Math.Sqrt(2 * Math.PI / t) *
                    c2(t)
                );

            return 2 * a.Sum() + b;
        }

        double Zx(double i) => Z(i) * Ereal(0, -V(i));
        double Zy(double i) => Z(i) * Eimag(0, -V(i));

        var imag = s.Imaginary;

        return new Complex(Zx(imag), Zy(imag));
    }

    [MoonSharpUserData]
    public class Spiral
    {
        public int middleIndex;
        public Vector middlePoint;
        public int numLinks;
        public Vector[] links;
        public Complex input;
        public Complex zeta;
        public Vector2[] spirals;

        public Spiral(Complex s, bool useReimannSiegel)
        {
            this.input = s;
            this.numLinks = (int)(input.Imaginary / Math.PI + 1);
            this.middleIndex = (int)Zeta.ImagToIndex(input.Imaginary);

            this.links = new Vector[numLinks * 2];
            for (var i = 0; i < this.links.Length; i++)
                this.links[i] = new Vector();

            this.middlePoint = new Vector();

            spirals = new Vector2[middleIndex + 1];
            for (var i = 0; i <= middleIndex; i++)
                this.spirals[i] = new Vector2();

            Update(s, useReimannSiegel);
        }

        public void Update(Complex s, bool useReimannSiegel)
        {
            this.input = s;
            this.numLinks = (int)(input.Imaginary / Math.PI + 1);
            this.middleIndex = (int)Zeta.ImagToIndex(input.Imaginary);

            if (useReimannSiegel)
                this.zeta = Zeta.ReimannSiegel(input);
            else
            {
                this.zeta = Zeta.Compute(input);
            }

            if (this.links.Length < numLinks)
            {
                var prevLen = this.links.Length;
                Array.Resize<Vector>(ref this.links, numLinks * 2);
                for (var i = prevLen; i < this.links.Length; i++)
                    this.links[i] = new Vector();
            }

            var start = this.links[0];
            start.x = 0; start.y = 0;

            var imag = this.input.Imaginary;
            var real = this.input.Real;

            for (int i = 1; i < numLinks; i++)
            {
                var x = Math.Cos(imag * Math.Log(i)) / Math.Pow(i, real);
                var y = -Math.Sin(imag * Math.Log(i)) / Math.Pow(i, real);
                var end = this.links[i];
                end.x = start.x + x;
                end.y = start.y + y;

                if (i == this.middleIndex + 1)
                {
                    this.middlePoint = start + (end - start) / 2;
                }

                start = end;
            }

            findSpirals();
        }

        public Vector PointOnLink(int idx, double dist)
        {
            var link = links[idx];
            link.Normalize();
            return link * dist;
        }


        void findSpirals()
        {
            var pt = this.zeta.ToVector();
            var slope = -pt.x / pt.y;
            var z = pt.ToVector2();
            var bipt = BisectingLines.BisectPoint(this);

            var z2 = (pt / 2).ToVector2();

            if (this.spirals.Length <= middleIndex)
            {
                var prevLen = this.spirals.Length;
                Array.Resize<Vector2>(ref this.spirals, middleIndex + 1);
                for (var i = prevLen; i < this.spirals.Length; i++)
                    this.spirals[i] = new Vector2();
            }

            // draw a line from each of the first links at the same slope as zeta
            for (var i = 0; i <= this.middleIndex; i++)
            {
                var from = this.links[i].ToVector2();

                var norm = (z2).normalized;
                var dot = Vector2.Dot(from, norm);
                this.spirals[i] = z + from - 2 * dot * norm; // reflect from about a normal (z2)
            }
        }
    }
}