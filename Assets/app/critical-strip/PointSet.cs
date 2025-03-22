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
    public Color Color { get; set; }
    public bool IsActive { get; set; }
    
    private List<Point> points;
    
    public PointSet(string name, Color color)
    {
        Name = name;
        Color = color;
        IsActive = true;
        points = new List<Point>();
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
        
        var headerParts = lines[0].Split(',');
        if (headerParts.Length != 2) return null;
        
        var name = headerParts[0];
        if (!ColorUtility.TryParseHtmlString(headerParts[1], out Color color))
        {
            color = Color.white;
        }
        
        var pointSet = new PointSet(name, color);
        
        for (int i = 1; i < lines.Length; i++)
        {
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
            $"{Name},#{ColorUtility.ToHtmlStringRGBA(Color)}"
        };
        
        foreach (var point in points)
        {
            lines.Add($"{point.Real},{point.Index}");
        }
        
        System.IO.File.WriteAllLines(filename, lines);
    }
} 