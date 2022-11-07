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
            // var s = this.startPt();
            // var startPt = spiral.middleLink[0] + PointOnLink((float)s);
            // s = stop1();
            // var stopPt = spiral.middleLink[0] + PointOnLink((float)s);
            // var halfPt = spiral.middleLink[1] - spiral.middleLink[0];
            // s = dfold(spiral.middleLink[1], halfPt);
            // var dfoldPt = spiral.middleLink[0] + PointOnLink((float)s);
            // using (Draw.StyleScope) {
            //     Draw.Color = Color.green;
            //     ShapesUtils.DrawCross(startPt, 2);

            //     Draw.Color = Color.red;
            //     ShapesUtils.DrawCross(stopPt, 2);

            //     Draw.Color = new Color(1, 0, 1, 1);
            //     ShapesUtils.DrawCross(dfoldPt, 2);
            // }
        }
    }


    double dfold(Vector2 M2, Vector2 h)
    {
        return Math.Sqrt(Math.Pow(M2.x - h.x, 2) + Math.Pow(M2.y - h.y, 2));
    }

    double stop1()
    {

        var idx = Zeta.ImagToIndex(app.Imag);

        double _s()
        {
            return Math.Sqrt(idx + 1) - Math.Sqrt(idx) - (1 / (2 * Math.Sqrt(idx + 1))) + (1 / (2 * Math.Sqrt(idx)));
        }

        var s = spiral.S;
        var mi = s.MiddleIndex;

        var middleLink = new Vector2[] 
        {
            s.Links[mi],
            s.Links[mi + 1]
        };

        var halfPt = middleLink[0] + (middleLink[1] - middleLink[0]) / 2;
        return Math.Sqrt(idx) * dfold(middleLink[1], halfPt) + 2 * Math.Floor(idx) * (_s() * Math.Sqrt(idx) - .5);
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
}