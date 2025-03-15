using UnityEngine;
using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine.Profiling;
using Shapes;
#if UNITY_EDITOR
using UnityEditor;
#endif
using Unity.Mathematics;
using Unity.Jobs;
using Unity.Burst;
using Unity.Collections;

[ExecuteInEditMode]
public class OldZetaSpiral2 : ImmediateModeShapeDrawer
{
    const float IMAGINARY_START = 216.8121f;
    public App app;
    
    // Line pattern parameters
    [Header("Pattern Parameters")]
    [SerializeField] private float real = 0.5f;
    [SerializeField] private float imaginary = 216.8121f;
    [SerializeField] private int numberOfPoints = 220;
    [SerializeField] private int extraPoints = 0;
    [SerializeField] private int downsampledPoints;
    [SerializeField] private int drawnLines;
    [SerializeField] private double _index;

    [Tooltip("Downsample start index. Points before this index are always included.")]
    [SerializeField] [Range(0, 10000)] private int downsampleStartIndex = 1000;

    [Tooltip("Minimum length of line segments to draw. Smaller values increase detail but may reduce performance.")]
    [SerializeField] [Range(0.00001f, 0.01f)] private float minLength = 0.001f;
    
    // Rendering parameters
    [Header("Rendering Parameters")]
    [SerializeField] [Range(0.01f, 0.1f)] private float thickness = 0.02f;
    [SerializeField] private Color lineColor = Color.white;
    [SerializeField] [Range(1f, 10f)] private float scale = 5f;

    [SerializeField] private bool drawAxes = false;


    
    // Animation parameters
    [Header("Animation")]
    [SerializeField] private bool animate = false;
    [SerializeField] [Range(0.1f, 10f)] private float animationSpeed = 1f;
    
    // Optimization parameters
    [Header("Optimization Parameters")]
    [Tooltip("When enabled, reduces the number of rendered points by intelligently skipping points that won't be visually noticeable")]
    [SerializeField] private bool enableDownsampling = false;

    [Tooltip("When enabled, uses Unity.Mathematics and Burst Compiler for parallel processing")]
    [SerializeField] private bool useParallelProcessing = false;

    [Tooltip("Number of points to process in each parallel batch. Higher values (like 1024) can be more efficient")]
    [SerializeField] [Range(32, 2048)] private int batchSize = 1024;

    [Tooltip("Controls how aggressively points are removed. Higher values (>1) remove more points but may affect visual quality. Lower values (<1) preserve more detail")]
    [SerializeField] [Range(0.1f, 4.0f)] private float downsampleAggressiveness = 1f;

    [Tooltip("Minimum screen-space distance (in pixels) between points before a new point is included. Higher values reduce detail but improve performance")]
    [SerializeField] [Range(0.1f, 4.0f)] private float pixelThreshold = 1f;

    [Tooltip("Minimum world-space distance between points before considering screen-space distance. Acts as a first-pass optimization")]
    [SerializeField] [Range(0.01f, 4.0f)] private float worldDistanceThreshold = 0.1f;
    
    // Only check screen distance every N iterations if world‑space difference is small.
    [Tooltip("Controls how often screen-space distance checks are performed. Higher values improve performance but may reduce visual accuracy. Only applies when world-space difference is small.")]
    [SerializeField] [Range(1, 10)] private int screenCheckInterval = 2;
    
    // Debug parameters
    [Header("Debug")]
    [SerializeField] private bool debugLogging = false;
    
    // Reference to the camera for screen-space calculations
    [SerializeField] Camera mainCamera;
    
    // List to store calculated points for the spiral
    private List<Vector3> calculatedPoints = new List<Vector3>();
    
    public override void OnEnable()
    {
        base.OnEnable();
        
        if (debugLogging) Debug.Log("ZetaSpiral2.OnEnable called");
        
        imaginary = 1000000; //118094.4f; //(float)IMAGINARY_START;
        
        // Get camera reference
        mainCamera = GetComponent<Camera>();
        if (mainCamera == null)
        {
            mainCamera = Camera.main;
            if (debugLogging) Debug.Log($"Using main camera: {(mainCamera != null ? mainCamera.name : "null")}");
        }
        
        // Generate the spiral points
        RegenerateLines();
    }
    
    public override void OnDisable()
    {
        if (debugLogging) Debug.Log("ZetaSpiral2.OnDisable called");
        base.OnDisable();
    }
    

    public void RegenerateLines()
    {
        if (useParallelProcessing)
        {
            RegenerateLines_Parallel();
        }
        else 
        {
            RegenerateLines_Original();
        }
    }

    private void RegenerateLines_Original()
    {
        Profiler.BeginSample("ZetaSpiral2.RegenerateLines_Original");
        
        calculatedPoints.Clear();
        int includedPoints = 0;  // Counter for points actually rendered
        
        Vector2 runningSum = Vector2.zero;
        Vector2 lastPoint = Vector2.zero;
        Vector2 lastScreen = Vector2.zero;
        
        if (debugLogging)
        {
            Debug.Log($"Starting spiral generation with real={real}, imaginary={imaginary}, points={numberOfPoints}");
        }

        float startTime = Time.realtimeSinceStartup;
        
        for (int i = 1; i < numberOfPoints; i++)
        {
            // Compute term: reuse Math.Log(i) plus compute inverse power for one division
            double logVal = Math.Log(i);
            double powVal = Math.Pow(i, real);
            double invPow = 1.0f / powVal;
            double angle = imaginary * logVal;
            float x = (float)(Math.Cos(angle) * invPow); 
            float y = (float)(-Math.Sin(angle) * invPow);
            Vector2 term = new Vector2(x, y);
            
            runningSum += term;
            Vector2 currentPoint = runningSum * scale;
            
            bool forceInclude = i <= downsampleStartIndex;
            bool includePoint = false;
            
            // Always include first point or if forced (first 1000 are not downsampled)
            if (enableDownsampling == false || i == 1 || forceInclude || lastPoint == Vector2.zero)
            {
                includePoint = true;
            }
            else
            {
                // First do a cheap world-space squared distance check
                float adjustedWorldThreshold = worldDistanceThreshold * (1f + downsampleAggressiveness);
                float worldThresholdSq = adjustedWorldThreshold * adjustedWorldThreshold;
                float worldDistSq = (currentPoint - lastPoint).sqrMagnitude;
                
                if (worldDistSq > worldThresholdSq)
                {
                    includePoint = true;
                    if (debugLogging)
                    {
                        Debug.Log($"[Point {i}] Included by world distance; worldDistSq: {worldDistSq:F4} > {worldThresholdSq:F4}");
                    }
                }
                // Only if the world distance is too small, do a (less frequent) screen-space check.
                else if (i % screenCheckInterval == 0)
                {
                    Vector2 currentScreen = mainCamera.WorldToScreenPoint(new Vector3(currentPoint.x, currentPoint.y, 0));
                    float adjustedPixelThreshold = pixelThreshold * (1f + downsampleAggressiveness);
                    float pixelThresholdSq = adjustedPixelThreshold * adjustedPixelThreshold;
                    float pixelDistSq = (currentScreen - lastScreen).sqrMagnitude;
                    
                    if (pixelDistSq > pixelThresholdSq)
                    {
                        includePoint = true;
                        if (debugLogging)
                        {
                            Debug.Log($"[Point {i}] Included by pixel distance; pixelDistSq: {pixelDistSq:F4} > {pixelThresholdSq:F4}");
                        }
                    }
                    else if (debugLogging)
                    {
                        Debug.Log($"[Point {i}] Skipped by pixel check; pixelDistSq: {pixelDistSq:F4} <= {pixelThresholdSq:F4}");
                    }
                }
            }
            
            if (includePoint)
            {
                includedPoints++;
                calculatedPoints.Add(new Vector3(currentPoint.x, currentPoint.y, 0));
                
                lastPoint = currentPoint;
                // Cache the screen position so we do not recompute it above
                lastScreen = mainCamera.WorldToScreenPoint(new Vector3(currentPoint.x, currentPoint.y, 0));
            }
        }
        
        // Record the actual number of points rendered
        downsampledPoints = includedPoints;
        
        float endTime = Time.realtimeSinceStartup;
        
        if (debugLogging)
        {
            Debug.Log($"Generated {calculatedPoints.Count} points from {numberOfPoints} points");
            Debug.Log($"Actually rendering {includedPoints} points ({numberOfPoints - includedPoints} points removed)");
            Debug.Log($"Generation time: {(endTime - startTime) * 1000:F2}ms");
            if (numberOfPoints > downsampleStartIndex)
            {
                Debug.Log($"Downsampling enabled after first {downsampleStartIndex} points");
            }
        }
        
        Profiler.EndSample();
    }

    private void RegenerateLines_Parallel()
    {
        Profiler.BeginSample("ZetaSpiral2.RegenerateLines_Parallel");
        
        int pointCount = numberOfPoints - 1;
        calculatedPoints.Clear();
        
        if (debugLogging)
        {
            Debug.Log($"Starting parallel spiral generation with real={real}, imaginary={imaginary}, points={pointCount}, batchSize={batchSize}");
        }

        float startTime = Time.realtimeSinceStartup;
        
        // Allocate native arrays
        var pointsNative = new NativeArray<float2>(pointCount, Allocator.TempJob);
        var includePoint = new NativeArray<bool>(pointCount, Allocator.TempJob);
        
        try
        {
            // Schedule point calculation job
            var calcJob = new CalculatePointsJob
            {
                real = real,
                imaginary = imaginary,
                scale = scale,
                points = pointsNative
            };
            
            var calcHandle = calcJob.Schedule(pointCount, batchSize);
            
            if (enableDownsampling)
            {
                // Schedule downsampling job
                var downsampleJob = new DownsamplePointsJob
                {
                    inputPoints = pointsNative,
                    worldDistanceThreshold = worldDistanceThreshold,
                    pixelThreshold = pixelThreshold,
                    downsampleAggressiveness = downsampleAggressiveness,
                    downsampleStartIndex = downsampleStartIndex,
                    includePoint = includePoint
                };
                
                var downsampleHandle = downsampleJob.Schedule(pointCount, batchSize, calcHandle);
                downsampleHandle.Complete();
            }
            else
            {
                // If not downsampling, include all points
                calcHandle.Complete();
                for (int i = 0; i < pointCount; i++)
                {
                    includePoint[i] = true;
                }
            }
            
            // Copy results back
            float2 runningSum = float2.zero;
            int includedPoints = 0;
            
            for (int i = 0; i < pointCount; i++)
            {
                if (includePoint[i] || i < downsampleStartIndex)
                {
                    includedPoints++;
                    runningSum += pointsNative[i];
                    calculatedPoints.Add(new Vector3(runningSum.x, runningSum.y, 0));
                }
            }
            
            // Record the actual number of points rendered
            downsampledPoints = includedPoints;
            
            float endTime = Time.realtimeSinceStartup;
            
            if (debugLogging)
            {
                Debug.Log($"[Parallel] Generated {calculatedPoints.Count} points from {pointCount} points");
                Debug.Log($"[Parallel] Actually rendering {includedPoints} points ({pointCount - includedPoints} points removed)");
                Debug.Log($"[Parallel] Generation time: {(endTime - startTime) * 1000:F2}ms");
            }
        }
        finally
        {
            // Clean up native arrays
            pointsNative.Dispose();
            includePoint.Dispose();
        }
        
        Profiler.EndSample();
    }

    [BurstCompile]
    private struct CalculatePointsJob : IJobParallelFor
    {
        [ReadOnly] public float real;
        [ReadOnly] public float imaginary;
        [ReadOnly] public float scale;
        [WriteOnly] public NativeArray<float2> points;

        public void Execute(int i)
        {
            int k = i + 1;
            double logVal = math.log(k);
            double powVal = math.pow(k, real);
            double invPow = 1.0f / powVal;
            double angle = imaginary * logVal;
            float x = (float)(math.cos(angle) * invPow); 
            float y = (float)(-math.sin(angle) * invPow);
            points[i] = new float2(x, y) * scale;
        }
    }

    [BurstCompile]
    private struct DownsamplePointsJob : IJobParallelFor 
    {
        [ReadOnly] public NativeArray<float2> inputPoints;
        [ReadOnly] public float worldDistanceThreshold;
        [ReadOnly] public float pixelThreshold;
        [ReadOnly] public float downsampleAggressiveness;
        [ReadOnly] public int downsampleStartIndex;
        [WriteOnly] public NativeArray<bool> includePoint;
        
        public void Execute(int i)
        {
            if (i == 0 || i < downsampleStartIndex) 
            {
                includePoint[i] = true;
                return;
            }

            float2 current = inputPoints[i];
            float2 prev = inputPoints[i-1];
            
            float adjustedWorldThreshold = worldDistanceThreshold * (1f + downsampleAggressiveness);
            float worldDistSq = math.distancesq(current, prev);
            
            includePoint[i] = worldDistSq > (adjustedWorldThreshold * adjustedWorldThreshold);
        }
    }

    double middleIndex(double index, double spiral)
    {
        // given index and joint/spiral num, return index/number of the 
        // Spiral Middle Link, works for any spiral (last spiral is number j=0)

        // S_{mlink}\left(i,j\right)=\frac{2i\left(i+1\right)}{\left(2j+1\right)}+\frac{1}{3\left(2j+1\right)}

        // GPT 3.5
        // (2index^2 + 3index + 2spiral)/(2spiral + 1)
        // GPT4:
        // (2 * index^2 + 2 * index - 2 * spiral + 2) / (3 * (2 * spiral + 1))

        var i = (2*index * (index + 1)) / (2 * spiral + 1) + 1/(3 * (2 * spiral + 1)) - 1;

        return i;
    }
    
    public override void DrawShapes(Camera cam)
    {
        drawnLines = 0;

        if (debugLogging)
        {
            Debug.Log($"DrawShapes called for camera {cam.name}. Points: {calculatedPoints.Count}");
        }
        // Set up the drawing command
        using (Draw.Command(cam))
        {
            // Draw test axes to verify drawing is working
            Draw.ResetAllDrawStates();
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;
            Draw.Thickness = 4;
            
            // Draw coordinate axes for debugging
            if (drawAxes)
            {
                Draw.Line(Vector3.zero, Vector3.right, Color.red);
                Draw.Line(Vector3.zero, Vector3.up, Color.green);
                Draw.Line(Vector3.zero, Vector3.forward, Color.blue);
            }

            // Now draw our spiral
            Draw.ResetAllDrawStates();
            Draw.Matrix = transform.localToWorldMatrix;
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;

            // Draw lines between all points
            if (calculatedPoints.Count >= 2)
            {
                int skipCount = 0;
                Vector3 start = Vector3.zero;
                int middlePoint = (int)_index;

                for (int i = 0; i < calculatedPoints.Count; i++)
                {
                    Vector3 end = calculatedPoints[i];
                    
                    // Skip very short lines to reduce artifacts
                    if ((end - start).sqrMagnitude < minLength)
                    {
                        // start = end;
                        continue;
                    }

                    // Skip some lines for performance when we're past the middle point
                    // if (i > middlePoint)
                    // {
                    //     if (skipCount >= 2)
                    //     {
                    //         skipCount = 0;
                    //     }
                    //     else
                    //     {
                    //         skipCount++;
                    //         start = end;
                    //         continue;
                    //     }
                    // }

                    Color color = lineColor;
                    float thickness = this.thickness * 100;

                    // Special coloring for middle section
                    if (i == middlePoint - 1)
                    {
                        color = Color.green;
                        thickness = this.thickness * 400;
                    }
                    else if (i == middlePoint)
                    {
                        color = new Color(1, 0.5f, 0, 1f); // orange
                        thickness = this.thickness * 400;
                    }
                    else if (i == middlePoint + 1)
                    {
                        color = Color.red;
                        thickness = this.thickness * 400;
                    }

                    Draw.Thickness = thickness;
                    Draw.Line(start, end, color);
                    start = end;
                    drawnLines++;
                }

                if (debugLogging)
                {
                    Debug.Log($"Drew {calculatedPoints.Count} line segments");
                    Debug.Log($"First point: {calculatedPoints[0]}, Last point: {calculatedPoints[calculatedPoints.Count - 1]}");
                }
            }
            else if (debugLogging)
            {
                Debug.LogWarning("Not enough points to draw lines");
            }
        }
    }
    

    static double imagToIndex(double imag)
    {
        // Precomputed constants
        const double GammaToTheE = 0.2245172519832320; // gamma^e
        const double TwoRoot3Pi = 6.139960247678931; //2 * Math.Sqrt(3 * Math.PI);
        
        // Compute the index using the Zzrob formula
        return Math.Sqrt(6 * GammaToTheE / imag + 6 * imag + Math.PI) / TwoRoot3Pi - 0.5;
    }

    public double getNumLinks(double index)
    {
        return 2 * index * index + 2 * index - 2.0; // / 3.0;
    }
    
    void OnValidate()
    {
        if (debugLogging) Debug.Log("ZetaSpiral2.OnValidate called");
        
        _index = imagToIndex(imaginary);
        numberOfPoints = (int)getNumLinks(_index) + 2 + extraPoints;
        Debug.Log($"OnValidate: _index={_index}, numberOfPoints={numberOfPoints}");
        
        // Ensure we have a camera reference
        if (mainCamera == null)
        {
            mainCamera = GetComponent<Camera>();
            if (mainCamera == null)
            {
                mainCamera = Camera.main;
            }
            if (debugLogging) Debug.Log($"OnValidate: Using camera {(mainCamera != null ? mainCamera.name : "null")}");
        }
        
        RegenerateLines();
        
        #if UNITY_EDITOR
        // Force a repaint in the editor
        if (!Application.isPlaying)
        {
            SceneView.RepaintAll();
            if (debugLogging) Debug.Log("Forced SceneView repaint");
        }
        #endif
    }
    
    private void Update()
    {
        if (animate)
        {
            // Animate the imaginary value
            imaginary += Time.deltaTime * animationSpeed;
            RegenerateLines();
            
            if (debugLogging)
            {
                Debug.Log($"Animating - New imaginary value: {imaginary}");
            }
        }
    }

#if UNITY_EDITOR
    // Test method for validating point generation
    public void TestPointGeneration()
    {
        Vector2 testPoint = Vector2.zero;
        for (int i = 1; i < 10; i++)
        {
            double logVal = Math.Log(i);
            double invPow = 1.0 / Math.Pow(i, real);
            double angle = imaginary * logVal;
            float x = (float)(Math.Cos(angle) * invPow);
            float y = (float)(-Math.Sin(angle) * invPow);
            Vector2 newPoint = new Vector2(x, y) * scale;
            Debug.Log($"Test Point {i}: {newPoint}");
            testPoint = newPoint;
        }
    }
#endif
} 