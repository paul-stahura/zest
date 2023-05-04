using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Shapes;
using Complex = System.Numerics.Complex;

public class ZDisc : MonoBehaviour
{
    public Vector2 centerHandle;
    // public Vector2 radiusHandle;
    public float discRadius = .5f;
    public float handleRadius = .05f;

    public Button reset;
    public int numPoints = 10;
    public Color color = Color.magenta;
    public Slider transparency;

    public Lean.Touch.LeanTouch _leanDrag;

    public bool draggingFrom = false;
    public bool draggingTo = false;
    public bool dragging = false;
    public bool mousebutton = false;
    public bool leanTouch = true;

    protected List<Vector3> outputPts = new List<Vector3>();
    protected List<Color32> outputColors = new List<Color32>();

    public delegate Complex ZetaFunction(Complex z);
    ZetaFunction ZetaFn = Zeta.EulerMaclauren;

    PointCloudData _pointCloudData = new PointCloudData();

    void Start()
    {
        centerHandle = new Vector2(.5f, .5f);
        var pcr = GetComponent<PointCloudRenderer>();
        pcr.sourceData = _pointCloudData;
        calculate();
    }

    void OnDestroy()
    {
        _pointCloudData.Dispose();
    }

    public void OnDrawShapes(Camera cam)
    {
        using (Draw.StyleScope)
        {
            Draw.Thickness = 1;
            handleRadius = cam.orthographicSize / 50;

            drawInput(cam);
        }
    }

    protected void drawInput(Camera cam)
    {
        var worldPos = Camera.main.ScreenToWorldPoint(Input.mousePosition);

        if (Vector2.Distance(worldPos, centerHandle) < handleRadius || mouseInRing())
        {
            var c = color;
            c.a = .8f;
            if (Vector2.Distance(worldPos, centerHandle) < handleRadius)
                Draw.Disc(centerHandle, handleRadius, c);
            else
            {
                Draw.Ring(centerHandle, discRadius, 10, c);
            }

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

        var colors = new Color[] { Color.red, Color.green, new Color(.5f, 0, 1, 1), Color.yellow, Color.cyan, Color.magenta, Color.white };
        var ringThickness = discRadius / colors.Length;

        Draw.Disc(centerHandle, discRadius, color);
        for (var i = 0; i < colors.Length; i++)
        {
            var c = colors[i];
            c.a = c.a / 2;
            Draw.Ring(centerHandle, ringThickness * (i + 1), 2, c);
        }
    }

    protected void calculate()
    {
        outputPts.Clear();
        outputColors.Clear();
        // _pointCloudData.Reset();

        var num = dragging ? numPoints : numPoints * 100;
        var colors = new Color[] { Color.red, Color.green, new Color(.5f, 0, 1, 1), Color.yellow, Color.cyan, Color.magenta, Color.white };
        var ringThickness = discRadius / colors.Length;
        for (var l = 0; l < colors.Length; l++)
        {
            for (int i = 0; i < num * (l + 1); i++)
            {
                var rad = UnityEngine.Random.Range(0, 2 * Mathf.PI);
                var len = ringThickness * l + UnityEngine.Random.Range(0, ringThickness);

                var pos = centerHandle + new Vector2((float)(len * Math.Cos(rad)), (float)(len * Math.Sin(rad)));

                var pt = new Complex(pos.x, pos.y);
                outputPts.Add(Zeta.EulerMaclauren(pt).ToVector2());
                outputColors.Add(colors[l]);
            }
        }

        _pointCloudData.Initialize(outputPts, outputColors);
    }


    bool mouseInRing()
    {
        var ringInnerRadius = discRadius - handleRadius;
        var ringOuterRadius = discRadius + handleRadius;

        var worldMouse = Camera.main.ScreenToWorldPoint(Input.mousePosition);
        var distance = Vector2.Distance(worldMouse, centerHandle);
        return distance >= ringInnerRadius && distance <= ringOuterRadius;
    }

    protected void beginDrag()
    {
        var worldMouse = Camera.main.ScreenToWorldPoint(Input.mousePosition);
        if (Vector2.Distance(worldMouse, centerHandle) <= handleRadius)
        {
            draggingFrom = true;
            centerHandle = worldMouse;
        }
        else if (mouseInRing())
        {
            // Mouse is inside the ring
            draggingTo = true;
            discRadius = Vector2.Distance(worldMouse, centerHandle);
        }

        dragging = draggingFrom || draggingTo;
        _leanDrag.enabled = !dragging;

        calculate();
    }

    protected void drag()
    {
        var worldPos = Camera.main.ScreenToWorldPoint(Input.mousePosition);
        if (draggingFrom)
        {
            // fromReal.Value = worldPos.x;
            // fromImag.Value = worldPos.y;
            centerHandle = worldPos;
        }
        else
        {
            // toReal.Value = worldPos.x;
            // toImag.Value = worldPos.y;
            // radiusHandle = worldPos;
            discRadius = Vector2.Distance(worldPos, centerHandle);
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
