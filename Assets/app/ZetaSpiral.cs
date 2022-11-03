using System;
using System.IO;
using System.Collections.Generic;

using UnityEngine;
using Shapes;


public class ZetaSpiral : ImmediateModeShapeDrawer {

    [SerializeField]
    public App app;

    public Vector2[] middleLink = new Vector2[2];
    public int middleIndex;
    public Vector2 zeta;

    [SerializeField]
    public int numLinks = 100;

	public override void DrawShapes( Camera cam ){

        zeta = Zeta.ReimannSiegel(app.Imag).ToVector2();

		using( Draw.Command( cam ) ){

			// set up static parameters. these are used for all following Draw.Line calls
			Draw.LineGeometry = LineGeometry.Volumetric3D;
			Draw.ThicknessSpace = ThicknessSpace.Pixels;
            Draw.Thickness = 1;

			// set static parameter to draw in the local space of this object
			Draw.Matrix = transform.localToWorldMatrix;

            middleIndex = Mathf.FloorToInt((float)Zeta.ImagToIndex(app.Imag)) + 1;

            drawSpiral();
            cameraTrackLink();
            drawZeta();
            drawBisectingLines();
            var c1 = drawZetaCircle();
            var c2 = drawGrossZetaEstimate();

            drawCircleIntersections(c1, c2);

            drawIntersectionTrail(c1, c2);

            findIntersectionZeros(c1, c2);

		}
	}

    public float difference;
    List<double> intersectionZeros = new List<double>();
    void findIntersectionZeros(Circle c1, Circle c2) {
        if (app.findIntersectionZeros.isOn) {
            var i1 = c1.IntersectionPoints(c2, false);
            var i2 = c1.IntersectionPoints(c2, true);

            var pos1 = new Vector(i1.x, i1.y);
            var pos2 = new Vector(i2.x, i2.y);

            var diff = (pos1 - pos2).Length;
            difference = (float)diff;
            app.Imag += .01 * diff;

            if (difference == 0)
            {
                Debug.Log(app.Imag);
                intersectionZeros.Add(app.Imag);
                app.Imag += 0.04;
            }
        }
        else if (intersectionZeros.Count > 0) {
            using StreamWriter file = new ("intersection-zeros.csv");
            foreach (var z in intersectionZeros) {
                file.WriteLine(z.ToString());
            }
        }
    }

    List<Vector2> trail = new List<Vector2>();
    public int trailLength;
    void drawIntersectionTrail(Circle c1, Circle c2) {
        if (app.drawTrail.isOn) {
            var i1 = c1.IntersectionPoints(c2, false);
            var i2 = c1.IntersectionPoints(c2, true);

            var pos1 = new Vector2((float)i1.x, (float)i1.y);
            var pos2 = new Vector2((float)i2.x, (float)i2.y);

            var pos = pos1.magnitude > pos2.magnitude ? pos1 : pos2;

            trailLength = trail.Count;

            if (trail.Count == 0) {
                trail.Add(pos);
                return;
            }


            if (trail[trail.Count - 1] != pos)
            {
                trail.Add(pos);
            }


            // keep the trail line count to the set amount
            while (trail.Count > app.trailLength.value) {
                trail.RemoveAt(0);
            }

            using (Draw.StyleScope) {
                Draw.Thickness = 1;
                Draw.Color = Color.magenta;
                for (var i = 1; i < trail.Count; i++)
                {
                    Draw.Line(trail[i-1], trail[i]);
                }
            }
        }
        else {
            if (trail.Count > 0) 
                trail.Clear();
        }
    }

    public float distance;

    void drawSpiral() {
        var start = Vector3.zero;
        numLinks = (int)(app.Imag);
        using (Draw.StyleScope) {
            Draw.Thickness = 1; // 4px wide
            for (int i = 1; i < numLinks; i++) {
                var x = Mathf.Cos((float)-app.Imag * Mathf.Log(i)) / Mathf.Pow(i, .5f);
                var y = Mathf.Sin((float)-app.Imag * Mathf.Log(i)) / Mathf.Pow(i, .5f);
                var end = new Vector3(start.x + x, start.y + y, 0);

                var color = Color.grey;
                color.a = app.spiralTransparency.value;
                Draw.Thickness = 1;

                if (i == middleIndex - 1) {
                    color = Color.green;
                    Draw.Thickness = 4;
                }
                else if (i == middleIndex)
                {
                    color = new Color(1, .5f, 0, 1f);
                    middleLink[0] = start;
                    middleLink[1] = end;
                    Draw.Thickness = 4;
                }
                else if (i == middleIndex + 1) {
                    color = Color.red;
                    Draw.Thickness = 4;
                }

                Draw.Line(start, end, color);
                start = end;
                distance = Mathf.Abs(zeta.magnitude - start.magnitude);
            }
        }
    }

    void drawCircleIntersections(Circle c1, Circle c2) {
        using (Draw.StyleScope) {
            var c = c1.IntersectionPoints(c2, true);
            drawCross(new Vector2((float)c.x, (float)c.y), .1f);
            c = c1.IntersectionPoints(c2, false);
            drawCross(new Vector2((float)c.x, (float)c.y), .1f);
        }
    }

    Vector2 bisectPoint() {
        var M1 = middleLink[0];
        var M2 = middleLink[1];

        // Finds the intersecting point between the bisecting line and the middle link
        var slope1 = -zeta.x/zeta.y;
        var slope2 = (M2.y - M1.y) / (M2.x - M1.x);
        
        var x = ((slope2 * M2.x - slope1 * zeta.x / 2) - (M2.y - zeta.y / 2)) / (slope2 - slope1);

        var y = slope1 * (x - zeta.x / 2) + zeta.y / 2;

        return new Vector2((float)x, (float)y);
    }

    void drawBisectingLines() {
        using (Draw.StyleScope) {
            Draw.Thickness = .5f;
            Draw.Color = Color.cyan;
            var bipt = bisectPoint();
            Draw.Line(Vector2.zero, zeta);
            Draw.Line(Vector2.zero, bipt);
            Draw.Line(bipt, zeta);
        }
    }

    Circle drawZetaCircle() {
        // get the distance from the bisecting point of the middle link 
        // to the origin
        using (Draw.StyleScope) {
            Draw.Color = new Color(0, 1f, 0, 0.2f); // Color.green;
            Draw.Thickness = .1f;
            var bipt = bisectPoint();
            drawCross(bipt, .1f);
            var radius = bipt.magnitude;
            Draw.Ring(bipt, radius, 2f);

            return new Circle(bipt, radius);
        }
    }

    Circle drawGrossZetaEstimate() {
        using (Draw.StyleScope) {
            Draw.Color = new Color(1f, 0, 0, .2f); //Color.red;
            Draw.Thickness = .1f;
            var pt = (middleLink[1] - middleLink[0]) / 2 + middleLink[0];
            drawCross(pt, .1f);
            var radius = pt.magnitude;
            Draw.Ring(pt, radius, 2f);
            
            return new Circle(pt, radius);
        }

    }

    void drawZeta() {
        using (Draw.StyleScope) {
            Draw.Color = Color.green;
            Draw.Thickness = 1;
            Draw.Ring(zeta, .08f);
            drawCross(zeta, .1f);
        }
    }

    void drawCross(Vector2 pt, float length) {
        Draw.Line(new Vector2(pt.x, pt.y - length), new Vector2(pt.x, pt.y + length));
        Draw.Line(new Vector2(pt.x - length, pt.y), new Vector2(pt.x + length, pt.y));
    }

    void cameraTrackLink() {
        if (app.cameraTrackLink.isOn)
        {
            var start = middleLink[0];
            var end = middleLink[1];

            var pos = end - (end - start) / 2;
            var rot = rotationOfLink(middleIndex);
            setCamera(pos, rot);
        }
    }

    /// <summary>
    /// Sets the camera's position to an offset from the Robot3's position. 
    /// Also sets the camera's absolute rotation.
    /// 
    /// The camera's transform can only be updated during the Update() phase, which
    /// is also when Robot3.calc() is called.
    /// </summary>
    /// <param name="pos"></param>
    /// <param name="rot"></param>
    void setCamera(Vector3 pos, Quaternion rot)
    {
        // Make Camera z opposite when tracking is enabled.
        pos = new Vector3(pos.x, pos.y, Camera.main.transform.position.z);

        
        Camera.main.transform.rotation = rot;
        Camera.main.transform.position = transform.position + pos;
    }


    // Calculates the rotation required to orient the camera so that the link
    // at the given index appears horizontal when rendered.
    Quaternion rotationOfLink(int linkIndex)
    {
        Vector3 start = middleLink[0];
        Vector3 end = middleLink[1];

        var temp = end - start;
        var angle = Mathf.Atan2(temp.y, temp.x) * Mathf.Rad2Deg;

        return Quaternion.AngleAxis(angle, Vector3.forward);
    }
}
