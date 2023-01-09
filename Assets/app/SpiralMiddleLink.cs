using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class SpiralMiddleLink : MonoBehaviour
{
    public App app;
    public IntInput spiralNumber;
    public Slider txMidLink;
    public Slider txMidLinkCircle;

    public Color mlColor;
    public Color mlCircle;

    void OnApplicationQuit()
    {
        PlayerPrefs.SetFloat(name + "-TxMidLink", txMidLink.value);
        PlayerPrefs.SetFloat(name + "-TxMidLinkCircle", txMidLink.value);
    }

    // Start is called before the first frame update
    void Start()
    {
        txMidLink.onValueChanged.AddListener(value =>
        {
            mlColor = new Color(mlColor.r, mlColor.g, mlColor.b, value);
        });
        txMidLink.value = PlayerPrefs.GetFloat(name + "-TxMidLink", mlColor.a);

        txMidLinkCircle.onValueChanged.AddListener(value =>
        {
            mlCircle = new Color(mlCircle.r, mlCircle.g, mlCircle.b, value);
        });
        txMidLinkCircle.value = PlayerPrefs.GetFloat(name + "-TxMidLinkCircle", mlCircle.a);
        app.DrawSprial += drawShapes;
    }

    void drawShapes(Camera cam, Zeta.Spiral spiral)
    {
        using (Draw.StyleScope)
        {
            var mi = Zeta.ImagToIndex(app.Imag);
            var i = (int)spiral.SpiralMiddleIndex(mi, spiralNumber.Value);

            // Highlight the spiral middle link
            var j1 = spiral.joints[i];
            var j2 = spiral.joints[i + 1];
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;
            Draw.Matrix = transform.localToWorldMatrix;
            Draw.Thickness = 10 * .5f / cam.orthographicSize;
            Draw.Color = mlColor;
            Draw.Line(j1, j2);

            // circle with center at the right most side of the link 
            // (the side closer to zeta) with radius = 1/2 link length
            Draw.Thickness = 1;
            Draw.Color = mlCircle;
            var radius = (float)(j2 - j1).Length / 2;
            Draw.Ring(j2, radius, 1f);
        }
    }
}
