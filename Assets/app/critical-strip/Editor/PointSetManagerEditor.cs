using UnityEngine;
using UnityEditor;

[CustomEditor(typeof(PointSetManager))]
public class PointSetManagerEditor : Editor
{
    [MenuItem("CONTEXT/PointSetManager/Add 10 Random Points")]
    private static void AddRandomPoints(MenuCommand command)
    {
        var manager = command.context as PointSetManager;
        if (manager == null) return;

        var pointSet = new PointSet("test_points", Color.cyan);
        
        // Generate 10 random points within the critical strip
        for (int i = 0; i < 10; i++)
        {
            float real = Random.value; // [0,1]
            float index = Random.Range(0f, 7f); // Default index range
            pointSet.AddPoint(real, index);
        }
        
        manager.AddTestPointSet(pointSet);
        
        Debug.Log($"Added {pointSet.Points.Count} random points to test_points set");
    }
    
    [MenuItem("CONTEXT/PointSetManager/Add 100 Random Points")]
    private static void AddManyRandomPoints(MenuCommand command)
    {
        var manager = command.context as PointSetManager;
        if (manager == null) return;

        var pointSet = new PointSet("test_points_large", new Color(1f, 0.5f, 0f, 1f)); // Orange
        
        // Generate 100 random points within the critical strip
        for (int i = 0; i < 100; i++)
        {
            float real = Random.value; // [0,1]
            float index = Random.Range(0f, 7f); // Default index range
            pointSet.AddPoint(real, index);
        }
        
        manager.AddTestPointSet(pointSet);
        
        Debug.Log($"Added {pointSet.Points.Count} random points to test_points_large set");
    }
    
    [MenuItem("CONTEXT/PointSetManager/Clear Test Points")]
    private static void ClearTestPoints(MenuCommand command)
    {
        var manager = command.context as PointSetManager;
        if (manager == null) return;

        manager.ClearTestPointSets();
        Debug.Log("Cleared all test point sets");
    }
} 