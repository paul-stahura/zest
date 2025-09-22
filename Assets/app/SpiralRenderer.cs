using System;
using System.Collections;
using System.Collections.Generic;
using System.Numerics;
using Shapes;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Vector2 = UnityEngine.Vector2;

public class SpiralRenderer : ImmediateModeShapeDrawer
{
    [SerializeField] private MultiOptionToggle _spiralTransparency;
    [Header("Spiral Colors")]
    [SerializeField] private Color EmsColor;
    [SerializeField] private Toggle _emsForwardToggle;
    [SerializeField] private Color ZrsColor;
    [SerializeField] private Toggle _ZrsForwardToggle;
    [SerializeField] private Toggle _forwardReflectedToggle;
    [SerializeField] private Color ReverseSpiralColor;
    [SerializeField] private Toggle _reverseSpiralToggle;
    [SerializeField] private Color InverseSpiralColor;
    [SerializeField] private Toggle _inverseSpiralToggle;
    [SerializeField] private Color InverseReflectedColor;
    [SerializeField] private Toggle _inverseReflectedToggle;

    [SerializeField] private Color ZakColor;
    [SerializeField] private Color ZakRemainderColor;
    [SerializeField] private Toggle _zakLinksToggle;
    [SerializeField] private Toggle _zakRemainderLinkToggle;
    [SerializeField] private Toggle _zakInverseLinksToggle;
    [SerializeField] private Toggle _zakInverseRemainderLinkToggle;

    [SerializeField] private Color EtaSpiralColor;
    [SerializeField] private Toggle _etaSpiralToggle;

    [SerializeField] private Toggle _realPathToggle;

    [Header("Bisector/Clock Colors")]
    [SerializeField] private TMP_Dropdown _linksToDrawDropdown;
    [SerializeField] private MultiOptionToggle _colorLinksToggle;
    [SerializeField] private Color _bisectorColor = new Color(0.9607844f, 0.6901961f, 0.3333333f, 1);
    [SerializeField] private Color _clockYinColor = Color.green;
    [SerializeField] private Color _clockYangColor = Color.red;

    private SpiralCalculator _spiralCalculator;

    void Awake()
    {
        _spiralTransparency = GameObject.Find("SpiralTransparencyMOT").GetComponent<MultiOptionToggle>();

        _emsForwardToggle = GameObject.Find("EmsForwardToggle").GetComponent<Toggle>();
        _ZrsForwardToggle = GameObject.Find("ZrsForwardToggle").GetComponent<Toggle>();
        _forwardReflectedToggle = GameObject.Find("forwardReflectedToggle").GetComponent<Toggle>();
        _reverseSpiralToggle = GameObject.Find("ReverseSpiralToggle").GetComponent<Toggle>();
        _inverseSpiralToggle = GameObject.Find("InverseSpiralToggle").GetComponent<Toggle>();
        _inverseReflectedToggle = GameObject.Find("InverseReflectedToggle").GetComponent<Toggle>();

        _zakLinksToggle = GameObject.Find("ZakLinksToggle").GetComponent<Toggle>();
        _zakRemainderLinkToggle = GameObject.Find("ZakRemainderLinkToggle").GetComponent<Toggle>();

        _zakInverseLinksToggle = GameObject.Find("ZakInverseLinksToggle").GetComponent<Toggle>();
        _zakInverseRemainderLinkToggle = GameObject.Find("ZakInverseRemainderLinkToggle").GetComponent<Toggle>();

        _etaSpiralToggle = GameObject.Find("EtaSpiralToggle").GetComponent<Toggle>();

        _realPathToggle = GameObject.Find("RealPathToggle").GetComponent<Toggle>();
        _linksToDrawDropdown = GameObject.Find("LinksToDrawDropdown").GetComponent<TMP_Dropdown>();
        _colorLinksToggle = GameObject.Find("ColorBisectorOptionsToggle").GetComponent<MultiOptionToggle>();

        _spiralCalculator = GameObject.Find("Spiral Calculator").GetComponent<SpiralCalculator>();

        SubSpirals();

        // init
        _emsForwardToggle.isOn = true;
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

    public void InvertColors()
    {
        EmsColor = ColorInverter.InvertColor(EmsColor);
    }

    private void DrawSpirals()
    {
        if (_emsForwardToggle.isOn) DrawEms(_spiralCalculator.GetEms());
        if (_ZrsForwardToggle.isOn) DrawZrs(_spiralCalculator.GetZrs());
        if (_forwardReflectedToggle.isOn) DrawSpiral((int)Math.Floor(_spiralCalculator.GetIndex()), _spiralCalculator.GetForwardReflected(), EmsColor);
        if (_reverseSpiralToggle.isOn) DrawReverseSpiral();
        if (_inverseSpiralToggle.isOn) DrawRsInverseSum(_spiralCalculator.GetRsInverseSum());
        if (_inverseReflectedToggle.isOn) DrawRsInverseSumReflected(_spiralCalculator.GetRsInverseSum());

        if (_zakLinksToggle.isOn) DrawSpiralLines(_spiralCalculator.GetZakLinks(), ZakColor);
        if (_zakRemainderLinkToggle.isOn) DrawSpiralLines(_spiralCalculator.GetZakRemainderLink(), ZakRemainderColor, 3);

        if (_zakInverseLinksToggle.isOn) DrawSpiralLines(_spiralCalculator.GetZakInverseLinks(), ZakColor);
        if (_zakInverseRemainderLinkToggle.isOn) DrawSpiralLines(_spiralCalculator.GetZakInverseRemainderLink(), ZakRemainderColor, 3);

        if (_etaSpiralToggle.isOn) DrawEtaSpiral(_spiralCalculator.GetEta());

        if (_realPathToggle.isOn) DrawRealPath();

        // DrawDifSpiral();
    }

    private void DrawDifSpiral()
    {
        var real = _spiralCalculator.GetReal();
        var index = _spiralCalculator.GetIndex();

        var sForward = _spiralCalculator.GetEms();
        var sInverse = _spiralCalculator.GetRsInverseSum();

        int bisectorIndex = (int)Math.Floor(index) + 1;
        var sDif = new Vector[bisectorIndex + 1];

        // add up to bisector
        for (int i = 0; i < bisectorIndex; i++)
        {
            sDif[i] = (sForward.joints[i] + sInverse[i]) / 2;
        }

        using (Draw.StyleScope)
        {
            Draw.Color = Color.yellow;
            Draw.Thickness = 2;
        }

        // add dist from joint
        Vector r1 = SumRemainders.CalcZpsR1(real, index).ToVector();
        Vector r2 = SumRemainders.CalcZpsR2(real, index).ToVector();
        r1 += sForward.joints[bisectorIndex - 1];
        r2 += sInverse[bisectorIndex - 1];

        sDif[bisectorIndex] = (r1 + r2) / 2;

        // draw the dif between each sum of links
        DrawSpiralLines(sDif, Color.cyan, 1);
        using (Draw.StyleScope)
        {
            Draw.Color = Color.red;
            Draw.Thickness = 2;
            // draw the bisector link
            ShapesUtils.DrawCross(sDif[bisectorIndex], 0.03f);
        }

        // draw line between dif links
        using (Draw.StyleScope)
        {
            Draw.Thickness = 1;
            Draw.Line(Vector2.zero, r1 + r2, Color.yellow);
        }
    }

    private void SubSpirals()
    {
        _spiralTransparency.OnOptionChanged += SpiralTransparenyOptionChanged;
        SpiralTransparenyOptionChanged(_spiralTransparency.GetSelectedOption().Item1);

        _emsForwardToggle.onValueChanged.AddListener((value) =>
        {
            if (value)
            {
                SpiralCalculator.UpdateEms += SubEms;
            }
            else
            {
                SpiralCalculator.UpdateEms -= SubEms;
            }
        });

        _ZrsForwardToggle.onValueChanged.AddListener((value) =>
        {
            if (value)
            {
                SpiralCalculator.UpdateZrs += SubZrs;
            }
            else
            {
                SpiralCalculator.UpdateZrs -= SubZrs;
            }
        });

        _forwardReflectedToggle.onValueChanged.AddListener((value) =>
        {
            if (value)
            {
                SpiralCalculator.UpdateForwardReflected += SubForwardReflected;
            }
            else
            {
                SpiralCalculator.UpdateForwardReflected -= SubForwardReflected;
            }
        });

        _reverseSpiralToggle.onValueChanged.AddListener((value) =>
        {
            if (value)
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

        _inverseSpiralToggle.onValueChanged.AddListener((value) =>
        {
            if (value) SpiralCalculator.UpdateRsInverseSum += SubRsInverseSum;
            else SpiralCalculator.UpdateRsInverseSum -= SubRsInverseSum;
        });

        _inverseReflectedToggle.onValueChanged.AddListener((value) =>
        {
            if (value)
            {
                SpiralCalculator.UpdateRsInverseSum += SubRsInverseSumReflected;
            }
            else
            {
                SpiralCalculator.UpdateRsInverseSum -= SubRsInverseSumReflected;
            }
        });

        _zakLinksToggle.onValueChanged.AddListener((value) =>
        {
            if (value) SpiralCalculator.UpdateZakLinks += SubZakLinks;
            else SpiralCalculator.UpdateZakLinks -= SubZakLinks;
        });

        _zakRemainderLinkToggle.onValueChanged.AddListener((value) =>
        {
            if (value) SpiralCalculator.UpdateZakLinks += SubZakLinks;
            else SpiralCalculator.UpdateZakLinks -= SubZakLinks;
        });

        _etaSpiralToggle.onValueChanged.AddListener((value) =>
        {
            if (value) SpiralCalculator.UpdateEta += SubEtaSpiral;
            else SpiralCalculator.UpdateEta -= SubEtaSpiral;
        });


        _realPathToggle.onValueChanged.AddListener((value) =>
        {
            if (value) SpiralCalculator.UpdateRealPath += SubRealPath;
            else SpiralCalculator.UpdateRealPath -= SubRealPath;
        });
    }

    private void SpiralTransparenyOptionChanged(int option)
    {
        switch (option)
        {
            case 0: // Light
                SetColorTransparency(0.25f);
                break;
            case 1: // Half
                SetColorTransparency(0.5f);
                break;
            case 2: // Full
                SetColorTransparency(1f);
                break;
        }
    }

    private void SetColorTransparency(float colorAlpha)
    {
        EmsColor.a = colorAlpha;
        ZrsColor.a = colorAlpha;
        ReverseSpiralColor.a = colorAlpha;
        InverseSpiralColor.a = colorAlpha;
        InverseReflectedColor.a = colorAlpha;
        EtaSpiralColor.a = colorAlpha;
    }

    private void SubEms(Zeta.Spiral spiral) { }
    private void DrawEms(Zeta.Spiral ems)
    {
        DrawSpiral(ems.middleIndex, ems.joints, EmsColor);
    }

    private void ZrsOptionChanged(int option)
    {
        if (option > 0)
        {
            if (option == 1)
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
    private void SubZrs(Zeta.Spiral spiral) { }
    private void DrawZrs(Zeta.Spiral zrs)
    {
        DrawSpiral(zrs.middleIndex, zrs.joints, ZrsColor);
    }

    private void SubForwardReflected(Vector[] links) { }

    private void DrawReverseSpiral()
    {
        var spiral = Mathf.Approximately((float)_spiralCalculator.GetReal(), 0.5f) ? _spiralCalculator.GetZrs() : _spiralCalculator.GetEms();
        var zeta = spiral.zeta.ToVector();
        var norm = zeta.Normalized();

        var newJoints = new Vector[spiral.joints.Length];
        for (int i = 0; i < spiral.joints.Length; i++)
        {
            newJoints[i] = zeta + spiral.joints[i].Reflect(norm);
        }

        DrawSpiral(spiral.middleIndex, newJoints, ReverseSpiralColor);
    }

    private void SubRsInverseSum(Vector[] links) { }
    private void DrawRsInverseSum(Vector[] links)
    {
        DrawSpiral((int)Math.Floor(_spiralCalculator.GetIndex()), links, InverseSpiralColor);
    }

    private void SubRsInverseSumReflected(Vector[] links) { }
    private void DrawRsInverseSumReflected(Vector[] links)
    {
        var spiral = _spiralCalculator.GetSpiral();
        var zeta = spiral.zeta.ToVector();
        // var zeta = _spiralCalculator.GetForwardBisector() + _spiralCalculator.GetInverseBisector();
        var norm = zeta.Normalized();
        var perp = new Vector(-norm.y, norm.x);

        var newJoints = new Vector[links.Length];
        for (int i = 0; i < newJoints.Length; i++)
        {
            newJoints[i] = zeta + links[i].Reflect(norm).Reflect(perp);
        }

        DrawSpiral(spiral.middleIndex, newJoints, InverseReflectedColor);
    }

    private void SubZakLinks(Vector[] links) { }

    private void SubEtaSpiral(Zeta.Spiral spiral) { }
    private void DrawEtaSpiral(Zeta.Spiral eta)
    {
        DrawSpiralLines(eta.joints, EtaSpiralColor);
    }

    private void SubRealPath(List<Vector> pat, int indexOne) { }
    private void DrawRealPath()
    {
        var realPath = _spiralCalculator.GetRealPath().Item1.ToArray();
        var indexOne = _spiralCalculator.GetRealPath().Item2;
        var realUpToOne = new Vector[indexOne + 1];
        for (int i = 0; i <= indexOne; i++)
        {
            realUpToOne[i] = realPath[i];
        }

        var afterOne = new Vector[realPath.Length - indexOne];
        for (int i = 0; i < afterOne.Length; i++)
        {
            afterOne[i] = realPath[i + indexOne];
        }
        DrawSpiralLines(realUpToOne, Color.magenta);
        DrawSpiralLines(afterOne, Color.blue);
    }

    private void DrawSpiral(int middleIndex, Vector[] joints, Color color)
    {
        var highlight = _colorLinksToggle.GetSelectedOption().Item1;
        bool colorBisector = highlight > 0;
        bool colorClock = highlight == 3;
        switch (_linksToDrawDropdown.value)
        {
            case 0: // ALL
                DrawSpiralLines(joints, color);
                if (colorBisector) HighlightBisectorLink(joints, middleIndex, color);
                if (colorClock) HighlighClockArms(joints, middleIndex, color);
                break;
            case 1: // up to Sum1
                // create a new joint array that only includes the joints up to the bisector link
                var partJoints = new Vector[middleIndex + 1];
                Array.Copy(joints, partJoints, middleIndex + 1);
                DrawSpiralLines(partJoints, color);
                break;
            case 2: // up To Bisector Link
                // create a new joint array that only includes the joints up to the bisector link
                partJoints = new Vector[middleIndex + 2];
                Array.Copy(joints, partJoints, middleIndex + 2);
                DrawSpiralLines(partJoints, color);
                if (colorBisector) HighlightBisectorLink(partJoints, middleIndex, color);
                break;
            case 3: // Bisector Link
                HighlightBisectorLink(joints, middleIndex, color);
                break;
            case 4: // Clock
                HighlightBisectorLink(joints, middleIndex, color);
                HighlighClockArms(joints, middleIndex, color);
                break;
            case 5: // Last Link
                HighlightLastLink(joints, color);
                break;
        }
    }

    private void HighlightBisectorLink(Vector[] points, int middleIndex, Color color)
    {
        using (Draw.StyleScope)
        {
            // color tint the bisector link
            var colorAlpha = 0.3f;
            var colorTint = 0.6f;
            Color newColor = Color.Lerp(color, _bisectorColor, colorTint);
            newColor.a = colorAlpha;
            Draw.Thickness = 3;
            Draw.Line(points[middleIndex], points[middleIndex + 1], newColor);
        }
    }

    private void HighlighClockArms(Vector[] points, int middleIndex, Color color)
    {
        using (Draw.StyleScope)
        {
            // color tint arms
            var colorAlpha = 0.3f;
            var colorTint = 0.6f;
            Draw.Thickness = 3;

            Color newColor = Color.Lerp(color, _clockYinColor, colorTint);
            newColor.a = colorAlpha;
            Draw.Line(points[middleIndex - 1], points[middleIndex], newColor);

            newColor = Color.Lerp(color, _clockYangColor, colorTint);
            newColor.a = colorAlpha;
            Draw.Line(points[middleIndex + 1], points[middleIndex + 2], newColor);
        }
    }

    private void HighlightLastLink(Vector[] points, Color color)
    {
        using (Draw.StyleScope)
        {
            var colorAlpha = 0.3f;
            var colorTint = 0.6f;
            Draw.Thickness = 3;

            Color newColor = Color.Lerp(color, Color.red, colorTint);
            newColor.a = colorAlpha;
            Draw.Line(points[points.Length - 2], points[points.Length - 1], newColor);
        }
    }

    private void DrawSpiralLines(Vector[] points, Color color, int thickness = 1)
    {
        using (Draw.StyleScope)
        {
            Draw.Color = color;
            Draw.Thickness = thickness;
            for (int i = 0; i < points.Length - 1; i++)
            {
                Draw.Line(points[i], points[i + 1], color);
            }
        }
    }
}

