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

    [SerializeField] private Color _zakColor;
    [SerializeField] private Toggle _zakToggle;
    [SerializeField] private TMP_Text _zakPos;

    [SerializeField] private Color _zpsColor;
    [SerializeField] private Toggle _zpsToggle;
    [SerializeField] private TMP_Text _zpsPos;
    [SerializeField] private Color _zetapsColor;
    [SerializeField] private Toggle _zetapsToggle;
    [SerializeField] private TMP_Text _zetapsPos;

    [SerializeField] private Color _emsColor;
    [SerializeField] private Toggle _emsToggle;
    [SerializeField] private TMP_Text _emsPos;
    [SerializeField] private Color _zemColor;
    [SerializeField] private Toggle _zemToggle;
    [SerializeField] private TMP_Text _zemPos;

    [SerializeField] private Color _etaColor;
    [SerializeField] private Toggle _etaToggle;
    [SerializeField] private TMP_Text _etaPos;

    [SerializeField] private Toggle _fwdBisectorToggle;
    [SerializeField] private Color _fwdBisectorColor;
    [SerializeField] private Toggle _invBisectorToggle;
    [SerializeField] private Color _invBisectorColor;

    [SerializeField] private Toggle _ravToggle;
    [SerializeField] private Color _ravColor;

    [SerializeField] private Toggle _drawOrigin;

    [Header("Trace Settings")]
    private const int _traceLength = 100;
    private const double _traceInterval = 0.0000000000001f;
    [SerializeField] private Toggle _traceToggle;
    private Vector2[] _zrsPath = new Vector2[_traceLength];
    private int _zrsPathIndex = 0;

    private Vector2[] _zakPath = new Vector2[_traceLength];
    private int _zakPathIndex = 0;

    private Vector2[] _zpsPath = new Vector2[_traceLength];
    private int _zpsPathIndex = 0;
    private Vector2[] _zetapsPath = new Vector2[_traceLength];
    private int _zetapsPathIndex = 0;
    private Vector2[] _emsPath = new Vector2[_traceLength];
    private int _emsPathIndex = 0;
    private Vector2[] _zemPath = new Vector2[_traceLength];
    private int _zemPathIndex = 0;
    private Vector2[] _etaPath = new Vector2[_traceLength];
    private int _etaPathIndex = 0;

    [SerializeField] private Toggle _midPointToggle;
    [SerializeField] private Toggle _r2MidPointToggle;
    private Vector2[] _midPointPath = new Vector2[_traceLength];
    private int _midPointIndex = 0;

    private SpiralCalculator _spiralCalculator;
    private CameraPositionTracking _cameraPositionTracking;
    private Coroutine _camTargetFade;
    private Color _camTargetColor = new Color(0, 1, 0, 0);


    void Awake()
    {
        _zrsToggle = GameObject.Find("Zrs Zeta Toggle").GetComponent<Toggle>();
        _zrsPos = GameObject.Find("Zrs Pos").GetComponent<TMP_Text>();

        _zakToggle = GameObject.Find("Zak Zeta Toggle").GetComponent<Toggle>();
        _zakPos = GameObject.Find("Zak Pos").GetComponent<TMP_Text>();

        _zpsToggle = GameObject.Find("Zps 1/2 Toggle").GetComponent<Toggle>();
        _zpsPos = GameObject.Find("Zps Pos").GetComponent<TMP_Text>();
        _zetapsToggle = GameObject.Find("Zeta ps Toggle").GetComponent<Toggle>();
        _zetapsPos = GameObject.Find("Zeta ps Pos").GetComponent<TMP_Text>();

        _emsToggle = GameObject.Find("Ems Zeta Toggle").GetComponent<Toggle>();
        _emsPos = GameObject.Find("Ems Pos").GetComponent<TMP_Text>();
        _zemToggle = GameObject.Find("Zem3 Toggle").GetComponent<Toggle>();
        _zemPos = GameObject.Find("Zem3 Pos").GetComponent<TMP_Text>();

        _etaToggle = GameObject.Find("Eta Zeta Toggle").GetComponent<Toggle>();
        _etaPos = GameObject.Find("Eta Pos").GetComponent<TMP_Text>();

        _midPointToggle = GameObject.Find("Mid Point Toggle").GetComponent<Toggle>();
        _r2MidPointToggle = GameObject.Find("R2 Mid Point Toggle").GetComponent<Toggle>();

        _fwdBisectorToggle = GameObject.Find("Fwd Bisector Target Toggle").GetComponent<Toggle>();

        _invBisectorToggle = GameObject.Find("Inv Bisector Target Toggle").GetComponent<Toggle>();


        _ravToggle = GameObject.Find("Rav Zps Toggle").GetComponent<Toggle>();

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

        _zakToggle.onValueChanged.AddListener((bool value) => 
        { 
            if(value) SpiralCalculator.UpdateZakLinks += UpdateZak;
            else SpiralCalculator.UpdateZakLinks -= UpdateZak; 
        });

        _zpsToggle.onValueChanged.AddListener((bool value) => 
        { 
            if(value) SpiralCalculator.UpdateZps += UpdateZps;
            else SpiralCalculator.UpdateZps -= UpdateZps; 
        });
        _zetapsToggle.onValueChanged.AddListener((bool value) => 
        { 
            if(value) SpiralCalculator.UpdateZetaPS += UpdateZetaPS;
            else SpiralCalculator.UpdateZetaPS -= UpdateZetaPS;
        });

        _emsToggle.onValueChanged.AddListener((bool value) => 
        { 
            if(value) SpiralCalculator.UpdateEms += UpdateEms;
            else SpiralCalculator.UpdateEms -= UpdateEms; 
        });
        _zemToggle.onValueChanged.AddListener((bool value) => 
        { 
            if(value) SpiralCalculator.UpdateZem += UpdateZem;
            else SpiralCalculator.UpdateZem -= UpdateZem;
        });

        _etaToggle.onValueChanged.AddListener((bool value) => 
        { 
            if(value) SpiralCalculator.UpdateEta += UpdateEta;
            else SpiralCalculator.UpdateEta -= UpdateEta; 
        });

        _midPointToggle.onValueChanged.AddListener((bool value) => 
        { 
            if(value) SpiralCalculator.UpdateMidPoint += UpdateMidPoint;
            else SpiralCalculator.UpdateMidPoint -= UpdateMidPoint; 
        });

        _r2MidPointToggle.onValueChanged.AddListener((bool value) => 
        { 
            if(value) SpiralCalculator.UpdateMidPoint += UpdateMidPoint;
            else SpiralCalculator.UpdateMidPoint -= UpdateMidPoint; 
        });

        _fwdBisectorToggle.onValueChanged.AddListener((bool value) => 
        { 
            if(value) SpiralCalculator.UpdateForwardBisector += UpdateFwdBisectorTarget;
            else SpiralCalculator.UpdateForwardBisector -= UpdateFwdBisectorTarget; 
        });

        _invBisectorToggle.onValueChanged.AddListener((bool value) => 
        { 
            if(value) SpiralCalculator.UpdateInverseBisector += UpdateInverseBisector;
            else SpiralCalculator.UpdateInverseBisector -= UpdateInverseBisector; 
        });

        _ravToggle.onValueChanged.AddListener((bool value) => 
        { 
            if(value) SpiralCalculator.UpdateRAV += UpdateRAV;
            else SpiralCalculator.UpdateRAV -= UpdateRAV; 
        });

        CameraPositionTracking.OnCameraTrackingChanged += FlashCamTarget;
    }

    private void UpdateZrs(Zeta.Spiral zrs)
    {
        UpdateTargetPos(zrs.zeta.ToVector2(), ref _zrsPath, ref _zrsPathIndex);
    }

    private void UpdateZak(Vector[] zakLinks)
    {
        var zak = _spiralCalculator.GetZakLinks();
        var lastZak = zak[zak.Length - 1].ToComplex();
        UpdateTargetPos(lastZak.ToVector2(), ref _zakPath, ref _zakPathIndex);
    }

    private void UpdateZps(Vector zps)
    {
        UpdateTargetPos(zps, ref _zpsPath, ref _zpsPathIndex);
    }

    private void UpdateZetaPS(Vector zetaPS)
    {
        UpdateTargetPos(zetaPS, ref _zetapsPath, ref _zetapsPathIndex);
    }

    private void UpdateEms(Zeta.Spiral ems)
    {
        UpdateTargetPos(ems.zeta.ToVector2(), ref _emsPath, ref _emsPathIndex);
    }

    private void UpdateZem(Vector zem) 
    {
        UpdateTargetPos(zem, ref _zemPath, ref _zemPathIndex);
    }

    private void UpdateEta(Zeta.Spiral eta)
    {
        UpdateTargetPos(eta.zeta.ToVector2(), ref _etaPath, ref _etaPathIndex);
    }
    
    private void UpdateMidPoint(Vector midPoint)
    {
        UpdateTargetPos(midPoint, ref _midPointPath, ref _midPointIndex);
    }

    private void UpdateFwdBisectorTarget(Vector fwdBisector) { }

    private void UpdateInverseBisector(Vector invBisector) { }

    private void UpdateRAV(Vector rav) { }

    private void DrawTargets()
    {
        DrawZetaTarget(_zrsToggle, _zrsPos, _spiralCalculator.GetZrs().zeta, _zrsPath, _zrsPathIndex, _zrsColor);

        var zak = _spiralCalculator.GetZakLinks();
        var lastZak = zak[zak.Length - 1].ToComplex();
        DrawZetaTarget(_zakToggle, _zakPos, lastZak, _zakPath, _zakPathIndex, _zakColor);

        DrawZetaTarget(_zpsToggle, _zpsPos, _spiralCalculator.GetZps(), _zpsPath, _zpsPathIndex, _zpsColor);
        DrawZetaTarget(_zetapsToggle, _zetapsPos, _spiralCalculator.GetZetaPS(), _zetapsPath, _zetapsPathIndex, _zetapsColor);
        DrawZetaTarget(_emsToggle, _emsPos, _spiralCalculator.GetEms().zeta, _emsPath, _emsPathIndex, _emsColor);
        DrawZetaTarget(_zemToggle, _zemPos, _spiralCalculator.GetZem(), _zemPath, _zemPathIndex, _zemColor);
        DrawZetaTarget(_etaToggle, _etaPos, _spiralCalculator.GetEta().zeta, _etaPath, _etaPathIndex, _etaColor);

        if (_fwdBisectorToggle.isOn) DrawBisectorTarget(_spiralCalculator.GetForwardBisector(), _fwdBisectorColor);
        if (_invBisectorToggle.isOn) DrawBisectorTarget(_spiralCalculator.GetInverseBisector(), _invBisectorColor);

        if (_ravToggle.isOn) DrawRav();

        if (_midPointToggle.isOn) DrawMiddlePoint();
        if (_r2MidPointToggle.isOn) DrawMiddlePoint(true);

        if (_drawOrigin.isOn) DrawOrigin();

        if (_camTargetColor.a > 0.05f) DrawCamTarget();

        // DrawRemainderToForwardBisectorLine();
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

    private void DrawBisectorTarget(Vector2 bisector, Color color)
    {
        using (Draw.StyleScope)
        {
            Draw.Color = color;
            Draw.Thickness = 1f;
            ShapesUtils.DrawCross45(bisector, 0.08f);
        }
    }

    private void DrawRav()
    {
        using (Draw.StyleScope)
        {
            Draw.Color = _ravColor;
            Draw.Thickness = 1f;
            ShapesUtils.DrawCross45(_spiralCalculator.GetRAV(), 0.08f);
        }
    }

    private void DrawRemainderToForwardBisectorLine()
    {
        using (Draw.StyleScope)
        {
            Draw.Color = _zakColor;
            Draw.Thickness = 1f;
            var Bf = _spiralCalculator.GetForwardBisector();
            var Br = _spiralCalculator.GetRemainderForwardBisector();
            var Bi = _spiralCalculator.GetInverseBisector();
            var FtR = (Br - Bf).Normalized();

            var Bri = _spiralCalculator.GetRemainderInverseBisector();
            var ItR = (Bri - Bi).Normalized();

            var rtr = (Br - Bri).Length / 2;

            Draw.Line(Br + FtR * rtr, Br - FtR * rtr);
            Draw.Line(Bri + ItR * rtr, Bri - ItR * rtr);
        }
    }

    private void DrawMiddlePoint(bool useR2 = false)
    {
        using (Draw.StyleScope)
        {
            Draw.Color = useR2 ? _zrsColor : _zpsColor;
            Draw.Thickness = 1f;
            var Bf = useR2 ? _spiralCalculator.GetRemainderForwardBisector() : _spiralCalculator.GetForwardBisector();
            var Bi = useR2 ? _spiralCalculator.GetRemainderInverseBisector() : _spiralCalculator.GetInverseBisector();
            var Zps = Bf + Bi;
            var midPoint = _spiralCalculator.GetMidPoint();
            Draw.Ring(midPoint, 0.02f);
            ShapesUtils.DrawCross(midPoint, 0.03f);

            Draw.UseDashes = true;
            Draw.Line(Bf, Bi);
            Draw.Line(Vector2.zero, Zps);
        }

        if (_traceToggle.isOn)
        {
            DrawPath(_midPointPath, _midPointIndex, _zrsColor);
        }
    }

    private void DrawZetaTarget(Toggle toggle, TMP_Text posText, Complex pos, Vector2[] pathList, int pathIndex, Color color)
    {
        if (toggle.isOn)
        {
            DrawZ(pos.ToVector2(), color);

            if (posText != null) posText.text = $"({pos.Real:F6}, {pos.Imaginary:F6})";

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

    private void UpdateTargetPos(Vector2 pos, ref Vector2[] targetPath, ref int targetPathIndex)
    {
        UpdatePath(ref targetPath, ref targetPathIndex, pos);
    }

    private void UpdatePath(ref Vector2[] path, ref int pathIndex, Vector2 pos)
    {
        var prevIndex = (pathIndex - 1 + _traceLength) % _traceLength;
        if(Math.Abs(path[prevIndex].magnitude - pos.magnitude) > _traceInterval)
        {
            pathIndex = (pathIndex + 1) % _traceLength;
        }
        path[pathIndex] = pos;
    }
}
