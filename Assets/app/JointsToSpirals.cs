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

    public Toggle showJust2;


    List<Vector3> trail = new List<Vector3>();


    void OnApplicationQuit()
    {
        PlayerPrefs.SetFloat(name + "-Transparency", transparency.value);
        PlayerPrefs.SetFloat(name + "-DotTransparency", dotTransparency.value);
        PlayerPrefs.SetFloat(name + "-TxCenterTrail", trailTransparency.value);
        PlayerPrefs.SetInt(name + "-ShowJust2", showJust2.isOn ? 1 : 0);

        PlayerPrefs.Save();
    }

    void Start()
    {
        transparency.value = PlayerPrefs.GetFloat(name + "-Transparency", color.a);
        dotTransparency.value = PlayerPrefs.GetFloat(name + "-DotTransparency", 1f);
        trailTransparency.value = PlayerPrefs.GetFloat(name + "-TrailTransparency", 1f);
        showJust2.isOn = PlayerPrefs.GetInt(name + "-ShowJust2", 0) != 0 ? true : false;

        app.DrawSprial += drawShapes;
    }

    void drawShapes(Camera cam, Zeta.Spiral s)
    {
        using (Draw.StyleScope)
        {
            drawJointsToSpirals(s);
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

    void drawJointsToSpirals(Zeta.Spiral spiral)
    {
        Draw.Thickness = thickness;
        color.a = transparency.value;
        Draw.Color = color;

        var start = 0;
        if (showJust2.isOn)
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
    }

    void drawCenterPoints(Camera cam, Zeta.Spiral spiral)
    {
        dotColor.a = dotTransparency.value;
        Draw.Color = dotColor;
        Draw.Thickness = 1;

        var start = 0;
        if (showJust2.isOn)
            start = spiral.middleIndex - 1;

        for (var i = start; i < spiral.spirals.Length; i++)
        {
            var pt = spiral.spirals[i];
            Draw.Ring(pt, .001f);
            ShapesUtils.DrawCross(pt, .002f, .5f);
        }
    }
}



