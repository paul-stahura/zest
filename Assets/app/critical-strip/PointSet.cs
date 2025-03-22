using UnityEngine;
using System.Collections.Generic;

public class PointSet
{
    public string Name { get; private set; }
    public Color Color { get; set; }
    public bool IsActive { get; set; }
    
    private List<Vector2> points;
    
    public PointSet(string name, Color color)
    {
        Name = name;
        Color = color;
        IsActive = true;
        points = new List<Vector2>();
    }
    
    public void AddPoint(float real, float index)
    {
        points.Add(new Vector2(real, index));
    }
    
    public void Clear()
    {
        points.Clear();
    }
    
    public IReadOnlyList<Vector2> Points => points;
    
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
                float.TryParse(parts[0], out float real) && 
                float.TryParse(parts[1], out float index))
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
            lines.Add($"{point.x},{point.y}");
        }
        
        System.IO.File.WriteAllLines(filename, lines);
    }
} 