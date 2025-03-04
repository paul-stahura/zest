using System;
using System.Collections;
using System.Collections.Generic;
using System.Numerics;
using Shapes;
using UnityEngine;
using UnityEngine.UI;

public class SpiralRenderer : ImmediateModeShapeDrawer
{
    [SerializeField] private Color EmsColor;
    private MultiOptionToggle _emsForwardToggle;
    [SerializeField] private Color ZrsColor;
    private MultiOptionToggle _ZrsForwardToggle;
    [SerializeField] private Color ReverseSpiralColor;
    private Toggle _reverseSpiralToggle;
    [SerializeField] private Color InverseSpiralColor;
    private Toggle _inverseSpiralToggle;
    [SerializeField] private Color InverseReflectedColor;
    private Toggle _inverseReflectedToggle;
    [SerializeField] private Color EtaSpiralColor;
    private Toggle _etaSpiralToggle;

    private Toggle _realPathToggle;

    private SpiralCalculator _spiralCalculator;

    void Awake()
    {
        _emsForwardToggle = GameObject.Find("EmsForwardMOT").GetComponent<MultiOptionToggle>();
        _ZrsForwardToggle = GameObject.Find("ZrsForwardMOT").GetComponent<MultiOptionToggle>();
        _reverseSpiralToggle = GameObject.Find("ReverseSpiralToggle").GetComponent<Toggle>();
        _inverseSpiralToggle = GameObject.Find("InverseSpiralToggle").GetComponent<Toggle>();
        _inverseReflectedToggle = GameObject.Find("InverseReflectedToggle").GetComponent<Toggle>();
        _etaSpiralToggle = GameObject.Find("EtaSpiralToggle").GetComponent<Toggle>();

        _realPathToggle = GameObject.Find("RealPathToggle").GetComponent<Toggle>();

        _spiralCalculator = GameObject.Find("Spiral Calculator").GetComponent<SpiralCalculator>();

        SubSpirals();
    }

    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;

            // set static parameter to draw in the local space of this object
            Draw.Matrix = transform.localToWorldMatrix;

            DrawSpirals();
        }
    }

    private void DrawSpirals()
    {
        if(_emsForwardToggle.GetSelectedOption().Item1 != 0) DrawEms(_spiralCalculator.GetEms());
        if(_ZrsForwardToggle.GetSelectedOption().Item1 != 0) DrawZrs(_spiralCalculator.GetZrs());
        if(_reverseSpiralToggle.isOn) DrawReverseSpiral();
        if(_inverseSpiralToggle.isOn) DrawRsInverseSum(_spiralCalculator.GetRsInverseSum());
        if(_inverseReflectedToggle.isOn) DrawRsInverseSumReflected(_spiralCalculator.GetRsInverseSum());
        if(_etaSpiralToggle.isOn) DrawEtaSpiral(_spiralCalculator.GetEta());

        if(_realPathToggle.isOn) DrawRealPath();
    }

    private void SubSpirals()
    {
        _emsForwardToggle.OnOptionChanged += EmsOptionChanged;
        _ZrsForwardToggle.OnOptionChanged += ZrsOptionChanged;

        _reverseSpiralToggle.onValueChanged.AddListener((value) => {
            if(value)
            {
                SpiralCalculator.UpdateEms += SubEms;
                SpiralCalculator.UpdateZrs += SubZrs;
            }
            else 
            {
                SpiralCalculator.UpdateEms -= SubEms;
                SpiralCalculator.UpdateZrs -= SubZrs;
            }
        });

        _inverseSpiralToggle.onValueChanged.AddListener((value) => {
            if(value) SpiralCalculator.UpdateRsInverseSum += SubRsInverseSum;
            else SpiralCalculator.UpdateRsInverseSum -= SubRsInverseSum;
        });

        _inverseReflectedToggle.onValueChanged.AddListener((value) => {
            if(value) 
            {
                SpiralCalculator.UpdateRsInverseSum += SubRsInverseSumReflected;
                SpiralCalculator.UpdateEms += SubEms;
                SpiralCalculator.UpdateZrs += SubZrs;
            }
            else 
            {
                SpiralCalculator.UpdateRsInverseSum -= SubRsInverseSumReflected;
                SpiralCalculator.UpdateEms += SubEms;
                SpiralCalculator.UpdateZrs += SubZrs;
            }
        });
        
        _etaSpiralToggle.onValueChanged.AddListener((value) => {
            if(value) SpiralCalculator.UpdateEta += SubEtaSpiral;
            else SpiralCalculator.UpdateEta -= SubEtaSpiral;
        });


        _realPathToggle.onValueChanged.AddListener((value) => {
            if(value) SpiralCalculator.UpdateRealPath += SubRealPath;
            else SpiralCalculator.UpdateRealPath -= SubRealPath;
        });
    }

    private void EmsOptionChanged(int option)
    {
        if(option != 0)
        {
            SpiralCalculator.UpdateEms += SubEms;
            EmsColor.a = option / 4f;
        }
        else SpiralCalculator.UpdateEms -= SubEms;
    }
    private void SubEms(Zeta.Spiral spiral){}
    private void DrawEms(Zeta.Spiral ems)
    {
        DrawSpiralLines(ems.joints, EmsColor);
    }

     private void ZrsOptionChanged(int option)
    {
        if(option != 0)
        {
            SpiralCalculator.UpdateZrs += SubZrs;
            ZrsColor.a =  option / 4f;
        }
        else SpiralCalculator.UpdateZrs -= SubZrs;
    }
    private void SubZrs(Zeta.Spiral spiral){}
    private void DrawZrs(Zeta.Spiral zrs)
    {
        DrawSpiralLines(zrs.joints, ZrsColor);
    }

    private void DrawReverseSpiral()
    {
        var spiral = _spiralCalculator.GetEms();
        if(spiral.real == 0.5) spiral = _spiralCalculator.GetZrs();
        var zeta = spiral.zeta.ToVector();
        var norm = zeta.Normalized();

        var newJoints = new Vector[spiral.joints.Length];
        for(int i = 0; i < spiral.joints.Length; i++)
        {
            newJoints[i] = zeta + spiral.joints[i].Reflect(norm);
        }

        DrawSpiralLines(newJoints, ReverseSpiralColor);
    }

    private void SubRsInverseSum(Vector[] links){}
    private void DrawRsInverseSum(Vector[] links)
    {
        DrawSpiralLines(links, InverseSpiralColor);
    }

    private void SubRsInverseSumReflected(Vector[] links){}
    private void DrawRsInverseSumReflected(Vector[] links)
    {
        var spiral = _spiralCalculator.GetEms();
        if(spiral.real == 0.5) spiral = _spiralCalculator.GetZrs();
        var zeta = spiral.zeta.ToVector();
        var norm = zeta.Normalized();
        var perp = new Vector(-norm.y, norm.x);

        var newJoints = new Vector[links.Length];
        for(int i = 0; i < newJoints.Length; i++)
        {
            newJoints[i] = zeta + links[i].Reflect(norm).Reflect(perp);
        }

        DrawSpiralLines(newJoints, InverseReflectedColor);
    }

    private void SubEtaSpiral(Zeta.Spiral spiral){}
    private void DrawEtaSpiral(Zeta.Spiral eta)
    {
        DrawSpiralLines(eta.joints, EtaSpiralColor);
    }

    private void SubRealPath(List<Vector> pat, int indexOne){}
    private void DrawRealPath()
    {
        var realPath = _spiralCalculator.GetRealPath().Item1.ToArray();
        var indexOne = _spiralCalculator.GetRealPath().Item2;
        var realUpToOne = new Vector[indexOne + 1];
        for(int i = 0; i <= indexOne; i++)
        {
            realUpToOne[i] = realPath[i];
        }

        var afterOne = new Vector[realPath.Length - indexOne];
        for(int i = 0; i < afterOne.Length; i++)
        {
            afterOne[i] = realPath[i + indexOne];
        }
        DrawSpiralLines(realUpToOne, Color.red);
        DrawSpiralLines(afterOne, Color.blue);
    }

    private void DrawSpiralLines(Vector[] points, Color color)
    {
        using (Draw.StyleScope)
        {
            Draw.Color = color;
            Draw.Thickness = 1;
            for (int i = 0; i < points.Length - 1; i++)
            {
                Draw.Line(points[i], points[i + 1], color);
            }
        }
    }
}

