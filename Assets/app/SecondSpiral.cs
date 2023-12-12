using TMPro;
using UnityEngine;
using UnityEngine.UI;

// [RequireComponent(typeof(ZetaSpiral))]
public class SecondSpiral : MonoBehaviour
{
    public App app;
    public Toggle drawSecondSpiral;
    public TMP_Dropdown spiralFormula;
    public ZetaSpiral secondZetaSpiral;

    public Color secondSpiralColor = Color.cyan;
    private Color firstSpiralColor;
    
    public void Start()
    {
        app.DrawSprial += drawShapes;
    }

    void drawShapes(Camera cam, Zeta.Spiral spiral)
    {
        if(drawSecondSpiral.isOn)
        {
            Zeta.Spiral s2;
            if(spiralFormula.value == (int)SpiralFormulas.EtaFormula)
            {
                if(spiral.input.Real != 0.5)
                {
                    s2 = new Zeta.Spiral(spiral.input, SpiralFormulas.EulerMaclauren);
                }
                else
                {
                    s2 = new Zeta.Spiral(spiral.input, SpiralFormulas.ReimannSiegel);
                }
            }
            else
            {
                s2 = new Zeta.Spiral(spiral.input, SpiralFormulas.EtaFormula);
            }

            firstSpiralColor = secondZetaSpiral.spiralColor;
            secondZetaSpiral.spiralColor = secondSpiralColor;
            secondZetaSpiral.DrawShapes(cam, s2);
            secondZetaSpiral.spiralColor = firstSpiralColor;
        }
    }
}
