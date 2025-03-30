using UnityEngine;
using UnityEditor;

[CustomEditor(typeof(PointSetManager))]
public class PointSetManagerEditor : Editor
{  
    [MenuItem("CONTEXT/PointSetManager/Add 1000 Random Points")]
    private static void AddManyRandomPoints(MenuCommand command)
    {
        var manager = command.context as PointSetManager;
        if (manager == null) return;

        // Get the renderer to determine current visible range
        var renderer = manager.GetComponentInChildren<CriticalStripRenderer>();
        if (renderer == null)
        {
            Debug.LogError("Could not find CriticalStripRenderer in children");
            return;
        }

        var transform = renderer.GetTransform();
        if (transform == null)
        {
            Debug.LogError("Could not get CriticalStripTransform");
            return;
        }

        var pointSet = new PointSet("test_points_large", new Color(1f, 0.5f, 0f, 1f)); // Orange
        
        // Generate points within the current visible range
        for (int i = 0; i < 1000; i++)
        {
            float real = Random.value; // [0,1]
            float index = Random.Range(Mathf.Max(0, transform.MinIndex), transform.MaxIndex);
            pointSet.AddPoint(real, index);
        }
        
        manager.AddTestPointSet(pointSet);
        
        Debug.Log($"Added {pointSet.Points.Count} random points to test_points_large set in range [{transform.MinIndex}, {transform.MaxIndex}]");
    }
    
    [MenuItem("CONTEXT/PointSetManager/Clear Test Points")]
    private static void ClearTestPoints(MenuCommand command)
    {
        var manager = command.context as PointSetManager;
        if (manager == null) return;

        manager.ClearTestPointSets();
        Debug.Log("Cleared all test point sets");
    }

    [MenuItem("CONTEXT/PointSetManager/Add Grid Points")]
    private static void AddGridPoints(MenuCommand command)
    {
        var manager = command.context as PointSetManager;
        if (manager == null) return;

        // Get the renderer to determine current visible range
        var renderer = manager.GetComponentInChildren<CriticalStripRenderer>();
        if (renderer == null)
        {
            Debug.LogError("Could not find CriticalStripRenderer in children");
            return;
        }

        var transform = renderer.GetTransform();
        if (transform == null)
        {
            Debug.LogError("Could not get CriticalStripTransform");
            return;
        }

        var pointSet = new PointSet("test_grid", Color.green);
        
        // Create a grid of points with regular intervals
        float xStep = 0.1f;  // Step size for real component (x)
        float yStep = 0.1f;  // Step size for index component (y)
        
        // Cover the current visible range
        for (float x = 0; x <= 1.0f; x += xStep)
        {
            for (float y = Mathf.Max(0, transform.MinIndex); y <= transform.MaxIndex; y += yStep)
            {
                pointSet.AddPoint(x, y);
            }
        }
        
        manager.AddTestPointSet(pointSet);
        
        Debug.Log($"Added grid points to test_grid set with intervals: x={xStep}, y={yStep} in range [{transform.MinIndex}, {transform.MaxIndex}]");
    }

    [MenuItem("CONTEXT/PointSetManager/Add Critical Value Test Grid")]
    private static void AddCriticalValueGrid(MenuCommand command)
    {
        var manager = command.context as PointSetManager;
        if (manager == null) return;

        var pointSet = new PointSet("critical_value_test", Color.magenta);
        
        // Add points exactly at 0.5 real value across different indices
        for (float y = 0; y <= 7.0f; y += 0.25f)
        {
            pointSet.AddPoint(0.5f, y);
        }
        
        // Add points near 0.5 to test precision
        float[] criticalXValues = { 0.499f, 0.4995f, 0.5f, 0.5005f, 0.501f };
        float[] yValues = { 0f, 3.5f, 7f };  // Test at bottom, middle, and top
        
        foreach (float x in criticalXValues)
        {
            foreach (float y in yValues)
            {
                pointSet.AddPoint(x, y);
            }
        }
        
        manager.AddTestPointSet(pointSet);
        
        Debug.Log("Added critical value test grid focusing on real=0.5");
    }

    [MenuItem("CONTEXT/PointSetManager/Analyze Critical Line Threshold")]
    private static void AnalyzeCriticalLineThreshold(MenuCommand command)
    {
        var manager = command.context as PointSetManager;
        if (manager == null) return;

        // Get the actual renderer's RectTransform from the scene
        var renderer = manager.GetComponentInChildren<CriticalStripRenderer>();
        if (renderer == null)
        {
            Debug.LogError("Could not find CriticalStripRenderer in children");
            return;
        }

        var rectTransform = renderer.GetComponent<RectTransform>();
        if (rectTransform == null)
        {
            Debug.LogError("CriticalStripRenderer does not have a RectTransform component");
            return;
        }

        var transform = new CriticalStripTransform(rectTransform);

        Debug.Log("=== Critical Line Threshold Analysis ===");
        Debug.Log($"Viewport size: {rectTransform.rect.width} x {rectTransform.rect.height}");
        Debug.Log("Testing coordinate transformations near 0.5");

        // Test different viewport positions and their transformations
        float[] testValues = {
            0.49f, 0.495f, 0.499f, 0.4999f,
            0.5f,
            0.5001f, 0.501f, 0.505f, 0.51f
        };

        foreach (float x in testValues)
        {
            // Convert to viewport coordinates
            Vector2 stripPos = new Vector2(x, 1.0f);
            Vector2 viewportPos = transform.StripToViewport(stripPos);
            
            // Convert back to strip coordinates
            Vector2 resultPos = transform.ViewportToStrip(viewportPos);
            
            float error = Mathf.Abs(x - resultPos.x);
            string snapped = (resultPos.x == 0.5f) ? " (SNAPPED)" : "";
            float pixelsFromCenter = Mathf.Abs(viewportPos.x - (rectTransform.rect.width * 0.5f));
            
            Debug.Log($"Input: {x:F6} -> Viewport: {viewportPos.x:F6} ({pixelsFromCenter:F1}px from center) -> Output: {resultPos.x:F6}, Error: {error:E6}{snapped}");
        }

        // Test with current threshold
        float currentThreshold = transform.CriticalValueThreshold;
        float currentPixels = currentThreshold * rectTransform.rect.width;
        Debug.Log($"\nCurrent threshold: {currentThreshold:F6}");
        Debug.Log($"In viewport units: {currentPixels:F1} pixels");
        
        // Show what range this covers in strip coordinates
        float range = 0.5f * currentThreshold;
        Debug.Log($"This snaps values between {0.5f - range:F6} and {0.5f + range:F6} to 0.5");
        
        // Suggest some alternative thresholds
        float[] pixelRanges = { 1f, 2f, 3f, 5f, 10f };
        Debug.Log("\nAlternative thresholds to consider:");
        foreach (float pixels in pixelRanges)
        {
            float threshold = pixels / rectTransform.rect.width;
            range = 0.5f * threshold;
            Debug.Log($"{pixels:F1} pixels = {threshold:F6} threshold ({0.5f - range:F6} to {0.5f + range:F6})");
        }
    }
} 