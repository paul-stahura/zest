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
public class ZetaSpiral2 : ImmediateModeShapeDrawer
{
    const float IMAGINARY_START = 216.8121f; // default imaginary for editor
    
    // This is the range of values where the minimum length is interpolated
    // from the minimum to the maximum.
    private const float MIN_LENGTH_MIN = 0.0001f;
    private const float MIN_LENGTH_MAX = 0.0007f;
    // When you stop animating, we interpolate back to the original minimum length
    // over this duration.
    private const float MIN_LENGTH_INTERPOLATION_DURATION = .1f;

    [Header("Spiral Parameters")]
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
    [SerializeField] [Range(0.0001f, 0.01f)] private float minLength = 0.001f;
    
    [Header("Rendering Parameters")]
    [SerializeField] [Range(0.01f, 0.1f)] private float thickness = 0.02f;
    [SerializeField] private Color lineColor = Color.white;
    [SerializeField] private bool drawAxes = false;
    
    [Header("Animation")]
    [SerializeField] private bool animate = false;
    [SerializeField] [Range(0.1f, 10f)] private float animationSpeed = 1f;

    /// <summary>
    /// Public property to control animation state
    /// </summary>
    public bool Animating
    {
        get => animate;
        set
        {
            if (animate != value)
            {
                animate = value;
                // Reset interpolation when animation state changes
                wasAnimating = value;
                minLengthInterpolationTime = 0f;
                if (value)
                {
                    minLength = MIN_LENGTH_MAX;
                }
            }
        }
    }
    
    // Track previous animation state and interpolation. When animating, we are
    // going to shorten the minimum length because you can't see the difference
    // and it will speed up the animation. Once the animation is complete, we
    // will interpolate back to the original minimum length over a short period of time.
    private bool wasAnimating = false;
    private float minLengthInterpolationTime = 0f;

    

    [Header("Optimization Parameters")]

    [Header("Downsampling")]
    [Tooltip("When enabled, reduces the number of rendered points by intelligently skipping points that won't be visually noticeable")]
    [SerializeField] private bool enableDownsampling = false;

    [Tooltip("Automatically enable downsampling when imaginary is greater than this value")]
    [SerializeField] [Range(1_000_000, 2_000_000)] private int autoEnableDownsampleAt = 1_200_000;

    // Track the user-set downsampling state separately from the auto-enabled state
    private bool userSetDownsamplingState = false;
    private bool wasAutoEnabled = false;

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
    
    [Header("Debug")]
    [SerializeField] private bool debugLogging = false;
    
    // Reference to the camera for screen-space calculations
    [SerializeField] Camera mainCamera;
    
    public List<Vector3> points = new List<Vector3>();

    // Reference to our parallel calculator
    private ParallelSums parallelSums;
    
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

        // Initialize parallel calculator
        parallelSums = new ParallelSums(debugLogging);
        
        Calc(real, imaginary);
    }
    
    public override void OnDisable()
    {
        if (debugLogging) Debug.Log("ZetaSpiral2.OnDisable called");
        base.OnDisable();
    }

    public void Calc(float realPart, float imaginaryPart)
    {
        real = realPart;
        imaginary = imaginaryPart;
        _index = imagToIndex(imaginary);
        numberOfPoints = (int)getNumLinks(_index) + 2 + extraPoints;

        // Store the current user-set state if we haven't been auto-enabled
        if (!wasAutoEnabled)
        {
            userSetDownsamplingState = enableDownsampling;
        }

        // Check if we should auto-enable or restore based on threshold
        if (imaginary > autoEnableDownsampleAt)
        {
            if (!wasAutoEnabled)
            {
                wasAutoEnabled = true;
                enableDownsampling = true;
                if (debugLogging) Debug.Log($"Auto-enabling downsampling due to large imaginary value: {imaginary} > {autoEnableDownsampleAt}");
            }
        }
        else if (wasAutoEnabled)
        {
            wasAutoEnabled = false;
            enableDownsampling = userSetDownsamplingState;
            if (debugLogging) Debug.Log($"Restoring downsampling to previous state: {userSetDownsamplingState} (imaginary: {imaginary} <= {autoEnableDownsampleAt})");
        }

        if (useParallelProcessing)
        {
            calcParallel(realPart, imaginaryPart);
        }
        else 
        {
            calcSequential(realPart, imaginaryPart);
        }
    }

    private static double imagToIndex(double imag)
    {
        // Precomputed constants 
        const double GammaToTheE = 0.2245172519832320; // gamma^e
        const double TwoRoot3Pi = 6.139960247678931; //2 * Math.Sqrt(3 * Math.PI);
        
        return Math.Sqrt(6 * GammaToTheE / imag + 6 * imag + Math.PI) / TwoRoot3Pi - 0.5;
    }

    private static double getNumLinks(double index)
    {
        return 2 * index * index + 2 * index - 2.0; // / 3.0;
    }
    

    private void calcSequential(float realPart, float imaginaryPart)
    {
        Profiler.BeginSample("ZetaSpiral2.calcSequential");
        
        points.Clear();
        int includedPoints = 0;
        
        Vector2 runningSum = Vector2.zero;
        Vector2 lastPoint = Vector2.zero;
        Vector2 lastScreen = Vector2.zero;
        
        if (debugLogging)
        {
            Debug.Log($"[Sequential] Starting spiral generation with real={realPart}, imaginary={imaginaryPart}, points={numberOfPoints}");
        }

        float startTime = Time.realtimeSinceStartup;
        
        for (int i = 1; i < numberOfPoints; i++)
        {
            double logVal = Math.Log(i);
            double powVal = Math.Pow(i, realPart);
            double invPow = 1.0f / powVal;
            double angle = imaginaryPart * logVal;
            float x = (float)(Math.Cos(angle) * invPow); 
            float y = (float)(-Math.Sin(angle) * invPow);
            Vector2 term = new Vector2(x, y);
            
            runningSum += term;
            Vector2 currentPoint = runningSum;
            
            bool forceInclude = i <= downsampleStartIndex;
            bool includePoint = false;
            
            if (enableDownsampling == false || i == 1 || forceInclude || lastPoint == Vector2.zero)
            {
                includePoint = true;
            }
            else
            {
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
                }
            }
            
            if (includePoint)
            {
                includedPoints++;
                points.Add(new Vector3(currentPoint.x, currentPoint.y, 0));
                
                lastPoint = currentPoint;
                // lastScreen = mainCamera.WorldToScreenPoint(new Vector3(currentPoint.x, currentPoint.y, 0));
            }
        }
        
        downsampledPoints = includedPoints;
        
        float endTime = Time.realtimeSinceStartup;
        
        if (debugLogging)
        {
            Debug.Log($"[Sequential] Generated {points.Count} points from {numberOfPoints} points");
            Debug.Log($"[Sequential] Actually rendering {includedPoints} points ({numberOfPoints - includedPoints} points removed)");
            Debug.Log($"[Sequential] Generation time: {(endTime - startTime) * 1000:F2}ms");
        }
        
        Profiler.EndSample();
    }

    private void calcParallel(float realPart, float imaginaryPart)
    {
        Profiler.BeginSample("ZetaSpiral2.calcParallel");
        
        int pointCount = numberOfPoints - 1;
        points.Clear();
        points.Add(Vector3.zero);

        parallelSums.CalculatePoints(
            realPart,
            imaginaryPart,
            pointCount,
            batchSize,
            enableDownsampling,
            worldDistanceThreshold,
            pixelThreshold,
            downsampleAggressiveness,
            downsampleStartIndex,
            points
        );

        downsampledPoints = points.Count;
        
        Profiler.EndSample();
    }

    double middleIndex(double index, double spiral)
    {
        // given index and joint/spiral num, return index/number of the 
        return (2*index * (index + 1)) / (2 * spiral + 1) + 1/(3 * (2 * spiral + 1)) - 1;
    }
    
    public override void DrawShapes(Camera cam)
    {
        drawnLines = 0;

        if (debugLogging)
        {
            Debug.Log($"DrawShapes called for camera {cam.name}. Points: {points.Count}");
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

            if (points.Count >= 2)
            {
                int skipCount = 0;
                Vector3 start = Vector3.zero;
                int middlePoint = (int)_index;

                for (int i = 0; i < points.Count; i++)
                {
                    Vector3 end = points[i];
                    
                    // Skip very short lines to reduce overall line count
                    if ((end - start).sqrMagnitude < minLength)
                    {
                        continue;
                    }

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
                    Debug.Log($"Drew {points.Count} line segments");
                    Debug.Log($"First point: {points[0]}, Last point: {points[points.Count - 1]}");
                }
            }
            else if (debugLogging)
            {
                Debug.LogWarning("Not enough points to draw lines");
            }
        }
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
        
        Calc(real, imaginary);
        
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
        if (animate != wasAnimating)
        {
            if (animate)
            {
                minLength = MIN_LENGTH_MAX;
                minLengthInterpolationTime = 0f;
            }
            else
            {
                minLengthInterpolationTime = 0f;
            }
            wasAnimating = animate;
        }

        if (!animate && minLengthInterpolationTime < MIN_LENGTH_INTERPOLATION_DURATION)
        {
            minLengthInterpolationTime += Time.deltaTime;
            float t = minLengthInterpolationTime / MIN_LENGTH_INTERPOLATION_DURATION;
            minLength = Mathf.Lerp(MIN_LENGTH_MAX, MIN_LENGTH_MIN, t);
        }

        if (animate)
        {
            imaginary += Time.deltaTime * animationSpeed;
            Calc(real, imaginary);
        }
    }

    #if UNITY_EDITOR
    // Test method to analyze imagToIndex behavior
    [ContextMenu("Analyze ImagToIndex")]
    private void AnalyzeImagToIndex()
    {
        Debug.Log("Analyzing imagToIndex behavior:");
        double[] testValues = { 216.8121, 1000, 10000, 100000, 1000000 };
        
        foreach (double imag in testValues)
        {
            double exactResult = imagToIndex(imag);
            int flooredResult = (int)Math.Floor(exactResult);
            // Test a simpler approximation based on square root
            double approxResult = Math.Sqrt(imag) / 2.5;
            
            Debug.Log($"imag: {imag}");
            Debug.Log($"  exact: {exactResult}");
            Debug.Log($"  floored: {flooredResult}");
            Debug.Log($"  approx: {approxResult}");
            Debug.Log($"  error: {Math.Abs(exactResult - approxResult)}");
        }
    }
#endif
} 