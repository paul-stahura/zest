using UnityEngine;
using UnityEditor;
using System.IO;
using System.Collections.Generic;
using System.Text;

public static class FindIntersections
{
    private const float MIN_INDEX = 4f;
    private const float MAX_INDEX = 6f;
    private const float INDEX_STEP = 0.01f;
    
    private const int POINTS_PER_PATH = 1000; // 10x more points than BPSymmetryRenderer
    
    // Known critical value that should have exactly 3 intersections
    private static readonly float CRITICAL_INDEX = 5.108561515808110f;

    [MenuItem("Critical Strip/Find Rhombus Intersections")]
    public static void FindRhombusIntersections()
    {
        var intersectionData = new List<(float real, float index, Vector2 point)>();
        
        // First check the known critical value with high resolution
        Debug.Log($"Checking critical index value: {CRITICAL_INDEX}");
        FindIntersectionsForIndex(CRITICAL_INDEX, intersectionData);
        
        // Then check the range with regular steps
        int totalSteps = Mathf.CeilToInt((MAX_INDEX - MIN_INDEX) / INDEX_STEP);
        int currentStep = 0;

        for (float index = MIN_INDEX; index <= MAX_INDEX; index += INDEX_STEP)
        {
            if (Mathf.Abs(index - CRITICAL_INDEX) < INDEX_STEP)
            {
                Debug.Log($"Skipping {index} as it's close to critical value");
                continue;
            }
            
            if (EditorUtility.DisplayCancelableProgressBar(
                "Finding Intersections",
                $"Processing index {index:F2}",
                (float)currentStep / totalSteps))
            {
                EditorUtility.ClearProgressBar();
                Debug.Log("Intersection finding cancelled.");
                return;
            }

            FindIntersectionsForIndex(index, intersectionData);
            currentStep++;
        }

        EditorUtility.ClearProgressBar();
        SaveToCSV(intersectionData);
    }

    private static void FindIntersectionsForIndex(float index, List<(float real, float index, Vector2 point)> intersectionData)
    {
        var path1 = new Vector2[POINTS_PER_PATH];
        var path2 = new Vector2[POINTS_PER_PATH];
        
        // Generate paths with higher resolution
        for (int i = 0; i < POINTS_PER_PATH; i++)
        {
            float r = (float)i / POINTS_PER_PATH;
            path1[i] = RhombusPoints.GetBPSymmetry(r, index);
            path2[i] = RhombusPoints.GetBPForward(r, index);
        }
        
        var intersections = FindPathIntersections(path1, path2);
        Debug.Log($"Found {intersections.Length} intersections for index {index}");
        
        foreach (var intersection in intersections)
        {
            // Find closest point in either path to get real value
            float closestDist = float.MaxValue;
            float closestReal = 0f;
            
            for (int i = 0; i < path1.Length; i++)
            {
                float dist = Vector2.Distance(path1[i], intersection);
                if (dist < closestDist)
                {
                    closestDist = dist;
                    closestReal = (float)i / POINTS_PER_PATH;
                }
            }
            
            for (int i = 0; i < path2.Length; i++)
            {
                float dist = Vector2.Distance(path2[i], intersection);
                if (dist < closestDist)
                {
                    closestDist = dist;
                    closestReal = (float)i / POINTS_PER_PATH;
                }
            }
            
            intersectionData.Add((closestReal, index, intersection));
        }
    }

    private static Vector2[] FindPathIntersections(Vector2[] path1, Vector2[] path2)
    {
        var intersections = new List<Vector2>();
        
        // Check each line segment pair for intersections
        for (int i = 1; i < path1.Length; i++)
        {
            var line1Start = path1[i - 1];
            var line1End = path1[i];
            
            for (int j = 1; j < path2.Length; j++)
            {
                var line2Start = path2[j - 1];
                var line2End = path2[j];
                
                if (TryGetLineIntersection(line1Start, line1End, line2Start, line2End, out Vector2 intersection))
                {
                    intersections.Add(intersection);
                }
            }
        }
        
        return intersections.ToArray();
    }

    private static bool TryGetLineIntersection(Vector2 line1Start, Vector2 line1End, Vector2 line2Start, Vector2 line2End, out Vector2 intersection)
    {
        intersection = Vector2.zero;

        var a1 = line1End.y - line1Start.y;
        var b1 = line1Start.x - line1End.x;
        var c1 = a1 * line1Start.x + b1 * line1Start.y;

        var a2 = line2End.y - line2Start.y;
        var b2 = line2Start.x - line2End.x;
        var c2 = a2 * line2Start.x + b2 * line2Start.y;

        var determinant = a1 * b2 - a2 * b1;

        if (Mathf.Abs(determinant) < 0.0001f)
            return false;

        var x = (b2 * c1 - b1 * c2) / determinant;
        var y = (a1 * c2 - a2 * c1) / determinant;
        intersection = new Vector2(x, y);

        return IsPointOnLineSegment(line1Start, line1End, intersection) &&
               IsPointOnLineSegment(line2Start, line2End, intersection);
    }

    private static bool IsPointOnLineSegment(Vector2 lineStart, Vector2 lineEnd, Vector2 point)
    {
        var d1 = Vector2.Distance(lineStart, point);
        var d2 = Vector2.Distance(lineEnd, point);
        var lineLength = Vector2.Distance(lineStart, lineEnd);
        var buffer = 0.0001f;

        return d1 + d2 >= lineLength - buffer && d1 + d2 <= lineLength + buffer;
    }

    private static void SaveToCSV(List<(float real, float index, Vector2 point)> intersections)
    {
        var csv = new StringBuilder();
        csv.AppendLine("real,index");
        
        foreach (var (real, index, _) in intersections)
        {
            csv.AppendLine($"{real:F12},{index:F12}");
        }
        
        string path = "Assets/Resources/intersections.csv";
        Directory.CreateDirectory(Path.GetDirectoryName(path));
        File.WriteAllText(path, csv.ToString());
        AssetDatabase.Refresh();
    }
} 