using System.Collections.Generic;


public abstract class PointList  // abstract means
{
    protected Dictionary<int, double> cache = new Dictionary<int, double>();

    public abstract double GetValue(int index);

    public int Next(double imag)
    {
        int i = 1;
        double value = GetValue(i);

        while (value <= imag)
        {
            i++;
            try
            {
                value = GetValue(i);
            }
            catch (KeyNotFoundException)
            {
                i--;
                break;
            }
        }

        return i;
    }

    public int Prev(double imag)
    {
        int i = Next(imag) - 1;

        if (i <= 1)
            i = 1;
        else if (GetValue(i) == imag)
            i--;

        return i;
    }
}