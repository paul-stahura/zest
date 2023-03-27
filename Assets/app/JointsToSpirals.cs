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
    public Color trailColor = Color.blue;


    public float thickness = 1;

    public Slider transparency;
    public Slider dotTransparency;
    public Slider trailTransparency;

    [Tooltip("Shows only the three joints-to-spirals around the middle link")]
    public Toggle showJust3;


    List<Vector3> trail = new List<Vector3>();


    void OnApplicationQuit()
    {
        PlayerPrefs.SetFloat(name + "-Transparency", transparency.value);
        PlayerPrefs.SetFloat(name + "-DotTransparency", dotTransparency.value);
        PlayerPrefs.SetFloat(name + "-TxCenterTrail", trailTransparency.value);
        PlayerPrefs.SetInt(name + "-ShowJust2", showJust3.isOn ? 1 : 0);

        PlayerPrefs.Save();
    }

    void Start()
    {
        transparency.value = PlayerPrefs.GetFloat(name + "-Transparency", color.a);
        dotTransparency.value = PlayerPrefs.GetFloat(name + "-DotTransparency", 1f);
        trailTransparency.value = PlayerPrefs.GetFloat(name + "-TrailTransparency", 1f);
        showJust3.isOn = PlayerPrefs.GetInt(name + "-ShowJust2", 0) != 0 ? true : false;

        app.DrawSprial += drawShapes;
    }

    void drawShapes(Camera cam, Zeta.Spiral s)
    {
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
        color.a = transparency.value;
        Draw.Color = color;

        var start = 0;
        if (showJust3.isOn)
        {
            start = spiral.middleIndex - 1;
        }

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
        dotColor.a = dotTransparency.value / 2;
        Draw.Color = dotColor;
        Draw.Thickness = 1;

        var start = 0;
        if (showJust3.isOn)
            start = spiral.middleIndex - 1;

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
                    var offset = orth / size;
                    Draw.Rectangle(pt - new Vector2(offset, offset), new Rect
                    {
                        width = orth / size * 2,
                        height = orth / size * 2
                    });

                    ShapesUtils.DrawCross(pt, orth / size * 2, .5f);
                    // continue;
                }

                if (orth < 1.5f && i == spiral.middleIndex + 1)
                {
                    Draw.Pie(pt, orth / size, 0, Mathf.PI / 2);
                    Draw.Pie(pt, orth / size, Mathf.PI, 1.5f * Mathf.PI);
                    ShapesUtils.DrawCross(pt, orth / size * 2, .5f);
                    // continue;
                }
            }

            Draw.Ring(pt, orth / size);
            ShapesUtils.DrawCross(pt, orth / size * 2, .5f);
        }
    }

    public float size = 50f;
}



