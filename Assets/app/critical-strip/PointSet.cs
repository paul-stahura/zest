using UnityEngine;
using System.Collections.Generic;

public class Point
{
    public Vector2 TransformedCoordinates { get; private set; }
    public double Real { get; private set; }
    public double Index { get; private set; }

    public Point(double real, double index)
    {
        Real = real;
        Index = index;
        TransformedCoordinates = new Vector2((float)real, (float)index);
    }

    public void UpdateTransformedCoordinates(float real, float index)
    {
        TransformedCoordinates = new Vector2(real, index);
    }
}

public class PointSet
{
    public string Name { get; private set; }
    public Color Color { get; private set; }
    public bool IsActive { get; set; }
    public bool SkipCriticalLine { get; private set; }
    public int TotalPointsInFile { get; set; }  // Total points in the original file before optimization
    
    private List<Point> points;
    
    public PointSet(string name, Color color, bool skipCriticalLine = false)
    {
        Name = name;
        Color = color;
        IsActive = true;
        SkipCriticalLine = skipCriticalLine;
        points = new List<Point>();
        TotalPointsInFile = 0;
    }
    
    public void AddPoint(double real, double index)
    {
        points.Add(new Point(real, index));
    }
    
    public void Clear()
    {
        points.Clear();
    }
    
    // For compatibility with existing code that expects Vector2
    public IReadOnlyList<Vector2> Points => points.ConvertAll(p => p.TransformedCoordinates);
    
    // New property to access the original double-precision points
    public IReadOnlyList<Point> OriginalPoints => points;
    
    public static PointSet FromFile(string filename)
    {
        var lines = System.IO.File.ReadAllLines(filename);
        if (lines.Length < 1) return null;
        
        // Skip any comment lines to find the header
        int headerIndex = 0;
        while (headerIndex < lines.Length && lines[headerIndex].StartsWith("#"))
        {
            headerIndex++;
        }
        
        if (headerIndex >= lines.Length)
        {
            return null;  // No header found (only comments)
        }
        
        var headerParts = lines[headerIndex].Split(',');
        if (headerParts.Length < 2) return null;
        
        var name = headerParts[0];
        if (!ColorUtility.TryParseHtmlString(headerParts[1], out Color color))
        {
            color = Color.white;
        }

        bool skipCriticalLine = false;
        if (headerParts.Length > 2)
        {
            bool parseResult = bool.TryParse(headerParts[2], out bool skip);
            skipCriticalLine = parseResult && skip;
        }
        
        var pointSet = new PointSet(name, color, skipCriticalLine);
        
        // Process points, skipping any remaining comment lines
        for (int i = headerIndex + 1; i < lines.Length; i++)
        {
            // Skip comment lines
            if (lines[i].StartsWith("#")) continue;
            
            var parts = lines[i].Split(',');
            if (parts.Length == 2 && 
                double.TryParse(parts[0], out double real) && 
                double.TryParse(parts[1], out double index))
            {
                pointSet.AddPoint(real, index);
            }
        }
        
        return pointSet;
    }
    
    public void SaveToFile(string filename)
    {
        var lines = new List<string>
        {
            $"{Name},#{ColorUtility.ToHtmlStringRGBA(Color)},{SkipCriticalLine}"
        };
        
        foreach (var point in points)
        {
            lines.Add($"{point.Real},{point.Index}");
        }
        
        System.IO.File.WriteAllLines(filename, lines);
    }
} 