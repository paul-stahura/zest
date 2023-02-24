using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class SpiralMiddleLink : MonoBehaviour
{
    public App app;
    public Slider spiralNumber;
    public Text spiralNumDisplay;

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

        spiralNumber.onValueChanged.AddListener(value => spiralNumDisplay.text = value.ToString());
        app.DrawSprial += drawShapes;
    }

    void drawShapes(Camera cam, Zeta.Spiral spiral)
    {
        using (Draw.StyleScope)
        {
            var mi = Zeta.ImagToIndex(app.Imag);
            var i = (int)spiral.SpiralMiddleIndex(mi, spiralNumber.value);

            // Highlight the spiral middle link
            var j1 = spiral.joints[i];
            var j2 = spiral.joints[i + 1];
            Draw.Thickness = 8;
            Draw.Color = mlColor;
            Draw.Line(j1, j2);

            var center = j2.Clone();

            Draw.Thickness = 1;
            Draw.Color = mlCircle;
            if (CameraTracking.trackingIndex != -1)
            {
                i = CameraTracking.trackingIndex;
                center = spiral.joints[i + 1];
            }

            for (var l = i; l < i + (int)mi; l++)
            {
                // when looking at the end spiral ...
                if (l + 1 >= spiral.joints.Length)
                    return;

                j1 = spiral.joints[l];
                j2 = spiral.joints[l + 1];
                // circle with center at the right most side of the link 
                // (the side closer to zeta) with radius = 1/2 link length
                var radius = (float)(j2 - j1).Length / 2;
                Draw.Ring(center, radius, 1f);
            }
        }
    }
}
