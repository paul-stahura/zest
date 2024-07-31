using System;
using System.Collections.Generic;
using System.Linq;
using Shapes;
using UnityEngine;

public class SpiderWeb : MonoBehaviour
{
    [Header("Unit Points")]
    [SerializeField] private bool _drawUpToMiddlePlusOne = true;
    [SerializeField] private int _unitPointsToDraw = 10;

    [Header("Web")]
    [SerializeField] private int _pointsPerWeb = 100;
    [SerializeField] private int _webIndex = -1;
    [SerializeField] private int _webCount = 1;
    [SerializeField] private List<Vector> _webPoints;

    [Header("Draw")]
    [SerializeField] private float _lineTransparency = 0.8f;
    [SerializeField] private Color _circleColor = Color.white;
    [SerializeField] private Color _pointColor = Color.green;
    [SerializeField] private float _pointSize = 0.04f;
    [SerializeField] private Color _webColor = Color.red;


    private App _app;

    void Awake()
    {
        _app = GameObject.Find("App")?.GetComponent<App>();
        _app.DrawSprial += DrawSpiral;


    }
    
    private void DrawSpiral(Camera cam, Zeta.Spiral s)
    {
        // unit circle
        using(Draw.StyleScope)
        {
            _pointColor.a = _lineTransparency;
            Draw.Color = _circleColor;
            Draw.Thickness = 1 + _lineTransparency;

            // first angle is always zero with length of 1
            Draw.Ring(Vector2.zero, 1);
        }

        // points to draw
        if(_drawUpToMiddlePlusOne)
        {
            _unitPointsToDraw = s.middleIndex + 1;
        }

        DrawUnitPoints(s);

        int newIndex = (int)Mathf.Floor((float)s.index);
        if(_webIndex != newIndex)
        {
            _webIndex = newIndex;
            CalcWebPoints(s);
        }

        DrawWeb();
    }

    private void DrawUnitPoints(Zeta.Spiral s)
    {
        using(Draw.StyleScope)
        {
            _pointColor.a = _lineTransparency;
            Draw.Color = _pointColor;
            Draw.Thickness = 1 + _lineTransparency;

            // first angle is always zero with length of 1
            Vector pos = new Vector(1.0, 0.0);
            for(int i = 0; i < _unitPointsToDraw; i++)
            {
                // the angle is relitive to the previous point, so we can just rotate based off our last position
                pos = Rotate2DPoint(pos, GetJointAngle(i, s));
                Draw.Ring(pos, _pointSize);
            }
        }
    }

    private void CalcWebPoints(Zeta.Spiral s)
    {
        List<double> dists = new List<double>();

        double inc = 1.0d / _pointsPerWeb;
        double index = _webIndex;
        Zeta.Spiral webSpiral = new Zeta.Spiral(s.real, index, SpiralFormulas.EulerMaclauren);

        while(index < _webIndex + _webCount)
        {
            // get unitPoint
            Vector pos = new Vector(1.0, 0.0);
            for(int i = 0; i < _unitPointsToDraw; i++)
            {
                // the angle is relitive to the previous point, so we can just rotate based off our last position
                pos = Rotate2DPoint(pos, GetJointAngle(i, webSpiral));
            }

            // save dist from unit point to zeta
            dists.Add(Vector.Distance(pos, webSpiral.zeta.ToVector()));
            
            index += inc;
            webSpiral.Update(webSpiral.real, index, SpiralFormulas.EulerMaclauren);
        }

        _webPoints = new List<Vector>();

        // IDEA/TODO: play with a different way to distribute the points around the circle
        double angleInc = Math.PI * 2 / _pointsPerWeb;
        double angle = 0;
        _webPoints.Add(new Vector(1.0, 0.0) * dists[0]);
        for(int i = 1; i < dists.Count; i++)
        {
            // reset vector, add angle
            Vector pos = new Vector(1.0, 0.0);
            angle += angleInc;
            _webPoints.Add(Rotate2DPoint(pos, angle) * dists[i]);
        }
    }
    private void DrawWeb()
    {
        using(Draw.StyleScope)
        {
            _webColor.a = _lineTransparency;
            Draw.Color = _webColor;
            Draw.Thickness = 1 + _lineTransparency;

            for(int i = 1; i < _webPoints.Count(); i++)
            {
                Draw.Line(_webPoints[i-1], _webPoints[i]);
            }
        }
    }

    private double GetJointAngle(int jointIndex, Zeta.Spiral s)
    {
        if(jointIndex <= 0 || jointIndex > s.joints.Count()) return 0;

        Vector link1 = s.joints[jointIndex] - s.joints[jointIndex-1];
        Vector link2 = s.joints[jointIndex + 1] - s.joints[jointIndex];
        return GetAngle(link2, link1);
    }

    private double GetAngle(Vector a, Vector b)
    {
        double dotProduct = a.Dot(b);
        double magnitudeProduct = a.Length * b.Length;
        double angle = Math.Acos(dotProduct / magnitudeProduct);

        // Check if the vectors are in the same or opposite direction
        // > 0 = clockwise
        if (Vector3.Cross(a, b).z > 0)
        {
            angle = 2 * Math.PI - angle;
        }

        return angle;
    }

    private Vector Rotate2DPoint(Vector point2D, double rad)
    {
        double rotatedX = point2D.x * Math.Cos(rad) - point2D.y * Math.Sin(rad);
        double rotatedY = point2D.x * Math.Sin(rad) + point2D.y * Math.Cos(rad);

        return new Vector(rotatedX, rotatedY);
    }
}
