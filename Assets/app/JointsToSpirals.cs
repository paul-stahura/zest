using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class JointsToSpirals : MonoBehaviour
{
    public App app;
    // public ZetaSpiral zs;
    public Color color = Color.blue;
    public float thickness = 1;
    public Slider transparency;

    public Toggle showJust2;

    int currentIndex;

    List<Vector2> trail = new List<Vector2>();


    void OnApplicationQuit()
    {
        PlayerPrefs.SetFloat(name + "-Transparency", transparency.value);
        PlayerPrefs.SetInt(name + "-ShowJust2", showJust2.isOn ? 1 : 0);

        PlayerPrefs.Save();
    }

    void Start()
    {
        transparency.onValueChanged.AddListener(value =>
        {
            color = new Color(color.r, color.g, color.b, value);
        });
        transparency.value = PlayerPrefs.GetFloat(name + "-Transparency", color.a);

        showJust2.onValueChanged.AddListener(val =>
        {

        });
        showJust2.isOn = PlayerPrefs.GetInt(name + "-ShowJust2", 0) != 0 ? true : false;

        app.DrawSprial += drawShapes;
    }

    void drawShapes(Camera cam, Zeta.Spiral s)
    {
        if (transparency.value == 0)
            return;

        using (Draw.StyleScope)
        {
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;

            // set static parameter to draw in the local space of this object
            Draw.Matrix = transform.localToWorldMatrix;

            drawJointsToSpirals(s);
            // drawTrail();
        }
    }

    void drawJointsToSpirals(Zeta.Spiral spiral)
    {
        Draw.Thickness = thickness;
        Draw.Color = color;

        var start = 0;
        if (showJust2.isOn)
        {
            start = spiral.middleIndex - 1;
        }

        // draw a line from each of the first links at the same slope as zeta
        for (var i = start; i < spiral.middleIndex; i++)
        {
            var from = spiral.links[i].ToVector2();
            var to = spiral.spirals[i]; // reflect from about a normal (z2)

            Draw.Line(from, to);
        }
    }
}


    // void drawTrail()
    // {
    //     using (Draw.StyleScope)
    //     {
    //         Draw.Color = Color.magenta;
    //         Draw.Thickness = 4;

    //         var mi = zs.S.middleIndex - 1;

    //         var count = 0;
    //         var start = new Vector2();

    //         for (var imag = Zeta.IndexToImag(mi); imag < Zeta.IndexToImag(mi + 1); imag += .05)
    //         {
    //             var spiral = new Zeta.Spiral(new System.Numerics.Complex(app.Real, imag), false);


    //             var pt = spiral.zeta.ToVector();
    //             var slope = -pt.x / pt.y;

    //             var z2 = (pt / 2).ToVector2(); // zeta over 2
    //             var zeta = pt.ToVector2();

    //             var from = spiral.links[spiral.middleIndex].ToVector2();
    //             var norm = (z2).normalized;
    //             var dot = Vector2.Dot(from, norm);
    //             var to = zeta + from - 2 * dot * norm; // reflect from about a normal (z2)

    //             // if (count == 0)
    //             // {
    //             //     start = to;
    //             //     count++;
    //             //     continue;
    //             // }

    //             // Draw.Line(start, to);
    //             // start = to;
    //             // count++;

    //             if (count == 3)
    //                 break;

    //             count++;
    //             ShapesUtils.DrawCross(to);
    //             // break;
    //         }
    //     }
    // }