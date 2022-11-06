using System;
using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class ZetaRangeEst : ImmediateModeShapeDrawer
{
    public ZetaSpiral spiral;
    public App app;

    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {
            using (Draw.StyleScope)
            {
                // set up static parameters. these are used for all following Draw.Line calls
                Draw.LineGeometry = LineGeometry.Volumetric3D;
                Draw.ThicknessSpace = ThicknessSpace.Pixels;
                Draw.Thickness = 1f;
                // set static parameter to draw in the local space of this object
                Draw.Matrix = transform.localToWorldMatrix;

                Draw.Color = Color.yellow;

                var index = Mathf.FloorToInt((float)Zeta.ImagToIndex(app.Imag));
                var imag = Zeta.IndexToImag(index);
                var line = bisectLine(imag);
                Draw.Line(line[0], line[1]);

                imag++;
                var bits = BitConverter.SingleToInt32Bits((float)imag);
                var imag2 = BitConverter.Int32BitsToSingle(bits - 1);
                line = bisectLine(imag2);
                Draw.Line(line[0], line[1]);
            }
        }
    }

    Vector2[] bisectLine(double imag)
    {
        var spiral = new Zeta.Spiral(imag);
        var bisect = BisectingLines.BisectPoint(spiral);

        return new Vector2[] {
            bisect,
            spiral.ZetaPoint.ToVector2()
        };
    }
}