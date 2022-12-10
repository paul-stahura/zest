using System;
using System.Collections.Generic;
using System.IO;

public static class FileUtils
{
    public static List<float> LoadFromFileF(string path)
    {
        var values = new List<float>();

        using(var sr = new StreamReader(path))
        {
            var buffer = sr.ReadToEnd();
            string[] tokens = buffer.Split(new char[] { '\n', ' ' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var token in tokens)
            {
                var value = float.Parse(token);
                values.Add(value);
            }
        }

        return values;
    }

    public static List<double> LoadFromFileD(string path)
    {
        var values = new List<double>();

        using(var sr = new StreamReader(path))
        {
            var buffer = sr.ReadToEnd();
            string[] tokens = buffer.Split(new char[] { '\n', ' ' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var token in tokens)
            {
                var value = double.Parse(token);
                values.Add(value);
            }
        }

        return values;
    }

    public static List<int> LoadFromFile(string path)
    {
        var values = new List<int>();

        using(var sr = new StreamReader(path))
        {
            var buffer = sr.ReadToEnd();
            string[] tokens = buffer.Split(new char[] { '\n', ' ' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var token in tokens)
            {
                var value = int.Parse(token);
                values.Add(value);
            }
        }

        return values;
    }
}