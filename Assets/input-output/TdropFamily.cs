using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using Shapes;
using UnityEngine;
using UnityEngine.UI;
using Complex = System.Numerics.Complex;

public class TdropFamily : MonoBehaviour
{
    public delegate void TeardropPoints(List<Vector3> tdropInfinity, List<List<Vector3>> tdropPoints);
    public static event TeardropPoints OnTeardropPointsUpdated;

    [Header("UI")]
    public FloatInput inputPointsPer;
    public Toggle inputInfinityTdropToggle;
    public FloatInput inputStartIndex;
    public FloatInput inputNumOfTdrops;
    public Button inputApproximateTdropButton;
 

    [Header("Tdrop settings")]
    [SerializeField] private int _pointsPerTdrop = 250;
    [SerializeField] private bool _drawTdropAtInfinity = true;
    [SerializeField] private Color _infinityTdropColor = new Color(1, 0, 0.6f, 1);
    [SerializeField] private int _tdropStaringIndex = 0;
    [SerializeField] private int _numOfTdrops = 1;
    [SerializeField] private Color _tdropColor = Color.cyan;
    
    [SerializeField] private Transform _teardropOrigin;

    private List<Vector3> _infinityTdropPts;
    private List<List<Vector3>> _familyTdropPts;


    void Start()
    {
        InitUI();

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

    private void InitUI()
    {
        inputPointsPer = GameObject.Find("InputPointsPer")?.GetComponent<FloatInput>();
        inputPointsPer?.onValueChanged.AddListener((float value) =>
        {
            _pointsPerTdrop = (int)value;
            calculateTdrops();
        });

        inputInfinityTdropToggle = GameObject.Find("InputInfinityTdropToggle")?.GetComponent<Toggle>();
        inputInfinityTdropToggle?.onValueChanged.AddListener((bool value) =>
        {
            _drawTdropAtInfinity = value;
            calculateTdrops();
        });

        inputStartIndex = GameObject.Find("InputStartIndex")?.GetComponent<FloatInput>();
        inputStartIndex?.onValueChanged.AddListener((float value) =>
        {
            _tdropStaringIndex = (int)value;
            calculateTdrops();
        });

        inputNumOfTdrops = GameObject.Find("InputNumOfTdrops")?.GetComponent<FloatInput>();
        inputNumOfTdrops?.onValueChanged.AddListener((float value) =>
        {
            _numOfTdrops = (int)value;
            calculateTdrops();
        });

        inputApproximateTdropButton = GameObject.Find("inputApproximateTdropButton")?.GetComponent<Button>();
        inputApproximateTdropButton?.onClick.AddListener(() =>
        {
            calculateTdrops();
            OnTeardropPointsUpdated(_infinityTdropPts, _familyTdropPts);
        });
    }

    private void calculateTdrops()
    {
        _infinityTdropPts = new();
        _familyTdropPts = new();

        if(_drawTdropAtInfinity) calculateInfinityTdropPts();

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
                Draw.Line(_infinityTdropPts[i - 1], _infinityTdropPts[i], _infinityTdropColor);
            }
        }
    }

    private void calculateFamilyTdropPts()
    {
        _familyTdropPts.Clear();
        
        for(int i = _tdropStaringIndex; i < (_tdropStaringIndex + _numOfTdrops); i++)
        {
            _familyTdropPts.Add(new());

            double inc = 1d / (_pointsPerTdrop - 1);
            Debug.Assert(inc > 0);
            for (int j = 0; j < _pointsPerTdrop; j++)
            {
                double t = j * inc;
                if(i == 0 && j == 0) t = inc / 2;
                _familyTdropPts[_familyTdropPts.Count - 1].Add(FamilyTdrop(i, t));
            }
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
        using (Draw.StyleScope)
        {
            Draw.Thickness = 1;
            Draw.Matrix = _teardropOrigin.localToWorldMatrix;
            
            for(int i = 0; i < _familyTdropPts.Count; i++)
            {
                for (int j = 1; j < _familyTdropPts[i].Count; j++)
                {
                    Draw.Line(_familyTdropPts[i][j - 1], _familyTdropPts[i][j], _tdropColor);
                }
            }
        }
    }
}
