using System;
using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class ZetaLaidOut : MonoBehaviour
{
    public App app;
    public Slider transparency;

    void Start()
    {
        app.DrawSprial += drawShapes;
    }

    void drawShapes(Camera cam, Zeta.Spiral spiral)
    {
        using (Draw.StyleScope)
        {
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;

            var z = spiral.zeta.ToVector();
            z.Normalize();

            // set static parameter to draw in the local space of this object
            Draw.Matrix = transform.localToWorldMatrix;
            for (var i = 1; i < 2; i++)
            {
                var m = 1 / Math.Sqrt(i);
                var pt = z + z * m;

                Draw.Color = Color.magenta;
            }
        }
    }
}