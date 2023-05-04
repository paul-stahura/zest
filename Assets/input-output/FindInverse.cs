using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Complex = System.Numerics.Complex;
using Unity.Jobs;
using Unity.Collections;
using System.IO;
using System.Linq;
using UnityEngine.UI;
using Shapes;
using System;

public struct ZetaJob : IJobParallelFor
{
    public NativeArray<Complex> results;
    public Complex center;
    public double radius;
    public Complex target;
    public Complex nearest;
    public double distance;

    public void Execute(int i)
    {
        var pt = center.ToVector2();
        // Generate a random point within the radius
        System.Random random = new System.Random();
        var min = center.Real - radius;
        var max = center.Real + radius;
        double pointX = random.NextDouble() * (max - min) + min;

        min = center.Imaginary - radius;
        max = center.Imaginary + radius;
        double pointY = random.NextDouble() * (max - min) + min;

        // Calculate the Zeta value at the point
        var zeta = Zeta.EulerMaclauren(new Complex(pointX, pointY));
        var current = Complex.Abs(zeta - target); // how far is this one from the target?
        if (current < distance) // are we getting closer?
        {
            distance = current;
            nearest = zeta;
        }

        // Save the result in the array
        results[i] = zeta;
    }

    public static Complex Run(Complex center, float radius, Complex target)
    {
        NativeArray<Complex> results = new NativeArray<Complex>(1000, Allocator.TempJob);
        var job = new ZetaJob
        {
            results = results,
            center = center,
            radius = radius,
            target = target
        };

        job.Schedule(results.Length, 64).Complete();
        results.Dispose();
        return job.nearest;
    }
}

public class FindInverse : MonoBehaviour
{
    public FloatInput fromReal;
    public FloatInput fromImag;

    public FloatInput toReal;
    public FloatInput toImag;
    public Button reset;
    public Lean.Touch.LeanTouch _leanDrag;
    public Color inputColor = Color.yellow;
    public Color outputColor = Color.green;

    List<Complex> inputPts = new List<Complex>();
    List<Complex> currentPts = new List<Complex>();
    List<Complex> outputPts = new List<Complex>();

    public bool draggingFrom = false;
    public bool draggingTo = false;
    public bool dragging = false;
    public bool mousebutton = false;
    public bool leanTouch = true;
    public float radius;
    public int numPoints = 1000;

    void Start()
    {
        // Read the CSV file
        var lines = File.ReadAllLines("Assets/data/teardrops.csv");

        // Parse each line to get the x,y values
        var coordinates = lines.Select(line =>
        {

            var values = line.Split(',');

            var v1 = new Complex(float.Parse(values[0]), float.Parse(values[1]));
            var v2 = new Complex(float.Parse(values[2]), float.Parse(values[3]));

            return (v1, v2);
        });

        fromReal.onValueChanged.AddListener((float f) => calculate());
        fromImag.onValueChanged.AddListener((float f) => calculate());
        toReal.onValueChanged.AddListener((float f) => calculate());
        toImag.onValueChanged.AddListener((float f) => calculate());

        // Get the points
        outputPts = coordinates.Select(c => c.Item1).ToList<Complex>();
        // points2 = coordinates.Select(c => c.Item2).ToArray();

        reset.onClick.AddListener(() =>
        {
            fromReal.Value = .5f;
            toReal.Value = .5f;
        });

        calculate();

        StartCoroutine(FromOutput());
    }

    public void OnDrawShapes(Camera cam)
    {
        using (Draw.StyleScope)
        {
            Draw.Thickness = 1;
            radius = cam.orthographicSize / 50;

            if (outputPts.Count == 0)
                return;

            // draw the input
            drawInput(cam);



            // draw the output
            Draw.Thickness = 4;
            for (int i = 1; i < outputPts.Count; i++)
            {
                Draw.Line(outputPts[i - 1].ToVector2(), outputPts[i].ToVector2(), outputColor);
            }

            Draw.Thickness = 1;
            for (int i = 1; i < currentPts.Count; i++)
            {
                Draw.Line(currentPts[i - 1].ToVector2(), currentPts[i].ToVector2(), inputColor);
            }
        }
    }

    protected void drawInput(Camera cam)
    {
        var from = new Vector(fromReal, fromImag);
        var to = new Vector(toReal, toImag);

        var worldPos = Camera.main.ScreenToWorldPoint(Input.mousePosition);
        if (Vector2.Distance(worldPos, from) < radius || Vector2.Distance(worldPos, to) < radius)
        {
            Draw.Disc(from, radius, inputColor);
            Draw.Disc(to, radius, inputColor);

            dragging = draggingFrom || draggingTo;

            mousebutton = Input.GetMouseButton(0);
            leanTouch = _leanDrag.enabled;

            if (Input.GetMouseButton(0))
            {
                // if the mouse button is down and we are not currently dragging
                if (!dragging)
                    beginDrag();

                // else, since the mouse is down and we are dragging, keep dragging
                else if (dragging)
                    drag();
            }
            else if (dragging) // mouse button is up but we are still dragging
                endDrag();

        }

        Draw.Line(from, to, inputColor);

        for (int i = 1; i < inputPts.Count; i++)
        {
            Draw.Line(inputPts[i - 1].ToVector2(), inputPts[i].ToVector2(), Color.cyan);
        }
    }

    void calculate()
    {
        var from = new Vector(fromReal, fromImag);
        var to = new Vector(toReal, toImag);

        double inc = 1d / numPoints;
        Debug.Assert(inc > 0);
        currentPts.Clear();
        for (double i = 0; i <= 1; i += inc)
        {
            var c = Vector.Lerp(from, to, i);
            currentPts.Add(Zeta.EulerMaclauren(c));
        }
    }

    public IEnumerator FromOutput()
    {
        var from = new Vector(fromReal, fromImag);
        var to = new Vector(toReal, toImag);

        double inc = 1d / outputPts.Count;
        Debug.Assert(inc > 0);

        inputPts.Clear();
        for (double i = 0; i <= 1; i += inc)
        {
            var c = Vector.Lerp(from, to, i);
            inputPts.Add(c);
        }

        // for each input point, sample around it in a radius and find the closest sample
        // to the output point and move the input point to that sample and repeat
        // until we are very close to the output point
        for (int i = 0; i < inputPts.Count; i++)
        {
            Debug.Log(i);
            var input = inputPts[i];
            var output = outputPts[i];

            var radius = (float)(to - from).Length / 2;
            for (int j = 0; j < numPoints; j++)
            {
                var nearest = ZetaJob.Run(input, radius, output);
                inputPts[i] = nearest.ToVector();

                yield return new WaitForEndOfFrame();
            }
        }

        yield return null;
    }

    protected void beginDrag()
    {
        var from = new Vector(fromReal, fromImag);
        var to = new Vector(toReal, toImag);

        var worldPos = Camera.main.ScreenToWorldPoint(Input.mousePosition);
        if (Vector2.Distance(worldPos, from) <= radius)
        {
            draggingFrom = true;

            fromReal.Value = worldPos.x;
            fromImag.Value = worldPos.y;
        }
        else if (Vector2.Distance(worldPos, to) <= radius)
        {
            draggingTo = true;
            toReal.Value = worldPos.x;
            toImag.Value = worldPos.y;
        }

        dragging = draggingFrom || draggingTo;
        _leanDrag.enabled = !dragging;

        calculate();
    }

    protected void drag()
    {
        var vec = new Vector(fromReal, fromImag);
        if (draggingTo)
            vec = new Vector(toReal, toImag);

        var worldPos = Camera.main.ScreenToWorldPoint(Input.mousePosition);
        if (draggingFrom)
        {
            fromReal.Value = worldPos.x;
            fromImag.Value = worldPos.y;
        }
        else
        {
            toReal.Value = worldPos.x;
            toImag.Value = worldPos.y;
        }

        calculate();
    }

    protected void endDrag()
    {
        draggingFrom = false;
        draggingTo = false;
        dragging = false;
        _leanDrag.enabled = true;
        calculate();
    }
}