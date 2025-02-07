using System.Numerics;
using Shapes;
using TMPro;
using Vector2 = UnityEngine.Vector2;
using Vector3 = UnityEngine.Vector3;
using UnityEngine;
using UnityEngine.UI;

public class SecondSpiral : MonoBehaviour
{
    public App app;
    public Toggle drawSecondSpiral;
    public Toggle drawRealOneHalf;
    public Toggle drawRealFan;
    //cbp - Center on Bisector Point
    public Toggle cbp;
    public Slider bisectorTransparencySlider;
    public Slider targetTransparencySlider;
    public Toggle bisectorToggle;
    public TMP_Dropdown spiralFormula;
    public ZetaSpiral zetaSpiral;

    public Color ReimannColor = Color.cyan;
    public Color EtaColor = Color.magenta;
    public Color ZetColor = Color.blue;
    
    void Awake()
    {
        zetaSpiral = GameObject.Find("ZetaSpiral")?.GetComponent<ZetaSpiral>();

        drawRealOneHalf = GameObject.Find("DrawRealOneHalfToggle")?.GetComponent<Toggle>();
        drawRealFan = GameObject.Find("DrawFanSpiralsToggle")?.GetComponent<Toggle>();
        cbp = GameObject.Find("CenterBisectorPointToggle")?.GetComponent<Toggle>();
        bisectorTransparencySlider = GameObject.Find("BisectorTransparencySlider")?.GetComponent<Slider>();
        targetTransparencySlider = GameObject.Find("TargetTransparencySlider")?.GetComponent<Slider>();
        bisectorToggle = GameObject.Find("BisectorPointToggle")?.GetComponent<Toggle>();
    }

    public void Start()
    {
        app.DrawSprial += drawShapes;
    }

    void drawShapes(Camera cam, Zeta.Spiral spiral)
    {
        if(drawRealFan.isOn)
        {
            var centerBP = BisectorPoint.GetScaledBisectorPoint(spiral, app.useNewImagToggle.isOn);
            DrawFanSpiral(cam, 0, spiral.index, (SpiralFormulas)spiralFormula.value, centerBP);
            DrawFanSpiral(cam, 0.25, spiral.index, (SpiralFormulas)spiralFormula.value, centerBP);
            DrawFanSpiral(cam, 0.5, spiral.index, (SpiralFormulas)spiralFormula.value, centerBP);
            DrawFanSpiral(cam, 0.75, spiral.index, (SpiralFormulas)spiralFormula.value, centerBP);
            DrawFanSpiral(cam, 1, spiral.index, (SpiralFormulas)spiralFormula.value, centerBP);
        }

        if(drawRealOneHalf.isOn)
        {
            var centerBP = BisectorPoint.GetScaledBisectorPoint(spiral, app.useNewImagToggle.isOn);
            DrawFanSpiral(cam, 0.5, spiral.index, SpiralFormulas.ReimannSiegel, centerBP);
        }

        if(drawSecondSpiral.isOn)
        {
            Zeta.Spiral s;
            Vector offset = new Vector(0,0);

            switch(spiralFormula.value)
            {
                case (int)SpiralFormulas.ReimannSiegel:
                    s = new Zeta.Spiral(spiral.real, spiral.index, SpiralFormulas.EtaFormula, app.useNewImagToggle.isOn);
                    DrawSpiral(cam, EtaColor, s, offset);
                    if(spiral.imaginary < 40.9)
                    {
                        s = new Zeta.Spiral(spiral.real, spiral.index, SpiralFormulas.ZetFormula, app.useNewImagToggle.isOn);
                        DrawSpiral(cam, ZetColor, s, offset);
                    }
                    break;

                case (int)SpiralFormulas.EulerMaclauren:
                    s = new Zeta.Spiral(spiral.real, spiral.index, SpiralFormulas.EtaFormula, app.useNewImagToggle.isOn);
                    DrawSpiral(cam, EtaColor, s, offset);
                    if(spiral.imaginary < 40.9)
                    {
                        s = new Zeta.Spiral(spiral.real, spiral.index, SpiralFormulas.ZetFormula, app.useNewImagToggle.isOn);
                        DrawSpiral(cam, ZetColor, s, offset);
                    }
                    break;

                case (int)SpiralFormulas.EtaFormula:
                    if(spiral.real != 0.5)
                    {
                        s = new Zeta.Spiral(spiral.real, spiral.index, SpiralFormulas.EulerMaclauren, app.useNewImagToggle.isOn);
                    }
                    else 
                    {
                        s = new Zeta.Spiral(spiral.real, spiral.index, SpiralFormulas.ReimannSiegel, app.useNewImagToggle.isOn);
                    }
                    DrawSpiral(cam, ReimannColor, s, offset);

                    if(spiral.imaginary < 40.9)
                    {
                        s = new Zeta.Spiral(spiral.real, spiral.index, SpiralFormulas.ZetFormula, app.useNewImagToggle.isOn);
                        DrawSpiral(cam, ZetColor, s, offset);
                    }
                    break;

                case (int)SpiralFormulas.ZetFormula:
                    s = new Zeta.Spiral(spiral.real, spiral.index, SpiralFormulas.ReimannSiegel, app.useNewImagToggle.isOn);
                    DrawSpiral(cam, ReimannColor, s, offset);
                    s = new Zeta.Spiral(spiral.real, spiral.index, SpiralFormulas.EtaFormula, app.useNewImagToggle.isOn);
                    DrawSpiral(cam, EtaColor, s, offset);
                    break;

                default:
                    break;
            }
        }
    }

    private void DrawFanSpiral(Camera cam, double real, double index, SpiralFormulas formula, Vector centerBP)
    {
        Zeta.Spiral s;
        s = new Zeta.Spiral(real, index, formula, app.useNewImagToggle.isOn);
        var offset = new Vector(0,0);
        if(cbp != null && cbp.isOn)
        {
            offset = centerBP - BisectorPoint.GetScaledBisectorPoint(s, app.useNewImagToggle.isOn);
        }
        DrawSpiral(cam, Color.white, s, offset);
    }

    private void DrawSpiral(Camera cam, Color color, Zeta.Spiral s, Vector offset)
    {
        var tempColor = zetaSpiral.spiralColor;
        zetaSpiral.spiralColor = color;
        zetaSpiral.DrawOffsetSpiral(cam, s, offset);
        zetaSpiral.spiralColor = tempColor;

        Vector bp = BisectorPoint.GetScaledBisectorPoint(s, app.useNewImagToggle.isOn);

        if(bisectorToggle.isOn && bisectorTransparencySlider.value != 0)
        {
            using(Draw.StyleScope)
            {
                color = Color.cyan;
                color.a = bisectorTransparencySlider.value;
                Draw.Color = color;
                Draw.Thickness = 1 + color.a;

                Draw.Line(s.zeta.ToVector2(), bp);
            }
        }

        if(targetTransparencySlider.value > 0)
        {
            color = Color.cyan;
            color.a = targetTransparencySlider.value;
            
            Draw.Color = color;
            Draw.Thickness = 1;
            // !!! the leg lengths at 1/2 are not always equal with the Bp formula
            // Draw.Ring(bp, UnityEngine.Vector3.Distance(bp, s.zeta.ToVector2()));
            Draw.Ring(bp, Vector3.Distance(Vector2.zero, bp));

            color.a = targetTransparencySlider.value - 0.5f;
            color.a = color.a < 0 ? 0 : color.a;
            Draw.Color = color;
            Draw.Thickness = 1 + color.a;
            ShapesUtils.DrawCross(s.zeta.ToVector2(), .1f);
        }
    }
}
