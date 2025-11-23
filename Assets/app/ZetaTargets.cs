using System;
using System.Collections;
using System.Collections.Generic;
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
    [SerializeField] private MultiOptionToggle _zrsIndexPathToggle;
    [SerializeField] private TMP_Text _zrsPos;
    private List<Vector2> _zrsIndexPath = new List<Vector2>();

    [SerializeField] private Color _zakColor;
    [SerializeField] private Toggle _zakToggle;
    [SerializeField] private MultiOptionToggle _zakSigmaPathToggle;
    [SerializeField] private MultiOptionToggle _zakIndexPathToggle;
    [SerializeField] private TMP_Text _zakPos;
    private List<Vector2> _zakSigmaPath = new List<Vector2>();
    private List<Vector2> _zakIndexPath = new List<Vector2>();

    [SerializeField] private Color _zpsColor;
    [SerializeField] private Toggle _zpsToggle;
    [SerializeField] private MultiOptionToggle _zpsIndexPathToggle;
    [SerializeField] private TMP_Text _zpsPos;
    private List<Vector2> _zpsIndexPath = new List<Vector2>();

    [SerializeField] private Color _zetapsColor;
    [SerializeField] private Toggle _zetapsToggle;
    [SerializeField] private MultiOptionToggle _zetapsSigmaPathToggle;
    [SerializeField] private MultiOptionToggle _zetapsIndexPathToggle;
    [SerializeField] private TMP_Text _zetapsPos;
    private List<Vector2> _zetapsSigmaPath = new List<Vector2>();
    private List<Vector2> _zetapsIndexPath = new List<Vector2>();

    [SerializeField] private Color _emsColor;
    [SerializeField] private Toggle _emsToggle;
    [SerializeField] private MultiOptionToggle _emsSigmaPathToggle;
    [SerializeField] private MultiOptionToggle _emsIndexPathToggle;
    [SerializeField] private TMP_Text _emsPos;
    private List<Vector2> _emsSigmaPath = new List<Vector2>();
    private List<Vector2> _emsIndexPath = new List<Vector2>();

    [SerializeField] private Color _etaColor;
    [SerializeField] private Toggle _etaToggle;
    // [SerializeField] private MultiOptionToggle _etaSigmaPathToggle;
    // [SerializeField] private MultiOptionToggle _etaIndexPathToggle;
    [SerializeField] private TMP_Text _etaPos;
    // private List<Vector2> _etaSigmaPath = new List<Vector2>();
    // private List<Vector2> _etaIndexPath = new List<Vector2>();

    [SerializeField] private Toggle _sum1Toggle;
    [SerializeField] private MultiOptionToggle _sum1SigmaPathToggle;
    [SerializeField] private MultiOptionToggle _sum1IndexPathToggle;
    [SerializeField] private Color _sum1Color;
    private List<Vector2> _sum1SigmaPath = new List<Vector2>();
    private List<Vector2> _sum1IndexPath = new List<Vector2>();

    [SerializeField] private Toggle _ravToggle;
    [SerializeField] private MultiOptionToggle _ravIndexPathToggle;
    [SerializeField] private Color _ravColor;
    private List<Vector2> _ravIndexPath = new List<Vector2>();

    [SerializeField] private Toggle _midPointToggle;
    [SerializeField] private MultiOptionToggle _midPointSigmaPathToggle;
    [SerializeField] private MultiOptionToggle _midPointIndexPathToggle;
    [SerializeField] private Color _midPointColor;
    private List<Vector2> _midPointSigmaPath = new List<Vector2>();
    private List<Vector2> _midPointIndexPath = new List<Vector2>();

    [SerializeField] private Toggle _drawOrigin;

    [SerializeField] private Button _clearAllButton;

    private SpiralCalculator _spiralCalculator;
    private CameraPositionTracking _cameraPositionTracking;
    private Coroutine _camTargetFade;
    private Color _camTargetColor = new Color(0, 1, 0, 0);


    void Awake()
    {
        _zrsToggle = GameObject.Find("Zrs Zeta Toggle").GetComponent<Toggle>();
        _zrsIndexPathToggle = GameObject.Find("ZrsIndexPathToggle").GetComponent<MultiOptionToggle>();
        _zrsIndexPathToggle.OnOptionChanged += (option) =>
        {
            UpdateIndexPath(ref _zrsIndexPath, option, CalcZrsPoint);
        };
        _zrsPos = GameObject.Find("Zrs Pos").GetComponent<TMP_Text>();

        _zakToggle = GameObject.Find("Zak Zeta Toggle").GetComponent<Toggle>();
        _zakSigmaPathToggle = GameObject.Find("ZakSigmaPathToggle").GetComponent<MultiOptionToggle>();
        _zakSigmaPathToggle.OnOptionChanged += (option) =>
        {
            UpdateSigmaPath(ref _zakSigmaPath, option, CalcZakPoint);
        };
        _zakIndexPathToggle = GameObject.Find("ZakIndexPathToggle").GetComponent<MultiOptionToggle>();
        _zakIndexPathToggle.OnOptionChanged += (option) =>
        {
            UpdateIndexPath(ref _zakIndexPath, option, CalcZakPoint);
        };
        _zakPos = GameObject.Find("Zak Pos").GetComponent<TMP_Text>();

        _zpsToggle = GameObject.Find("Zps 1/2 Toggle").GetComponent<Toggle>();
        _zpsIndexPathToggle = GameObject.Find("ZpsIndexPathToggle").GetComponent<MultiOptionToggle>();
        _zpsIndexPathToggle.OnOptionChanged += (option) =>
        {
            UpdateIndexPath(ref _zpsIndexPath, option, CalcZpsPoint);
        };
        _zpsPos = GameObject.Find("Zps Pos").GetComponent<TMP_Text>();

        _zetapsToggle = GameObject.Find("Zeta ps Toggle").GetComponent<Toggle>();
        _zetapsSigmaPathToggle = GameObject.Find("ZetapsSigmaPathToggle").GetComponent<MultiOptionToggle>();
        _zetapsSigmaPathToggle.OnOptionChanged += (option) =>
        {
            UpdateSigmaPath(ref _zetapsSigmaPath, option, CalcZetapsPoint);
        };
        _zetapsIndexPathToggle = GameObject.Find("ZetapsIndexPathToggle").GetComponent<MultiOptionToggle>();
        _zetapsIndexPathToggle.OnOptionChanged += (option) =>
        {
            UpdateIndexPath(ref _zetapsIndexPath, option, CalcZetapsPoint);
        };
        _zetapsPos = GameObject.Find("Zeta ps Pos").GetComponent<TMP_Text>();

        _emsToggle = GameObject.Find("Ems Zeta Toggle").GetComponent<Toggle>();
        _emsSigmaPathToggle = GameObject.Find("EmsSigmaPathToggle").GetComponent<MultiOptionToggle>();
        _emsSigmaPathToggle.OnOptionChanged += (option) =>
        {
            UpdateSigmaPath(ref _emsSigmaPath, option, CalcEmsPoint);
        };
        _emsIndexPathToggle = GameObject.Find("EmsIndexPathToggle").GetComponent<MultiOptionToggle>();
        _emsIndexPathToggle.OnOptionChanged += (option) =>
        {
            UpdateIndexPath(ref _emsIndexPath, option, CalcEmsPoint);
        };
        _emsPos = GameObject.Find("Ems Pos").GetComponent<TMP_Text>();

        _etaToggle = GameObject.Find("Eta Zeta Toggle").GetComponent<Toggle>();
        // _etaSigmaPathToggle = GameObject.Find("EtaSigmaPathToggle").GetComponent<MultiOptionToggle>();
        // _etaSigmaPathToggle.OnOptionChanged += (option) =>
        // {
        //     UpdateSigmaPath(ref _etaSigmaPath, option, CalcEtaPoint);
        // };
        // _etaIndexPathToggle = GameObject.Find("EtaIndexPathToggle").GetComponent<MultiOptionToggle>();
        // _etaIndexPathToggle.OnOptionChanged += (option) =>
        // {
        //     UpdateIndexPath(ref _etaIndexPath, option, CalcEtaPoint);
        // };
        _etaPos = GameObject.Find("Eta Pos").GetComponent<TMP_Text>();

        _midPointToggle = GameObject.Find("Mid Point Toggle").GetComponent<Toggle>();
        _midPointIndexPathToggle = GameObject.Find("MidIndexPathToggle").GetComponent<MultiOptionToggle>();
        _midPointIndexPathToggle.OnOptionChanged += (option) =>
        {
            UpdateIndexPath(ref _midPointIndexPath, option, CalcMidPoint);
        };
        _midPointSigmaPathToggle = GameObject.Find("MidSigmaPathToggle").GetComponent<MultiOptionToggle>();
        _midPointSigmaPathToggle.OnOptionChanged += (option) =>
        {
            UpdateSigmaPath(ref _midPointSigmaPath, option, CalcMidPoint);
        };

        _sum1Toggle = GameObject.Find("Sum1 Target Toggle").GetComponent<Toggle>();
        _sum1SigmaPathToggle = GameObject.Find("Sum1SigmaPathToggle").GetComponent<MultiOptionToggle>();
        _sum1SigmaPathToggle.OnOptionChanged += (option) =>
        {
            UpdateSigmaPath(ref _sum1SigmaPath, option, CalcSum1Point);
        };
        _sum1IndexPathToggle = GameObject.Find("Sum1IndexPathToggle").GetComponent<MultiOptionToggle>();
        _sum1IndexPathToggle.OnOptionChanged += (option) =>
        {
            UpdateIndexPath(ref _sum1IndexPath, option, CalcSum1Point);
        };

        _ravToggle = GameObject.Find("Rav Zps Toggle").GetComponent<Toggle>();
        _ravIndexPathToggle = GameObject.Find("RavIndexPathToggle").GetComponent<MultiOptionToggle>();
        _ravIndexPathToggle.OnOptionChanged += (option) =>
        {
            UpdateIndexPath(ref _ravIndexPath, option, CalcRavPoint);
        };

        _drawOrigin = GameObject.Find("Draw Origin Toggle").GetComponent<Toggle>();

        _spiralCalculator = GameObject.Find("Spiral Calculator").GetComponent<SpiralCalculator>();
        SpiralCalculator.IndexChanged += OnIndexChanged;
        SpiralCalculator.RealChanged += OnSigmaChanged;

        InitAllOff();

        _cameraPositionTracking = Camera.main.GetComponent<CameraPositionTracking>();
        CameraPositionTracking.OnCameraTrackingChanged += FlashCamTarget;
    }

    private void InitAllOff()
    {
        _clearAllButton = GameObject.Find("ZetaTargetsClearAllButton").GetComponent<Button>();
        _clearAllButton.onClick.AddListener(() =>
        {
            _zrsToggle.isOn = false;
            _zakToggle.isOn = false;
            _zpsToggle.isOn = false;
            _etaToggle.isOn = false;
            _emsToggle.isOn = false;
            _zetapsToggle.isOn = false;
            _sum1Toggle.isOn = false;
            _ravToggle.isOn = false;
            _midPointToggle.isOn = false;
            _drawOrigin.isOn = false;

            _zrsIndexPathToggle.SetSelectedOption(0);
            _zakSigmaPathToggle.SetSelectedOption(0);
            _zakIndexPathToggle.SetSelectedOption(0);
            _zpsIndexPathToggle.SetSelectedOption(0);
            _zetapsSigmaPathToggle.SetSelectedOption(0);
            _zetapsIndexPathToggle.SetSelectedOption(0);
            _emsSigmaPathToggle.SetSelectedOption(0);
            _emsIndexPathToggle.SetSelectedOption(0);
            // _etaSigmaPathToggle.SetSelectedOption(0);
            // _etaIndexPathToggle.SetSelectedOption(0);
            _sum1SigmaPathToggle.SetSelectedOption(0);
            _sum1IndexPathToggle.SetSelectedOption(0);
            _ravIndexPathToggle.SetSelectedOption(0);
            _midPointSigmaPathToggle.SetSelectedOption(0);
            _midPointIndexPathToggle.SetSelectedOption(0);
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

            DrawTargets();
        }
    }


    #region Path Helpers
    private void OnIndexChanged(double index)
    {
        ValidateAllPaths();
    }

    private void OnSigmaChanged(double sigma)
    {
        ValidateAllPaths();
    }
    
    private void ValidateAllPaths()
    {
        UpdateIndexPath(ref _zrsIndexPath, _zrsIndexPathToggle.GetSelectedOption().Item1, CalcZrsPoint);
        UpdateSigmaPath(ref _zakSigmaPath, _zakSigmaPathToggle.GetSelectedOption().Item1, CalcZakPoint);
        UpdateIndexPath(ref _zakIndexPath, _zakIndexPathToggle.GetSelectedOption().Item1, CalcZakPoint);
        UpdateIndexPath(ref _zpsIndexPath, _zpsIndexPathToggle.GetSelectedOption().Item1, CalcZpsPoint);
        UpdateSigmaPath(ref _zetapsSigmaPath, _zetapsSigmaPathToggle.GetSelectedOption().Item1, CalcZetapsPoint);
        UpdateIndexPath(ref _zetapsIndexPath, _zetapsIndexPathToggle.GetSelectedOption().Item1, CalcZetapsPoint);
        UpdateSigmaPath(ref _emsSigmaPath, _emsSigmaPathToggle.GetSelectedOption().Item1, CalcEmsPoint);
        UpdateIndexPath(ref _emsIndexPath, _emsIndexPathToggle.GetSelectedOption().Item1, CalcEmsPoint);
        // UpdateSigmaPath(ref _etaSigmaPath, _etaSigmaPathToggle.GetSelectedOption().Item1, CalcEtaPoint);
        // UpdateIndexPath(ref _etaIndexPath, _etaIndexPathToggle.GetSelectedOption().Item1, CalcEtaPoint);
        UpdateSigmaPath(ref _sum1SigmaPath, _sum1SigmaPathToggle.GetSelectedOption().Item1, CalcSum1Point);
        UpdateIndexPath(ref _sum1IndexPath, _sum1IndexPathToggle.GetSelectedOption().Item1, CalcSum1Point);
        UpdateSigmaPath(ref _midPointSigmaPath, _midPointSigmaPathToggle.GetSelectedOption().Item1, CalcMidPoint);
        UpdateIndexPath(ref _midPointIndexPath, _midPointIndexPathToggle.GetSelectedOption().Item1, CalcMidPoint);
        UpdateIndexPath(ref _ravIndexPath, _ravIndexPathToggle.GetSelectedOption().Item1, CalcRavPoint);
    }

    private void UpdateSigmaPath(ref List<Vector2> path, int option, Func<double, double, Vector2> pointFunc)
    {
        if (option == 0) return;
        path.Clear();

        double index = _spiralCalculator.GetIndex();

        int minSigma = 0;
        switch (option)
        {
            case 1: minSigma = 0; break;
            case 2: minSigma = -5; break;
        }
        for (int i = minSigma; i <= 10; i++)
        {
            var scaler = Math.Max(i, 0);
            var ptCount = 100 / (scaler + 1);
            for (int j = 0; j <= ptCount; j++)
            {
                var r = i + (float)j / ptCount;
                Vector2 idx = pointFunc(r, index);
                path.Add(idx);
            }
        }
    }
    
    private void UpdateIndexPath(ref List<Vector2> path, int option, Func<double, double, Vector2> pointFunc)
    {
        if (option == 0) return;
        path.Clear();

        double index = _spiralCalculator.GetIndex();
        double sigma = _spiralCalculator.GetReal();

        float pathRange;
        switch (option)
        {
            // case 1: pathRange = 0.001f; break;
            case 1: pathRange = 0.01f; break;
            case 2: pathRange = 0.1f; break;
            case 3: pathRange = 0.5f; break;
            default: pathRange = 0f; break;
        }
        pathRange /= (float)(index * 2.0);
        int steps = 50 * option * (int)index; // more steps for larger paths
        for (int s = 0; s <= steps; s++)
        {
            double idx = index - pathRange + 2 * pathRange * s / steps;
            Vector2 r = pointFunc(sigma, idx);
            path.Add(r);
        }
    }

    private Vector2 CalcZrsPoint(double sigma, double index)
    {
        return Zeta.ReimannSiegel(new Complex(0.5, Zeta.IndexToImag(index))).ToVector2();
    }

    private Vector2 CalcZpsPoint(double sigma, double index)
    {
        return BisectorPoint.GetZPS(index).ToVector2();
    }

    private Vector2 CalcRavPoint(double sigma, double index)
    {
        return BisectorPoint.RightAngleVertex(BisectorPoint.BpOneHalf(index), index);
    }

    // private Vector2 CalcEtaPoint(double sigma, double index)
    // {
    //     return Zeta.EtaFormula(new Complex(sigma, Zeta.IndexToImag(index))).ToVector2();
    // }
    
    private Vector2 CalcEmsPoint(double sigma, double index)
    {
        return Zeta.EulerMaclauren(new Complex(sigma, Zeta.IndexToImag(index))).ToVector2();
    }

    private Vector2 CalcZetapsPoint(double sigma, double index)
    {
        var v = ZpsGeneral.ForwardBisector(sigma, index) + ZpsGeneral.InverseBisector(sigma, index);
        return v.ToVector2();
    }

    private Vector2 CalcZakPoint(double sigma, double index)
    {
        var links = ZakCalculator.CalcZakLinks(sigma, index);
        return links[links.Length - 1];
    }

    private Vector2 CalcSum1Point(double sigma, double index)
    {
        return SumRemainders.CalcForwardSumUpToBisector(sigma, index).ToVector2();
    }

    private Vector2 CalcMidPoint(double sigma, double index)
    {  
        return ZpsGeneral.GetMidPoint(sigma, index).ToVector2();
    }
    #endregion


    private void DrawTargets()
    {
        DrawPointTarget(_zrsToggle, _zrsPos, _spiralCalculator.GetZrs().zeta.ToVector2(), _zrsColor, true);
        DrawPointPath(_zrsIndexPathToggle, _zrsIndexPath, _zrsColor);

        DrawPointTarget(_zpsToggle, _zpsPos, _spiralCalculator.GetZps(), _zpsColor, true);
        DrawPointPath(_zpsIndexPathToggle, _zpsIndexPath, _zpsColor);

        DrawPointTarget(_etaToggle, _etaPos, _spiralCalculator.GetEta().zeta.ToVector2(), _etaColor, true);
        // DrawPointPath(_etaSigmaPathToggle, _etaSigmaPath, _etaColor);
        // DrawPointPath(_etaIndexPathToggle, _etaIndexPath, _etaColor);

        DrawPointTarget(_ravToggle, null, _spiralCalculator.GetRAV(), _ravColor, false);
        DrawPointPath(_ravIndexPathToggle, _ravIndexPath, _ravColor);

        DrawPointTarget(_emsToggle, _emsPos, _spiralCalculator.GetEms().zeta.ToVector2(), _emsColor, true);
        DrawPointPath(_emsSigmaPathToggle, _emsSigmaPath, _emsColor);
        DrawPointPath(_emsIndexPathToggle, _emsIndexPath, _emsColor);

        DrawPointTarget(_zetapsToggle, _zetapsPos, _spiralCalculator.GetZetaPS(), _zetapsColor, true);
        DrawPointPath(_zetapsSigmaPathToggle, _zetapsSigmaPath, _zetapsColor);
        DrawPointPath(_zetapsIndexPathToggle, _zetapsIndexPath, _zetapsColor);

        var zakLinks = _spiralCalculator.GetZakLinks();
        DrawPointTarget(_zakToggle, _zakPos, zakLinks[zakLinks.Length - 1], _zakColor, true);
        DrawPointPath(_zakSigmaPathToggle, _zakSigmaPath, _zakColor);
        DrawPointPath(_zakIndexPathToggle, _zakIndexPath, _zakColor);


        DrawPointTarget(_sum1Toggle, null, _spiralCalculator.GetSum1().ToVector2(), _sum1Color, false);
        DrawPointPath(_sum1SigmaPathToggle, _sum1SigmaPath, _sum1Color);
        DrawPointPath(_sum1IndexPathToggle, _sum1IndexPath, _sum1Color);

        if (_midPointToggle.isOn) DrawMiddlePoint();
        DrawPointPath(_midPointSigmaPathToggle, _midPointSigmaPath, _midPointColor);
        DrawPointPath(_midPointIndexPathToggle, _midPointIndexPath, _midPointColor);
        
        if (_drawOrigin.isOn) DrawOrigin();
        if (_camTargetColor.a > 0.05f) DrawCamTarget();
    }

    private void DrawPointTarget(Toggle toggle, TMP_Text posText, Vector2 pos, Color color, bool drawZ = true)
    {
        if (toggle.isOn)
        {
            if (drawZ)
            {
                DrawZ(pos, color);
            }
            else
            {
                using (Draw.StyleScope)
                {
                    Draw.Color = color;
                    Draw.Thickness = 1f;
                    ShapesUtils.DrawCross(pos, 0.05f);
                }
            }

            if (posText != null) posText.text = $"({pos.x:F6}, {pos.y:F6})";
        }
        else if (posText != null)
        {
            posText.text = "";
        }
    }

    private void DrawPointPath(MultiOptionToggle toggle, List<Vector2> path, Color color)
    {
        if (toggle.GetSelectedOption().Item1 != 0 && path.Count > 1)
        {
            DrawPath(path, color);
        }
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
            elapsedTime += Time.fixedDeltaTime;
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

    // private void DrawRemainderToForwardBisectorLine()
    // {
    //     using (Draw.StyleScope)
    //     {
    //         Draw.Color = _zakColor;
    //         Draw.Thickness = 1f;
    //         var Bf = _spiralCalculator.GetForwardBisector();
    //         var Br = _spiralCalculator.GetRemainderForwardBisector();
    //         var Bi = _spiralCalculator.GetInverseBisector();
    //         var FtR = (Br - Bf).Normalized();

    //         var Bri = _spiralCalculator.GetRemainderInverseBisector();
    //         var ItR = (Bri - Bi).Normalized();

    //         var rtr = (Br - Bri).Length / 2;

    //         Draw.Line(Br + FtR * rtr, Br - FtR * rtr);
    //         Draw.Line(Bri + ItR * rtr, Bri - ItR * rtr);
    //     }
    // }

    private void DrawMiddlePoint()
    {
        using (Draw.StyleScope)
        {
            Draw.Color = _zrsColor;
            Draw.Thickness = 1f;
            var Zps = _spiralCalculator.GetZetaPS();
            var midPoint = _spiralCalculator.GetMidPoint();
            Draw.Ring(midPoint, 0.02f);
            ShapesUtils.DrawCross(midPoint, 0.03f);
            Draw.UseDashes = true;
            Draw.Line(Vector2.zero, Zps);
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
            Draw.Line(pt + new Vector2(-r / 2, 0), pt + new Vector2(r / 2, 0)); // -
            Draw.Line(pt + new Vector2(-r, -r), pt + new Vector2(r, r));    // /
            Draw.Line(pt + new Vector2(-r, r), pt + new Vector2(r, r));     // `
            Draw.Line(pt + new Vector2(-r, -r), pt + new Vector2(r, -r));    // _
        }
    }
    
    private void DrawPath(List<Vector2> path, Color pathColor)
    {
        using (Draw.StyleScope)
        {
            Draw.Color = pathColor;
            Draw.Thickness = 1;
            //draw a line along the path starting at pathIndex and looping through the array
            for (int i = 1; i < path.Count; i++)
            {
                Draw.Line(path[i - 1], path[i]);
            }
        }
    }
}
