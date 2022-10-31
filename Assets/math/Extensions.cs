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