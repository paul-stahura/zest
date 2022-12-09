using System.IO;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class ZetaCircles : ImmediateModeShapeDrawer
{
    public float difference;

    public App app;
    public ZetaSpiral spiral;

    [Header("Zeta Circles")]
    public Color zetaColor = Color.green;
    public Color estimateColor = Color.red;
    public Color otherCircle = Color.cyan;

    public Slider transparency;
    public float thickness = 2;

    [Header("Intersection Trail")]
    public Slider trailLength;

    [Header("Intersection Zeros")]
    public Toggle findIntersectionZeros;
    public List<Vector2> trail = new List<Vector2>();
    List<double> intersectionZeros = new List<double>();

    void OnApplicationQuit()
    {
        PlayerPrefs.SetFloat(name + "-Transparency", transparency.value);
        PlayerPrefs.Save();
    }

    void Start()
    {
        transparency.onValueChanged.AddListener(value =>
        {
            zetaColor = new Color(zetaColor.r, zetaColor.g, zetaColor.b, value);
            estimateColor = new Color(estimateColor.r, estimateColor.g, estimateColor.b, value);
            otherCircle = new Color(otherCircle.r, otherCircle.g, otherCircle.b, value);
        });
        transparency.value = PlayerPrefs.GetFloat(name + "-Transparency", zetaColor.a);
    }

    public override void DrawShapes(Camera cam)
    {
        if (transparency.value == 0 || spiral.S == null)
            return;

        using (Draw.Command(cam))
        {
            // set up static parameters. these are used for all following Draw.Line calls
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;
            Draw.Thickness = 1;

            // set static parameter to draw in the local space of this object
            Draw.Matrix = transform.localToWorldMatrix;

            var c1 = drawZetaCircle();
            var c2 = drawMidpointCircle();
            var c3 = drawBisectCircle();

            drawCircleIntersections(c1, c2);

            if (trailLength.value > 0)
                drawIntersectionTrail(c1, c2);
            else if (trail.Count > 0)
                trail.Clear();

            if (findIntersectionZeros.isOn)
                findZeros(c1, c2);
            else if (intersectionZeros.Count > 0)
            {
                using (StreamWriter file = new("intersection-zeros.csv"))
                {
                    foreach (var z in intersectionZeros)
                        file.WriteLine(z.ToString());
                };
            }
        }
    }

    Circle drawZetaCircle()
    {
        // get the distance from the bisecting point of the middle link 
        // to the origin
        using (Draw.StyleScope)
        {
            Draw.Color = zetaColor; // Color.green;
            Draw.Thickness = thickness;
            var bipt = BisectingLines.BisectPoint(spiral.S);
            ShapesUtils.DrawCross(bipt, .1f, 1);
            var radius = bipt.magnitude;
            Draw.Ring(bipt, radius, thickness);

            return new Circle(bipt, radius);
        }
    }

    Circle drawMidpointCircle()
    {
        using (Draw.StyleScope)
        {
            Draw.Color = estimateColor;
            Draw.Thickness = thickness;
            var pt = spiral.S.middlePoint.ToVector2();
            ShapesUtils.DrawCross(pt, .1f, 1);
            var radius = pt.magnitude;
            Draw.Ring(pt, radius, thickness);

            return new Circle(pt, radius);
        }
    }

    Circle drawBisectCircle()
    {
        using (Draw.StyleScope)
        {
            Draw.Color = otherCircle;
            Draw.Thickness = thickness;

            var pt = spiral.S.middlePoint.ToVector2();
            var mid = (spiral.S.zeta.ToVector() / 2).ToVector2();

            ShapesUtils.DrawCross(mid, .1f, 1);
            var radius = mid.magnitude;
            Draw.Ring(mid, radius, thickness);

            return new Circle(pt, radius);
        }
    }

    // Finds all the zeros for the zeta circle intersections
    void findZeros(Circle c1, Circle c2)
    {
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



    void drawIntersectionTrail(Circle c1, Circle c2)
    {
        var i1 = c1.IntersectionPoints(c2, false);
        var i2 = c1.IntersectionPoints(c2, true);

        var pos1 = new Vector2((float)i1.x, (float)i1.y);
        var pos2 = new Vector2((float)i2.x, (float)i2.y);

        var pos = pos1.magnitude > pos2.magnitude ? pos1 : pos2;

        if (trail.Count == 0)
        {
            trail.Add(pos);
            return;
        }


        if (trail[trail.Count - 1] != pos)
        {
            trail.Add(pos);
        }


        // keep the trail line count to the set amount
        while (trail.Count > trailLength.value)
        {
            trail.RemoveAt(0);
        }

        using (Draw.StyleScope)
        {
            Draw.Thickness = 1;
            Draw.Color = Color.magenta;
            for (var i = 1; i < trail.Count; i++)
            {
                Draw.Line(trail[i - 1], trail[i]);
            }
        }
    }


    void drawCircleIntersections(Circle c1, Circle c2)
    {
        using (Draw.StyleScope)
        {
            Draw.Color = new Color(1, 1, 1, transparency.value);

            var c = c1.IntersectionPoints(c2, true);
            ShapesUtils.DrawCross(new Vector2((float)c.x, (float)c.y), .1f);
            c = c1.IntersectionPoints(c2, false);
            ShapesUtils.DrawCross(new Vector2((float)c.x, (float)c.y), .1f);
        }
    }
}