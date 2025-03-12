using System;
using System.Collections;
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

    [SerializeField] private Toggle _drawReticle;

    [SerializeField] private Toggle _drawOrigin;

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
    private CameraPositionTracking _cameraPositionTracking;
    private Coroutine _camTargetFade;
    private Color _camTargetColor = new Color(0, 1, 0, 0);


    void Awake()
    {
        _zrsToggle = GameObject.Find("Zrs Zeta Toggle").GetComponent<Toggle>();
        _zrsPos = GameObject.Find("Zrs Pos").GetComponent<TMP_Text>();
        _zpsToggle = GameObject.Find("Zps Zeta Toggle").GetComponent<Toggle>();
        _zpsPos = GameObject.Find("Zps Pos").GetComponent<TMP_Text>();
        _emsToggle = GameObject.Find("Ems Zeta Toggle").GetComponent<Toggle>();
        _emsPos = GameObject.Find("Ems Pos").GetComponent<TMP_Text>();

        _drawReticle = GameObject.Find("Draw Reticle Toggle").GetComponent<Toggle>();

        _traceToggle = GameObject.Find("Trace Zeta Toggle").GetComponent<Toggle>();
        _drawOrigin = GameObject.Find("Draw Origin Toggle").GetComponent<Toggle>();

        _spiralCalculator = GameObject.Find("Spiral Calculator").GetComponent<SpiralCalculator>();
        _cameraPositionTracking = Camera.main.GetComponent<CameraPositionTracking>();

        SubTargets();
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

        CameraPositionTracking.OnCameraTrackingChanged += FlashCamTarget;
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

        if(_drawReticle.isOn) DrawReticle();

        if(_drawOrigin.isOn) DrawOrigin();

        if(_camTargetColor.a > 0.05f) DrawCamTarget();
    }

    private void FlashCamTarget()
    {
        if(_camTargetFade != null) StopCoroutine(_camTargetFade);
        _camTargetFade = StartCoroutine(FlashCamPosition(0.5f));
    }
    private IEnumerator FlashCamPosition(float duration)
    {
        float elapsedTime = 0f;
        
        while (elapsedTime < duration)
        {
            float alpha = Mathf.Lerp(1f, 0f, elapsedTime / duration);
            _camTargetColor.a = alpha;
            elapsedTime += Time.deltaTime;
            yield return null;
        }
    }

    private void DrawCamTarget()
    {
        using (Draw.StyleScope)
        {
            Draw.Color = _camTargetColor;
            Draw.Thickness = 1f;
            var pos = (Vector2)_cameraPositionTracking.transform.position;
            float size = _cameraPositionTracking.GetZoomLevel() * 0.03f;
            Draw.Ring(pos, size * 2);
            ShapesUtils.DrawCross(pos, size);
        }
    }

    private void DrawOrigin()
    {
        using (Draw.StyleScope)
        {
            Draw.Color = _zrsColor;
            Draw.Thickness = 1f;
            Draw.Ring(Vector2.zero, 0.032f);
            ShapesUtils.DrawCross(Vector2.zero, 0.05f);
        }
    }

    private void DrawReticle()
    {
        double Psi(double x)
        {
            return Math.Cos(2 * Math.PI * (Math.Pow(x, 2) - x - 1.0 / 16)) / Math.Cos(2 * Math.PI * x);
        }
        
        double PsiThirdDerivative(double imag)
        {
            if (Math.Abs(imag) < 1e-15) return 0;

            double pi = Math.PI;
            double pi2 = pi * pi;
            double pi3 = pi2 * pi;

            // Precompute common values
            double cos2piImag = Math.Cos(2 * pi * imag);
            double sin2piImag = Math.Sin(2 * pi * imag);
            double cosPiExpr = Math.Cos(pi * (2 * Math.Pow(imag, 2) - 2 * imag - 1.0 / 8));
            double sinPiExpr = Math.Sin(pi * (2 * Math.Pow(imag, 2) - 2 * imag - 1.0 / 8));
            double sin2piImagSquared = Math.Pow(sin2piImag, 2);

            // Calculate terms using precomputed values
            double term1 = pi3 * Math.Pow(4 * imag - 2, 3) * sinPiExpr / cos2piImag;
            double term2 = -6 * pi3 * Math.Pow(4 * imag - 2, 2) * sin2piImag * cosPiExpr / Math.Pow(cos2piImag, 2);
            double term3 = -24 * pi3 * (4 * imag - 2) * sin2piImagSquared * sinPiExpr / Math.Pow(cos2piImag, 3);
            double term4 = -12 * pi3 * (4 * imag - 2) * sinPiExpr / cos2piImag;
            double term5 = -4 * pi2 * (4 * imag - 2) * cosPiExpr / cos2piImag;
            double term6 = -pi2 * (32 * imag - 16) * cosPiExpr / cos2piImag;
            double term7 = 48 * pi3 * Math.Pow(sin2piImag, 3) * cosPiExpr / Math.Pow(cos2piImag, 4);
            double term8 = -24 * pi2 * sin2piImag * sinPiExpr / Math.Pow(cos2piImag, 2);
            double term9 = 40 * pi3 * sin2piImag * cosPiExpr / Math.Pow(cos2piImag, 2);

            // Return the sum of terms
            return term1 + term2 + term3 + term4 + term5 + term6 + term7 + term8 + term9;
        }

        double Beta(double index)
        {
            int i = (int)Math.Ceiling(index);
            double imag = Zeta.IndexToImag(index, false);
            double theta = Theta(imag);

            return Math.Log(i) * imag - theta - Math.PI * (i * i - 1);
        }

        double Theta(double t)
        {

            return (t / 2 * Math.Log(t / (2 * Math.PI)) - t / 2 - Math.PI / 8 +
                    1 / (48 * t) +
                    7 / (5760 * Math.Pow(t, 3)) +
                    31 / (80640 * Math.Pow(t, 5)) +
                    127 / (430080 * Math.Pow(t, 7)) +
                    511 / (1216512 * Math.Pow(t, 9)));
        }

        int Square(double index)
        {
            return (int)(Math.Floor(Math.Sqrt(Zeta.IndexToImag(index, false) / (2 * Math.PI))) - Math.Floor(index));
        }

        double P(double imag)
        {
            double psqrt = Math.Sqrt(imag / (2 * Math.PI));
            return psqrt - Math.Floor(psqrt);
        }

        double C1(double imag)
        {
            return (-PsiThirdDerivative(P(imag)) /
                    (96 * Math.PI * Math.PI) *
                    Math.Pow(imag / (2 * Math.PI), -0.5));
        }
        double Djoint(double index)
        {
            double imag = Zeta.IndexToImag(index, false);
            double sq = (Math.Pow(-1, Square(index)) * Math.Sqrt(Math.Ceiling(index))) / (2 * Math.Cos(Beta(index)));
            double im = Math.Pow(imag / (2 * Math.PI), -0.25);
            double ps = Psi(P(imag)) + C1(imag);

            return Square(index) - (sq * im * ps);
        }

        var spiral = Mathf.Approximately((float)_spiralCalculator.GetReal(), 0.5f) ? _spiralCalculator.GetZrs() : _spiralCalculator.GetEms();
        Vector2 bisectorLink = spiral.joints[spiral.middleIndex + 1] - spiral.joints[spiral.middleIndex];
        
        Vector2 ratioPt = spiral.joints[spiral.middleIndex] + (float)Djoint(_spiralCalculator.GetIndex()) * bisectorLink;

        using (Draw.StyleScope)
        {
            Draw.Color = Color.cyan;
            Draw.Thickness = 1f;
            ShapesUtils.DrawCross45(ratioPt, 0.08f);
        }
    }

    private void DrawZetaTarget(Toggle toggle, TMP_Text posText, Complex pos, Vector2[] pathList, int pathIndex, Color color)
    {
        if (toggle.isOn)
        {
            DrawZ(pos.ToVector2(), color);
            posText.text = $"({pos.Real:F12}, {pos.Imaginary:F12})";

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
