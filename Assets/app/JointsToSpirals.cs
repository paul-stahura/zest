using System;
using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class JointsToSpirals : ImmediateModeShapeDrawer
{
    public ZetaSpiral zs;
    public Color color = Color.blue;
    public float thickness = 1;
    public Slider transparency;

    void Start()
    {
        transparency.onValueChanged.AddListener(value =>
        {
            color = new Color(color.r, color.g, color.b, value);
        });
        transparency.value = color.a;
    }

    public override void DrawShapes(Camera cam)
    {
        var spiral = zs.S;

        using (Draw.Command(cam))
        {
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;

            // set static parameter to draw in the local space of this object
            Draw.Matrix = transform.localToWorldMatrix;
            using (Draw.StyleScope)
            {
                Draw.Thickness = thickness;
                Draw.Color = color;
                
                var pt = spiral.zeta.ToVector();
                var slope = -pt.x / pt.y;
                var z = pt.ToVector2();
                var bipt = BisectingLines.BisectPoint(zs.S);
                
                var z2 = (pt / 2).ToVector2();

                // draw a line from each of the first links at the same slope as zeta
                for (var i = 1; i < spiral.middleIndex; i++)
                {
                    var from = spiral.links[i].ToVector2();

                    var norm = (z2).normalized;
                    var dot = Vector2.Dot(from, norm); 
                    var to = z + from - 2 * dot * norm; // reflect from about a normal (z2)

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

        var pt = spiral.zeta.ToVector();

        // Finds the intersecting point between the bisecting line and the middle link
        var slope1 = -pt.x / pt.y;
        var slope2 = (M2.y - M1.y) / (M2.x - M1.x);

        var x = ((slope2 * M2.x - slope1 * pt.x / 2) - (M2.y - pt.y / 2)) / (slope2 - slope1);

        var y = slope1 * (x - pt.x / 2) + pt.y / 2;

        return new Vector2((float)x, (float)y);
    }

}