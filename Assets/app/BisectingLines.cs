using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class BisectingLines : ImmediateModeShapeDrawer
{
    public ZetaSpiral spiral;

    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {
			// set up static parameters. these are used for all following Draw.Line calls
			Draw.LineGeometry = LineGeometry.Volumetric3D;
			Draw.ThicknessSpace = ThicknessSpace.Pixels;

			// set static parameter to draw in the local space of this object
			Draw.Matrix = transform.localToWorldMatrix;            
            Draw.Thickness = .5f;
            Draw.Color = Color.cyan;
            var bipt = BisectPoint(spiral);
            Draw.Line(Vector2.zero, spiral.rsZeta);
            Draw.Line(Vector2.zero, bipt);
            Draw.Line(bipt, spiral.rsZeta);
        }
    }


    public static Vector2 BisectPoint(ZetaSpiral spiral)
    {
        var M1 = spiral.middleLink[0];
        var M2 = spiral.middleLink[1];

        // Finds the intersecting point between the bisecting line and the middle link
        var slope1 = -spiral.rsZeta.x / spiral.rsZeta.y;
        var slope2 = (M2.y - M1.y) / (M2.x - M1.x);

        var x = ((slope2 * M2.x - slope1 * spiral.rsZeta.x / 2) - (M2.y - spiral.rsZeta.y / 2)) / (slope2 - slope1);

        var y = slope1 * (x - spiral.rsZeta.x / 2) + spiral.rsZeta.y / 2;

        return new Vector2((float)x, (float)y);
    }
}