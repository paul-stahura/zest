// Refactored BPSymmetryRenderer.cs for clarity with detailed comments.
// This class uses immediate mode shape drawing to render intersecting paths and debug visuals in a Unity scene.

using UnityEngine;
using Shapes;
using UnityEngine.UI;
using System.Collections.Generic;

/// <summary>
/// BPSymmetryRenderer is responsible for drawing two related paths based on a symmetry calculation,
/// detecting their intersections, local minima, and optionally drawing debug visuals for analysis.
/// </summary>
public class BPSymmetryRenderer : ImmediateModeShapeDrawer
{
    // ============================
    // ========== SETTINGS ========
    // ============================

    [Header("Basic Settings")]
    [SerializeField] private SpiralCalculator _spiralCalculator; // Used for spiral-related calculations (not used directly here)
    [SerializeField] private Color _symmetryColor; // Color used for symmetry elements
    [SerializeField] private bool _showDebugVisuals = false; // Toggle for drawing extra debug visuals
    
    [Header("Critical Index")]
    [SerializeField] private float _fixedIndex = 5.108561515808110f; // Critical index for symmetry calculations
    
    [Header("Intersection Detection")]
    [SerializeField] private float _intersectionThreshold = 0.001f; // Threshold distance for considering intersections
    [SerializeField] private float _validationThreshold = 0.005f; // Threshold used to validate known intersections

    [SerializeField] private int _initialDivisions = 100; // Number of segments to divide the path initially
    [SerializeField] private float _minStepSize = 0.001f; // Minimum allowed step size while searching for intersections
    [SerializeField] private float _baseStepSizeDivisor = 50f; // Divisor to determine the base step size for intersection search
    [SerializeField] private int _maxIterations = 100; // Maximum number of iterations in the intersection search loop
    
    [Header("Step Size Adjustments")]
    [SerializeField] private float _midRegionStepDivisor = 4f; // Step size divisor when t > 0.5
    [SerializeField] private float _lateRegionStepDivisor = 8f; // More reduction factor when t > 0.75
    [SerializeField] private float _stepSizeIncreaseRate = 1.2f; // Factor to increase step size when path is increasing
    [SerializeField] private int _requiredConsecutiveIncreases = 5; // Number of consecutive increases before adjusting step size
    [SerializeField] private float _minimumStepReduction = 8f; // Factor by which to reduce step size when a direction change is detected
    
    [Header("Local Minima Detection")]
    [SerializeField] private float _minimumDistanceThresholdMultiplier = 100f; // Multiplier to compute threshold for detecting significant minima
    [SerializeField] private float _minimumSeparationDivisor = 100f; // Divisor to ensure separation between detected minima
    [SerializeField] private float _significantMinimumRatio = 0.98f; // Ratio to judge whether a detected minimum is significant
    
    [Header("Visualization")]
    [SerializeField] private int _drawPoints = 100; // Number of points to sample along each path for drawing
    [SerializeField] private float _markerHeight = 0.2f; // Height of debug markers
    [SerializeField] private float _intersectionPointRadius = 0.05f; // Radius used for drawing intersection point discs
    [SerializeField] private Color _path1Color = Color.red; // Color for the first path
    [SerializeField] private Color _path2Color = Color.blue; // Color for the second path
    [SerializeField] private Color _intersectionColor = Color.yellow; // Color for intersection points
    [SerializeField] private Color _minimumColor = new Color(0f, 1f, 0f, 0.8f); // Color for significant minimum markers
    [SerializeField] private Color _innerThresholdColor = new Color(1f, 1f, 0f, 0.8f); // Color for inner threshold markers
    [SerializeField] private Color _outerThresholdColor = new Color(1f, 0.5f, 0f, 0.8f); // Color for outer threshold markers

    // Predefined known intersection t-values used for validation
    private static readonly float[] KNOWN_INTERSECTIONS = new float[] { 0.077987f, 0.5f, 0.922013f };

    /// <summary>
    /// Helper structure to group path data for drawing.
    /// Contains sample points for both paths and their distances.
    /// </summary>
    private struct PathData
    {
        public Vector2[] path1; // Points for the first path
        public Vector2[] path2; // Points for the second path
        public float[] distances; // Distance between corresponding points of path1 and path2
    }

    /// <summary>
    /// DrawShapes is the entry point for rendering shapes.
    /// It sets up the drawing context and invokes the process to calculate and draw intersections.
    /// </summary>
    public override void DrawShapes(Camera cam)
    {
        // Begin drawing command scoped to the camera
        using (Draw.Command(cam))
        {
            // Configure drawing settings
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;
            Draw.Matrix = transform.localToWorldMatrix;
            ProcessAndRenderPaths();
        }
    }

    /// <summary>
    /// ProcessAndRenderPaths calculates intersections, prepares path data, and draws the main paths.
    /// Also draws debug visuals if enabled.
    /// </summary>
    private void ProcessAndRenderPaths()
    {
        // Get intersections and local minima data
        var (intersections, localMinima) = FindAllIntersections();
        // Generate the sample datapoints for both paths and their inter-point distances
        var pathData = GeneratePathData();
        
        // Draw the two primary paths
        DrawMainPaths(pathData);
        
        // If debug visuals are enabled, draw additional markers and thresholds.
        if (_showDebugVisuals)
        {
            DrawDebugVisuals(pathData, intersections, localMinima);
        }
        
        // Draw intersection points as discs
        DrawIntersectionPoints(intersections);
        // Validate detected intersections against known t-values
        ValidateIntersections(intersections);
    }

    /// <summary>
    /// Iterates over the entire path to detect intersection points and local minima.
    /// </summary>
    /// <returns>
    /// A tuple containing:
    /// - List of intersections (each as a tuple of t value and midpoint).
    /// - List of local minima (each as a tuple of t value and distance).
    /// </returns>
    private (List<(float t, Vector2 point)> intersections, List<(float t, float distance)> localMinima) FindAllIntersections()
    {
        var intersections = new List<(float t, Vector2 point)>();
        var localMinima = new List<(float t, float distance)>();
        float stepSize = 1f / _initialDivisions;

        // Divide the t range [0,1] into segments and search for intersections within each segment.
        for (float t = 0; t <= 1 - stepSize; t += stepSize)
        {
            // Search for intersections in the current range [t, t + stepSize]
            var foundIntersections = FindIntersectionsInRange(t, t + stepSize, localMinima);
            foreach (var intersection in foundIntersections)
            {
                // Add intersection only if it is not a duplicate (within threshold) of an existing intersection.
                if (IsIntersectionUnique(intersection, intersections))
                {
                    intersections.Add(intersection);
                    // Log intersection details for debugging purposes.
                    Debug.Log($"Found intersection at t={intersection.t:F6}, distance={GetPathDistance(intersection.t):F6}");
                }
            }
        }

        return (intersections, localMinima);
    }

    /// <summary>
    /// Checks if an intersection is unique by comparing its t value with existing intersections.
    /// </summary>
    /// <param name="newIntersection">The new intersection candidate.</param>
    /// <param name="existingIntersections">List of already found intersections.</param>
    /// <returns>True if the new intersection is not within _intersectionThreshold of any existing one.</returns>
    private bool IsIntersectionUnique((float t, Vector2 point) newIntersection, List<(float t, Vector2 point)> existingIntersections)
    {
        foreach (var (existingT, _) in existingIntersections)
        {
            if (Mathf.Abs(existingT - newIntersection.t) < _intersectionThreshold)
            {
                return false;
            }
        }
        return true;
    }

    /// <summary>
    /// Generates sample points along the two paths and calculates distances between corresponding points.
    /// </summary>
    /// <returns>A PathData structure containing path points and distances.</returns>
    private PathData GeneratePathData()
    {
        var data = new PathData
        {
            path1 = new Vector2[_drawPoints],
            path2 = new Vector2[_drawPoints],
            distances = new float[_drawPoints]
        };

        // Sample the t range evenly and compute corresponding points on both paths.
        for (int i = 0; i < _drawPoints; i++)
        {
            float t = (float)i / _drawPoints;
            data.path1[i] = RhombusPoints.GetBPSymmetry(t, _fixedIndex);
            data.path2[i] = RhombusPoints.GetBPForward(t, _fixedIndex);
            data.distances[i] = Vector2.Distance(data.path1[i], data.path2[i]);
        }

        return data;
    }

    /// <summary>
    /// Draws the primary paths using the provided path data.
    /// Lines are only drawn if the distance between consecutive points is below a threshold to avoid artifacts.
    /// </summary>
    /// <param name="pathData">The sample data for the two paths.</param>
    private void DrawMainPaths(PathData pathData)
    {
        // Draw first path in designated color.
        Draw.Color = _path1Color;
        Draw.Thickness = 2f;
        for (int i = 1; i < pathData.path1.Length; i++)
        {
            if ((pathData.path1[i - 1] - pathData.path1[i]).magnitude < 5)
                Draw.Line(pathData.path1[i - 1], pathData.path1[i]);
        }

        // Draw second path in its designated color.
        Draw.Color = _path2Color;
        for (int i = 1; i < pathData.path2.Length; i++)
        {
            if ((pathData.path2[i - 1] - pathData.path2[i]).magnitude < 5)
                Draw.Line(pathData.path2[i - 1], pathData.path2[i]);
        }
    }

    /// <summary>
    /// Draws additional debug visuals such as threshold markers and local minima markers.
    /// </summary>
    /// <param name="pathData">The sample path data.</param>
    /// <param name="intersections">Detected intersection points (unused in debug visuals here but passed for completeness).</param>
    /// <param name="localMinima">Detected local minima values along the paths.</param>
    private void DrawDebugVisuals(PathData pathData, List<(float t, Vector2 point)> intersections, List<(float t, float distance)> localMinima)
    {
        DrawThresholdMarkers(pathData);
        DrawLocalMinimaMarkers(localMinima);
    }

    /// <summary>
    /// Draws vertical markers at points where the distance between paths crosses certain thresholds.
    /// </summary>
    /// <param name="pathData">The sample path data.</param>
    private void DrawThresholdMarkers(PathData pathData)
    {
        bool wasWithinInnerThreshold = false;
        bool wasWithinOuterThreshold = false;
        Vector2 prevMidPoint = Vector2.zero;
        float prevDistance = 0;

        // Iterate over each sampled point to determine when threshold boundaries are crossed.
        for (int i = 0; i < _drawPoints; i++)
        {
            Vector2 midPoint = (pathData.path1[i] + pathData.path2[i]) / 2f;
            float distance = pathData.distances[i];

            if (i > 0)
            {
                bool isWithinInnerThreshold = distance < _intersectionThreshold;
                bool isWithinOuterThreshold = distance < _intersectionThreshold * 10;

                // If inner threshold state changes, draw a vertical marker with inner threshold color.
                if (isWithinInnerThreshold != wasWithinInnerThreshold)
                {
                    DrawVerticalMarker(prevMidPoint, midPoint, prevDistance, distance, _intersectionThreshold, _innerThresholdColor);
                }

                // If outer threshold state changes, draw a vertical marker with outer threshold color.
                if (isWithinOuterThreshold != wasWithinOuterThreshold)
                {
                    DrawVerticalMarker(prevMidPoint, midPoint, prevDistance, distance, _intersectionThreshold * 10, _outerThresholdColor);
                }

                wasWithinInnerThreshold = isWithinInnerThreshold;
                wasWithinOuterThreshold = isWithinOuterThreshold;
            }

            prevMidPoint = midPoint;
            prevDistance = distance;
        }
    }

    /// <summary>
    /// Draws a vertical marker line between two points where the distance crosses a given threshold.
    /// </summary>
    /// <param name="prevPoint">Previous midpoint.</param>
    /// <param name="currentPoint">Current midpoint.</param>
    /// <param name="prevDist">Distance at previous point.</param>
    /// <param name="currentDist">Distance at current point.</param>
    /// <param name="threshold">Threshold value triggering the marker.</param>
    /// <param name="color">Color of the marker.</param>
    private void DrawVerticalMarker(Vector2 prevPoint, Vector2 currentPoint, float prevDist, float currentDist, float threshold, Color color)
    {
        Draw.Color = color;
        // Calculate interpolation ratio where the crossing occurs.
        float ratio = (threshold - prevDist) / (currentDist - prevDist);
        Vector2 crossingPoint = Vector2.Lerp(prevPoint, currentPoint, ratio);
        // Draw a short vertical line at the crossing point.
        Draw.Line(crossingPoint + Vector2.up * _markerHeight, crossingPoint + Vector2.down * _markerHeight);
    }

    /// <summary>
    /// Draws markers at local minima positions along the path to highlight significant distance dips.
    /// </summary>
    /// <param name="localMinima">List of local minima (t value and distance).</param>
    private void DrawLocalMinimaMarkers(List<(float t, float distance)> localMinima)
    {
        Draw.Color = _minimumColor;
        foreach (var (t, distance) in localMinima)
        {
            // Compute points from the two paths at parameter t.
            Vector2 p1 = RhombusPoints.GetBPSymmetry(t, _fixedIndex);
            Vector2 p2 = RhombusPoints.GetBPForward(t, _fixedIndex);
            // Determine the midpoint between the two points.
            Vector2 midPoint = (p1 + p2) / 2f;
            // Draw a vertical line marker at the midpoint.
            Draw.Line(midPoint + Vector2.up * _markerHeight, midPoint + Vector2.down * _markerHeight);
        }
    }

    /// <summary>
    /// Draws the detected intersection points as discs using the intersection color.
    /// </summary>
    /// <param name="intersections">List of detected intersections.</param>
    private void DrawIntersectionPoints(List<(float t, Vector2 point)> intersections)
    {
        Draw.Color = _intersectionColor;
        Draw.Thickness = 2f;
        foreach (var (t, point) in intersections)
        {
            Draw.Disc(point, _intersectionPointRadius);
        }
    }

    /// <summary>
    /// Validates detected intersections by comparing them to known intersection t-values.
    /// Logs success or warning depending on whether each known intersection was found.
    /// </summary>
    /// <param name="intersections">List of detected intersections.</param>
    private void ValidateIntersections(List<(float t, Vector2 point)> intersections)
    {
        foreach (float known in KNOWN_INTERSECTIONS)
        {
            bool found = false;
            foreach (var (t, _) in intersections)
            {
                if (Mathf.Abs(t - known) < _validationThreshold)
                {
                    Debug.Log($"✓ Validated intersection at t={t:F6} matches known value {known:F6}");
                    found = true;
                    break;
                }
            }
            if (!found)
            {
                Debug.LogWarning($"❌ Failed to find known intersection at t={known:F6}");
            }
        }
    }

    /// <summary>
    /// Searches for intersections within a given range of t values.
    /// It adjusts the step size dynamically based on the change in distance between paths.
    /// Also detects local minima if the distance is near a threshold.
    /// </summary>
    /// <param name="start">Start of t range.</param>
    /// <param name="end">End of t range.</param>
    /// <param name="localMinima">Reference list to add detected local minima.</param>
    /// <returns>List of detected intersections (t value and midpoint) within the range.</returns>
    private List<(float t, Vector2 point)> FindIntersectionsInRange(float start, float end, List<(float t, float distance)> localMinima)
    {
        var intersections = new List<(float t, Vector2 point)>();
        
        float t = start;
        // Calculate the base step size for the range using the provided divisor
        float baseStepSize = (end - start) / _baseStepSizeDivisor;
        float stepSize = baseStepSize;
        float prevDist = GetPathDistance(t);
        bool wasDecreasing = true;
        int iterations = 0;
        int consecutiveIncreasing = 0;
        
        // Setup variables for detecting local minima
        float lastMinimumDist = float.MaxValue;
        float minimumDistanceThreshold = _intersectionThreshold * _minimumDistanceThresholdMultiplier;
        float minimumSeparation = (end - start) / _minimumSeparationDivisor;
        float lastMinimumT = float.MinValue;

        while (stepSize > _minStepSize && t < end && iterations < _maxIterations)
        {
            // Adjust step size based on the current region of t
            if (t > 0.5f)
            {
                stepSize = baseStepSize / _midRegionStepDivisor;
                if (t > 0.75f)
                {
                    stepSize = baseStepSize / _lateRegionStepDivisor;
                }
            }

            float nextT = t + stepSize;
            float dist = GetPathDistance(nextT);
            bool isDecreasing = dist < prevDist;

            // If the distance falls below the strict intersection threshold, register an intersection.
            if (dist < _intersectionThreshold)
            {
                Vector2 p1 = RhombusPoints.GetBPSymmetry(nextT, _fixedIndex);
                Vector2 p2 = RhombusPoints.GetBPForward(nextT, _fixedIndex);
                // Use the midpoint as the location for the intersection marker.
                intersections.Add((nextT, (p1 + p2) / 2));
                Debug.Log($"Found intersection at t={nextT:F6} with distance {dist:F6}");
                
                // Increase step size dramatically after finding an intersection to continue search efficiently.
                stepSize = _minStepSize * 1000;
                consecutiveIncreasing = 0;
                t = nextT;
                prevDist = dist;
                iterations++;
                continue;
            }

            // Check if the distance trend has changed from decreasing to increasing (potential local minimum)
            if (wasDecreasing && !isDecreasing)
            {
                // If the new distance is below threshold, sufficiently separated, and a significant drop compared to previous minima, register as local minimum.
                if (dist < minimumDistanceThreshold && 
                    (nextT - lastMinimumT) > minimumSeparation &&
                    dist < lastMinimumDist * _significantMinimumRatio)
                {
                    Debug.Log($"Found significant minimum at t={nextT:F6} with distance {dist:F6}");
                    localMinima.Add((nextT, dist));
                    lastMinimumDist = dist;
                    lastMinimumT = nextT;
                }
                
                // Reduce step size for finer search after transition from decreasing to increasing trend.
                stepSize /= _minimumStepReduction;
                wasDecreasing = true;
                consecutiveIncreasing = 0;
                iterations++;
                continue;
            }

            if (isDecreasing)
            {
                // If distance is moderately small, further reduce step size to capture changes.
                if (dist < _intersectionThreshold * 20)
                {
                    stepSize = Mathf.Max(stepSize / 2, _minStepSize);
                }
                t = nextT;
                prevDist = dist;
                consecutiveIncreasing = 0;
            }
            else
            {
                // When distance is increasing, count consecutive increases.
                consecutiveIncreasing++;
                // For t values in the first half and after several consecutive increases, try increasing the step size gently.
                if (t < 0.5f && consecutiveIncreasing >= _requiredConsecutiveIncreases && stepSize < baseStepSize)
                {
                    stepSize = Mathf.Min(stepSize * _stepSizeIncreaseRate, baseStepSize);
                }
                t = nextT;
                prevDist = dist;
            }

            wasDecreasing = isDecreasing;
            iterations++;
        }

        if (iterations >= _maxIterations)
        {
            Debug.LogWarning($"Hit max iterations in range [{start:F6}, {end:F6}]");
        }

        return intersections;
    }

    /// <summary>
    /// Computes the distance between corresponding points on the two paths at a given t value.
    /// </summary>
    /// <param name="t">Parameter along the path.</param>
    /// <returns>Euclidean distance between points from the two methods.</returns>
    private float GetPathDistance(float t)
    {
        var p1 = RhombusPoints.GetBPSymmetry(t, _fixedIndex);
        var p2 = RhombusPoints.GetBPForward(t, _fixedIndex);
        return Vector2.Distance(p1, p2);
    }
} 