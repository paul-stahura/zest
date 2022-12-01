using System.IO;
using System.Collections.Generic;

public class PointsFromFile : PointList
{
    public PointsFromFile(string filename)
    {
        int i = 1;
        var lines = File.ReadAllLines($"./Assets/Resources/{filename}");
        // var lines = Resources.Load("zeta-zeros.txt") as String[];
        foreach (var line in lines)
        {
            cache[i++] = double.Parse(line);
        }
    }
    public override double GetValue(int index)
    {
        return cache[index];
    }
}