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
        for (var i = start; i < spiral.middleIndex; i++)
        {
            var from = spiral.joints[i];
            var to = spiral.spirals[i]; // reflect from about a normal (z2)

            Draw.Line(from, to);
        }
    }

    void drawCenterPoints(Camera cam, Zeta.Spiral spiral)
    {
        var SCALAR = 400f;
        // var p = new Vector3[spiral.middleIndex];
        // for (var i = 0; i < spiral.middleIndex; i++)
        // {
        //     var s = spiral.spirals[i];
        //     p[i] = new Vector3(s.x, s.y, 0);
        // }
        // MeshUtils.ChildrenFromPoints(transform, "Points", p, Material, Vector3.one);
        dotColor.a = dotTransparency.value;
        Draw.Color = dotColor;

        var index = Zeta.ImagToIndex(spiral.input.Imaginary);

        var size = cam.orthographicSize / SCALAR;
        var rc = new Rect(-size, -size, size * 2, size * 2);
        for (var i = 0; i < spiral.middleIndex; i++)
        {
            var from = spiral.spirals[i];
            Draw.Rectangle(from, rc);

            // I was going to draw a line straight down from the dot to the link
            // but its not finished here. This is to diagnose the wiggling dot.
            //
            // var l = (int)spiral.SpiralMiddleIndex(index, i);
            // var link = spiral.joints[l+1] - spiral.joints[l];
            // link.Dot(from);
        }
    }

    void drawTrail(Zeta.Spiral spiral)
    {
        if (trailTransparency.value == 0)
        {
            return;
        }

        // for (var i = 0; i < spiral.spirals.Length; i++)
        // {
        //     var s = spiral.spirals[i];
        //     if (trail.Contains(s))
        //         continue;

        //     trail.Add(new Vector3(s.x, s.y, 0));
        // }

        var spiralNumber = 2;

        var mi = Zeta.ImagToIndex(app.Imag);
        var i = (int)spiral.SpiralMiddleIndex(mi, spiralNumber);

        // Highlight the spiral middle link
        var j1 = spiral.joints[i];
        var j2 = spiral.joints[i + 1];

        var s = spiral.spirals[spiralNumber];
        var pt = new Vector(s.x, s.y);

        trailParent.transform.localPosition = j1.ToVector3();


        // Offset vector from the middle link first point
        var p = (pt - j1).ToVector3();

        //
        // TODO:
        // You need the angle of the line between these two lines:
        // j1 and p
        // j1 and j2
        // then apply that rotation to trail transform to move all the previous mesh points
        // then add the latest point
        // 
        var temp = (j2 - j1).ToVector3();
        var angle = Mathf.Atan2(temp.y, temp.x) * Mathf.Rad2Deg;

        // var rot = Quaternion.AngleAxis(180 - angle, Vector3.forward);

        // https://forum.unity.com/threads/rotate-vector-by-quaternion.21687/
        // p = Quaternion.Inverse(rot) * p;
        // if (trail.Count == 0)

        if (!trail.Contains(p))
            trail.Add(p);

        while (trail.Count > 65535)
            trail.RemoveAt(0);

        // trailParent.transform.rotation = rot;

    }

    public GameObject trailParent;

    // void calculateTrail(Zeta.Spiral spiral)
    // {
    //     using (Draw.StyleScope)
    //     {
    //         Draw.Color = Color.magenta;
    //         Draw.Thickness = 4;

    //         var mi = spiral.middleIndex - 1;

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
}



