using System;
using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class ZetaLaidOut : ImmediateModeShapeDrawer
{
    public ZetaSpiral zs;
    public Slider transparency;

    void Start()
    {
    }

    public override void DrawShapes(Camera cam)
    {
        var spiral = zs.S;

        using (Draw.Command(cam))
        {
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;

            var z = spiral.zetaPoint;
            z.Normalize();

            // set static parameter to draw in the local space of this object
            Draw.Matrix = transform.localToWorldMatrix;
            using (Draw.StyleScope)
            {
                for (var i = 1; i < 2; i++)
                {
                    var m = 1 / Math.Sqrt(i);
                    var pt = spiral.zetaPoint + z * m;

                    Draw.Color = Color.magenta;
                }
            }
        }
    }
}