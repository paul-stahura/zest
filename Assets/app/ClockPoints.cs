using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class ClockPoints : MonoBehaviour
{
    private int nPts = 200;
    private int nFamily = 4;

    public void CreateWritePointTable()
    {

    }

    private Vector GetRedArm(double real, double t)
    {
        Vector r = new Vector(Math.Cos(A(t, 1)), Math.Sin(A(t, 1)));
        r /= Math.Pow(Trunc(t)+2, real);
        r *= Math.Sqrt(Trunc(t) + 1);

        return r + new Vector(1, 0);
    }

    private Vector GetGreenArm(double real, double t)
    {
        Vector r = new Vector(Math.Cos(Math.PI - A(t, 0)), Math.Sin(Math.PI - A(t, 0)));
        r /= Math.Pow(Trunc(t), real);
        r *= Math.Sqrt(Trunc(t) + 1);

        return r + new Vector(1, 0);
    }

    private double D(int nFamily, int nPts, int n)
    {
        return nFamily + n/(float)nPts + 0.0001;
    }

    /// <summary>
    /// 1.2 => 0.2
    /// removes leading int
    /// </summary>
    /// <param name="x"></param>
    /// <returns></returns>
    private double Trunc(double x)
    {
        return x - (x % 1);
    }

    /// <summary>
    /// offset 0 = prev;
    /// offset 1 = next;
    /// </summary>
    /// <param name="index"></param>
    /// <param name="offset"></param>
    /// <returns></returns>
    private double A(double index, int offset)
    {
        double value = -Zeta.IndexToImag(index) * (Math.Log(Math.Floor(index + offset)) - Math.Log(Math.Floor(index + offset + 1)));
        return value % 2*Math.PI;
    }
}
