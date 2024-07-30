using System;
using UnityEngine;
using UnityEngine.UI;
using Shapes;

// 27 Mar, 2023 - not used
public class DFold : MonoBehaviour
{
    public App app;

    void Start()
    {
        app.DrawSprial += drawShapes;
    }
    void drawShapes(Camera cam, Zeta.Spiral spiral)
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


    double dfold(Vector2 M2, Vector2 h)
    {
        return Math.Sqrt(Math.Pow(M2.x - h.x, 2) + Math.Pow(M2.y - h.y, 2));
    }

    double stop1(Zeta.Spiral spiral)
    {

        var idx = app.Index;

        double _s()
        {
            return Math.Sqrt(idx + 1) - Math.Sqrt(idx) - (1 / (2 * Math.Sqrt(idx + 1))) + (1 / (2 * Math.Sqrt(idx)));
        }

        var s = spiral;
        var mi = s.middleIndex;

        var middleLink = new Vector2[]
        {
            s.joints[mi],
            s.joints[mi + 1]
        };

        var halfPt = middleLink[0] + (middleLink[1] - middleLink[0]) / 2;
        return Math.Sqrt(idx) * dfold(middleLink[1], halfPt) + 2 * Math.Floor(idx) * (_s() * Math.Sqrt(idx) - .5);
    }

    double startPt()
    {
        var idx = app.Index;
        return (
            (2 * idx + 1) * (Math.Sqrt(idx + 1) - Math.Sqrt(idx))
        ) /
        (
            2 * Math.Sqrt(idx * (idx + 1))
        );
    }
}