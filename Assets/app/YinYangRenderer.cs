using System;
using Shapes;
using UnityEditor.UIElements;
using UnityEngine;
using UnityEngine.UI;

public class YinYangRenderer : ImmediateModeShapeDrawer
{
    [SerializeField] private Toggle _yinYangToggle;
    [SerializeField] private Toggle _yinYangLinkToggle;
    [SerializeField] private Toggle _inverseToggle;
    private int _yinYangPathIndex = 0;
    private Vector2[] _yinPath = new Vector2[200];
    private Vector2[] _yangPath = new Vector2[200];

    [SerializeField] private Toggle _infToggle;
    [SerializeField] private Toggle _infLinkToggle;
    private Vector2[] _infYinPath = new Vector2[200];
    private Vector2[] _infYangPath = new Vector2[200];

    [SerializeField] private SpiralCalculator _spiralCalculator;

    void Awake()
    {
        _yinYangToggle = GameObject.Find("YinYang Toggle").GetComponent<Toggle>();
        _yinYangLinkToggle = GameObject.Find("YinYang Link Toggle").GetComponent<Toggle>();
        _inverseToggle = GameObject.Find("Inverse YinYang Toggle").GetComponent<Toggle>();

        _infToggle = GameObject.Find("INF YinYang Toggle").GetComponent<Toggle>();
        _infLinkToggle = GameObject.Find("INF Bisector Link Toggle").GetComponent<Toggle>();

        _spiralCalculator = GameObject.Find("Spiral Calculator").GetComponent<SpiralCalculator>();

        InitPaths();
        SubCalc();
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

            if(_yinYangToggle.isOn) DrawYinYang();
            if(_yinYangLinkToggle.isOn) DrawYinYangLink();
            if(_inverseToggle.isOn) DrawInverseYinYang();

            if(_infToggle.isOn) DrawInf();
            if(_infLinkToggle.isOn) DrawInfLink();
        }
    }

    private void DrawYinYang()
    {
        var spiral = Mathf.Approximately((float)_spiralCalculator.GetReal(), 0.5f) ? _spiralCalculator.GetZrs() : _spiralCalculator.GetEms();
        Vector2 midLink = spiral.joints[spiral.middleIndex + 1] - spiral.joints[spiral.middleIndex];
        Vector2 pt = spiral.joints[spiral.middleIndex] + midLink / 2f;
        Vector2 linkUp = new Vector2(-midLink.y, midLink.x).normalized;
        Quaternion rot = Quaternion.Euler(0, 0, Vector2.SignedAngle(Vector2.up, linkUp));

        var yinStart = pt + (Vector2)(rot * _yinPath[0]) * midLink.magnitude;
        var yangStart = pt + (Vector2)(rot * _yangPath[0]) * midLink.magnitude;
        for(int i = 1; i < _yinPath.Length - 1; i++)
        {
            var yinNext = pt + (Vector2)(rot * _yinPath[i + 1]) * midLink.magnitude;
            Draw.Line(yinStart, yinNext, Color.red);
            yinStart = yinNext;

            var yangNext = pt + (Vector2)(rot * _yangPath[i + 1]) * midLink.magnitude;
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

        var yin = pt + (Vector2)(rot * _spiralCalculator.GetYin()) * midLink.magnitude;
        var yang = pt + (Vector2)(rot * _spiralCalculator.GetYang()) * midLink.magnitude;
        Draw.Line(yin, yang, Color.magenta);
    }

    private void DrawInverseYinYang()
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
        _inverseToggle.onValueChanged.AddListener((v) => SubYinYang(v));

        _infToggle.onValueChanged.AddListener((v) => SubIndexChanged(v));
        _infLinkToggle.onValueChanged.AddListener((v) => SubInf(v));
    }

    private void SubIndexChanged(bool v)
    {
        if (v)
        {
            SpiralCalculator.IndexChanged += OnIndexChanged;
            OnIndexChanged(_spiralCalculator.GetIndex());
            if(_yinYangToggle) CalcYinYangPath();
            if(_infToggle) CalcInfPath();
        }
        else
        {
            SpiralCalculator.IndexChanged -= OnIndexChanged;
        }
    }

    private void OnIndexChanged(double index)
    {
        var newIndex = (int)Math.Floor(index);
        if(newIndex != _yinYangPathIndex)
        {
            _yinYangPathIndex = newIndex;
            if(_yinYangToggle) CalcYinYangPath();
            if(_infToggle) CalcInfPath();
        }
    }

    private void SubYinYang(bool v)
    {
        if (v)
        {
            SpiralCalculator.UpdateYin += SubYin;
            SpiralCalculator.UpdateYang += SubYang;
        }
        else
        {
            SpiralCalculator.UpdateYin -= SubYin;
            SpiralCalculator.UpdateYang -= SubYang;
        }
    }

    private void SubYin(Vector v) {}
    private void SubYang(Vector v) {}

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
        }
        for(int i = 0; i < _infYinPath.Length; i++)
        {
            _infYinPath[i] = Vector2.zero;
            _infYangPath[i] = Vector2.zero;
        }
    }

    private void CalcYinYangPath()
    {
        double first = (_yinYangPathIndex == 0) ? 0.0025f : _yinYangPathIndex + 0.00001;
        _yinPath[0] = MiddleLinkTeardrop.Yin(first);
        _yangPath[0] = MiddleLinkTeardrop.Yang(first);
        for(int i = 1; i < _yinPath.Length - 1; i++)
        {
            var index = _yinYangPathIndex + ((double)i)/_yangPath.Length;
            // avoid discontinuity at 0.25 and 0.75
            if(Mathf.Approximately((float)index, 0.25f) || Mathf.Approximately((float)index, 0.75f)) index += 0.00001f;
            _yinPath[i] = MiddleLinkTeardrop.Yin(index);
            _yangPath[i] = MiddleLinkTeardrop.Yang(index);
        }
        double last = _yinYangPathIndex + 1 - 0.00001;
        _yinPath[_yinPath.Length - 1] = MiddleLinkTeardrop.Yin(last);
        _yangPath[_yangPath.Length - 1] = MiddleLinkTeardrop.Yang(last);
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
