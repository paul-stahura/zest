using System;
using System.Numerics;
using Shapes;
using UnityEngine;
using Vector2 = UnityEngine.Vector2;
using UnityEngine.UI;

public class SumRemainderRenderer : ImmediateModeShapeDrawer
{
    [SerializeField] private Toggle _zakR1Toggle;
    [SerializeField] private Color _zakR1Color = Color.green;
    [SerializeField] private Toggle _zakR2Toggle;
    [SerializeField] private Color _zakR2Color = Color.green;
    [SerializeField] private Toggle _zpsR1Toggle;
    [SerializeField] private Color _zpsR1Color = Color.red;
    [SerializeField] private Toggle _zpsR2Toggle;
    [SerializeField] private Color _zpsR2Color = Color.red;

    private App _app;
    private static double _real;
    private static double _index;
    private static bool _remaindersUpdated = false;

    private Vector2 _zakR1;
    private Vector2 _zakR2;
    private Vector2 _zpsR1;
    private Vector2 _zpsR2;

    private SpiralCalculator _spiralCalculator;

    void Awake()
    {
        _app = GameObject.Find("App").GetComponent<App>();
        _app.IndexChanged += OnIndexChanged;
        _app.RealChanged += OnRealChanged;

        _real = _app.Real;
        _index = _app.Index;
    }

    private void OnIndexChanged(double index)
    {
        _index = index;
        _remaindersUpdated = false;
    }

    private void OnRealChanged(double real)
    {
        _real = real;
        _remaindersUpdated = false;
    }

    void Start()
    {
        _spiralCalculator = GameObject.Find("Spiral Calculator").GetComponent<SpiralCalculator>();

        _zakR1Toggle = GameObject.Find("ZakR1Toggle").GetComponent<Toggle>();
        _zakR1Toggle.onValueChanged.AddListener((value) => UpdateRs());
        
        _zakR2Toggle = GameObject.Find("ZakR2Toggle").GetComponent<Toggle>();
        _zakR2Toggle.onValueChanged.AddListener((value) => UpdateRs());

        _zpsR1Toggle = GameObject.Find("ZpsR1Toggle").GetComponent<Toggle>();
        _zpsR1Toggle.onValueChanged.AddListener((value) => UpdateRs());

        _zpsR2Toggle = GameObject.Find("ZpsR2Toggle").GetComponent<Toggle>();
        _zpsR2Toggle.onValueChanged.AddListener((value) => UpdateRs());
    }

    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;

            // set static parameter to draw in the local space of this object
            Draw.Matrix = transform.localToWorldMatrix;

            if(!_remaindersUpdated)
            {
                UpdateRs();
            }
            DrawRemainders();
        }
    }

    private void UpdateRs()
    {
        Zeta.Spiral s = _spiralCalculator.GetEms();
        Vector sum = s.joints[s.middleIndex];
        if (_zakR1Toggle.isOn) _zakR1 = sum + SumRemainders.CalcZakR1(_real, _index).ToVector2();
        if (_zakR2Toggle.isOn) _zakR2 = sum + SumRemainders.CalcZakR2(_real, _index).ToVector2();
        if (_zpsR1Toggle.isOn) _zpsR1 = sum + SumRemainders.CalcZpsR1(_real, _index).ToVector2();
        if (_zpsR2Toggle.isOn) _zpsR2 = sum + SumRemainders.CalcZpsR2(_real, _index).ToVector2();

        _remaindersUpdated = true;
    }

    private void DrawRemainders()
    {
        if (_zakR1Toggle.isOn) DrawZakR1();
        if (_zakR2Toggle.isOn) DrawZakR2();
        if (_zakR1Toggle.isOn && _zakR2Toggle.isOn)
        {
            using (Draw.StyleScope)
            {
                Draw.Thickness = 1f;
                Draw.UseDashes = true;
                Draw.Color = Color.yellow;
                Vector2 dir = (_zakR2 - _zakR1).normalized;
                Vector2 zeta = _spiralCalculator.GetEms().zeta.ToVector2();
                Vector2 projectedZeta = Vector2.Dot(zeta - _zakR1, dir) * dir;
                projectedZeta += projectedZeta.normalized;
                Draw.Line(_zakR1 + projectedZeta, _zakR2 - projectedZeta);
                Draw.UseDashes = false;
            }
        }

        if (_zpsR1Toggle.isOn) DrawZpsR1();
        if (_zpsR2Toggle.isOn) DrawZpsR2();
        if (_zpsR1Toggle.isOn && _zpsR2Toggle.isOn)
        {
            using (Draw.StyleScope)
            {
                Draw.Thickness = 1f;
                Draw.UseDashes = true;
                Draw.Color = Color.cyan;
                Vector2 dir = (_zpsR2 - _zpsR1).normalized;
                // project _zpsR1 to Zeta onto the line between _zpsR1 and _zpsR2
                Vector2 zeta = _spiralCalculator.GetEms().zeta.ToVector2();
                Vector2 projectedZeta = Vector2.Dot(zeta - _zpsR1, dir) * dir;
                projectedZeta += projectedZeta.normalized;
                Draw.Line(_zpsR1 + projectedZeta, _zpsR2 - projectedZeta);
                Draw.UseDashes = false;
            }
        }
    }

    private void DrawZakR1()
    {
        using (Draw.StyleScope)
        {
            Draw.Thickness = 3f;
            Draw.Color = _zakR1Color;
            Zeta.Spiral s = _spiralCalculator.GetEms();
            Draw.Line(s.joints[s.middleIndex], _zakR1);
        }
    }
    private void DrawZakR2()
    {
        using (Draw.StyleScope)
        {
            Draw.Thickness = 3f;
            Draw.Color = _zakR2Color;
            Zeta.Spiral s = _spiralCalculator.GetEms();
            Draw.Line(s.joints[s.middleIndex], _zakR2);
        }
    }

    private void DrawZpsR1()
    {
        using (Draw.StyleScope)
        {
            Draw.Thickness = 3f;
            Draw.Color = _zpsR1Color;
            Zeta.Spiral s = _spiralCalculator.GetEms();
            Draw.Line(s.joints[s.middleIndex], _zpsR1);
        }
    }
    private void DrawZpsR2()
    {
        using (Draw.StyleScope)
        {
            Draw.Thickness = 3f;
            Draw.Color = _zpsR2Color;
            Zeta.Spiral s = _spiralCalculator.GetEms();
            Draw.Line(s.joints[s.middleIndex], _zpsR2);
        }
    }
}
