using System;
using System.Collections;
using System.Collections.Generic;
using System.Numerics;
using Shapes;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class SpiralRenderer : ImmediateModeShapeDrawer
{
    [Header("Spiral Colors")]
    [SerializeField] private Color EmsColor;
    [SerializeField] private MultiOptionToggle _emsForwardToggle;
    [SerializeField] private Color ZrsColor;
    [SerializeField] private MultiOptionToggle _ZrsForwardToggle;
    [SerializeField] private Color ReverseSpiralColor;
    [SerializeField] private Toggle _reverseSpiralToggle;
    [SerializeField] private Color InverseSpiralColor;
    [SerializeField] private Toggle _inverseSpiralToggle;
    [SerializeField] private Color InverseReflectedColor;
    [SerializeField] private Toggle _inverseReflectedToggle;
    [SerializeField] private Toggle _chiSpiralToggle;
    [SerializeField] private Toggle _chiReflectedToggle;
    [SerializeField] private Color ChiSpiralColor;
    [SerializeField] private Color EtaSpiralColor;
    [SerializeField] private Toggle _etaSpiralToggle;

    [SerializeField] private Toggle _realPathToggle;

    [Header("Bisector/Clock Colors")]
    [SerializeField] private TMP_Dropdown _linksToDrawDropdown;
    [SerializeField] private Toggle _colorLinksToggle;
    [SerializeField] private Color _bisectorColor = new Color(0.9607844f, 0.6901961f, 0.3333333f, 1);
    [SerializeField] private Color _clockYinColor = Color.green;
    [SerializeField] private Color _clockYangColor = Color.red;

    private SpiralCalculator _spiralCalculator;

    void Awake()
    {
        _emsForwardToggle = GameObject.Find("EmsForwardMOT").GetComponent<MultiOptionToggle>();
        _ZrsForwardToggle = GameObject.Find("ZrsForwardMOT").GetComponent<MultiOptionToggle>();
        _reverseSpiralToggle = GameObject.Find("ReverseSpiralToggle").GetComponent<Toggle>();
        _inverseSpiralToggle = GameObject.Find("InverseSpiralToggle").GetComponent<Toggle>();
        _inverseReflectedToggle = GameObject.Find("InverseReflectedToggle").GetComponent<Toggle>();
        _chiSpiralToggle = GameObject.Find("ChiSpiralToggle").GetComponent<Toggle>();
        _chiReflectedToggle = GameObject.Find("ChiReflectedToggle").GetComponent<Toggle>();
        _etaSpiralToggle = GameObject.Find("EtaSpiralToggle").GetComponent<Toggle>();

        _realPathToggle = GameObject.Find("RealPathToggle").GetComponent<Toggle>();
        _linksToDrawDropdown = GameObject.Find("LinksToDrawDropdown").GetComponent<TMP_Dropdown>();
        _colorLinksToggle = GameObject.Find("ColorBisectorLinksToggle").GetComponent<Toggle>();

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

        if(_chiSpiralToggle.isOn) DrawChi();
        if(_chiReflectedToggle.isOn) DrawChiReflected();

        if(_etaSpiralToggle.isOn) DrawEtaSpiral(_spiralCalculator.GetEta());

        if(_realPathToggle.isOn) DrawRealPath();
    }

    private void SubSpirals()
    {
        _emsForwardToggle.OnOptionChanged += EmsOptionChanged;
        EmsOptionChanged(_emsForwardToggle.GetSelectedOption().Item1);
        _ZrsForwardToggle.OnOptionChanged += ZrsOptionChanged;
        ZrsOptionChanged(_ZrsForwardToggle.GetSelectedOption().Item1);

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
            }
            else 
            {
                SpiralCalculator.UpdateRsInverseSum -= SubRsInverseSumReflected;
            }
        });

        _chiSpiralToggle.onValueChanged.AddListener((value) => {
            if(value) SpiralCalculator.UpdateChi += SubChi;
            else SpiralCalculator.UpdateChi -= SubChi;
        });

        _chiReflectedToggle.onValueChanged.AddListener((value) => {
            if(value) 
            {
                SpiralCalculator.UpdateChi += SubChiReflected;
            }
            else 
            {
                SpiralCalculator.UpdateChi -= SubChiReflected;
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
        if(option > 0)
        {
            if(option == 1) 
            {
                SpiralCalculator.UpdateEms += SubEms;
                EmsColor.a = 0.25f;
            }
            else
            {
                EmsColor.a = 1f;
            }
        }
        else if (option == 0)
        {
            SpiralCalculator.UpdateEms -= SubEms;
        }
    }
    private void SubEms(Zeta.Spiral spiral){}
    private void DrawEms(Zeta.Spiral ems)
    {
        DrawSpiral(ems, ems.joints, EmsColor);
    }

     private void ZrsOptionChanged(int option)
    {
        if(option > 0)
        {
            if(option == 1) 
            {
                SpiralCalculator.UpdateZrs += SubZrs;
                ZrsColor.a = 0.25f;
            }
            else
            {
                ZrsColor.a = 1f;
            }
        }
        else if (option == 0)
        {
            SpiralCalculator.UpdateZrs -= SubZrs;
        }
    }
    private void SubZrs(Zeta.Spiral spiral){}
    private void DrawZrs(Zeta.Spiral zrs)
    {
        DrawSpiral(zrs, zrs.joints, ZrsColor);
    }

    private void DrawReverseSpiral()
    {
        var spiral = Mathf.Approximately((float)_spiralCalculator.GetReal(), 0.5f) ? _spiralCalculator.GetZrs() : _spiralCalculator.GetEms();
        var zeta = spiral.zeta.ToVector();
        var norm = zeta.Normalized();

        var newJoints = new Vector[spiral.joints.Length];
        for(int i = 0; i < spiral.joints.Length; i++)
        {
            newJoints[i] = zeta + spiral.joints[i].Reflect(norm);
        }

        DrawSpiral(spiral, newJoints, ReverseSpiralColor);
    }

    private void SubRsInverseSum(Vector[] links){}
    private void DrawRsInverseSum(Vector[] links)
    {
        DrawSpiral(_spiralCalculator.GetSpiral(), links, InverseSpiralColor);
    }

    private void SubChi(Vector[] chi){}
    private void DrawChi()
    {
        DrawSpiral(_spiralCalculator.GetSpiral(), _spiralCalculator.GetChi(), ChiSpiralColor);
    }

    private void SubRsInverseSumReflected(Vector[] links){}
    private void DrawRsInverseSumReflected(Vector[] links)
    {
        var spiral = _spiralCalculator.GetSpiral();
        var zeta = spiral.zeta.ToVector();
        var norm = zeta.Normalized();
        var perp = new Vector(-norm.y, norm.x);

        var newJoints = new Vector[links.Length];
        for(int i = 0; i < newJoints.Length; i++)
        {
            newJoints[i] = zeta + links[i].Reflect(norm).Reflect(perp);
        }

        DrawSpiral(spiral, newJoints, InverseReflectedColor);
    }

    private void SubChiReflected(Vector[] chi){}
    private void DrawChiReflected()
    {
        var spiral = _spiralCalculator.GetSpiral();
        var zeta = spiral.zeta.ToVector();
        var norm = zeta.Normalized();
        var perp = new Vector(-norm.y, norm.x);

        var chi = _spiralCalculator.GetChi();
        var newJoints = new Vector[chi.Length];
        for(int i = 0; i < newJoints.Length; i++)
        {
            newJoints[i] = zeta + chi[i].Reflect(norm).Reflect(perp);
        }

        DrawSpiral(_spiralCalculator.GetSpiral(), newJoints, ChiSpiralColor);
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
        DrawSpiralLines(realUpToOne, Color.magenta);
        DrawSpiralLines(afterOne, Color.blue);
    }

    private void DrawSpiral(Zeta.Spiral spiral, Vector[] joints, Color color)
    {
        switch(_linksToDrawDropdown.value)
        {
            case 0: // ALL
                DrawSpiralLines(joints, color);
                if(_colorLinksToggle.isOn) HighlightBisectorLink(joints, spiral.middleIndex, color, true);
                break;
            case 1: // Bisector Link
                HighlightBisectorLink(joints, spiral.middleIndex, color, false);
                break;
            case 2: // Clock
                HighlightBisectorLink(joints, spiral.middleIndex, color, true);
                break;
        }
    }

    private void HighlightBisectorLink(Vector[] points, int middleIndex, Color color, bool includeClockArms)
    {
        using (Draw.StyleScope)
        {
            // color tint the bisector link
            var colorAlpha = 0.3f;
            var colorTint = 0.8f;
            Color newColor = Color.Lerp(color, _bisectorColor, colorTint);
            newColor.a = colorAlpha;
            Draw.Thickness = 3;
            Draw.Line(points[middleIndex], points[middleIndex + 1], newColor);

            if(includeClockArms)
            {
                newColor = Color.Lerp(color, _clockYinColor, colorTint);
                newColor.a = colorAlpha;
                Draw.Line(points[middleIndex - 1], points[middleIndex], newColor);

                newColor = Color.Lerp(color, _clockYangColor, colorTint);
                newColor.a = colorAlpha;
                Draw.Line(points[middleIndex + 1], points[middleIndex + 2], newColor);
            }
        }
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

