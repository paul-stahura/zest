using System;
using System.Numerics;
using Shapes;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Vector2 = UnityEngine.Vector2;

public class ZetaTargets : ImmediateModeShapeDrawer
{
    [SerializeField] private Color _zrsColor;
    [SerializeField] private Toggle _zrsToggle;
    [SerializeField] private TMP_Text _zrsPos;

    [SerializeField] private Color _zpsColor;
    [SerializeField] private Toggle _zpsToggle;
    [SerializeField] private TMP_Text _zpsPos;

    [SerializeField] private Color _emsColor;
    [SerializeField] private Toggle _emsToggle;
    [SerializeField] private TMP_Text _emsPos;

    [Header("Trace Settings")]
    private const int _traceLength = 100;
    private const double _traceInterval = 0.0000000000001f;
    [SerializeField] private Toggle _traceToggle;
    private Vector2[] _zrsPath = new Vector2[_traceLength];
    private int _zrsPathIndex = 0;
    private Vector2[] _zpsPath = new Vector2[_traceLength];
    private int _zpsPathIndex = 0;
    private Vector2[] _emsPath = new Vector2[_traceLength];
    private int _emsPathIndex = 0;

    private SpiralCalculator _spiralCalculator;


    void Awake()
    {
        _zrsToggle = GameObject.Find("Zrs Zeta Toggle").GetComponent<Toggle>();
        _zrsPos = GameObject.Find("Zrs Pos").GetComponent<TMP_Text>();
        _zpsToggle = GameObject.Find("Zps Zeta Toggle").GetComponent<Toggle>();
        _zpsPos = GameObject.Find("Zps Pos").GetComponent<TMP_Text>();
        _emsToggle = GameObject.Find("Ems Zeta Toggle").GetComponent<Toggle>();
        _emsPos = GameObject.Find("Ems Pos").GetComponent<TMP_Text>();

        SubTargets();

        _traceToggle = GameObject.Find("Trace Zeta Toggle").GetComponent<Toggle>();

        _spiralCalculator = GameObject.Find("Spiral Calculator").GetComponent<SpiralCalculator>();
    }

    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;

            // set static parameter to draw in the local space of this object
            Draw.Matrix = transform.localToWorldMatrix;

            DrawTargets();
        }
    }

    private void SubTargets()
    {
        _zrsToggle.onValueChanged.AddListener((bool value) => 
        { 
            if(value) SpiralCalculator.UpdateZrs += UpdateZrs;
            else SpiralCalculator.UpdateZrs -= UpdateZrs; 
        });

        _zpsToggle.onValueChanged.AddListener((bool value) => 
        { 
            if(value) SpiralCalculator.UpdateZps += UpdateZps;
            else SpiralCalculator.UpdateZps -= UpdateZps; 
        });

        _emsToggle.onValueChanged.AddListener((bool value) => 
        { 
            if(value) SpiralCalculator.UpdateEms += UpdateEms;
            else SpiralCalculator.UpdateEms -= UpdateEms; 
        });
    }

    private void UpdateZrs(Zeta.Spiral zrs)
    {
        UpdateTargetPos(zrs.zeta, ref _zrsPath, ref _zrsPathIndex);
    }

    private void UpdateZps(Vector zps)
    {
        UpdateTargetPos(zps, ref _zpsPath, ref _zpsPathIndex);
    }

    private void UpdateEms(Zeta.Spiral ems)
    {
        UpdateTargetPos(ems.zeta, ref _emsPath, ref _emsPathIndex);
    }

    private void DrawTargets()
    {
        DrawZetaTarget(_zrsToggle, _zrsPos, _spiralCalculator.GetZrs().zeta, _zrsPath, _zrsPathIndex, _zrsColor);
        DrawZetaTarget(_zpsToggle, _zpsPos, _spiralCalculator.GetZps(), _zpsPath, _zpsPathIndex, _zpsColor);
        DrawZetaTarget(_emsToggle, _emsPos, _spiralCalculator.GetEms().zeta, _emsPath, _emsPathIndex, _emsColor);
    }

    private void DrawZetaTarget(Toggle toggle, TMP_Text posText, Complex pos, Vector2[] pathList, int pathIndex, Color color)
    {
        if (toggle.isOn)
        {
            DrawZ(pos.ToVector2(), color);
            posText.text = pos.ToString();

            if (_traceToggle.isOn)
            {
                DrawPath(pathList, pathIndex, color);
            }
        }
        else
        {
            posText.text = "";
        }
    }

    private void DrawZ(Vector2 pt, Color color)
    {
        using (Draw.StyleScope)
        {
            Draw.Color = color;
            Draw.Thickness = 1f;
            // -Z
            var r = .05f;
            Draw.Line(pt + new Vector2(-r/2, 0), pt + new Vector2(r/2, 0)); // -
            Draw.Line(pt + new Vector2(-r, -r), pt + new Vector2(r, r));    // /
            Draw.Line(pt + new Vector2(-r, r), pt + new Vector2(r, r));     // `
            Draw.Line(pt + new Vector2(-r, -r), pt + new Vector2(r,-r));    // _
        }
    }

    private void DrawPath(Vector2[] path, int pathIndex, Color pathColor)
    {
        using (Draw.StyleScope)
        {
            Draw.Color = pathColor;
            Draw.Thickness = 1;
            //draw a line along the path starting at pathIndex and looping through the array
            for (int i = 1; i < _traceLength; i++)
            {
                Draw.Line(path[(pathIndex + i) % _traceLength], path[(pathIndex + i + 1) % _traceLength]);
            }
        }
    }

    private void UpdateTargetPos(Complex complex, ref Vector2[] targetPath, ref int targetPathIndex)
    {
        UpdatePath(ref targetPath, ref targetPathIndex, complex);
    }

    private void UpdatePath(ref Vector2[] path, ref int pathIndex, Complex complex)
    {
        var prevIndex = (pathIndex - 1 + _traceLength) % _traceLength;
        if(Math.Abs(path[prevIndex].magnitude - complex.ToVector2().magnitude) > _traceInterval)
        {
            pathIndex = (pathIndex + 1) % _traceLength;
        }
        path[pathIndex] = complex.ToVector2();
    }
}
