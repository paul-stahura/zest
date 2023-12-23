using System;
using System.Collections;
using System.Collections.Generic;
using Shapes;
using UnityEngine;
using UnityEngine.UI;
using Complex = System.Numerics.Complex;

public class TdropFamily : MonoBehaviour
{
    public delegate void TeardropPoints(List<Vector3> tPoints);
    public static event TeardropPoints OnTeardopPointsUpdated;

    [Range(0, int.MaxValue)]
    [SerializeField] private int _pointsPerTdrop = 1000;
    [SerializeField] private bool _drawTdropAtInfinity = true;
    [SerializeField] private int _tdropStaringIndex = 0;
    [SerializeField] private int _numOfTdrops = 1;
    [SerializeField] private Color _tDropColor = Color.cyan;
    
    [SerializeField] private Transform _teardropOrigin;
    [SerializeField] private Button _approximateButton;

    private List<Vector3> _infinityTdropPts;
    private List<Vector3> _familyTdropPts;


    void Start()
    {
        _approximateButton.onClick.AddListener(() =>
        {
            OnTeardopPointsUpdated(_infinityTdropPts);
        });

        calculateTdrops();
    }

    void OnValidate()
    {
        calculateTdrops();
    }

    public void OnDrawShapes(Camera cam)
    {
        if(_drawTdropAtInfinity)
        {
            drawInfinityTdrop();
        }

        drawFamilyTdrops();
    }

    private void calculateTdrops()
    {
        _infinityTdropPts = new();
        _familyTdropPts = new();

        calculateInfinityTdropPts();

        calculateFamilyTdropPts();
    }

    private void calculateInfinityTdropPts()
    {
        _infinityTdropPts.Clear();

        double inc = 1d / _pointsPerTdrop;
        Debug.Assert(inc > 0);
        for (double t = 0; t < 1; t += inc)
        {
            // Tdrop is undefined at 0.25 and 0.75, so we skip these values
            if(Mathf.Approximately((float)t, 0.25f) || Mathf.Approximately((float)t, 0.75f)) {
                t += inc;
            }

            _infinityTdropPts.Add(InfinityTdrop(t));
        }

        _infinityTdropPts.Add(InfinityTdrop(1));
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
            
            for (int i = 1; i < _infinityTdropPts.Count; i++)
            {
                Draw.Line(_infinityTdropPts[i - 1], _infinityTdropPts[i], _tDropColor);
            }
        }
    }

    private void calculateFamilyTdropPts()
    {
        _familyTdropPts.Clear();
        
        for(int i = _tdropStaringIndex; i < _numOfTdrops; i++)
        {
            double inc = 1d / _pointsPerTdrop;
            Debug.Assert(inc > 0);
            for (double t = 0; t < 1; t += inc)
            {
                _familyTdropPts.Add(FamilyTdrop(i, t));
            }

            _familyTdropPts.Add(FamilyTdrop(i, 1));
        }
        
    }

    private Vector3 FamilyTdrop(int tdropNum, double t)
    {
        Complex complex = Zeta.TearDrop(tdropNum + 1, Zeta.IndexToImag(tdropNum + t));
        Vector3 output = new Vector3((float)complex.Real, (float)complex.Imaginary, Mathf.Lerp(0, 1, (float)t));

        return output;
    }

    private void drawFamilyTdrops()
    {
        if(_familyTdropPts.Count < _pointsPerTdrop) return;

        using (Draw.StyleScope)
        {
            Draw.Thickness = 1;
            Draw.Matrix = _teardropOrigin.localToWorldMatrix;
            
            for(int t = 0; t < _numOfTdrops; t++)
            {
                for (int i = 1 + t * _pointsPerTdrop; i < t * _pointsPerTdrop + _pointsPerTdrop; i++)
                {
                    Draw.Line(_familyTdropPts[i - 1], _familyTdropPts[i], _tDropColor);
                }
            }
        }
    }
}
