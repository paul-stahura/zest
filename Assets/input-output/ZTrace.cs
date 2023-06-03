using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Shapes;
using Complex = System.Numerics.Complex;

public class ZTrace : MonoBehaviour
{
    public FloatInput fromReal;
    public FloatInput fromImag;

    public FloatInput toReal;
    public FloatInput toImag;
    public Button reset;
    public int pointsPerSegment = 10;
    public int controlPoints = 10;
    public Color color = Color.magenta;
    public Slider transparency;
    public Toggle useReimannSegal;

    public Lean.Touch.LeanTouch _leanDrag;


    public int dragging = -1;
    public bool mousebutton = false;
    public bool leanTouch = true;
    bool invert = false;

    float radius;
    public float radiusScalar = 50;

    protected List<Vector> inputPts = new List<Vector>();
    protected List<Complex> outputPts = new List<Complex>();

    public delegate Complex ZetaFunction(Complex z);
    ZetaFunction ZetaFn = Zeta.EulerMaclauren;

    void Start()
    {
        // useReimannSegal.onValueChanged.AddListener((bool value) =>
        // {
        //     if (value)
        //     {
        //         fromReal.Value = .5f;
        //         toReal.Value = .5f;
        //         ZetaFn = Zeta.ReimannSiegel;
        //     }
        //     else
        //         ZetaFn = Zeta.EulerMaclauren;
        // });

        reset.onClick.AddListener(() =>
        {
            fromReal.Value = .5f;
            toReal.Value = .5f;

            resetControlPoints();
        });

        fromImag.onValueChanged.AddListener((float _) => resetControlPoints());
        toImag.onValueChanged.AddListener((float _) => resetControlPoints());
        fromReal.onValueChanged.AddListener((float _) => resetControlPoints());
        toReal.onValueChanged.AddListener((float _) => resetControlPoints());

        reset.onClick.Invoke();

        calculate();
    }

    void resetControlPoints()
    {
        inputPts.Clear();

        var inc = 1f / controlPoints;
        for (double i = 0; i <= 1; i += .1)
        {
            var pt = new Vector(.5, fromImag.Value).Lerp(new Vector(.5, toImag.Value), i);
            inputPts.Add(pt);
        }

        calculate();
    }

    public void OnDrawShapes(Camera cam)
    {
        using (Draw.StyleScope)
        {
            Draw.Thickness = 1;
            radius = cam.orthographicSize / radiusScalar;

            if (outputPts.Count == 0)
                return;

            // draw the input
            drawInput(cam);

            // draw the output
            for (int i = 1; i < outputPts.Count; i++)
            {
                Draw.Line(outputPts[i - 1].ToVector2(), outputPts[i].ToVector2(), color);
            }
        }
    }

    protected void drawInput(Camera cam)
    {
        if (fromReal != .5 || toReal != .5)
            ZetaFn = Zeta.EulerMaclauren;

        var wasDragging = dragging > -1;
        // if the mouse button is released, stop dragging
        dragging = Input.GetMouseButton(0) == false ? -1 : dragging;
        if (dragging == -1 && wasDragging)
            endDrag();

        // See if the mouse is close to the line.  If it is, draw a circle at the nearest point on the line.
        // If the mouse is near any point on the line, snap the circle to that point.
        // If we are currently dragging, ignore.
        var mousePos = Camera.main.ScreenToWorldPoint(Input.mousePosition);

        var discColor = color;
        discColor.a = discColor.a * .5f;
        var from = handleDragControlPoint(inputPts[0]);
        drawControlPoint(from);

        for (var i = 1; i < inputPts.Count; i++)
        {
            var to = handleDragControlPoint(inputPts[i]);
            drawControlPoint(to);

            Draw.Line(from, to, color);
            from = to;
        }

        drawOutputControlPoints();
    }

    void drawControlPoint(Vector2 pt)
    {
        var discColor = color;

        var mousePos = Camera.main.ScreenToWorldPoint(Input.mousePosition);
        var dist = Vector2.Distance(mousePos, pt);
        if (dist > radius)
        {
            discColor.a = discColor.a * .5f;
        }

        Draw.Disc(pt, radius, discColor);
    }

    Vector2 handleDragControlPoint(Vector pt)
    {
        var index = inputPts.IndexOf(pt);
        if (dragging == index)
            return drag(pt);

        if (dragging == -1 && isMouseOverControlPoint(pt) && Input.GetMouseButton(0))
        {
            return drag(pt);
        }

        return pt;
    }

    bool isMouseOverControlPoint(Vector pt)
    {
        var mousePos = Camera.main.ScreenToWorldPoint(Input.mousePosition);
        var dist = pt.Distance(mousePos);
        return dist < radius;
    }

    Vector2 nearestPointOnFiniteLine(Vector2 start, Vector2 end, Vector2 pnt)
    {
        // Finds the nearest point on the line segment to the mouse.
        var line = (end - start);
        var len = line.magnitude;
        line.Normalize();

        var v = pnt - start;
        var d = Vector2.Dot(v, line);
        d = Mathf.Clamp(d, 0f, len);
        return start + line * d;
    }




    protected void calculate()
    {
        //
        // Interpolates between the control points and calculates the Zeta function in between each pair of points.
        //
        if (invert) // don't calculate if we are deriving from points passed in
            return;

        outputPts.Clear();
        var from = inputPts[0];
        for (var i = 1; i < inputPts.Count; i++)
        {
            var to = inputPts[i];
            double inc = 1d / pointsPerSegment;
            Debug.Assert(inc > 0);
            for (double j = 0; j <= 1; j += inc)
            {
                var c = Vector.Lerp(from, to, j);
                outputPts.Add(Zeta.EulerMaclauren(c));
            }
            from = to;
        }
    }

    void drawOutputControlPoints()
    {
        //
        // Calculates the Zeta function for the control points and draws a disc for each one.
        //
        Vector to = new Vector();
        var discColor = color;
        discColor.a = discColor.a * .5f;

        var from = inputPts[0];
        for (var i = 1; i < inputPts.Count; i++)
        {
            to = inputPts[i];

            // draw the dragged point without alpha
            if (inputPts.IndexOf(from) == dragging)
                Draw.Disc(Zeta.EulerMaclauren(from).ToVector2(), radius, color);

            Draw.Disc(Zeta.EulerMaclauren(from).ToVector2(), radius, discColor);
            from = to;
        }

        Draw.Disc(Zeta.EulerMaclauren(to).ToVector2(), radius, discColor);
    }

    Vector2 drag(Vector pt)
    {
        var mousePos = Camera.main.ScreenToWorldPoint(Input.mousePosition);
        dragging = inputPts.IndexOf(pt);
        if (dragging == 0)
        {
            fromReal.Value = mousePos.x;
            fromImag.Value = mousePos.y;
        }
        else if (dragging == inputPts.Count - 1)
        {
            toReal.Value = mousePos.x;
            toImag.Value = mousePos.y;
        }

        _leanDrag.enabled = false;

        inputPts[dragging] = new Vector(mousePos);

        calculate();

        return mousePos;
    }

    protected void endDrag()
    {
        dragging = -1;
        _leanDrag.enabled = true;
        calculate();
    }
}
