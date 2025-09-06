/*
*** DO NOT DELETE ***
This file contains editor utilities for analyzing and finding critical points
*** END OF DO NOT DELETE HEADER ***
*/

using UnityEngine;
using UnityEditor;
using System.IO;
using System.Collections.Generic;
using System.Text;
using System;
using System.Numerics;
using Vector2 = UnityEngine.Vector2;
using Vector3 = UnityEngine.Vector3;
using System.Linq;

public static class DataPointSearch
{
    private const double MIN_INDEX = 1.0;
    private const double MAX_INDEX = 40.0;
    private const double INDEX_STEP = 0.0001;

    static Complex Rak1(double r, double i) => SumRemainders.CalcZakR1(r, i);
    static Complex Sum1(double r, double i) => SumRemainders.CalcForwardSumUpToBisector(r, i);

    [MenuItem("RakZero/Find Rak1 FirstFam Zeros")]
    public static void FindFirstFamZakZeros()
    {
        var zeroData = new List<(double real, double index, Vector2 point)>();

        // assume one zero every index step
        // after index 3 it looks like there is always a max at index x.7
        // we are looking for the first minimum before that max
        // so we will walk backwards from x.7 to find a minimum
        // then we will slowly increase the real until that minimum becomes a zero

        int start = (int)System.Math.Floor(MIN_INDEX);
        int end = (int)System.Math.Floor(MAX_INDEX);

        int totalSteps = end - start + 1;
        int currentStep = 0;

        double real = -1.5;
        
        double Rak1Mag(double r, double i) => Math.Pow(i, r) * (Rak1(r, i) + Sum1(r, i)).Magnitude;
        double RIndexMin(double i) => Rak1Mag(real, i);

        // function estimate:
        // double M = 1.74756;
        // double v = Math.PI * (1.0 / Math.Sqrt(2.0) - Math.Log(2));
        // // double nZero (int n) => n + v * Math.Log(n) + 0.5 - v * M; // far right
        // double nZero (int n) => n + v + 0.5 - v * M; // far left
        double nZero (int n) => n + 0.5;

        for (double index = MIN_INDEX; index <= MAX_INDEX; index += 1)
        {
            if (EditorUtility.DisplayCancelableProgressBar(
                "Finding Rak1 Zeros",
                $"Processing index {index:F15}",
                (float)currentStep / totalSteps))
            {
                EditorUtility.ClearProgressBar();
                Debug.Log("Cancelled");
                return;
            }

            // estimate the location of the local max to the right of the minimum
            // double indexEst = index + 0.5;
            // if (index > 5) indexEst += 0.1;
            // if (index > 45) indexEst += 0.05;
            // if (index > 150) indexEst += 0.05;

            // function estimate
            double indexEst = nZero((int)Math.Floor(index));
            if (index >= 20) indexEst += 0.05;
            if (index >= 39) indexEst -= 0.05;
            if (index >= 75) indexEst += 0.05;
            if (index >= 106) indexEst -= 0.05;
            if (index >= 174) indexEst += 0.025;

            // find local minimum at the estimated location
            double minIndex = FindLocalMin(RIndexMin, indexEst, tol: 1e-8, maxIter: 100000);

            // now we have a local minimum, we will decrease real until the minimum becomes a zero
            double RSigmaMin(double r) => Rak1Mag(r, minIndex);
            double realZero = FindLocalMin(RSigmaMin, real, tol: 1e-8, maxIter: 100000);

            // do one more refinement as the index may have shifted slightly
            double localIndexMin(double i) => Rak1Mag(realZero, i);
            minIndex = FindLocalMin(localIndexMin, minIndex, tol: 1e-10, maxIter: 100000);

            zeroData.Add((realZero, minIndex, new Vector2((float)realZero, (float)minIndex)));

            real = realZero; // start next search from this real value

            currentStep++;
        }

        EditorUtility.ClearProgressBar();
        SaveRakFamToCSV(zeroData);
    }

    private static void SaveRakFamToCSV(List<(double real, double index, Vector2 point)> zeros)
    {
        var csv = new StringBuilder();
        csv.AppendLine("Sigma, Rak1 Index Zero");

        foreach (var (real, index, _) in zeros)
        {
            csv.AppendLine($"{real},{index}");
        }
        
        string path = "Assets/Resources/DataPoints/rak1_first_zeros.csv";
        Directory.CreateDirectory(Path.GetDirectoryName(path));
        File.WriteAllText(path, csv.ToString());
        AssetDatabase.Refresh();
    }

    // Numerical derivative
    static double Derivative(Func<double, double> f, double x, double h = 1e-5)
    {
        return (f(x + h) - f(x - h)) / (2 * h);
    }

    public static double FindLocalMin(Func<double, double> f, double start, double tol = 1e-8, int maxIter = 1000)
    {
        // Uses gradient descent to find the local minimum of f starting from 'start'
        double x = start;
        double step = 0.01;
        double prevX = x;
        for (int i = 0; i < maxIter; i++)
        {
            double grad = Derivative(f, x);
            if (Math.Abs(grad) < tol)
            return x;
            // Use backtracking line search for adaptive step size
            double t = step;
            double fx = f(x);
            while (f(x - t * grad) > fx - 0.5 * t * grad * grad && t > 1e-8)
            t *= 0.5;
            prevX = x;
            x -= t * grad;
            if (Math.Abs(x - prevX) < tol)
            return x;
        }
        return x;
    }


    [MenuItem("RakZero/Find Rak1 Zeros")]
    public static void FindZakZeros()
    {
        var zeroData = new List<(double real, double index, Vector2 point)>();

        double realMin = 0.0;
        double realMax = 1.0;
        double realStep = 0.01;
        double indexMin = 2.0;
        double indexMax = 40.0;
        double indexStep = 0.00001;
        double magTolerance = 1e-5;

        // start at real max, as real decreases rak1 magnitude increases
        // x = real, y = index
        Vector currentIndexStep = new Vector(realMax, indexMin);

        while (currentIndexStep.y <= indexMax)
        {
            if (EditorUtility.DisplayCancelableProgressBar(
                "Finding Rak1 Zeros",
                $"Processing index {currentIndexStep:F15}",
                (float)(currentIndexStep.y - indexMin) / (float)(indexMax - indexMin)))
            {
                EditorUtility.ClearProgressBar();
                Debug.Log("Cancelled");
                return;
            }

            currentIndexStep.y += 0.0001;

            // FindNextRak1ZeroEqualMag(ref currentIndexStep, indexStep, realMin, realMax, magTolerance);
            FindNextZakZeroConverge(ref currentIndexStep, indexStep, realStep, realMin, magTolerance);

            // add zero data
            zeroData.Add((currentIndexStep.x, currentIndexStep.y, new Vector2((float)currentIndexStep.x, (float)currentIndexStep.y)));
        }

        EditorUtility.ClearProgressBar();
        SaveRakZerosToCSV(zeroData);
    }

    private static Vector FindNextZakZeroConverge(ref Vector currentStep, double indexStep, double realStep, double realMin, double magTolerance)
    {
        // start at real 1.0 and reduce it until sum1 and rak1 converge
        // when they converge, if the magnitudes are similar and the dot product is negative
        // we have found a zero

        // take a step in index
        currentStep.y += indexStep;

        // set the real to max
        // 1.0 is always max since we cant have zeros with real > 1
        currentStep.x = 1.0;

        // recalculate rak1 and sum1 at the new index
        Complex rak1 = Rak1(currentStep.x, currentStep.y);
        Complex sum1 = Sum1(currentStep.x, currentStep.y);

        double last_cross = Vector3.Cross(rak1.ToVector2().normalized, sum1.ToVector2().normalized).z;
        bool isLastRakGreaterThanSum = rak1.Magnitude > sum1.Magnitude;

        bool passedZero = false;
        while (!passedZero)
        {
            // reduce the real by a small step
            currentStep.x -= realStep;

            if (currentStep.x < realMin)
            {
                // we have reached the minimum real without converging
                // reset the real and take a step in index
                currentStep.x = 1.0;
                currentStep.y += indexStep;

                rak1 = Rak1(currentStep.x, currentStep.y);
                sum1 = Sum1(currentStep.x, currentStep.y);
                last_cross = Vector3.Cross(rak1.ToVector2().normalized, sum1.ToVector2().normalized).z;
                isLastRakGreaterThanSum = rak1.Magnitude > sum1.Magnitude;
                continue;
            }

            // recalculate rak1 and sum1 at the new real
            rak1 = Rak1(currentStep.x, currentStep.y);
            sum1 = Sum1(currentStep.x, currentStep.y);

            // take the new dot product
            double dot = Vector3.Dot(rak1.ToVector2().normalized, sum1.ToVector2().normalized);
            double new_cross = Vector3.Cross(rak1.ToVector2().normalized, sum1.ToVector2().normalized).z;
            bool isRakGreaterThanSum = rak1.Magnitude > sum1.Magnitude;

            // if the cross changed sign, and the dot is negative, we have a good angle for a zero
            if (Math.Sign(new_cross) != Math.Sign(last_cross) && dot < 0)
            {
                // last we need to check if rak1 has just passed sum1 in magnitude
                if (isRakGreaterThanSum != isLastRakGreaterThanSum || magTolerance > Math.Abs(rak1.Magnitude - sum1.Magnitude))
                {
                    currentStep = RefineZero(currentStep.y - indexStep, currentStep.y + 0.001, currentStep.x, currentStep.x + 0.3);
                    passedZero = true;
                }
            }

            // update for next loop
            last_cross = new_cross;
            isLastRakGreaterThanSum = isRakGreaterThanSum;
        }

        // zero found
        return currentStep;
    }

    public static Vector RefineZero(double indexMin, double indexMax,
                                double realMin, double realMax,
                                int gridR = 20, int gridI = 20,
                                int averageCount = 5,
                                int passes = 3,
                                double shrinkFactor = 0.2)
    {
        static double Magnitude(double r, double i) => (Rak1(r, i) + Sum1(r, i)).Magnitude;
        double magTolerance = 1e-10;

        double rMin = realMin;
        double rMax = realMax;
        double iMin = indexMin;
        double iMax = indexMax;

        var finalTop = new List<(double mag, double r, double i)>();

        for (int pass = 0; pass < passes; pass++)
        {
            var candidates = new List<(double mag, double r, double i)>();

            for (int ri = 0; ri < gridR; ri++)
            {
                double r = rMin + (rMax - rMin) * ri / (gridR - 1);
                for (int ii = 0; ii < gridI; ii++)
                {
                    double idx = iMin + (iMax - iMin) * ii / (gridI - 1);
                    double mag = Magnitude(r, idx);
                    candidates.Add((mag, r, idx));
                }
            }

            // sort by magnitude
            candidates.Sort((a, b) => a.mag.CompareTo(b.mag));

            // store top few for next centering
            finalTop = candidates.Take(Math.Min(averageCount, candidates.Count)).ToList();

            // average top few to center new box
            double avgR = finalTop.Average(x => x.r);
            double avgI = finalTop.Average(x => x.i);

            // build new zoomed box centered at average
            double rHalfSpan = (rMax - rMin) * shrinkFactor * 0.5;
            double iHalfSpan = (iMax - iMin) * shrinkFactor * 0.5;

            rMin = avgR - rHalfSpan;
            rMax = avgR + rHalfSpan;
            iMin = avgI - iHalfSpan;
            iMax = avgI + iHalfSpan;

            // early exit
            if (finalTop[0].mag < magTolerance)
                break;
        }

        // return the center of the best region from the last refined grid
        double finalR = finalTop.Average(x => x.r);
        double finalI = finalTop.Average(x => x.i);

        return new Vector(finalR, finalI);
    }

    private static Vector FindNextRak1ZeroEqualMag(ref Vector currentStep, double indexStep, double realMin, double realMax, double magTolerance)
    {
        // rak1 magnitude will always outscale the sum magnitude
        // this algorithm intends to keep the sum and rak1 magnitude similar
        // after the index is increased the sum and rak1 magnitudes will be compaired
        // then the real will be adjusted until the magnitudes are within a threshold
        // once they are lined up, we can check if the difference between the vectors is small enough to consider a zero

        // start at real max, as real decreases rak1 magnitude increases
        // x = real, y = index
        int currentIndex = (int)Math.Floor(currentStep.y);

        // take a step in index
        currentStep.y += indexStep;
        // recalculate rak1 and sum1 at the new index
        Complex rak1 = Rak1(currentStep.x, currentStep.y);
        Complex sum1 = Sum1(currentStep.x, currentStep.y);

        currentStep = SumRemainders.ZeroRak1Magnitude(currentStep, realMin, realMax, magTolerance);

        double cross = Vector3.Cross(rak1.ToVector2(), sum1.ToVector2()).z;
        bool passedZero = false;

        // check the cross and return a zero when it changes sign
        while (!passedZero)
        {
            // increase index by step
            currentStep.y += indexStep;
            // recalculate rak1 and sum1 at the new index
            rak1 = Rak1(currentStep.x, currentStep.y);
            sum1 = Sum1(currentStep.x, currentStep.y);

            currentStep = SumRemainders.ZeroRak1Magnitude(currentStep, realMin, realMax, magTolerance);

            bool flipFlag = Math.Sign(cross) != Math.Sign(Vector3.Cross(rak1.ToVector2(), sum1.ToVector2()).z);

            if (flipFlag)
            {
                // check that the index has not changed
                if (currentIndex != (int)Math.Floor(currentStep.y))
                {
                    currentIndex = (int)Math.Floor(currentStep.y);
                    cross = Vector3.Cross(rak1.ToVector2(), sum1.ToVector2()).z;
                    continue;
                }

                // check that the dot product is negative
                double dot = Vector2.Dot(rak1.ToVector2(), sum1.ToVector2());
                if (dot > 0)
                {
                    cross = Vector3.Cross(rak1.ToVector2(), sum1.ToVector2()).z;
                    continue;
                }

                // do something aobut real bounds

                // ZER0!
                passedZero = true;
            }
        }

        // we have a zero,  return the current step
        return currentStep;
    }

    private static void SaveRakZerosToCSV(List<(double real, double index, Vector2 point)> zeros)
    {
        var csv = new StringBuilder();
        csv.AppendLine("Sigma, Rak1 Index Zero");

        foreach (var (real, index, _) in zeros)
        {
            csv.AppendLine($"{real},{index}");
        }

        string path = "Assets/Resources/DataPoints/rak1_zeros.csv";
        Directory.CreateDirectory(Path.GetDirectoryName(path));
        File.WriteAllText(path, csv.ToString());
        AssetDatabase.Refresh();
    }
}