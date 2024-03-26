using System;
using System.Collections.Generic;

public class GramPoints : PointList
{
    public override double GetValue(int n)
    {
        double value;
        if (!cache.TryGetValue(n, out value))
        {
            value = 2 * Math.PI * Math.Exp((1.0 + lambertw(((8.0 * (double)n) + 1.0) / (8.0 * Math.E))));
            cache[n] = value;
        }

        return cache[n];
    }

    double lambertw(double x)
    {
        double v = 0.0, w, e, t;

        if (x <= 0)
            return 0.0;

        w = Math.Log(x);
        while (Math.Abs(w - v) / Math.Abs(w) > 1e-12)
        {
            v = w;
            e = Math.Exp(w);
            t = (w * e) - x;
            w = w - (t / ((e * (w + 1) - (w + 2) * t / (2 * w + 2))));
        }
        return w;
    }
}