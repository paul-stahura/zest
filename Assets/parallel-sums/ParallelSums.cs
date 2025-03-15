using UnityEngine;
using Unity.Mathematics;
using Unity.Jobs;
using Unity.Burst;
using Unity.Collections;
using System.Collections.Generic;

/// <summary>
/// Handles parallel calculation of zeta spiral points using Unity's Job System
/// </summary>
public class ParallelSums
{
    private readonly bool debugLogging;

    public ParallelSums(bool debugLogging = false)
    {
        this.debugLogging = debugLogging;
    }

    public void CalculatePoints(
        float realPart,
        float imaginaryPart,
        int pointCount,
        int batchSize,
        bool enableDownsampling,
        float worldDistanceThreshold,
        float pixelThreshold,
        float downsampleAggressiveness,
        int downsampleStartIndex,
        List<Vector3> points)
    {
        if (debugLogging)
        {
            Debug.Log($"[Parallel] Starting spiral generation with real={realPart}, imaginary={imaginaryPart}, points={pointCount}, batchSize={batchSize}");
        }

        float startTime = Time.realtimeSinceStartup;
        
        var pointsNative = new NativeArray<float2>(pointCount, Allocator.TempJob);
        var includePoint = new NativeArray<bool>(pointCount, Allocator.TempJob);
        
        try
        {
            var calcJob = new CalculatePointsJob
            {
                real = realPart,
                imaginary = imaginaryPart,
                points = pointsNative
            };
            
            var calcHandle = calcJob.Schedule(pointCount, batchSize);
            
            if (enableDownsampling)
            {
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
                calcHandle.Complete();
                for (int i = 0; i < pointCount; i++)
                {
                    includePoint[i] = true;
                }
            }
            
            float2 runningSum = float2.zero;
            int includedPoints = 0;
            
            for (int i = 0; i < pointCount; i++)
            {
                runningSum += pointsNative[i];
                
                if (includePoint[i] || i < downsampleStartIndex)
                {
                    includedPoints++;
                    points.Add(new Vector3(runningSum.x, runningSum.y, 0));
                }
            }
            
            float endTime = Time.realtimeSinceStartup;
            
            if (debugLogging)
            {
                Debug.Log($"[Parallel] Generated {points.Count} points from {pointCount} points");
                Debug.Log($"[Parallel] Actually rendering {includedPoints} points ({pointCount - includedPoints} points removed)");
                Debug.Log($"[Parallel] Generation time: {(endTime - startTime) * 1000:F2}ms");
            }
        }
        finally
        {
            pointsNative.Dispose();
            includePoint.Dispose();
        }
    }

    [BurstCompile]
    private struct CalculatePointsJob : IJobParallelFor
    {
        [ReadOnly] public float real;
        [ReadOnly] public float imaginary;
        [WriteOnly] public NativeArray<float2> points;

        public void Execute(int i)
        {
            int k = i + 1;
            // Use System.Math instead of Unity.Mathematics for better precision
            double logVal = System.Math.Log(k);
            double powVal = System.Math.Pow(k, real);
            double invPow = 1.0f / powVal;
            double angle = imaginary * logVal;
            float x = (float)(System.Math.Cos(angle) * invPow); 
            float y = (float)(-System.Math.Sin(angle) * invPow);
            // Don't apply scale here - will apply after accumulation
            points[i] = new float2(x, y);
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
} 