using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class SpiralMiddleLink : MonoBehaviour
{
    public App app;
    public IntInput spiralNumber;
    public Slider transparency;
    public Color color;

    void OnApplicationQuit() {
        PlayerPrefs.SetFloat(name + "-Transparency", transparency.value);
    }

    // Start is called before the first frame update
    void Start()
    {
        transparency.onValueChanged.AddListener(value =>
        {
            color = new Color(color.r, color.g, color.b, value);
        });
        transparency.value = PlayerPrefs.GetFloat(name + "-Transparency", color.a);
        app.DrawSprial += drawShapes;
    }

    void drawShapes(Camera cam, Zeta.Spiral spiral)
    {
        using (Draw.StyleScope)
        {
            var mi = Zeta.ImagToIndex(app.Imag);
            var i = (int)spiral.SpiralMiddleIndex(mi, spiralNumber.Value);

            using (Draw.StyleScope)
            {
                var j1 = spiral.joints[i];
                var j2 = spiral.joints[i + 1];
                Draw.LineGeometry = LineGeometry.Volumetric3D;
                Draw.ThicknessSpace = ThicknessSpace.Pixels;
                Draw.Matrix = transform.localToWorldMatrix;
                Draw.Thickness = 10 * .5f/cam.orthographicSize;
                Draw.Color = color;
                Draw.Line(j1, j2);
            }
        }
    }
}
