using System;
using System.Collections;
using System.Collections.Generic;
using Microsoft.Win32.SafeHandles;
using Shapes;
using TMPro.EditorUtilities;
using UnityEngine;

public class SegmentMarks : MonoBehaviour
{
    [SerializeField] private App _app;
    [SerializeField] private FloatInput _segmentCountInput;
    [SerializeField] private int _segmentCount = 20;
    private List<Vector2> _pts;
    void Awake()
    {
        _app = GameObject.Find("App")?.GetComponent<App>();
        _app.DrawSprial += DrawMarks;

        _segmentCountInput = GameObject.Find("SegmentPointsCount")?.GetComponent<FloatInput>();
        _segmentCountInput.onValueChanged.AddListener((value) => {
            _segmentCount = (int)value;
        });
        _segmentCount = (int)_segmentCountInput.Value;
    }

    private void DrawMarks(Camera cam, Zeta.Spiral s)
    {
        if(_segmentCount <= 0 || s.joints.Length < s.middleIndex - 1) return;
        
        DrawTickMarks(s.middleIndex - 1, s);
        DrawTickMarks(s.middleIndex, s);
        DrawTickMarks(s.middleIndex + 1, s);

        DrawTickMarks(0, s);
        DrawTickMarks(1, s);
        DrawTickMarks(s.zeta.ToVector(), new Vector(0, 0), s);
    }

    private void DrawTickMarks(int linkIndex, Zeta.Spiral s)
    {
        DrawTickMarks(s.joints[linkIndex + 1] - s.joints[linkIndex], s.joints[linkIndex], s);
    }

    private void DrawTickMarks(Vector link, Vector linkPt, Zeta.Spiral s)
    {
        _pts = new List<Vector2>();

        double segmentLength = 1d / _segmentCount;
        
        for(int i = 0; i < _segmentCount; i++)
        {
            double pt = segmentLength * (i + 1);
            Vector segmentPoint = link * Math.Pow(pt, 1d -s.real);
            _pts.Add(linkPt + segmentPoint);
        }
        

        Vector line = new Vector(link.y, -link.x) / _segmentCount;
        foreach(Vector2 pt in _pts)
        {
            using (Draw.StyleScope)
            {
                Color color = Color.white;
                color.a = 0.5f;
                Draw.Color = color;
                Draw.Thickness = 1;

                Draw.Line(pt + line, pt - line);
            }
        }
    }
}
