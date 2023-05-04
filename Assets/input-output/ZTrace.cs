using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Shapes;
using Complex = System.Numerics.Complex;

public class ZTrace : MonoBehaviour
{
    [Dropdown("states")]
    public string state;
    string[] states = new string[] { "None", "Line", "Circumference", "Disc" };

    public FloatInput fromReal;
    public FloatInput fromImag;

    public FloatInput toReal;
    public FloatInput toImag;
    public Button reset;
    public int numPoints = 1000;
    public Color color = Color.magenta;
    public Slider transparency;
    public Toggle useReimannSegal;

    public Lean.Touch.LeanTouch _leanDrag;


    public bool draggingFrom = false;
    public bool draggingTo = false;
    public bool dragging = false;
    public bool mousebutton = false;
    public bool leanTouch = true;
    bool invert = false;

    float radius;

    protected List<Complex> outputPts = new List<Complex>();

    public delegate Complex ZetaFunction(Complex z);
    ZetaFunction ZetaFn = Zeta.ReimannSiegel;

    void Start()
    {
        useReimannSegal.onValueChanged.AddListener((bool value) =>
        {
            if (value)
            {
                fromReal.Value = .5f;
                toReal.Value = .5f;
                ZetaFn = Zeta.ReimannSiegel;
            }
            else
                ZetaFn = Zeta.EulerMaclauren;
        });

        reset.onClick.AddListener(() =>
        {
            fromReal.Value = .5f;
            toReal.Value = .5f;
        });

        Debug.Log(name + " start");
        calculate();
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
            for (int i = 1; i < outputPts.Count; i++)
            {
                if (state == "Disc")
                    ShapesUtils.DrawCross(outputPts[i].ToVector2(), .01f, .5f);
                else
                    Draw.Line(outputPts[i - 1].ToVector2(), outputPts[i].ToVector2(), color);
            }
        }
    }

    protected void drawInput(Camera cam)
    {
        if (fromReal != .5 || toReal != .5)
            ZetaFn = Zeta.EulerMaclauren;

        var from = new Vector(fromReal, fromImag);
        var to = new Vector(toReal, toImag);

        var worldPos = Camera.main.ScreenToWorldPoint(Input.mousePosition);
        if (Vector2.Distance(worldPos, from) < radius || Vector2.Distance(worldPos, to) < radius)
        {
            Draw.Disc(from, radius, color);
            Draw.Disc(to, radius, color);

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

        switch (state)
        {
            case "Line":
                Draw.Line(from, to, color);
                break;
            case "Circumference":
                Draw.Ring(from, (float)(to - from).Length, color);
                break;
            case "Disc":
                var c = color;
                c.a = c.a / 4;
                Draw.Disc(from, (float)(to - from).Length, c);
                break;
            default:
                throw new System.NotImplementedException(state + " is not implemented");
        }
    }

    protected void calculate()
    {
        if (invert) // don't calculate if we are deriving from points passed in
            return;

        switch (state)
        {
            case "Line":
                calculateLine();
                break;
            case "Circumference":
                calculateCircumference();
                break;
            case "Disc":
                calculateDisc();
                break;
            default:
                throw new System.NotImplementedException(state + " is not implemented");

        }
    }

    protected void calculateLine()
    {
        var from = new Vector(fromReal, fromImag);
        var to = new Vector(toReal, toImag);

        double inc = 1d / numPoints;
        Debug.Assert(inc > 0);
        outputPts.Clear();
        for (double i = 0; i <= 1; i += inc)
        {
            var c = Vector.Lerp(from, to, i);
            outputPts.Add(Zeta.EulerMaclauren(c));
        }
    }

    protected void calculateCircumference()
    {
        var from = new Vector(fromReal, fromImag);
        var to = new Vector(toReal, toImag);

        outputPts.Clear();
        var center = from;
        var radius = (to - from).Length;

        for (int i = 0; i < numPoints; i++)
        {
            var angle = i * 2 * Math.PI / numPoints;
            var point = center + new Vector(Math.Cos(angle), Math.Sin(angle)) * radius;
            outputPts.Add(Zeta.EulerMaclauren(point));
        }

        outputPts.Add(outputPts[0]); // close the loop
    }

    protected void calculateDisc()
    {
        var from = new Vector(fromReal, fromImag);
        var to = new Vector(toReal, toImag);

        outputPts.Clear();
        var center = from;
        var radius = (to - from).Length;
        var num = dragging ? numPoints / 100 : numPoints * 100;
        for (int i = 0; i < num; i++)
        {
            var pt = center + new Vector(UnityEngine.Random.insideUnitCircle) * radius;
            outputPts.Add(Zeta.EulerMaclauren(pt));
        }
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
