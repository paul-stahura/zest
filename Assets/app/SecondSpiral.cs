using System.Numerics;
using Shapes;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class SecondSpiral : MonoBehaviour
{
    public App app;
    public Toggle drawSecondSpiral;
    public Toggle drawRealFan;
    //cbp - Center on Bisector Point
    public Toggle cbp;
    public TMP_Dropdown spiralFormula;
    public ZetaSpiral zetaSpiral;

    public Color ReimannColor = Color.cyan;
    public Color EtaColor = Color.magenta;
    public Color ZetColor = Color.blue;
    
    void Awake()
    {
        drawRealFan = GameObject.Find("DrawFanSpiralsToggle")?.GetComponent<Toggle>();
        cbp = GameObject.Find("CenterBisectorPointToggle")?.GetComponent<Toggle>();
    }

    public void Start()
    {
        app.DrawSprial += drawShapes;
    }

    void drawShapes(Camera cam, Zeta.Spiral spiral)
    {
        if(drawRealFan.isOn)
        {
            var centerBP = BisectorPoint.GetScaledBisectorPoint(spiral);
            DrawFanSpiral(cam, 0, spiral.input.Imaginary, centerBP);
            DrawFanSpiral(cam, 0.25, spiral.input.Imaginary, centerBP);
            DrawFanSpiral(cam, 0.5, spiral.input.Imaginary, centerBP);
            DrawFanSpiral(cam, 0.75, spiral.input.Imaginary, centerBP);
            DrawFanSpiral(cam, 1, spiral.input.Imaginary, centerBP);
        }

        if(drawSecondSpiral.isOn)
        {
            Zeta.Spiral s;
            Vector offset = new Vector(0,0);

            switch(spiralFormula.value)
            {
                case (int)SpiralFormulas.ReimannSiegel:
                    s = new Zeta.Spiral(spiral.input, SpiralFormulas.EtaFormula);
                    DrawSpiral(cam, EtaColor, s, offset);
                    if(spiral.input.Imaginary < 40.9)
                    {
                        s = new Zeta.Spiral(spiral.input, SpiralFormulas.ZetFormula);
                        DrawSpiral(cam, ZetColor, s, offset);
                    }
                    break;

                case (int)SpiralFormulas.EulerMaclauren:
                    s = new Zeta.Spiral(spiral.input, SpiralFormulas.EtaFormula);
                    DrawSpiral(cam, EtaColor, s, offset);
                    if(spiral.input.Imaginary < 40.9)
                    {
                        s = new Zeta.Spiral(spiral.input, SpiralFormulas.ZetFormula);
                        DrawSpiral(cam, ZetColor, s, offset);
                    }
                    break;

                case (int)SpiralFormulas.EtaFormula:
                    if(spiral.input.Real != 0.5)
                    {
                        s = new Zeta.Spiral(spiral.input, SpiralFormulas.EulerMaclauren);
                    }
                    else 
                    {
                        s = new Zeta.Spiral(spiral.input, SpiralFormulas.ReimannSiegel);
                    }
                    DrawSpiral(cam, ReimannColor, s, offset);

                    if(spiral.input.Imaginary < 40.9)
                    {
                        s = new Zeta.Spiral(spiral.input, SpiralFormulas.ZetFormula);
                        DrawSpiral(cam, ZetColor, s, offset);
                    }
                    break;

                case (int)SpiralFormulas.ZetFormula:
                    s = new Zeta.Spiral(spiral.input, SpiralFormulas.ReimannSiegel);
                    DrawSpiral(cam, ReimannColor, s, offset);
                    s = new Zeta.Spiral(spiral.input, SpiralFormulas.EtaFormula);
                    DrawSpiral(cam, EtaColor, s, offset);
                    break;

                default:
                    break;
            }
        }
    }

    private void DrawFanSpiral(Camera cam, double real, double imaginary, Vector centerBP)
    {
        Zeta.Spiral s;
        s = new Zeta.Spiral(new Complex(real, imaginary), (SpiralFormulas)spiralFormula.value);
        var offset = new Vector(0,0);
        if(cbp.isOn)
        {
            offset = centerBP - BisectorPoint.GetScaledBisectorPoint(s);
        }
        DrawSpiral(cam, Color.white, s, offset);
    }

    private void DrawSpiral(Camera cam, Color color, Zeta.Spiral s, Vector offset)
    {
        var tempColor = zetaSpiral.spiralColor;
        zetaSpiral.spiralColor = color;
        zetaSpiral.DrawOffsetSpiral(cam, s, offset);
        zetaSpiral.spiralColor = tempColor;
    }
}
