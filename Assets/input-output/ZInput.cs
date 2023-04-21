using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class ZInput : MonoBehaviour
{
    public Vector imagStart = new Vector(.5f, 189.5416f); // index: 5.0
    public Vector imagEnd = new Vector(.5f, 264.9393f); // index: 5.999999

    public FloatInput startReal;
    public FloatInput startImag;
    public FloatInput endReal;
    public FloatInput endImag;

    float radius;

    public Lean.Touch.LeanTouch _leanDrag;

    void Start()
    {
        startReal.onValueChanged.AddListener(value => imagStart.x = value);
        startImag.onValueChanged.AddListener(value => imagStart.y = value);
        endReal.onValueChanged.AddListener(value => imagEnd.x = value);
        endImag.onValueChanged.AddListener(value => imagEnd.y = value);

        setInputValues();

    }

    void setInputValues()
    {
        startReal.Value = (float)imagStart.x;
        startImag.Value = (float)imagStart.y;
        endReal.Value = (float)imagEnd.x;
        endImag.Value = (float)imagEnd.y;
    }

    public void onClick()
    {
        imagStart.x = .5;
        imagEnd.x = .5;

        setInputValues();
    }


    public void OnDrawShapes(Camera cam)
    {
        var start = Vector2.zero;
        radius = cam.orthographicSize / 50;


        using (Draw.StyleScope)
        {
            Draw.Thickness = 1;
            Draw.Disc(imagStart, radius, Color.red);
            Draw.Disc(imagEnd, radius, Color.red);
            Draw.Line(imagStart, imagEnd, Color.red);
        }
    }
    public bool dragging = false;
    bool dragStart = false;

    void Update()
    {
        if (Input.GetMouseButton(0))
        {
            var worldPos = Camera.main.ScreenToWorldPoint(Input.mousePosition);
            if (Vector2.Distance(worldPos, imagStart) < radius)
            {
                dragging = true;
                dragStart = true;
            }
            else if (Vector2.Distance(worldPos, imagEnd) < radius)
            {
                dragging = true;
                dragStart = false;
            }

            if (dragging)
            {
                if (dragStart)
                {
                    imagStart = new Vector(worldPos);
                }
                else
                {
                    imagEnd = new Vector(worldPos);
                }
                setInputValues();
            }
        }
        else
        {
            dragging = false;
        }

        _leanDrag.enabled = !dragging;
    }
}
