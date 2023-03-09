using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class SpiralLinkCircles : MonoBehaviour
{
    public App app;
    public Slider spiralNumber;
    public Text spiralNumDisplay;

    [Tooltip("Transparency of the circles")]
    public Slider txMidLinkCircle; // circles transparency

    public Color mlCircle;

    void OnApplicationQuit()
    {
        PlayerPrefs.SetFloat(name + "-TxMidLinkCircle", txMidLinkCircle.value);
    }

    // Start is called before the first frame update
    void Start()
    {
        txMidLinkCircle.onValueChanged.AddListener(value =>
        {
            mlCircle = new Color(mlCircle.r, mlCircle.g, mlCircle.b, value);
        });
        txMidLinkCircle.value = PlayerPrefs.GetFloat(name + "-TxMidLinkCircle", mlCircle.a);

        spiralNumber.onValueChanged.AddListener(value => spiralNumDisplay.text = value.ToString());
        app.DrawSprial += drawShapes;
    }

    
    //
    // Draws concentric circles with the center on the next joint to the link
    // the camera is tracking. The number of circles is the current middle index (MI).
    // The radius is 1/2 the link length from the current link and the next -MI-
    // link lengths.
    void drawShapes(Camera cam, Zeta.Spiral spiral)
    {
        using (Draw.StyleScope)
        {
            var mi = Zeta.ImagToIndex(app.Imag);
            var i = (int)spiral.SpiralMiddleIndex(mi, spiralNumber.value);

            // Highlight the spiral middle link
            var j1 = spiral.joints[i];
            var j2 = spiral.joints[i + 1];

            var center = j2.Clone();

            Draw.Thickness = 1;
            Draw.Color = mlCircle;

            // If the camera is tracking a link, draw the circles on that link instead
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
