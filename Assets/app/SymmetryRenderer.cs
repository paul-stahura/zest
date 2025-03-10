using System;
using System.Collections;
using System.Collections.Generic;
using Shapes;
using UnityEngine;
using UnityEngine.UI;

public class SymmetryRenderer : ImmediateModeShapeDrawer
{
    [SerializeField] private Toggle _bisectorLinkToggle;
    [SerializeField] private Color _bisectorLinkColor;
    [SerializeField] private Color _bisectorLinkPointsColor;

    [SerializeField] private Toggle _linksToSpiralsToggle;
    [SerializeField] private Color _linksToSpiralsColor;
    [SerializeField] private Color _linksToSpiralsPointsColor;

    [SerializeField] private Toggle _zpsBisectorToggle;
    [SerializeField] private Color _zpsBisectorColor;

    [SerializeField] private Toggle _symmeytryToggle;
    [SerializeField] private Color _symmetryColor;

    [SerializeField] private Toggle _zpsBPToZetaCirlceToggle;
    [SerializeField] private Color _zpsBPToZetaCircleColor;

    [SerializeField] private SpiralCalculator _spiralCalculator;
    [SerializeField] private CameraPositionTracking _cam;

    void Awake()
    {
        _bisectorLinkToggle = GameObject.Find("BisectorLinkToggle").GetComponent<Toggle>();
        _linksToSpiralsToggle = GameObject.Find("LinksToSpiralsToggle").GetComponent<Toggle>();
        _zpsBisectorToggle = GameObject.Find("ZPSBisectorToggle").GetComponent<Toggle>();
        _symmeytryToggle = GameObject.Find("SymmetryToggle").GetComponent<Toggle>();
        _zpsBPToZetaCirlceToggle = GameObject.Find("ZPSBPToZetaCircleToggle").GetComponent<Toggle>();

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
        if(_bisectorLinkToggle.isOn) DrawBisectorLink();
        if(_linksToSpiralsToggle.isOn) DrawLinksToSpirals();

        // if(_zpsBisectorToggle.isOn) DrawZpsBisector();
        // if(_symmeytryToggle.isOn) DrawSymmetryPoint();
        // if(_zpsBPToZetaCirlceToggle.isOn) DrawZpsBPToZetaCircle();
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
            Draw.Color = _bisectorLinkPointsColor;
            Draw.Thickness = 1f;

            var rad = _cam.GetZoomLevel() * 0.03f;

            Draw.Rectangle(yin - new Vector2(rad/2, rad/2), new Rect
            {
                width = rad,
                height = rad
            });
            ShapesUtils.DrawCross(yin, rad + rad/4);

            Draw.Pie(yang, rad, 0, Mathf.PI / 2);
            Draw.Pie(yang, rad, Mathf.PI, 1.5f * Mathf.PI);
            ShapesUtils.DrawCross(yang, rad + rad/4);

            Draw.Thickness = 1f;
            Draw.Color = _bisectorLinkColor;
            Draw.Line(yin, yang);
        }
    }

    private void DrawLinksToSpirals()
    {
        Zeta.Spiral spiral = _spiralCalculator.GetZrs();

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
    }

    private void SubZps(Vector zpsPos) {}
    private void SubBpOneHalf(Vector bps) {}
    private void SubEms(Zeta.Spiral emsSpiral) {}
    private void SubSymmetryPoint(Vector symmetryPoint) {}
}
