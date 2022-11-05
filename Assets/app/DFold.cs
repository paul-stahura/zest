using System;
using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class DFold : ImmediateModeShapeDrawer
{
    public App app;
    public ZetaSpiral spiral;

    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {
            var s = this.startPt();
            var startPt = spiral.middleLink[0] + ptOnMiddleLink((float)s);
            s = stop1();
            var stopPt = spiral.middleLink[0] + ptOnMiddleLink((float)s);
            var halfPt = spiral.middleLink[1] - spiral.middleLink[0];
            s = dfold(spiral.middleLink[1], halfPt);
            var dfoldPt = spiral.middleLink[0] + ptOnMiddleLink((float)s);
            using (Draw.StyleScope) {
                Draw.Color = Color.green;
                ShapesUtils.DrawCross(startPt, 2);

                Draw.Color = Color.red;
                ShapesUtils.DrawCross(stopPt, 2);

                Draw.Color = new Color(1, 0, 1, 1);
                ShapesUtils.DrawCross(dfoldPt, 2);
            }
        }
    }


    double dfold(Vector2 M2, Vector2 h)
    {
        return Math.Sqrt(Math.Pow(M2.x - h.x, 2) + Math.Pow(M2.y - h.y, 2));
    }

    double stop1()
    {

        var idx = Zeta.ImagToIndex(app.Imag);

        double s()
        {
            return Math.Sqrt(idx + 1) - Math.Sqrt(idx) - (1 / (2 * Math.Sqrt(idx + 1))) + (1 / (2 * Math.Sqrt(idx)));
        }

        var halfPt = spiral.middleLink[0] + (spiral.middleLink[1] - spiral.middleLink[0]) / 2;
        return Math.Sqrt(idx) * dfold(spiral.middleLink[1], halfPt) + 2 * Math.Floor(idx) * (s() * Math.Sqrt(idx) - .5);
    }

    double startPt()
    {
        var idx = Zeta.ImagToIndex(app.Imag);
        return (
            (2 * idx + 1) * (Math.Sqrt(idx + 1) - Math.Sqrt(idx))
        ) /
        (
            2 * Math.Sqrt(idx * (idx + 1))
        );
    }

    Vector2 ptOnMiddleLink(float dist)
    {
        return Vector2.Scale(spiral.middleLink[0].normalized, new Vector2(dist, dist));
    }
}