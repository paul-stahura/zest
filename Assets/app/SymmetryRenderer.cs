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

    [SerializeField] private Toggle _inverseBisectorToggle;
    [SerializeField] private Toggle _inverseRealPathToggle;
    [SerializeField] private Toggle _inverseBPToZetaCirlceToggle;
    [SerializeField] private Color _inverseColor;

    [SerializeField] private Toggle _linksToSpiralsToggle;
    [SerializeField] private Color _linksToSpiralsColor;

    [SerializeField] private SpiralCalculator _spiralCalculator;
    [SerializeField] private CameraPositionTracking _cam;

    void Awake()
    {
        _zpsBisectorToggle = GameObject.Find("ZPSBisectorToggle").GetComponent<Toggle>();
        _zpsBPToZetaCirlceToggle = GameObject.Find("ZPSBPToZetaCircleToggle").GetComponent<Toggle>();

        _symmeytryToggle = GameObject.Find("SymmetryToggle").GetComponent<Toggle>();
        _symmetryRealPathToggle = GameObject.Find("SymmetryRealPathToggle").GetComponent<Toggle>();
        _reverseLinkToggle = GameObject.Find("ReverseLinkToggle").GetComponent<Toggle>();
        _linksToSpiralsToggle = GameObject.Find("LinksToSpiralsToggle").GetComponent<Toggle>();

        _inverseBisectorToggle = GameObject.Find("InverseBisectorToggle").GetComponent<Toggle>();
        _inverseRealPathToggle = GameObject.Find("InverseRealPathToggle").GetComponent<Toggle>();
        _inverseBPToZetaCirlceToggle = GameObject.Find("InverseBPToZetaCircleToggle").GetComponent<Toggle>();

        _spiralCalculator = GameObject.Find("Spiral Calculator").GetComponent<SpiralCalculator>();
        _cam = Camera.main.GetComponent<CameraPositionTracking>();

        SubToCalculations();
    }

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
        if(_linksToSpiralsToggle.isOn) DrawLinksToSpirals();

        if(_inverseBisectorToggle.isOn) DrawInverseBisector();
        if(_inverseRealPathToggle.isOn) DrawInversePath();
        if(_inverseBPToZetaCirlceToggle.isOn) DrawInverseBPToZetaCircle();
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

    private void DrawLinksToSpirals()
    {
        var spiral = Mathf.Approximately((float)_spiralCalculator.GetReal(), 0.5f) ? _spiralCalculator.GetZrs() : _spiralCalculator.GetEms();

        using (Draw.StyleScope)
        {
            Draw.Color = _linksToSpiralsColor;
            Draw.Thickness = 1f;

            for (int i = 0; i < spiral.spirals.Length; i++)
            {
                var from = spiral.joints[i];
                var to = spiral.spirals[i];
                Draw.Line(from, to);
            }
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
            var dir = (z2 - bipt).Normalized() * .5f;
            Draw.Thickness = 1.75f;
            Draw.UseDashes = true;
            Draw.Line(z2 + dir, bipt - dir);

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
        using (Draw.StyleScope)
        {
            Draw.Color = _zpsBPToZetaCircleColor;
            Draw.Thickness = 1f;

            var spiral = Mathf.Approximately((float)_spiralCalculator.GetReal(), 0.5f) ? _spiralCalculator.GetZrs() : _spiralCalculator.GetEms();
            var zeta = spiral.zeta.ToVector();
            Vector2 bpOneHalf = _spiralCalculator.GetBpOneHalf();

            Draw.UseDashes = true;
            Draw.Ring(bpOneHalf, (zeta - bpOneHalf).magnitude);

            Draw.Color = Color.red;
            Draw.Line(bpOneHalf, zeta);
        }
    }

    private void DrawInverseBisector()
    {
        using (Draw.StyleScope)
        {
            Draw.Color = _inverseColor;
            Draw.Thickness = 1f;

            var s = Mathf.Approximately((float)_spiralCalculator.GetReal(), 0.5f) ? _spiralCalculator.GetZrs() : _spiralCalculator.GetEms();
            var pt = _spiralCalculator.GetInversePoint();

            ShapesUtils.DrawCross45(pt, 0.08f);

            Draw.Line(Vector2.zero, pt, Color.green);
            Draw.Line(pt, s.zeta.ToVector(), Color.red);
        }
    }

    private void DrawInversePath()
    {
        Vector2[] path = _spiralCalculator.GetInverseSumPath();

        using (Draw.StyleScope)
        {
            Draw.Color = _inverseColor;
            Draw.Thickness = 1f;

            for (int i = 1; i < path.Length; i++)
            {
                Draw.Line(path[i - 1], path[i]);
            }
        }
    }

    private void DrawInverseBPToZetaCircle()
    {
        using (Draw.StyleScope)
        {
            Draw.Color = Color.magenta;
            Draw.Thickness = 1f;

            var spiral = Mathf.Approximately((float)_spiralCalculator.GetReal(), 0.5f) ? _spiralCalculator.GetZrs() : _spiralCalculator.GetEms();
            var zeta = spiral.zeta.ToVector();
            Vector2 inversePt = _spiralCalculator.GetInversePoint();

            Draw.UseDashes = true;
            Draw.Ring(inversePt, (zeta - inversePt).magnitude);

            Draw.Color = Color.red;
            Draw.Line(inversePt, zeta);
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

        _inverseBisectorToggle.onValueChanged.AddListener((value) => {
            if (value)
            {
                SpiralCalculator.UpdateInversePoint += SubInversePoint;
            }
            else
            {
                SpiralCalculator.UpdateInversePoint -= SubInversePoint;
            }
        });

        _inverseRealPathToggle.onValueChanged.AddListener((value) => {
            if (value)
            {
                SpiralCalculator.UpdateInverseSumPath += SubInversePath;
            }
            else
            {
                SpiralCalculator.UpdateInverseSumPath -= SubInversePath;
            }
        });
    }

    private void SubZps(Vector zpsPos) {}
    private void SubBpOneHalf(Vector bps) {}
    private void SubEms(Zeta.Spiral emsSpiral) {}
    private void SubSymmetryPoint(Vector symmetryPoint) {}
    private void SubSymmetryPath(Vector2[] symmetryPath) {}
    private void SubInversePoint(Vector inversePt) {}
    private void SubInversePath(Vector2[] inversePath) {}

    #endregion
}
