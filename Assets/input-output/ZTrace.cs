using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Shapes;
using Complex = System.Numerics.Complex;
using System.Security.Cryptography.X509Certificates;

public class ZTrace : MonoBehaviour
{
    public Camera inputCamera;
    public Transform inputOrigin;
    public FloatInput fromReal;
    public FloatInput fromImag;

    public Camera outputCamera;
    public Transform outputOrigin;
    public FloatInput toReal;
    public FloatInput toImag;
    public Button reset;
    public Button approximate;

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

    public delegate void ZetaPoints(List<Vector3> tPoints);
    public static event ZetaPoints OnPointsUpdated;

    protected List<Vector> inputPts = new List<Vector>();
    protected List<Complex> outputPts = new List<Complex>();
    protected List<Vector3> outputPtsZDepth = new List<Vector3>();

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

            fromImag.Value = 0.002f;
            toImag.Value = 1f;

            resetControlPoints();
        });

        approximate.onClick.AddListener(() =>
        {
            OnPointsUpdated(outputPtsZDepth);
        });

        fromImag.onValueChanged.AddListener((float _) => resetControlPoints());
        toImag.onValueChanged.AddListener((float _) => resetControlPoints());
        fromReal.onValueChanged.AddListener((float _) => resetControlPoints());
        toReal.onValueChanged.AddListener((float _) => resetControlPoints());

        reset.onClick.Invoke();

        // resetControlPoints();
        // calculate();
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
            if (outputPts.Count == 0)
                return;

            Draw.Thickness = 1;

            // draw the input
            radius = inputCamera.orthographicSize / radiusScalar;
            Draw.Matrix = inputOrigin.localToWorldMatrix;
            drawInput(inputCamera);
            
            // draw the output
            radius = outputCamera.orthographicSize / radiusScalar;
            Draw.Matrix = outputOrigin.localToWorldMatrix;

            for (int i = 1; i < outputPts.Count; i++)
            {
                // Draw.Line(outputPts[i - 1].ToVector2(), outputPts[i].ToVector2(), color);
                Draw.Line(outputPtsZDepth[i - 1], outputPtsZDepth[i], color);
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
        var mousePos = inputCamera.ScreenToWorldPoint(Input.mousePosition);

        var discColor = color;
        discColor.a = discColor.a * .5f;
        var from = handleDragControlPoint(inputPts[0]);
        drawControlPoint(from, inputCamera);

        for (var i = 1; i < inputPts.Count; i++)
        {
            var to = handleDragControlPoint(inputPts[i]);
            drawControlPoint(to, inputCamera);

            Draw.Line(from, to, color);
            from = to;
        }

        drawOutputControlPoints();
    }

    void drawControlPoint(Vector2 pt, Camera cam)
    {
        var discColor = color;
        var mousePos = cam.ScreenToWorldPoint(Input.mousePosition);
        // I must be using the matrix here incorrectly so im using a simple transformation instead
        // mousePos = inputOrigin.worldToLocalMatrix * mousePos;
        mousePos -= new Vector(inputOrigin.position.x, inputOrigin.position.y);
        var dist = Vector2.Distance(mousePos, pt);

        radius = cam.orthographicSize / radiusScalar;

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
        // + new Vector(inputOrigin.position.x, inputOrigin.position.y)
        {
            return drag(pt);
        }

        return pt;
    }

    bool isMouseOverControlPoint(Vector pt)
    {
        var cam = getCameraInFocus();
        var mousePos = cam.ScreenToWorldPoint(Input.mousePosition) - new Vector(inputOrigin.position.x, inputOrigin.position.y);
        var dist = pt.Distance(mousePos);
        radius = cam.orthographicSize / radiusScalar;
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
        outputPtsZDepth = new List<Vector3>();
        var from = inputPts[0];
        // var from = new Vector(inputPts[0].x, Zeta.IndexToImag(inputPts[0].y));
        for (var i = 1; i < inputPts.Count; i++)
        {
            var to = inputPts[i];
            // var to = new Vector(inputPts[i].x, Zeta.IndexToImag(inputPts[i].y));
            double inc = 1d / pointsPerSegment;
            Debug.Assert(inc > 0);
            for (double j = 0; j <= 1; j += inc)
            {
                var input = Vector.Lerp(from, to, j);
                var index = input.y;
                var s = new Complex(input.x, Zeta.IndexToImag(input.y));
                
                Complex complex = Zeta.EulerMaclauren(s);
                Vector3 output = new Vector3((float)complex.Real, (float)complex.Imaginary, (float)Vector.Lerp(inputPts[i - 1], inputPts[i], j).y);

                outputPts.Add(complex);
                outputPtsZDepth.Add(output);
            }
            from = to;
        }
    }

    void drawOutputControlPoints()
    {
        using (Draw.StyleScope)
        {
            Draw.Matrix = outputOrigin.localToWorldMatrix;
            radius = outputCamera.orthographicSize / radiusScalar;
            //
            // Calculates the Zeta function for the control points and draws a disc for each one.
            //
            Vector to = new Vector();
            var discColor = color;
            discColor.a = discColor.a * .5f;

            // var from = inputPts[0];
            var from = new Vector(inputPts[0].x, Zeta.IndexToImag(inputPts[0].y));
            Vector3 DiscPos = new Vector3();
            
            for (var i = 1; i < inputPts.Count; i++)
            {
                // to = inputPts[i];
                to = new Vector(inputPts[i].x, Zeta.IndexToImag(inputPts[i].y));

                DiscPos = Zeta.EulerMaclauren(from).ToVector2();
                // add z depth to disc pos
                DiscPos = new Vector3(DiscPos.x, DiscPos.y, (float)inputPts[i - 1].y);

                // draw the dragged point without alpha
                if (inputPts.IndexOf(from) == dragging)
                    Draw.Disc(DiscPos, radius, discColor);

                Draw.Disc(DiscPos, radius, discColor);
                from = to;
            }

            DiscPos = Zeta.EulerMaclauren(to).ToVector2();
            // add z depth to disc pos
            DiscPos = new Vector3(DiscPos.x, DiscPos.y, (float)inputPts[inputPts.Count - 1].y);

            Draw.Disc(DiscPos, radius, discColor);
        }
    }

    Vector2 drag(Vector pt)
    {
        // var mousePos = getCameraInFocus().ScreenToWorldPoint(Input.mousePosition);
        var mousePos = inputCamera.ScreenToWorldPoint(Input.mousePosition);
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

        inputPts[dragging] = new Vector(mousePos) - new Vector(inputOrigin.position.x, inputOrigin.position.y);

        calculate();

        return mousePos - new Vector(inputOrigin.position.x, inputOrigin.position.y);
    }

    protected void endDrag()
    {
        dragging = -1;
        _leanDrag.enabled = true;
        calculate();

        // OnTeardopPointsUpdated(outputPtsZDepth);
    }

    // returns a camera with the mouse in it's viewport
    Camera getCameraInFocus()
    {
        Vector3 viewPos = outputCamera.ScreenToViewportPoint(Input.mousePosition);
        if(viewPos.x > 0 && viewPos.x < 1 && viewPos.y > 0 && viewPos.y < 1)
        {
            return outputCamera;
        }
        return inputCamera;
    }
}
