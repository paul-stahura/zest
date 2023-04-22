using System.Collections;
using System;
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

    public Action OnDragStart;
    public Action OnDragEnd;

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
        OnDragEnd?.Invoke();
    }


    public void OnDrawShapes(Camera cam)
    {
        // var start = Vector2.zero;
        radius = cam.orthographicSize / 50;


        using (Draw.StyleScope)
        {
            Draw.Thickness = 1;
            var start = imagStart.ToVector2();
            start.y /= 100;

            var end = imagEnd.ToVector2();
            end.y /= 100;

            Draw.Disc(start, radius, Color.green);
            Draw.Disc(end, radius, Color.red);
            Draw.Line(start, end, Color.white);
        }
    }
    public bool dragging = false;
    bool dragStart = false;

    void Update()
    {
        var start = imagStart.ToVector2();
        start.y /= 100;

        var end = imagEnd.ToVector2();
        end.y /= 100;

        if (Input.GetMouseButton(0))
        {
            var worldPos = Camera.main.ScreenToWorldPoint(Input.mousePosition);
            if (Vector2.Distance(worldPos, start) < radius)
            {
                if (!dragging)
                    OnDragStart?.Invoke();

                dragging = true;
                dragStart = true;
            }
            else if (Vector2.Distance(worldPos, end) < radius)
            {
                if (!dragging)
                    OnDragStart?.Invoke();

                dragging = true;
                dragStart = false;
            }

            if (dragging)
            {
                if (dragStart)
                {
                    start = new Vector(worldPos);
                    imagStart = new Vector(start.x, start.y * 100);
                }
                else
                {
                    end = new Vector(worldPos);
                    imagEnd = new Vector(end.x, end.y * 100);
                }
                setInputValues();
            }
        }
        else
        {
            if (dragging)
                OnDragEnd?.Invoke();

            dragging = false;
        }

        _leanDrag.enabled = !dragging;
    }
}
