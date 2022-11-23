using UnityEngine;
using System;

using Complex = System.Numerics.Complex;
public static class Extensions
{
    public static Vector2 ToVector2(this Complex c)
    {
        return new Vector2((float)c.Real, (float)c.Imaginary);
    }

    public static Vector ToVector(this Complex c)
    {
        return new Vector(c.Real, c.Imaginary);
    }

    public static Vector2 Abs(this Vector2 v)
    {
        return new Vector2(Mathf.Abs(v.x), Mathf.Abs(v.y));
    }

    public static double Pow(this double d, double exp)
    {
        return Math.Pow(d, exp);
    }
}

// public static class ComplexExt
// {
//     public static double Mod(this Complex a)
//     {
//         return Math.Sqrt((a.Real * a.Real) + (a.Imaginary * a.Imaginary));
//     }

//     public static Complex Neg(this Complex a)
//     {
//         return new Complex(-1 * a.Real, -1 * a.Imaginary);
//     }

//     public static double Arg(this Complex a)
//     {
//         if (a.Imaginary != 0.0) return 2.0 * Math.Atan((a.Mod() - a.Real) / a.Imaginary);
//         if (a.Real > 0.0) return 0.0;
//         if (a.Real < 0.0) return Math.PI;
//         return 1.0 / 0.0; //argument is undefined at the origin
//     }

//     public static Complex Pow(this int a, Complex exp)
//     {
//         return ((double)a).Pow(exp);
//     }

//     // real number raised to complex power
//     public static Complex Pow(this double a, Complex exp)
//     {
//         return new Complex(Math.Pow(a, exp.Real) * Math.Cos((exp.Imaginary) * Math.Log(a)),
//             Math.Pow(a, exp.Real) * Math.Sin((exp.Imaginary) * Math.Log(a)));
//     }
// }