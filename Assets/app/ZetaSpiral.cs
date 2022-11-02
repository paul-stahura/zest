using System;

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
			Draw.Thickness = 1; // 4px wide

			// set static parameter to draw in the local space of this object
			Draw.Matrix = transform.localToWorldMatrix;

            middleIndex = Mathf.FloorToInt((float)Zeta.ImagToIndex(app.Imag)) + 1;

            drawSpiral();
            trackLink();
            drawZeta();
            drawBisectingLines();
            var c1 = drawZetaCircle();
            var c2 = drawGrossZetaEstimate();

            drawCircleIntersections(c1, c2);
		}
	}

    public float distance;

    void drawSpiral() {
        var start = Vector3.zero;
        numLinks = (int)(app.Imag);
        for (int i = 1; i < numLinks; i++) {
            var x = Mathf.Cos((float)-app.Imag * Mathf.Log(i)) / Mathf.Pow(i, .5f);
            var y = Mathf.Sin((float)-app.Imag * Mathf.Log(i)) / Mathf.Pow(i, .5f);
            var end = new Vector3(start.x + x, start.y + y, 0);

            var color = Color.grey;
            Draw.Thickness = 1;

            if (i == middleIndex - 1)
                color = Color.green;
            else if (i == middleIndex)
            {
                color = new Color(1, .5f, 0, 1f);
                middleLink[0] = start;
                middleLink[1] = end;
            }
            else if (i == middleIndex + 1)
                color = Color.red;

            if (color != Color.grey)
                Draw.Thickness = 4;

            Draw.Line(start, end, color);
            start = end;
            distance = Mathf.Abs(zeta.magnitude - start.magnitude);
            // if (distance <= .02)
            //     break;
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
            Draw.Color = Color.green;
            Draw.Thickness = .5f;
            var bipt = bisectPoint();
            drawCross(bipt, .1f);
            var radius = bipt.magnitude;
            Draw.Ring(bipt, radius, 2f);

            return new Circle(bipt, radius);
        }
    }

    Circle drawGrossZetaEstimate() {
        using (Draw.StyleScope) {
            Draw.Color = Color.red;
            Draw.Thickness = .5f;
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

    void trackLink() {
        if (app.trackLink.isOn)
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
