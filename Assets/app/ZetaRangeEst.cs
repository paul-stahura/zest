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

        // var s = spiral.S;
        // var start = s.Links[idx];
        // var end = s.Links[idx + 1];

        // var pos = start + (end - start) / 2;
        // var rot = RotationOfLink(s, idx);
        // setCamera(pos, rot);

                var rot = CameraTracking.RotationOfLink(spiral.S, spiral.S.middleIndex);

                var index = Mathf.FloorToInt((float)Zeta.ImagToIndex(app.Imag));
                var imag = Zeta.IndexToImag(index);
                var real = app.Real;

                var s = new Zeta.Spiral(new System.Numerics.Complex(real, imag), app.useReimannSiegel.isOn);
                var pt = BisectingLines.BisectPoint(s);
                // Draw.Rotation = rot;
                Draw.Line(pt, s.zeta.ToVector2());

                imag++;
                var bits = BitConverter.SingleToInt32Bits((float)imag);
                imag = BitConverter.Int32BitsToSingle(bits - 1);
                s = new Zeta.Spiral(new System.Numerics.Complex(real, imag), app.useReimannSiegel.isOn);
                pt = BisectingLines.BisectPoint(s);
                Draw.Rotation = rot;
                Draw.Line(pt, s.zeta.ToVector2());
            }
        }
    }
}