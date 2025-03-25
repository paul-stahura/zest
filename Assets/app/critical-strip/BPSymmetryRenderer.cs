using UnityEngine;
using Shapes;
using UnityEngine.UI;
using System.Collections.Generic;

public class BPSymmetryRenderer : ImmediateModeShapeDrawer
{
    // test
    [Header("Basic Settings")]
    [SerializeField] private SpiralCalculator _spiralCalculator;
    [SerializeField] private Color _symmetryColor;
    [SerializeField] private bool _showDebugVisuals = false;
    
    [Header("Critical Index")]
    [SerializeField] private float _fixedIndex = 5.108561515808110f;
    
    [Header("Intersection Detection")]
    [SerializeField] private float _intersectionThreshold = 0.001f;
    [SerializeField] private float _validationThreshold = 0.005f;

    [SerializeField] private int _initialDivisions = 100;
    [SerializeField] private float _minStepSize = 0.001f;
    [SerializeField] private float _baseStepSizeDivisor = 50f;
    [SerializeField] private int _maxIterations = 100;
    
    [Header("Step Size Adjustments")]
    [SerializeField] private float _midRegionStepDivisor = 4f;
    [SerializeField] private float _lateRegionStepDivisor = 8f;
    [SerializeField] private float _stepSizeIncreaseRate = 1.2f;
    [SerializeField] private int _requiredConsecutiveIncreases = 5;
    [SerializeField] private float _minimumStepReduction = 8f;
    
    [Header("Local Minima Detection")]
    [SerializeField] private float _minimumDistanceThresholdMultiplier = 100f;
    [SerializeField] private float _minimumSeparationDivisor = 100f;
    [SerializeField] private float _significantMinimumRatio = 0.98f;
    
    [Header("Visualization")]
    [SerializeField] private int _drawPoints = 100;
    [SerializeField] private float _markerHeight = 0.2f;
    [SerializeField] private float _intersectionPointRadius = 0.05f;
    [SerializeField] private Color _path1Color = Color.red;
    [SerializeField] private Color _path2Color = Color.blue;
    [SerializeField] private Color _intersectionColor = Color.yellow;
    [SerializeField] private Color _minimumColor = new Color(0f, 1f, 0f, 0.8f);
    [SerializeField] private Color _innerThresholdColor = new Color(1f, 1f, 0f, 0.8f);
    [SerializeField] private Color _outerThresholdColor = new Color(1f, 0.5f, 0f, 0.8f);

    // Known intersection points for the critical index value (for validation)
    private static readonly float[] KNOWN_INTERSECTIONS = new float[] { 0.077987f, 0.5f, 0.922013f };

    private struct PathData
    {
        public Vector2[] path1;
        public Vector2[] path2;
        public float[] distances;
    }

    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;
            Draw.Matrix = transform.localToWorldMatrix;
            FindAndDrawIntersectingPaths();
        }
    }

    private void FindAndDrawIntersectingPaths()
    {
        var intersections = FindAllIntersections();
        var pathData = GeneratePathData();
        
        DrawMainPaths(pathData);
        
        if (_showDebugVisuals)
        {
            DrawDebugVisuals(pathData, intersections.intersections, intersections.localMinima);
        }
        
        DrawIntersectionPoints(intersections.intersections);
        ValidateIntersections(intersections.intersections);
    }

    private (List<(float t, Vector2 point)> intersections, List<(float t, float distance)> localMinima) FindAllIntersections()
    {
        var intersections = new List<(float t, Vector2 point)>();
        var localMinima = new List<(float t, float distance)>();
        float stepSize = 1f / _initialDivisions;

        for (float t = 0; t <= 1 - stepSize; t += stepSize)
        {
            var foundIntersections = FindIntersectionsInRange(t, t + stepSize, localMinima);
            foreach (var intersection in foundIntersections)
            {
                if (IsNewIntersection(intersection, intersections))
                {
                    intersections.Add(intersection);
                    Debug.Log($"Found intersection at t={intersection.t:F6}, distance={GetPathDistance(intersection.t):F6}");
                }
            }
        }

        return (intersections, localMinima);
    }

    private bool IsNewIntersection((float t, Vector2 point) newIntersection, List<(float t, Vector2 point)> existingIntersections)
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

    private PathData GeneratePathData()
    {
        var data = new PathData
        {
            path1 = new Vector2[_drawPoints],
            path2 = new Vector2[_drawPoints],
            distances = new float[_drawPoints]
        };

        for (int i = 0; i < _drawPoints; i++)
        {
            float t = (float)i / _drawPoints;
            data.path1[i] = RhombusPoints.GetBPSymmetry(t, _fixedIndex);
            data.path2[i] = RhombusPoints.GetBPForward(t, _fixedIndex);
            data.distances[i] = Vector2.Distance(data.path1[i], data.path2[i]);
        }

        return data;
    }

    private void DrawMainPaths(PathData pathData)
    {
        // Draw first path
        Draw.Color = _path1Color;
        Draw.Thickness = 2f;
        for (int i = 1; i < pathData.path1.Length; i++)
        {
            if ((pathData.path1[i - 1] - pathData.path1[i]).magnitude < 5)
                Draw.Line(pathData.path1[i - 1], pathData.path1[i]);
        }

        // Draw second path
        Draw.Color = _path2Color;
        for (int i = 1; i < pathData.path2.Length; i++)
        {
            if ((pathData.path2[i - 1] - pathData.path2[i]).magnitude < 5)
                Draw.Line(pathData.path2[i - 1], pathData.path2[i]);
        }
    }

    private void DrawDebugVisuals(PathData pathData, List<(float t, Vector2 point)> intersections, List<(float t, float distance)> localMinima)
    {
        DrawThresholdMarkers(pathData);
        DrawLocalMinimaMarkers(localMinima);
    }

    private void DrawThresholdMarkers(PathData pathData)
    {
        bool wasWithinInnerThreshold = false;
        bool wasWithinOuterThreshold = false;
        Vector2 prevMidPoint = Vector2.zero;
        float prevDistance = 0;

        for (int i = 0; i < _drawPoints; i++)
        {
            Vector2 midPoint = (pathData.path1[i] + pathData.path2[i]) / 2f;
            float distance = pathData.distances[i];

            if (i > 0)
            {
                bool isWithinInnerThreshold = distance < _intersectionThreshold;
                bool isWithinOuterThreshold = distance < _intersectionThreshold * 10;

                if (isWithinInnerThreshold != wasWithinInnerThreshold)
                {
                    DrawVerticalMarker(prevMidPoint, midPoint, prevDistance, distance, 
                        _intersectionThreshold, new Color(1f, 1f, 0f, 0.8f));
                }

                if (isWithinOuterThreshold != wasWithinOuterThreshold)
                {
                    DrawVerticalMarker(prevMidPoint, midPoint, prevDistance, distance, 
                        _intersectionThreshold * 10, new Color(1f, 0.5f, 0f, 0.8f));
                }

                wasWithinInnerThreshold = isWithinInnerThreshold;
                wasWithinOuterThreshold = isWithinOuterThreshold;
            }

            prevMidPoint = midPoint;
            prevDistance = distance;
        }
    }

    private void DrawVerticalMarker(Vector2 prevPoint, Vector2 currentPoint, float prevDist, float currentDist, 
        float threshold, Color color)
    {
        Draw.Color = color;
        float ratio = (threshold - prevDist) / (currentDist - prevDist);
        Vector2 crossingPoint = Vector2.Lerp(prevPoint, currentPoint, ratio);
        Draw.Line(crossingPoint + Vector2.up * _markerHeight, crossingPoint + Vector2.down * _markerHeight);
    }

    private void DrawLocalMinimaMarkers(List<(float t, float distance)> localMinima)
    {
        Draw.Color = _minimumColor;
        foreach (var (t, distance) in localMinima)
        {
            Vector2 p1 = RhombusPoints.GetBPSymmetry(t, _fixedIndex);
            Vector2 p2 = RhombusPoints.GetBPForward(t, _fixedIndex);
            Vector2 midPoint = (p1 + p2) / 2f;
            Draw.Line(midPoint + Vector2.up * _markerHeight, midPoint + Vector2.down * _markerHeight);
        }
    }

    private void DrawIntersectionPoints(List<(float t, Vector2 point)> intersections)
    {
        Draw.Color = _intersectionColor;
        Draw.Thickness = 2f;
        foreach (var (t, point) in intersections)
        {
            Draw.Disc(point, _intersectionPointRadius);
        }
    }

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

    private List<(float t, Vector2 point)> FindIntersectionsInRange(float start, float end, List<(float t, float distance)> localMinima)
    {
        var intersections = new List<(float t, Vector2 point)>();
        
        float t = start;
        float baseStepSize = (end - start) / _baseStepSizeDivisor;
        float stepSize = baseStepSize;
        float prevDist = GetPathDistance(t);
        bool wasDecreasing = true;
        int iterations = 0;
        int consecutiveIncreasing = 0;
        
        // For local minimum detection
        float lastMinimumDist = float.MaxValue;
        float minimumDistanceThreshold = _intersectionThreshold * _minimumDistanceThresholdMultiplier;
        float minimumSeparation = (end - start) / _minimumSeparationDivisor;
        float lastMinimumT = float.MinValue;

        while (stepSize > _minStepSize && t < end && iterations < _maxIterations)
        {
            // Adjust step size based on region
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

            if (dist < _intersectionThreshold)
            {
                Vector2 p1 = RhombusPoints.GetBPSymmetry(nextT, _fixedIndex);
                Vector2 p2 = RhombusPoints.GetBPForward(nextT, _fixedIndex);
                intersections.Add((nextT, (p1 + p2) / 2));
                Debug.Log($"Found intersection at t={nextT:F6} with distance {dist:F6}");
                
                stepSize = _minStepSize * 1000;
                consecutiveIncreasing = 0;
                t = nextT;
                prevDist = dist;
                iterations++;
                continue;
            }

            if (wasDecreasing && !isDecreasing)
            {
                if (dist < minimumDistanceThreshold && 
                    (nextT - lastMinimumT) > minimumSeparation &&
                    dist < lastMinimumDist * _significantMinimumRatio)
                {
                    Debug.Log($"Found significant minimum at t={nextT:F6} with distance {dist:F6}");
                    localMinima.Add((nextT, dist));
                    lastMinimumDist = dist;
                    lastMinimumT = nextT;
                }
                
                stepSize /= _minimumStepReduction;
                wasDecreasing = true;
                consecutiveIncreasing = 0;
                iterations++;
                continue;
            }

            if (isDecreasing)
            {
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
                consecutiveIncreasing++;
                
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

    private float GetPathDistance(float t)
    {
        var p1 = RhombusPoints.GetBPSymmetry(t, _fixedIndex);
        var p2 = RhombusPoints.GetBPForward(t, _fixedIndex);
        return Vector2.Distance(p1, p2);
    }
} 