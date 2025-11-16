using System;
using System.Numerics;
using Shapes;
using TMPro;
using UnityEditor.UIElements;
using UnityEngine;
using UnityEngine.UI;
using Quaternion = UnityEngine.Quaternion;
using Vector2 = UnityEngine.Vector2;

public class YinYangRenderer : ImmediateModeShapeDrawer
{
    [SerializeField] private Button _clearAllButton;

    [SerializeField] private Toggle _yinYangToggle;
    [SerializeField] private Toggle _yinYangLinkToggle;
    [SerializeField] private Toggle _yinYangSpecialToggle;
    [SerializeField] private Toggle _yinYangSpecialLinkToggle;
    [SerializeField] private Toggle _inverseSpecialToggle;

    [SerializeField] private TMP_Dropdown _derivativeModeDropdown;
    private YinYangCalculationMethod _derivativeMode = YinYangCalculationMethod.Approximate;

    private int _yinYangPathIndex = 0;
    private Vector2[] _yinPath = new Vector2[200];
    private Vector2[] _yangPath = new Vector2[200];
    private Vector2[] _yinSpecialPath = new Vector2[200];
    private Vector2[] _yangSpecialPath = new Vector2[200];

    [SerializeField] private Toggle _infToggle;
    [SerializeField] private Toggle _infLinkToggle;
    private Vector2[] _infYinPath = new Vector2[200];
    private Vector2[] _infYangPath = new Vector2[200];

    [SerializeField] private SpiralCalculator _spiralCalculator;

    void Awake()
    {
        _yinYangToggle = GameObject.Find("YinYang Toggle").GetComponent<Toggle>();
        _yinYangLinkToggle = GameObject.Find("YinYang Link Toggle").GetComponent<Toggle>();
        _yinYangSpecialToggle = GameObject.Find("YinYangSpecial Toggle").GetComponent<Toggle>();
        _yinYangSpecialLinkToggle = GameObject.Find("YinYangSpecial Link Toggle").GetComponent<Toggle>();
        _inverseSpecialToggle = GameObject.Find("Inverse YinYangSpecial Toggle").GetComponent<Toggle>();

        _derivativeModeDropdown = GameObject.Find("YinYang Derivative Mode Dropdown").GetComponent<TMP_Dropdown>();

        _infToggle = GameObject.Find("INF YinYang Toggle").GetComponent<Toggle>();
        _infLinkToggle = GameObject.Find("INF Bisector Link Toggle").GetComponent<Toggle>();

        _spiralCalculator = GameObject.Find("Spiral Calculator").GetComponent<SpiralCalculator>();

        InitPaths();
        SubCalc();

        _clearAllButton = GameObject.Find("YinYangClearAllButton").GetComponent<Button>();
        _clearAllButton.onClick.AddListener(() =>
        {
            _yinYangToggle.isOn = false;
            _yinYangLinkToggle.isOn = false;
            _yinYangSpecialToggle.isOn = false;
            _yinYangSpecialLinkToggle.isOn = false;
            _inverseSpecialToggle.isOn = false;
            _infToggle.isOn = false;
            _infLinkToggle.isOn = false;

            _derivativeModeDropdown.value = 0;
        });
    }

    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;

            // set static parameter to draw in the local space of this object
            Draw.Matrix = transform.localToWorldMatrix;

            DrawTearDrops();
        }
    }

    #region Draw
    private void DrawTearDrops()
    {
        using (Draw.StyleScope)
        {
            Draw.Thickness = 1;
            Draw.Color = Color.white;

            if(_yinYangToggle.isOn) DrawYinYang(_yinPath, _yangPath);
            if(_yinYangLinkToggle.isOn) DrawYinYangLink();

            if(_yinYangSpecialToggle.isOn) DrawYinYang(_yinSpecialPath, _yangSpecialPath);
            if(_yinYangSpecialLinkToggle.isOn) DrawYinYangSpecialLink();
            if(_inverseSpecialToggle.isOn) DrawInverseYinYangSpecial();

            if(_infToggle.isOn) DrawInf();
            if(_infLinkToggle.isOn) DrawInfLink();
        }
    }

    private void DrawYinYang(Vector2[] yinPath, Vector2[] yangPath)
    {
        var spiral = Mathf.Approximately((float)_spiralCalculator.GetReal(), 0.5f) ? _spiralCalculator.GetZrs() : _spiralCalculator.GetEms();
        Vector2 midLink = spiral.joints[spiral.middleIndex + 1] - spiral.joints[spiral.middleIndex];
        Vector2 pt = spiral.joints[spiral.middleIndex] + midLink / 2f;
        Vector2 linkUp = new Vector2(-midLink.y, midLink.x).normalized;
        Quaternion rot = Quaternion.Euler(0, 0, Vector2.SignedAngle(Vector2.up, linkUp));

        var yinStart = pt + (Vector2)(rot * yinPath[0]) * midLink.magnitude;
        var yangStart = pt + (Vector2)(rot * yangPath[0]) * midLink.magnitude;
        for(int i = 1; i < yinPath.Length - 1; i++)
        {
            var yinNext = pt + (Vector2)(rot * yinPath[i + 1]) * midLink.magnitude;
            Draw.Line(yinStart, yinNext, Color.red);
            yinStart = yinNext;

            var yangNext = pt + (Vector2)(rot * yangPath[i + 1]) * midLink.magnitude;
            Draw.Line(yangStart, yangNext, Color.green);
            yangStart = yangNext;
        }
    }

    private void DrawYinYangLink()
    {
        var spiral = Mathf.Approximately((float)_spiralCalculator.GetReal(), 0.5f) ? _spiralCalculator.GetZrs() : _spiralCalculator.GetEms();
        Vector2 midLink = spiral.joints[spiral.middleIndex + 1] - spiral.joints[spiral.middleIndex];
        Vector2 pt = spiral.joints[spiral.middleIndex] + midLink / 2f;
        Vector2 linkUp = new Vector2(-midLink.y, midLink.x).normalized;
        Quaternion rot = Quaternion.Euler(0, 0, Vector2.SignedAngle(Vector2.up, linkUp));

        var (yin, yang) = _spiralCalculator.GetYinYang();
        var yinPt = pt + (Vector2)(rot * yin) * midLink.magnitude;
        var yangPt = pt + (Vector2)(rot * yang) * midLink.magnitude;
        Draw.Line(yinPt, yangPt, Color.magenta);
    }

    private void DrawYinYangSpecialLink()
    {
        var spiral = Mathf.Approximately((float)_spiralCalculator.GetReal(), 0.5f) ? _spiralCalculator.GetZrs() : _spiralCalculator.GetEms();
        Vector2 midLink = spiral.joints[spiral.middleIndex + 1] - spiral.joints[spiral.middleIndex];
        Vector2 pt = spiral.joints[spiral.middleIndex] + midLink / 2f;
        Vector2 linkUp = new Vector2(-midLink.y, midLink.x).normalized;
        Quaternion rot = Quaternion.Euler(0, 0, Vector2.SignedAngle(Vector2.up, linkUp));

        var (yin, yang) = _spiralCalculator.GetYinYangSpecial();
        var yinPt = pt + (Vector2)(rot * yin) * midLink.magnitude;
        var yangPt = pt + (Vector2)(rot * yang) * midLink.magnitude;
        Draw.Line(yinPt, yangPt, Color.magenta);
    }

    private void DrawInverseYinYangSpecial()
    {
        var spiral = Mathf.Approximately((float)_spiralCalculator.GetReal(), 0.5f) ? _spiralCalculator.GetZrs() : _spiralCalculator.GetEms();
        var zeta = spiral.zeta.ToVector();
        var norm = zeta.Normalized();
        Vector2 midLink = spiral.joints[spiral.middleIndex + 1] - spiral.joints[spiral.middleIndex];
        Vector2 pt = spiral.joints[spiral.middleIndex] + midLink / 2f;
        Vector2 linkUp = new Vector2(-midLink.y, midLink.x).normalized;
        Quaternion rot = Quaternion.Euler(0, 0, Vector2.SignedAngle(Vector2.up, linkUp));

        var yinStart = pt + (Vector2)(rot * _yinPath[0]) * midLink.magnitude;
        var yangStart = pt + (Vector2)(rot * _yangPath[0]) * midLink.magnitude;
        for(int i = 1; i < _yinPath.Length - 1; i++)
        {
            var yinNext = pt + (Vector2)(rot * _yinPath[i + 1]) * midLink.magnitude;
            Draw.Line(zeta + Vector2.Reflect(yinStart, norm), zeta + Vector2.Reflect(yinNext, norm), Color.red);
            yinStart = yinNext;

            var yangNext = pt + (Vector2)(rot * _yangPath[i + 1]) * midLink.magnitude;
            Draw.Line(zeta + Vector2.Reflect(yangStart, norm), zeta + Vector2.Reflect(yangNext, norm), Color.green);
            yangStart = yangNext;
        }
    }

    private void DrawInf()
    {
        var spiral = Mathf.Approximately((float)_spiralCalculator.GetReal(), 0.5f) ? _spiralCalculator.GetZrs() : _spiralCalculator.GetEms();
        Vector2 midLink = spiral.joints[spiral.middleIndex + 1] - spiral.joints[spiral.middleIndex];
        Vector2 pt = spiral.joints[spiral.middleIndex] + midLink / 2f;
        Vector2 linkUp = new Vector2(-midLink.y, midLink.x).normalized;
        Quaternion rot = Quaternion.Euler(0, 0, Vector2.SignedAngle(Vector2.up, linkUp));

        var yinStart = pt + (Vector2)(rot * (_infYinPath[0] + new Vector2(-0.5f, 0)) * midLink.magnitude);
        var yangStart = pt + (Vector2)(rot * (_infYangPath[0] + new Vector2(0.5f, 0)) * midLink.magnitude);
        for(int i = 1; i < _infYinPath.Length - 1; i++)
        {
            var yinNext = pt + (Vector2)(rot * (_infYinPath[i + 1] + new Vector2(-0.5f, 0)) * midLink.magnitude);
            Draw.Line(yinStart, yinNext, Color.cyan);
            yinStart = yinNext;

            var yangNext = pt + (Vector2)(rot * (_infYangPath[i + 1] + new Vector2(0.5f, 0)) * midLink.magnitude);
            Draw.Line(yangStart, yangNext, Color.cyan);
            yangStart = yangNext;
        }
    }

    private void DrawInfLink()
    {
        var spiral = Mathf.Approximately((float)_spiralCalculator.GetReal(), 0.5f) ? _spiralCalculator.GetZrs() : _spiralCalculator.GetEms();
        Vector2 midLink = spiral.joints[spiral.middleIndex + 1] - spiral.joints[spiral.middleIndex];
        Vector2 pt = spiral.joints[spiral.middleIndex] + midLink / 2f;
        Vector2 linkUp = new Vector2(-midLink.y, midLink.x).normalized;
        Quaternion rot = Quaternion.Euler(0, 0, Vector2.SignedAngle(Vector2.up, linkUp));
        
        var infLink = _spiralCalculator.GetInfLink();
        var yin = pt + (Vector2)(rot * infLink.Item1) * midLink.magnitude;
        var yang = pt + (Vector2)(rot * infLink.Item2) * midLink.magnitude;
        Draw.Line(yin, yang, Color.cyan);
    }
    #endregion

    #region Sub
    private void SubCalc()
    {
        _yinYangToggle.onValueChanged.AddListener((v) => SubIndexChanged(v));
        _yinYangLinkToggle.onValueChanged.AddListener((v) => SubYinYang(v));

        _yinYangSpecialToggle.onValueChanged.AddListener((v) => SubIndexChanged(v));
        _yinYangSpecialLinkToggle.onValueChanged.AddListener((v) => SubYinYangSpecial(v));
        _inverseSpecialToggle.onValueChanged.AddListener((v) => SubYinYangSpecial(v));

        _derivativeModeDropdown.onValueChanged.AddListener((v) =>
        {
            _derivativeMode = (YinYangCalculationMethod)v;
            if(_yinYangToggle) CalcYinYangPath(_derivativeMode);
        });

        _infToggle.onValueChanged.AddListener((v) => SubIndexChanged(v));
        _infLinkToggle.onValueChanged.AddListener((v) => SubInf(v));
    }

    private void SubIndexChanged(bool v)
    {
        if (v)
        {
            SpiralCalculator.IndexChanged += OnIndexChanged;
            SpiralCalculator.RealChanged += OnRealChanged;
            OnIndexChanged(_spiralCalculator.GetIndex());
            if(_yinYangToggle) CalcYinYangPath(_derivativeMode);
            if(_infToggle) CalcInfPath();
        }
        else
        {
            SpiralCalculator.IndexChanged -= OnIndexChanged;
            SpiralCalculator.RealChanged -= OnRealChanged;
        }
    }

    private void OnIndexChanged(double index)
    {
        var newIndex = (int)Math.Floor(index);
        if(newIndex != _yinYangPathIndex)
        {
            _yinYangPathIndex = newIndex;
            if(_yinYangToggle) CalcYinYangPath(_derivativeMode);
            if(_infToggle) CalcInfPath();
        }
    }

    private void OnRealChanged(double real)
    {
        if(_yinYangToggle) CalcYinYangPath(_derivativeMode);
    }

    private void SubYinYang(bool v)
    {
        if (v)
        {
            SpiralCalculator.UpdateYinYangSpecial += SubYinYangPoints;
        }
        else
        {
            SpiralCalculator.UpdateYinYangSpecial -= SubYinYangPoints;
        }
    }

    private void SubYinYangSpecial(bool v)
    {
        if (v)
        {
            SpiralCalculator.UpdateYinYangSpecial += SubYinYangSpecialPoints;
        }
        else
        {
            SpiralCalculator.UpdateYinYangSpecial -= SubYinYangSpecialPoints;
        }
    }

    private void SubYinYangSpecialPoints((Vector yin, Vector yang) tuple) {}
    private void SubYinYangPoints((Vector yin, Vector yang) tuple) {}

    private void SubInf(bool v)
    {
        if (v)
        {
            SpiralCalculator.UpdateInfLink += SubInfLink;
        }
        else
        {
            SpiralCalculator.UpdateInfLink -= SubInfLink;
        }
    }

    private void SubInfLink(Vector v1, Vector v2) {}
    #endregion

    #region Calc
    private void InitPaths()
    {
        for(int i = 0; i < _yinPath.Length; i++)
        {
            _yinPath[i] = Vector2.zero;
            _yangPath[i] = Vector2.zero;
            _yinSpecialPath[i] = Vector2.zero;
            _yangSpecialPath[i] = Vector2.zero;
        }
        for(int i = 0; i < _infYinPath.Length; i++)
        {
            _infYinPath[i] = Vector2.zero;
            _infYangPath[i] = Vector2.zero;
        }
    }

    private void CalcYinYangPath(YinYangCalculationMethod derivativeMode)
    {
        int n = _yinYangPathIndex;
        double first = (_yinYangPathIndex == 0) ? 0.0025f : _yinYangPathIndex + 0.00001;

        var yinSpecial = ZpsGeneral.YinSpecial(first);
        var yangSpecial = ZpsGeneral.YangSpecial(first);
        _yinSpecialPath[0] = yinSpecial;
        _yangSpecialPath[0] = yangSpecial;

        var real = _spiralCalculator.GetReal();
        var chi = SpiralCalculator.ChiBrian(new Complex(real, Zeta.IndexToImag(first)));
        var (yin, yang) = ZpsGeneral.YinYang(real, first, chi, yinSpecial, yangSpecial, derivativeMode);
        _yinPath[0] = yin;
        _yangPath[0] = yang;
        
        for(int i = 1; i < _yinPath.Length - 1; i++)
        {
            var indexFrac = _yinYangPathIndex + ((double)i)/_yangPath.Length;
            // avoid discontinuity at 0.25 and 0.75
            if(Mathf.Approximately((float)indexFrac, 0.25f) || Mathf.Approximately((float)indexFrac, 0.75f)) indexFrac += 0.00001f;

            yinSpecial = ZpsGeneral.YinSpecial(indexFrac);
            yangSpecial = ZpsGeneral.YangSpecial(indexFrac);
            _yinSpecialPath[i] = yinSpecial;
            _yangSpecialPath[i] = yangSpecial;

            chi = SpiralCalculator.ChiBrian(new Complex(real, Zeta.IndexToImag(indexFrac)));
            (yin, yang) = ZpsGeneral.YinYang(real, indexFrac, chi, yinSpecial, yangSpecial, derivativeMode);
            _yinPath[i] = yin;
            _yangPath[i] = yang;
        }
        double last = _yinYangPathIndex + 1 - 0.00001;

        yinSpecial = ZpsGeneral.YinSpecial(last);
        yangSpecial = ZpsGeneral.YangSpecial(last);
        _yinSpecialPath[_yinPath.Length - 1] = yinSpecial;
        _yangSpecialPath[_yangPath.Length - 1] = yangSpecial;

        chi = SpiralCalculator.ChiBrian(new Complex(real, Zeta.IndexToImag(last)));
        (yin, yang) = ZpsGeneral.YinYang(real, last, chi, yinSpecial, yangSpecial, derivativeMode);
        _yinPath[_yinPath.Length - 1] = yin;
        _yangPath[_yangPath.Length - 1] = yang;
    }

    private void CalcInfPath()
    {
        _infYinPath[0] = Zeta.InfinityTdrop(0, false);
        _infYinPath[_infYinPath.Length - 1] = _infYinPath[0];
        _infYangPath[0] = Zeta.InfinityTdrop(0, true);
        _infYangPath[_infYangPath.Length - 1] = _infYangPath[0];
        for(int i = 1; i < _infYinPath.Length - 1; i++)
        {
            var index = ((float)i)/_infYinPath.Length;
            // avoid discontinuity at 0.25 and 0.75
            if(Mathf.Approximately(index, 0.25f) || Mathf.Approximately(index, 0.75f)) index += 0.0001f;
            _infYinPath[i] = Zeta.InfinityTdrop(index, false);
            _infYangPath[i] = Zeta.InfinityTdrop(index, true);
        }
    }
    #endregion
}
