using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using UnityEditor;
using UnityEngine;

public class MathFileParser
{
    [Tooltip("Path to the .txt or .m file inside StreamingAssets or absolute path.")]
    public static string fileName = "zz10k";

    [Serializable]
    public struct Pair
    {
        public double x;
        public double y;
        public Pair(double x, double y) { this.x = x; this.y = y; }
        public override string ToString() => $"({x}, {y})";
    }

    public static List<Pair> ParsedValues { get; private set; } = new List<Pair>();

    [MenuItem("RakZero/ParseNagativeZeroPointPairs")]
    public static void ParseNagativeZeroPointPairs()
    {
        // load file from resources
        TextAsset resourceFile = Resources.Load<TextAsset>($"Data/{fileName}");
        if (resourceFile == null)
        {
            Debug.LogError($"Failed to load file from Resources/Data/{fileName}.m");
            return;
        }

        ParsedValues = ParseMathFile(resourceFile.text);

        var points = new List<(double, double, Vector2)>();
        var outBoundsPoints = new List<(double, double, Vector2)>();
        var zetaPoints = new List<(double, double, Vector2)>();
        for (int i = 0; i < ParsedValues.Count; i++)
        {
            var pair = ParsedValues[i];
            // convert from imag to index
            double index = Zeta.SearchImagToIndex(pair.y);

            if (pair.x < -4)
                outBoundsPoints.Add((-4, index, new Vector2((float)-4, (float)index)));

            points.Add((pair.x, index, new Vector2((float)pair.x, (float)index)));

            // mirror x across 0.5 critical line
            var mirroredX = 1.0 - pair.x;
            zetaPoints.Add((mirroredX, index, new Vector2((float)mirroredX, (float)index)));
        }

        FindIntersections.SaveToCSV(points, "Rak1_10k");
        FindIntersections.SaveToCSV(outBoundsPoints, "Rak1_10k_OutOfBounds");
        FindIntersections.SaveToCSV(zetaPoints, "Rak1_Zetas");
    }

    /// <summary>
    /// Parses a Mathematica-style data file of the form:
    /// zz10k = {{x1, y1}, {x2, y2}, ...}
    /// Handles backslashes, long decimals, and `150.` notation.
    /// </summary>
    public static List<Pair> ParseMathFile(string input)
    {
        var result = new List<Pair>();

        // Remove all backslashes and newlines
        input = input.Replace("\\\n", "").Replace("\n", "").Replace("\r", "");

        // Find the section inside the outermost braces {{ ... }}
        var match = Regex.Match(input, @"\{\{(.*)\}\}", RegexOptions.Singleline);
        if (!match.Success)
            return result;

        string inner = match.Groups[1].Value;

        // Match all {x, y} pairs
        var pairMatches = Regex.Matches(inner, @"\{([^,]+),\s*([^}]+)\}");
        foreach (Match m in pairMatches)
        {
            string xStr = CleanNumber(m.Groups[1].Value);
            string yStr = CleanNumber(m.Groups[2].Value);

            if (double.TryParse(xStr, System.Globalization.NumberStyles.Float,
                                System.Globalization.CultureInfo.InvariantCulture, out double x) &&
                double.TryParse(yStr, System.Globalization.NumberStyles.Float,
                                System.Globalization.CultureInfo.InvariantCulture, out double y))
            {
                result.Add(new Pair(x, y));
            }
            else
            {
                Debug.LogWarning($"Failed to parse pair: {{ {xStr}, {yStr} }}");
            }
        }

        return result;
    }

    private static string CleanNumber(string num)
    {
        // Remove Mathematica precision marker like `150.`
        num = Regex.Replace(num, @"`[0-9.]+", "");
        // Remove stray backslashes or spaces
        return num.Trim().Replace("\\", "");
    }
}