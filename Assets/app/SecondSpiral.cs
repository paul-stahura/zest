using Shapes;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class SecondSpiral : MonoBehaviour
{
    public App app;
    public Toggle drawSecondSpiral;
    public TMP_Dropdown spiralFormula;
    public ZetaSpiral zetaSpiral;

    public Color ReimannColor = Color.cyan;
    public Color EtaColor = Color.magenta;
    public Color ZetColor = Color.blue;
    
    public void Start()
    {
        app.DrawSprial += drawShapes;
    }

    void drawShapes(Camera cam, Zeta.Spiral spiral)
    {
        if(drawSecondSpiral.isOn)
        {
            Zeta.Spiral s;
            switch(spiralFormula.value)
            {
                case (int)SpiralFormulas.ReimannSiegel:
                    s = new Zeta.Spiral(spiral.input, SpiralFormulas.EtaFormula);
                    DrawSpiral(cam, EtaColor, s);
                    if(spiral.input.Imaginary < 40.9)
                    {
                        s = new Zeta.Spiral(spiral.input, SpiralFormulas.ZetFormula);
                        DrawSpiral(cam, ZetColor, s);
                    }
                    break;

                case (int)SpiralFormulas.EulerMaclauren:
                    s = new Zeta.Spiral(spiral.input, SpiralFormulas.EtaFormula);
                    DrawSpiral(cam, EtaColor, s);
                    if(spiral.input.Imaginary < 40.9)
                    {
                        s = new Zeta.Spiral(spiral.input, SpiralFormulas.ZetFormula);
                        DrawSpiral(cam, ZetColor, s);
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
                    DrawSpiral(cam, ReimannColor, s);

                    if(spiral.input.Imaginary < 40.9)
                    {
                        s = new Zeta.Spiral(spiral.input, SpiralFormulas.ZetFormula);
                        DrawSpiral(cam, ZetColor, s);
                    }
                    break;

                case (int)SpiralFormulas.ZetFormula:
                    s = new Zeta.Spiral(spiral.input, SpiralFormulas.ReimannSiegel);
                    DrawSpiral(cam, ReimannColor, s);
                    s = new Zeta.Spiral(spiral.input, SpiralFormulas.EtaFormula);
                    DrawSpiral(cam, EtaColor, s);
                    break;

                default:
                    break;
            }
        }
    }

    private void DrawSpiral(Camera cam, Color color, Zeta.Spiral s)
    {
        var tempColor = zetaSpiral.spiralColor;
        zetaSpiral.spiralColor = color;
        zetaSpiral.DrawShapes(cam, s);
        zetaSpiral.spiralColor = tempColor;
    }
}
