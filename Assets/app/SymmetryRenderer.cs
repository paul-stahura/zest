using System;
using System.Collections;
using System.Collections.Generic;
using Shapes;
using UnityEngine;
using UnityEngine.UI;

public class SymmetryRenderer : ImmediateModeShapeDrawer
{
    [SerializeField] private Toggle _zpsBisectorToggle;
    [SerializeField] private Color _zpsBisectorColor;
    [SerializeField] private Toggle _zpsBPToZetaCirlceToggle;
    [SerializeField] private Color _zpsBPToZetaCircleColor;

    [SerializeField] private Toggle _symmeytryToggle;
    [SerializeField] private Toggle _symmetryRealPathToggle;
    [SerializeField] private Color _symmetryColor;
    [SerializeField] private Toggle _reverseLinkToggle;
    [SerializeField] private Color _reverseLinkColor;
    [SerializeField] private Color _reverseLinkPointsColor;
    
    [SerializeField] private MultiOptionToggle _ForwardLegsToggle;
    [SerializeField] private Toggle _tempForwardToZetaToggle;
    [SerializeField] private Toggle _ForwardLegsPathToggle;
    [SerializeField] private Toggle _ForwardLegsZetaCircleToggle;
    [SerializeField] private Color _forwardLegsColor;
    [SerializeField] private MultiOptionToggle _inverseLegsToggle;
    [SerializeField] private Toggle _inverseLegsPathToggle;
    [SerializeField] private Toggle _inverseLegsZetaCircleToggle;
    [SerializeField] private Color _inverseLegsColor;
    [SerializeField] private Toggle _inverseReflectedLegsToggle;
    [SerializeField] private Toggle _inverseReflectedLegsPathToggle;
    [SerializeField] private Toggle _inverseReflectedZetaCircleToggle;
    [SerializeField] private Color _inverseReflectedColor;

    [SerializeField] private SpiralCalculator _spiralCalculator;
    [SerializeField] private CameraPositionTracking _cam;

    #region FindObjects
    void Awake()
    {
        _zpsBisectorToggle = GameObject.Find("ZPSBisectorToggle").GetComponent<Toggle>();
        _zpsBPToZetaCirlceToggle = GameObject.Find("ZPSBPToZetaCircleToggle").GetComponent<Toggle>();

        _symmeytryToggle = GameObject.Find("SymmetryToggle").GetComponent<Toggle>();
        _symmetryRealPathToggle = GameObject.Find("SymmetryRealPathToggle").GetComponent<Toggle>();
        _reverseLinkToggle = GameObject.Find("ReverseLinkToggle").GetComponent<Toggle>();
        
        _ForwardLegsToggle = GameObject.Find("ForwardLegsOptionToggle").GetComponent<MultiOptionToggle>();
        _ForwardLegsPathToggle = GameObject.Find("ForwardLegsPathToggle").GetComponent<Toggle>();
        _ForwardLegsZetaCircleToggle = GameObject.Find("ForwardLegsBPToZetaCircleToggle").GetComponent<Toggle>();
        _inverseLegsToggle = GameObject.Find("InverseLegsOptionToggle").GetComponent<MultiOptionToggle>();
        _inverseLegsPathToggle = GameObject.Find("InverseLegsPathToggle").GetComponent<Toggle>();
        _inverseLegsZetaCircleToggle = GameObject.Find("InverseLegsBPToZetaCircleToggle").GetComponent<Toggle>();
        _inverseReflectedLegsToggle = GameObject.Find("InverseReflectedLegsToggle").GetComponent<Toggle>();
        _inverseReflectedLegsPathToggle = GameObject.Find("InverseReflectedLegsPathToggle").GetComponent<Toggle>();
        _inverseReflectedZetaCircleToggle = GameObject.Find("InverseReflectedZetaCircleToggle").GetComponent<Toggle>();

        _tempForwardToZetaToggle = GameObject.Find("TempForwardToZetaToggle").GetComponent<Toggle>();

        _spiralCalculator = GameObject.Find("Spiral Calculator").GetComponent<SpiralCalculator>();
        _cam = Camera.main.GetComponent<CameraPositionTracking>();

        SubToCalculations();
    }
    #endregion

    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;

            // set static parameter to draw in the local space of this object
            Draw.Matrix = transform.localToWorldMatrix;

            DrawSymmetry();
        }
    }

    private void DrawSymmetry()
    {
        if(_zpsBisectorToggle.isOn) DrawZpsBisector();
        if(_zpsBPToZetaCirlceToggle.isOn) DrawZpsBPToZetaCircle();

        if(_symmeytryToggle.isOn) DrawSymmetryPoint();
        if(_symmetryRealPathToggle.isOn) DrawSymmetryPath();
        if(_reverseLinkToggle.isOn) DrawBisectorLink();

        DrawForwardLegs(_ForwardLegsToggle.GetSelectedOption().Item1);
        if(_ForwardLegsPathToggle.isOn) DrawForwardLegsPath();
        if(_ForwardLegsZetaCircleToggle.isOn) DrawForwardLegsZetaCircle();
        DrawInverseLegs(_inverseLegsToggle.GetSelectedOption().Item1);
        if(_inverseLegsPathToggle.isOn) DrawInverseLegsPath();
        if(_inverseLegsZetaCircleToggle.isOn) DrawInverseLegsZetaCircle();
        if(_inverseReflectedLegsToggle.isOn) DrawInverseReflectedLegs();
        if(_inverseReflectedLegsPathToggle.isOn) DrawInverseReflectedLegsPath();
        if(_inverseReflectedZetaCircleToggle.isOn) DrawInverseReflectedZetaCircle();

        if(_tempForwardToZetaToggle.isOn)
        {
            using (Draw.StyleScope)
            {
                Draw.Color = Color.white;
                Draw.Thickness = 1f;
                var bp = _spiralCalculator.GetForwardBisector();
                var zeta = _spiralCalculator.GetSpiral().zeta.ToVector();
                Draw.UseDashes = true;
                Draw.Line(bp, zeta, Color.red);
            }
        }
    }

    private void DrawBisectorLink()
    {
        var spiral = Mathf.Approximately((float)_spiralCalculator.GetReal(), 0.5f) ? _spiralCalculator.GetZrs() : _spiralCalculator.GetEms();
        var zeta = spiral.zeta.ToVector();
        var norm = zeta.Normalized();
        Vector2 yang = zeta + spiral.joints[spiral.middleIndex].Reflect(norm);
        Vector2 yin = zeta + spiral.joints[spiral.middleIndex + 1].Reflect(norm);

        using (Draw.StyleScope)
        {
            Draw.Color = _reverseLinkPointsColor;
            Draw.Thickness = 1f;

            var rad = _cam.GetZoomLevel() * 0.03f;

            Draw.Rectangle(yin - new Vector2(rad/2, rad/2), new Rect
            {
                width = rad,
                height = rad
            });

            Draw.Color = new Color(_reverseLinkPointsColor.r, _reverseLinkPointsColor.g, _reverseLinkPointsColor.b, 1);
            ShapesUtils.DrawCross(yin, rad + rad/4);

            Draw.Color = _reverseLinkPointsColor;
            Draw.Pie(yang, rad*0.75f, 0, Mathf.PI / 2);
            Draw.Pie(yang, rad*0.75f, Mathf.PI, 1.5f * Mathf.PI);

            Draw.Color = new Color(_reverseLinkPointsColor.r, _reverseLinkPointsColor.g, _reverseLinkPointsColor.b, 1);
            ShapesUtils.DrawCross(yang, rad + rad/4);

            Draw.Thickness = 1f;
            Draw.Color = _reverseLinkColor;
            Draw.Line(yin, yang);
        }
    }

    private void DrawZpsBisector()
    {
        using (Draw.StyleScope)
        {
            Draw.Thickness = 1;

            var zps = _spiralCalculator.GetZps();
            var bipt = _spiralCalculator.GetBpOneHalf();

            // legs
            Draw.Color = Color.green;
            Draw.Line(Vector2.zero, bipt);
            Draw.Color = Color.red;
            Draw.Line(bipt, zps);

            // Draw dashed bisecting line. Extend it past a little bit
            Draw.Color = _zpsBisectorColor;
            var z2 = (zps / 2);
            var dir = (z2 - bipt).Normalized() * .5f;
            Draw.Thickness = 1.75f;
            Draw.UseDashes = true;
            Draw.Line(z2 + dir, bipt - dir);

            Draw.Ring(bipt, .005f);
            ShapesUtils.DrawCross45(bipt, .05f);
        }
    }

    private void DrawSymmetryPoint()
    {
        using (Draw.StyleScope)
        {
            Draw.Thickness = 1;
            Draw.Color = _symmetryColor;

            var spiral = Mathf.Approximately((float)_spiralCalculator.GetReal(), 0.5f) ? _spiralCalculator.GetZrs() : _spiralCalculator.GetEms();
            var zetaPt = spiral.zeta.ToVector();

            var bipt = _spiralCalculator.GetSymmetryPoint();

            Draw.Line(Vector2.zero, zetaPt);
            Draw.Line(Vector2.zero, bipt);
            Draw.Line(bipt, zetaPt);

            // Draw dashed bisecting line. Extend it past a little bit
            var z2 = (zetaPt / 2);
            Vector dist = z2 - bipt;
            dist += dist.Normalized() * .5f;
            Draw.Thickness = 1.75f;
            Draw.UseDashes = true;
            Draw.Line(z2 + dist, z2 - dist);

            Draw.Ring(bipt, .005f);
            ShapesUtils.DrawCross45(bipt, .05f);
        }
    }

    private void DrawSymmetryPath()
    {
        Vector2[] path = _spiralCalculator.GetSymmetryPath();

        using (Draw.StyleScope)
        {
            Draw.Color = _symmetryColor;
            Draw.Thickness = 1f;

            for (int i = 1; i < path.Length; i++)
            {
                //if dist between points is greater that 0.5f skip
                if((path[i - 1] - path[i]).magnitude < 5)
                {
                    Draw.Line(path[i - 1], path[i]);
                }

            }
        }
    }

    private void DrawZpsBPToZetaCircle()
    {
        var spiral = Mathf.Approximately((float)_spiralCalculator.GetReal(), 0.5f) ? _spiralCalculator.GetZrs() : _spiralCalculator.GetEms();
        var zeta = spiral.zeta.ToVector();
        Vector2 bpOneHalf = _spiralCalculator.GetBpOneHalf();
        DrawTargetCircle(bpOneHalf, zeta, _zpsBPToZetaCircleColor, Color.red);
    }

    #region Forward
    private void DrawForwardLegs(int numToDraw)
    {
        if(numToDraw == 0) return;
        using (Draw.StyleScope)
        {
            Draw.Color = _forwardLegsColor;
            Draw.Thickness = 1f;

            var pt = _spiralCalculator.GetForwardBisector();
            var inversePt = _spiralCalculator.GetInverseBisector();

            ShapesUtils.DrawCross45(pt, 0.08f);

            Draw.Line(Vector2.zero, pt, Color.green);
            if(numToDraw == 2) Draw.Line(pt, pt + inversePt, Color.red);
        }
    }

    private void DrawForwardLegsPath()
    {
        DrawPath(_spiralCalculator.GetForwardBisectorPath(), _forwardLegsColor);
    }

    private void DrawForwardLegsZetaCircle()
    {
        var forwardPt = _spiralCalculator.GetForwardBisector();
        var inversePt = _spiralCalculator.GetInverseBisector();
        DrawTargetCircle(forwardPt, forwardPt + inversePt, _forwardLegsColor, Color.red);
    }
    #endregion
    #region Inverse
    private void DrawInverseLegs(int numToDraw)
    {
        if(numToDraw == 0) return;

        using (Draw.StyleScope)
        {
            Draw.Color = _inverseLegsColor;
            Draw.Thickness = 1f;

            var pt = _spiralCalculator.GetInverseBisector();
            var forwardPt = _spiralCalculator.GetForwardBisector();

            ShapesUtils.DrawCross45(pt, 0.08f);

            Draw.Line(Vector2.zero, pt, Color.red);
            if(numToDraw == 2) Draw.Line(pt, pt + forwardPt, Color.green);
        }
    }

    private void DrawInverseLegsPath()
    {
        DrawPath(_spiralCalculator.GetInverseBisectorPath(), _inverseLegsColor);
    }

    private void DrawInverseLegsZetaCircle()
    {
        var spiral = Mathf.Approximately((float)_spiralCalculator.GetReal(), 0.5f) ? _spiralCalculator.GetZrs() : _spiralCalculator.GetEms();
        var zeta = spiral.zeta.ToVector();
        Vector2 inversePt = _spiralCalculator.GetInverseBisector();
        DrawTargetCircle(inversePt, zeta, _inverseLegsColor, Color.green);
    }

    private void DrawInverseReflectedLegs()
    {
        using (Draw.StyleScope)
        {
            Draw.Color = _inverseReflectedColor;
            Draw.Thickness = 1f;

            var s = Mathf.Approximately((float)_spiralCalculator.GetReal(), 0.5f) ? _spiralCalculator.GetZrs() : _spiralCalculator.GetEms();
            var pt = _spiralCalculator.GetInverseReflectedBisector();

            ShapesUtils.DrawCross45(pt, 0.08f);

            Draw.Line(Vector2.zero, pt, Color.green);
            Draw.Line(pt, s.zeta.ToVector(), Color.red);
        }
    }

    private void DrawInverseReflectedLegsPath()
    {
        DrawPath(_spiralCalculator.GetInverseReflectedBisectorPath(), _inverseReflectedColor);
    }

    private void DrawInverseReflectedZetaCircle()
    {
        var spiral = Mathf.Approximately((float)_spiralCalculator.GetReal(), 0.5f) ? _spiralCalculator.GetZrs() : _spiralCalculator.GetEms();
        var zeta = spiral.zeta.ToVector();
        DrawTargetCircle(_spiralCalculator.GetInverseReflectedBisector(), zeta, _inverseReflectedColor, Color.red);
    }
    #endregion

    private void DrawPath(Vector2[] path, Color color)
    {
        using (Draw.StyleScope)
        {
            Draw.Color = color;
            Draw.Thickness = 1f;

            for (int i = 1; i < path.Length; i++)
            {
                Draw.Line(path[i - 1], path[i]);
            }
        }
    }
    private void DrawTargetCircle(Vector2 pt, Vector2 target, Color color, Color line)
    {
        using (Draw.StyleScope)
        {
            Draw.Color = color;
            Draw.Thickness = 1f;

            Draw.UseDashes = true;
            Draw.Ring(pt, (target - pt).magnitude);

            Draw.Color = line;
            Draw.Line(pt, target);
        }
    }

    #region Subs
    private void SubToCalculations()
    {
        _zpsBisectorToggle.onValueChanged.AddListener((value) => {
            if (value)
            {
                SpiralCalculator.UpdateZps += SubZps;
                SpiralCalculator.UpdateBpOneHalf += SubBpOneHalf;
            }
            else
            {
                SpiralCalculator.UpdateZps -= SubZps;
                SpiralCalculator.UpdateBpOneHalf -= SubBpOneHalf;
            }
        });

        _symmeytryToggle.onValueChanged.AddListener((value) => {
            if (value)
            {
                SpiralCalculator.UpdateEms += SubEms;
                SpiralCalculator.UpdateSymmetryPoint += SubSymmetryPoint;
            }
            else
            {
                SpiralCalculator.UpdateEms -= SubEms;
                SpiralCalculator.UpdateSymmetryPoint -= SubSymmetryPoint;
            }
        });

        _symmetryRealPathToggle.onValueChanged.AddListener((value) => {
            if (value)
            {
                SpiralCalculator.UpdateSymmetryPath += SubSymmetryPath;
            }
            else
            {
                SpiralCalculator.UpdateSymmetryPath -= SubSymmetryPath;
            }
        });

        _zpsBPToZetaCirlceToggle.onValueChanged.AddListener((value) => {
            if (value)
            {
                SpiralCalculator.UpdateZps += SubZps;
                SpiralCalculator.UpdateBpOneHalf += SubBpOneHalf;
            }
            else
            {
                SpiralCalculator.UpdateZps -= SubZps;
                SpiralCalculator.UpdateBpOneHalf -= SubBpOneHalf;
            }
        });

        _ForwardLegsToggle.OnOptionChanged += SubForwardOptionBisector;

        _ForwardLegsPathToggle.onValueChanged.AddListener((value) => {
            if (value)
            {
                SpiralCalculator.UpdateForwardBisectorPath += SubForwardPath;
            }
            else
            {
                SpiralCalculator.UpdateForwardBisectorPath -= SubForwardPath;
            }
        });

        _inverseLegsToggle.OnOptionChanged += SubInverseOptionBisector;

        _inverseLegsPathToggle.onValueChanged.AddListener((value) => {
            if (value)
            {
                SpiralCalculator.UpdateInverseSumPath += SubInversePath;
            }
            else
            {
                SpiralCalculator.UpdateInverseSumPath -= SubInversePath;
            }
        });

        _inverseLegsZetaCircleToggle.onValueChanged.AddListener((value) => {
            if (value)
            {
                SpiralCalculator.UpdateInverseBisector += SubInverseBisector;
            }
            else
            {
                SpiralCalculator.UpdateInverseBisector -= SubInverseBisector;
            }
        });

        _inverseReflectedLegsToggle.onValueChanged.AddListener((value) => {
            if (value)
            {
                SpiralCalculator.UpdateInverseReflectedBisector += SubInverseReflectedPoint;
            }
            else
            {
                SpiralCalculator.UpdateInverseReflectedBisector -= SubInverseReflectedPoint;
            }
        });

        _inverseReflectedLegsPathToggle.onValueChanged.AddListener((value) => {
            if (value)
            {
                SpiralCalculator.UpdateInverseReflectedBisectorPath += SubInverseReflectedPath;
            }
            else
            {
                SpiralCalculator.UpdateInverseReflectedBisectorPath -= SubInverseReflectedPath;
            }
        });

        _inverseReflectedZetaCircleToggle.onValueChanged.AddListener((value) => {
            if (value)
            {
                SpiralCalculator.UpdateInverseReflectedBisector += SubInverseReflectedPoint;
            }
            else
            {
                SpiralCalculator.UpdateInverseReflectedBisector -= SubInverseReflectedPoint;
            }
        });
    }

    private void SubZps(Vector zpsPos) {}
    private void SubBpOneHalf(Vector bps) {}
    private void SubEms(Zeta.Spiral emsSpiral) {}
    private void SubSymmetryPoint(Vector symmetryPoint) {}
    private void SubSymmetryPath(Vector2[] symmetryPath) {}
    private void SubForwardOptionBisector(int option) 
    {
        if(option == 0)
        {
            SpiralCalculator.UpdateForwardBisector -= SubForwardBisector;
            SpiralCalculator.UpdateInverseBisector -= SubInverseBisector;
        }
        else
        {
            SpiralCalculator.UpdateForwardBisector += SubForwardBisector;
            SpiralCalculator.UpdateInverseBisector += SubInverseBisector;
        }
    }
    private void SubForwardBisector(Vector forwardPt) {}
    private void SubForwardPath(Vector2[] forwardPath) {}
    private void SubInverseOptionBisector(int option) 
    {
        if(option == 0)
        {
            SpiralCalculator.UpdateForwardBisector -= SubForwardBisector;
            SpiralCalculator.UpdateInverseBisector -= SubInverseBisector;
        }
        else
        {
            SpiralCalculator.UpdateForwardBisector += SubForwardBisector;
            SpiralCalculator.UpdateInverseBisector += SubInverseBisector;
        }
    }
    private void SubInverseBisector(Vector inversePt) {}
    private void SubInversePath(Vector2[] inversePath) {}
    private void SubInverseReflectedPoint(Vector inversePt) {}
    private void SubInverseReflectedPath(Vector2[] inversePath) {}

    #endregion
}
