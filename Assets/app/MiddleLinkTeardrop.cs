using System;
using System.Collections;
using System.Collections.Generic;
using Shapes;
using UnityEngine;
using UnityEngine.UI;

public class MiddleLinkTeardrop : MonoBehaviour
{
    public App app;
    
    public Slider TeardropTransparency;
    public Color TeardropColorA = Color.red;
    public Color TeardropColorB = Color.green;

    public Vector TdropDotA { get; private set; }
    public Vector TdropDotB { get; private set; }
    
    // Start is called before the first frame update
    public void Start()
    {
        app.DrawSprial += drawTeardrop;
    }

    private void drawTeardrop(Camera cam, Zeta.Spiral spiral)
    {
        if(TeardropTransparency.value < 0.05f)
        {
            return;
        }

        double psi(double t) => Math.Cos(2 * Math.PI * (t*t - t - 1.0 / 16.0)) / Math.Cos(2 * Math.PI * t);
        Vector a(double t) => new Vector(-Math.Cos(2*Math.PI * (t*t - 1.0/16.0)), Math.Sin(2*Math.PI * (t*t - 1.0/16.0)));
        Vector tDropa(double t) => a(t) * psi(t);// + new Vector(1.0, 0.0);
        Vector tDropb(double t) => tDropa(t) * Math.Cos(Math.PI);// + new Vector(1.0, 0.0);
        
        Vector trackDrop(Vector v, Vector link) => RotateAround(v, new Vector(0.0, 0.0), LinkRad(spiral, spiral.middleIndex)) / Math.Sqrt(spiral.middleIndex+1) + link; 

        using (Draw.StyleScope)
        {
            TeardropColorA.a = TeardropTransparency.value;
            TeardropColorB.a = TeardropTransparency.value;
            Draw.Color = TeardropColorA;
            Draw.Thickness = 1 + TeardropTransparency.value;

            double i = 0;
            double inc = 1d/200;
            var start = trackDrop(tDropa(i), spiral.joints[spiral.middleIndex + 1]);
            for (i = inc; i <= 1+inc; i += inc)
            {
                // skip 0.25 && 0.75
                if(i >= 0.249 && i <= 0.251 || i >= 0.749 && i <= 0.751) {
                    i += inc;
                }

                var end = trackDrop(tDropa(i), spiral.joints[spiral.middleIndex + 1]);
                Draw.Line(start, end);
                start = end;
            }

            Draw.Color = TeardropColorB;
            i = 0;
            start = trackDrop(tDropb(i), spiral.joints[spiral.middleIndex]);
            for (i = inc; i <= 1+inc; i += inc)
            {
                // skip 0.25 && 0.75
                if(i >= 0.249 && i <= 0.251 || i >= 0.749 && i <= 0.751) {
                    i += inc;
                }

                var end = trackDrop(tDropb(i), spiral.joints[spiral.middleIndex]);
                Draw.Line(start, end);
                start = end;
            }
        }

        // Draws two dots/circles at the current location of teardrop A and B given the Zeta index
        using (Draw.StyleScope)
        {
            Color dotColor = Color.cyan;
            dotColor.a = TeardropTransparency.value;
            Draw.Color = dotColor;
            Draw.Thickness = 1 + TeardropTransparency.value;

            var index = Zeta.ImagToIndex(spiral.input.ToVector().y);
            index -= Math.Floor(index);

            var orth = Mathf.Min(1f, cam.orthographicSize);
            var size = 50.0f;

            TdropDotA = trackDrop(tDropa(index), spiral.joints[spiral.middleIndex + 1]);
            Draw.Ring(TdropDotA, orth / size / 2);
            ShapesUtils.DrawCross(TdropDotA, orth / size, .5f);

            index = 1 - index;
            TdropDotB = trackDrop(tDropb(index), spiral.joints[spiral.middleIndex]);
            Draw.Ring(TdropDotB, orth / size / 2);
            ShapesUtils.DrawCross(TdropDotB, orth / size, .5f);
        }
    }

    public static double LinkRad(Zeta.Spiral s, int idx)
    {
        Vector3 start = s.joints[idx];
        Vector3 end = s.joints[idx + 1];

        var temp = end - start;
        return Mathf.Atan2(temp.y, temp.x);
    }

    public static Vector RotateAround(Vector point, Vector pivot, double rad)
    {
        return new Vector ((point.x - pivot.x) * Math.Cos(rad) - (point.y - pivot.y) * Math.Sin(rad) + pivot.x, (point.x - pivot.x) * Math.Sin(rad) + (point.y - pivot.y) * Math.Cos(rad) + pivot.y);
    }
}
