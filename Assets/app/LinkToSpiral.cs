using System;
using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class LinkToSpiral : ImmediateModeShapeDrawer
{
    public ZetaSpiral zs;
    public App app;

    public override void DrawShapes(Camera cam)
    {
        var spiral = zs.S;

        using (Draw.Command(cam))
        {
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;
            Draw.Thickness = 1;

            // set static parameter to draw in the local space of this object
            Draw.Matrix = transform.localToWorldMatrix;
            using (Draw.StyleScope)
            {
                var slope = -spiral.zetaPoint.x / spiral.zetaPoint.y;
                var z = spiral.zetaPoint.ToVector2();

                Draw.Thickness = 1;
                Draw.Color = Color.blue;

                // draw a line from each of the first links at the same slope as zeta
                for (var i = 1; i < spiral.middleIndex; i++)
                {
                    var from = spiral.links[i].ToVector2();
                    var to = from + z;
                    // to.Scale(new Vector2(4f / to.magnitude, 4 / to.magnitude));
                    Draw.Line(from, to);
                }
            }
        }
    }

    Vector2 zeta(Zeta.Spiral spiral)
    {
        var idx = spiral.middleIndex;
        var M1 = spiral.links[idx];
        var M2 = spiral.links[idx + 1];

        // Finds the intersecting point between the bisecting line and the middle link
        var slope1 = -spiral.zetaPoint.x / spiral.zetaPoint.y;
        var slope2 = (M2.y - M1.y) / (M2.x - M1.x);

        var x = ((slope2 * M2.x - slope1 * spiral.zetaPoint.x / 2) - (M2.y - spiral.zetaPoint.y / 2)) / (slope2 - slope1);

        var y = slope1 * (x - spiral.zetaPoint.x / 2) + spiral.zetaPoint.y / 2;

        return new Vector2((float)x, (float)y);
    }

}