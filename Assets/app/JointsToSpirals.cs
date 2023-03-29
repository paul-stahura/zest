using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class JointsToSpirals : MonoBehaviour
{
    public App app;
    public Color color = Color.blue;
    public Color dotColor = Color.magenta;


    public float thickness = 1;

    public Slider transparency;
    public Slider lineCount;

    void OnApplicationQuit()
    {
        PlayerPrefs.SetFloat(name + "-Transparency", transparency.value);
        PlayerPrefs.SetFloat(name + "-LineCount", lineCount.value);

        PlayerPrefs.Save();
    }

    void Start()
    {
        transparency.value = PlayerPrefs.GetFloat(name + "-Transparency", color.a);
        lineCount.value = PlayerPrefs.GetFloat(name + "-LineCount", 1f);

        app.DrawSprial += drawShapes;
    }

    void drawShapes(Camera cam, Zeta.Spiral s)
    {
        lineCount.maxValue = s.spirals.Length;

        using (Draw.StyleScope)
        {
            drawJointsToSpirals(cam, s);
        }

        using (Draw.StyleScope)
        {
            drawCenterPoints(cam, s);
        }

        using (Draw.StyleScope)
        {
            // drawTrail(s);
        }
    }


    void drawJointsToSpirals(Camera cam, Zeta.Spiral spiral)
    {
        Draw.Thickness = thickness;
        color.a = SRMath.Ease(0, .75f, transparency.value, SRMath.EaseType.ExpoEaseIn);
        Draw.Color = color;

        var start = spiral.spirals.Length - (int)lineCount.value;

        // draw a line from each of the first links at the same slope as zeta
        for (var i = start; i < spiral.spirals.Length; i++)
        {
            var from = spiral.joints[i];
            var to = spiral.spirals[i]; // reflect from about a normal (z2)
            Draw.Line(from, to);
        }

        // var screenPt = cam.WorldToScreenPoint(spiral.spirals[start]);
        // if (trail.Count > 0 && trail[trail.Count - 1] == screenPt)
        // {
        //     // don't log the same point twice
        //     return;
        // }

        // trail.Add(screenPt);
        // if (trail.Count > 5000)
        //     trail.RemoveAt(0);

        // if (trail.Count < 50)
        //     return;


        // List<int> simplified = new List<int>();
        // LineUtility.Simplify(trail, .001f, simplified);

        // var fr = trail[simplified[0]];
        // for (var i = 1; i < simplified.Count; i++)
        // {
        //     var to = cam.ScreenToWorldPoint(trail[i]);
        //     Draw.Line(fr, to);
        //     fr = to;
        // }
    }

    /// <summary>
    /// Draws the points on the end of the joints-to-spiral lines. It used to be
    /// simple pink dots but the current implementation shows a ring + cross.
    /// </summary>
    /// <param name="cam"></param>
    /// <param name="spiral"></param>
    void drawCenterPoints(Camera cam, Zeta.Spiral spiral)
    {
        dotColor.a = SRMath.Ease(0, 1, transparency.value, SRMath.EaseType.ExpoEaseOut);
        Draw.Color = dotColor;
        Draw.Thickness = 1;

        var start = spiral.spirals.Length - (int)lineCount.value;

        for (var i = start; i < spiral.spirals.Length; i++)
        {
            var pt = spiral.spirals[i];

            var orth = Mathf.Min(1f, cam.orthographicSize);

            // if we are zoomed in enough, draw the points around the middle
            // index differently so they are easier to distinguish
            if (orth < 1.5f)
            {
                if (orth < 1.5f && i == spiral.middleIndex - 1)
                {
                    Draw.Ring(pt, orth / size);
                    ShapesUtils.DrawCross(pt, orth / size * 2, .5f);
                    continue; // no need to fall out cause it will draw the same thing below
                }

                if (orth < 1.5f && i == spiral.middleIndex)
                {
                    ShapesUtils.DrawCross(pt, orth / size * 2, .5f);

                    var c = dotColor;
                    c.a = c.a / 2;
                    Draw.Color = c;
                    var offset = orth / size;
                    Draw.Rectangle(pt - new Vector2(offset, offset), new Rect
                    {
                        width = orth / size * 2,
                        height = orth / size * 2
                    });
                    Draw.Color = dotColor;

                    continue;
                }

                if (orth < 1.5f && i == spiral.middleIndex + 1)
                {
                    ShapesUtils.DrawCross(pt, orth / size * 2, .5f);

                    var c = dotColor;
                    c.a = c.a / 2;
                    Draw.Color = c;

                    Draw.Pie(pt, orth / size, 0, Mathf.PI / 2);
                    Draw.Pie(pt, orth / size, Mathf.PI, 1.5f * Mathf.PI);

                    Draw.Color = dotColor;
                    continue;
                }
            }

            Draw.Ring(pt, orth / size / 2);
            ShapesUtils.DrawCross(pt, orth / size, .5f);
        }
    }

    public float size = 50f;
}



