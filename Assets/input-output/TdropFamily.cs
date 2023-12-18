using System;
using System.Collections;
using System.Collections.Generic;
using Shapes;
using UnityEngine;
using UnityEngine.UI;

public class TdropFamily : MonoBehaviour
{
    public delegate void TeardropPoints(List<Vector3> tPoints);
    public static event TeardropPoints OnTeardopPointsUpdated;

    [SerializeField] private int _pointsPerTdrop = 1000;
    [SerializeField] private bool _drawTdropAtInfinity = true;
    [SerializeField] private Color _tDropColor = Color.cyan;
    
    [SerializeField] private Transform _teardropOrigin;
    [SerializeField] private Button _approximate;

    private List<Vector3> infinityDropPts;

    void Start()
    {
        _approximate.onClick.AddListener(() =>
        {
            OnTeardopPointsUpdated(infinityDropPts);
        });

        infinityDropPts = new();
        calculateTdrops();
    }

    public void OnDrawShapes(Camera cam)
    {
        if(_drawTdropAtInfinity)
        {
            drawInfinityTdrop();
        }
    }

    private void calculateTdrops()
    {
        calculateInfinityTdropPts();
    }

    private void calculateInfinityTdropPts()
    {
        infinityDropPts.Clear();

        double inc = 1d / _pointsPerTdrop;
        Debug.Assert(inc > 0);
        for (double t = 0; t < 1; t += inc)
        {
            // Tdrop is undefined at 0.25 and 0.75, so we skip these values
            if(Mathf.Approximately((float)t, 0.25f) || Mathf.Approximately((float)t, 0.75f)) {
                t += inc;
            }

            infinityDropPts.Add(InfinityTdrop(t));
        }

        infinityDropPts.Add(InfinityTdrop(1));
    }

    private Vector3 InfinityTdrop(double t)
    {
        // https://www.desmos.com/calculator/3lybupjolu
        double tx(double t)
        {
            double PI2 = 2.0 * Math.PI;
            return -Math.Cos(PI2 * (t*t - 1.0/16.0));
        }

        double ty(double t)
        {
            return Math.Sin(2.0 * Math.PI * (t*t - 1.0/16.0));
        }

        double psi(double t) => Math.Cos(2.0 * Math.PI * (t*t - t - 1.0 / 16.0)) / Math.Cos(2.0 * Math.PI * t);

        double PSI = psi(t);

        Vector3 pt = new();
        pt.x = (float)(tx(t) * PSI);
        pt.y = (float)(ty(t) * PSI);
        pt.z = (float)t;

        return pt + new Vector3(1, 0, 0);
    }

    private void drawInfinityTdrop()
    {
        using (Draw.StyleScope)
        {
            Draw.Thickness = 1;
            Draw.Matrix = _teardropOrigin.localToWorldMatrix;

            
            for (int i = 1; i < infinityDropPts.Count; i++)
            {
                Draw.Line(infinityDropPts[i - 1], infinityDropPts[i], _tDropColor);
            }
        }
    }
}
