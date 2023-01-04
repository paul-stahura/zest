using System;
using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class ZetaRangeEst : MonoBehaviour
{
    public App app;

    void Start()
    {
        app.DrawSprial += drawShapes;
    }

    void drawShapes(Camera cam, Zeta.Spiral spiral)
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

            var rot = CameraTracking.RotationOfLink(spiral, spiral.middleIndex);

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