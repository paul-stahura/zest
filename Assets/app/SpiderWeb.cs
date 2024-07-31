using System;
using System.Collections.Generic;
using System.Linq;
using Shapes;
using UnityEngine;

public class SpiderWeb : MonoBehaviour
{
    [SerializeField] private float _lineTransparency = 0.8f;
    [SerializeField] private bool _drawUpToMiddlePlusOne = true;
    [SerializeField] private int _unitPointsToDraw = 10;
    [SerializeField] private Color _circleColor = Color.white;
    [SerializeField] private Color _pointColor = Color.green;
    [SerializeField] private float _pointSize = 0.1f;
    [SerializeField] private Color _webColor = Color.red;

    private App _app;

    void Awake()
    {
        _app = GameObject.Find("App")?.GetComponent<App>();
        _app.DrawSprial += DrawSpiral;


    }
    
    private void DrawSpiral(Camera cam, Zeta.Spiral s)
    {
        using(Draw.StyleScope)
        {
            _pointColor.a = _lineTransparency;
            Draw.Color = _circleColor;
            Draw.Thickness = 1 + _lineTransparency;

            // first angle is always zero with length of 1
            Draw.Ring(Vector2.zero, 1);
        }


        if(_drawUpToMiddlePlusOne)
        {
            _unitPointsToDraw = s.middleIndex + 1;
        }

        // calculate the angle of each joint
        List<double> angles = new List<double>();
        // joint zero is (0,0), so we start at 1 and 2
        for(int i = 2; i <= _unitPointsToDraw; i++)
        {
            if(i > s.joints.Count()) break;
            
            Vector last = s.joints[i-1];
            Vector a = s.joints[i] - last;
            angles.Add(GetAngle(a, last) + (Math.PI / 2));

            // the first angle is right, something is off on the following ones
            Debug.Log(GetAngle(a, last) * Mathf.Rad2Deg);
        }

        DrawUnitPoints(angles);


    }

    private void DrawUnitPoints(List<double> angles)
    {
        using(Draw.StyleScope)
        {
            _pointColor.a = _lineTransparency;
            Draw.Color = _pointColor;
            Draw.Thickness = 1 + _lineTransparency;

            // first angle is always zero with length of 1
            Draw.Ring(Vector2.right, _pointSize);

            for(int i = 0; i < angles.Count; i++)
            {
                Vector2 pos = new Vector(Math.Sin(angles[i]), Math.Cos(angles[i]));
                Draw.Ring(pos, _pointSize);
            }
        }
    }


    private void DrawWeb(Zeta.Spiral s)
    {
        using(Draw.StyleScope)
        {
            Draw.Thickness = 1 + _lineTransparency;


        }
    }

    private double GetAngle(Vector2 a, Vector2 b)
    {
        double aAngle = Math.Atan2(a.y, a.x);
        double bAngle = Math.Atan2(b.y, b.x);
        return bAngle - aAngle;
    }
}
