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
            var z = spiral.zeta.ToVector();
            z.Normalize();

            for (var i = 1; i < 2; i++)
            {
                var m = 1 / Math.Sqrt(i);
                var pt = z + z * m;

                Draw.Color = Color.magenta;
            }
        }
    }
}