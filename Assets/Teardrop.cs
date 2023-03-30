using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Complex = System.Numerics.Complex;
using Shapes;

public class Teardrop : ImmediateModeShapeDrawer
{
    Zeta.Spiral spiral;
    List<Vector> joints = new List<Vector>();
    List<Vector> spirals = new List<Vector>();

    Complex zeta;
    Complex c = new Complex(.5, 216.8121);
    int middleIndex;

    Vector[] middleLink = new Vector[2];

    // Start is called before the first frame update
    void Start()
    {
        var imag = c.Imaginary;
        var real = c.Real;

        Vector middlePoint;

        var nl = (int)(imag / Math.PI + 1);

        var index = Zeta.ImagToIndex(imag);
        middleIndex = (int)index + 1;


        var numLinks = (int)Zeta.Spiral.SpiralMiddleIndex(index, 0) + 2;

        joints.Clear();

        var start = new Vector();
        joints.Add(start);

        zeta = Zeta.ReimannSiegel(c);

        for (int i = 1; i < numLinks; i++)
        {
            var x = Math.Cos(imag * Math.Log(i)) / Math.Pow(i, real);
            var y = -Math.Sin(imag * Math.Log(i)) / Math.Pow(i, real);
            var end = new Vector(start.x + x, start.y + y);
            joints.Add(end);

            if (i == middleIndex + 1)
            {
                middlePoint = start + (end - start) / 2;
            }

            start = end;
        }


        middleLink[0] = joints[middleIndex - 1];
        middleLink[1] = joints[middleIndex];
        // var rad = -Math.Atan2(middleLink[1].y - middleLink[0].y, middleLink[1].x - middleLink[0].x);
        var rad = 0;
        
        var zv = zeta.ToVector() - middleLink[0];

        for (var i = 0; i < joints.Count; i++)
        {
            joints[i] = joints[i] - middleLink[0];

            // rotate each joint by the angle of the middle link
            var x = joints[i].x * Math.Cos(rad) - joints[i].y * Math.Sin(rad);
            var y = joints[i].x * Math.Sin(rad) + joints[i].y * Math.Cos(rad);
            joints[i] = new Vector(x, y);
        }

        // zeta = (zv + joints[middleIndex -1]).ToComplex();

        //rotate zeta by the angle of the middle link
        zv.x = zv.x * Math.Cos(rad) - zv.y * Math.Sin(rad);
        zv.y = zv.x * Math.Sin(rad) + zv.y * Math.Cos(rad);

        zv += joints[middleIndex - 1];
        zeta = zv.ToComplex();

        findSpirals();
    }

    void findSpirals()
    {
        // Zeta is a complex number 
        // Convert the complex number to a vector 
        // then scale it by 2.
        // 
        // zeta / 2
        var zv = zeta.ToVector();
        var z2 = zv / 2;

        // Copy zeta vector and normalize it.
        var norm = zv.Normalized();

        spirals.Clear();

        // Loop through all the joints up to the middle index.
        //
        for (var i = 0; i < joints.Count; i++)
        {
            var joint = this.joints[i];

            var dot = joint.Dot(norm);
            spirals.Add(zv + joint - norm * 2 * dot); // reflect from about a normal (z2)
        }
    }

    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;
            Draw.Thickness = 1;

            // set static parameter to draw in the local space of this object
            Draw.Matrix = transform.localToWorldMatrix;

            var from = joints[0];
            for (var i = 1; i < joints.Count; i++)
            {
                var to = joints[i];

                Draw.Line(from, to, Color.white);
                from = to;
            }

            Draw.Line(from, spirals[spirals.Count - 1], Color.blue);

            Draw.Color = Color.gray;
            ShapesUtils.DrawCross(Vector2.zero, 3);

            Draw.Color = Color.cyan;
            ShapesUtils.DrawCross(zeta.ToVector(), 2);
        }
    }
}
