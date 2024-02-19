using System;
using System.IO;
using System.Collections.Generic;
using Complex = System.Numerics.Complex;

using UnityEngine;
using UnityEngine.UI;
using Shapes;


public partial class ZetaSpiral : MonoBehaviour
{

    public App app;
    public Slider transparency;
    public Slider visibleLinks;
    public Slider targetTransparency;
    public Color spiralColor = Color.white;

    [Header("Reverse Spiral")]
    public Toggle showReverseSpiral;
    public Color reverseSpiralColor;



    // Dont draw a line until the total length of the vectors is at least this
    [HideInInspector]
    public Slider cutoffLength;

    // Skip drawing this many lines before drawing the next line. They are so short you can't see them anyway
    [HideInInspector]
    public Slider skipEvery;


    // Don't draw the spiral after the middle links.  Only draw a line to each spiral
    [HideInInspector]
    public Toggle onlyDrawOutline;
    // Draw a cross marking the location of each spiral

    void OnApplicationQuit()
    {
        savePlayerPrefs();
    }
    public void Start()
    {
        transparency.value = PlayerPrefs.GetFloat(name + "-Transparency", .7f);
        visibleLinks.value = PlayerPrefs.GetFloat(name + "-VisableLinks", 5f);
        targetTransparency.value = PlayerPrefs.GetFloat(name + "-ZetaTargetTransparency", 1f);
        showReverseSpiral.isOn = PlayerPrefs.GetInt(name + "-ShowReverseSpiral", 1) == 1;
        app.DrawSprial += DrawShapes;
        app.SceneChange += savePlayerPrefs;
    }

    void savePlayerPrefs() 
    {
        PlayerPrefs.SetFloat(name + "-Transparency", transparency.value);
        PlayerPrefs.SetFloat(name + "-VisableLinks", visibleLinks.value);
        PlayerPrefs.SetFloat(name + "-ZetaTargetTransparency", targetTransparency.value);
        PlayerPrefs.SetInt(name + "-ShowReverseSpiral", showReverseSpiral.isOn ? 1 : 0);
        PlayerPrefs.Save();
    }

    public void DrawShapes(Camera cam, Zeta.Spiral spiral)
    {
        using (Draw.StyleScope)
        {
            drawSpiral(spiral);
        }

        using (Draw.StyleScope)
        {
            drawZetaTarget(spiral);
        }

        using (Draw.StyleScope)
        {
            drawOutline(spiral);
        }

        using (Draw.StyleScope)
        {
            drawReverseSpiral(cam, spiral);
        }
    }

    void drawSpiral(Zeta.Spiral spiral)
    {
        if (spiral.joints[0] == null)
            return;

        Draw.Thickness = 1;
        // Since our links are zero-based, the middle index into the array
        // is not the middle link number starting from one.
        var middleLink = spiral.middleIndex + 1;

        int skipCount = 0;

        // If the visibleLinks slider is at max value, don't limit visibility.  Draw all links
        bool limitVisibleLinks = visibleLinks.value < visibleLinks.maxValue && CameraTracking.trackingIndex > -1;

        var startIndex = 1;
        var endIndex = spiral.numLinks;

        if (limitVisibleLinks)
        {
            startIndex = (int)Mathf.Clamp(CameraTracking.trackingIndex - (int)visibleLinks.value + 1, 1, CameraTracking.trackingIndex - (int)visibleLinks.value + 1);
            endIndex = (int)Mathf.Clamp(CameraTracking.trackingIndex + (int)visibleLinks.value + 2, CameraTracking.trackingIndex + (int)visibleLinks.value + 2, spiral.numLinks);
        }

        var start = spiral.joints[startIndex - 1].ToVector2();
        for (int i = startIndex; i < endIndex; i++)
        {
            var color = spiralColor;
            color.a = transparency.value;
            Draw.Thickness = 1 + transparency.value;

            if (i == middleLink - 1)
            {
                color = Color.green;
                color.a = transparency.value;
                Draw.Thickness = 4;
            }
            else if (i == middleLink)
            {
                color = new Color(1, .5f, 0, 1f); // orange
                color.a = transparency.value;
                Draw.Thickness = 4;
            }
            else if (i == middleLink + 1)
            {
                color = Color.red;
                color.a = transparency.value;
                Draw.Thickness = 4;
            }
            // else if (i == sprial.numLinks - 1)
            // {
            //     color = Color.red;
            //     Draw.Thickness = 2;
            // }


            var end = spiral.joints[i];


            if (i >= middleLink + 2)
            {
                if ((end - start).sqrMagnitude < cutoffLength.value)
                    continue;


                if (skipCount >= skipEvery.value)
                {
                    skipCount = 0;
                }
                else
                {
                    skipCount++;
                    continue;
                }

                if (onlyDrawOutline.isOn)
                    return;
            }

            Draw.Line(start, end, color);
            start = end;
        }

    }

    void drawOutline(Zeta.Spiral spiral)
    {
        if (!onlyDrawOutline.isOn)
            return;

        var start = spiral.spirals[0];
        for (var i = 0; i < spiral.middleIndex; i++)
        {
            var end = spiral.spirals[i];
            Draw.Line(start, end);
            start = end;
        }
    }



    void drawZetaTarget(Zeta.Spiral sprial)
    {
        var pt = sprial.zeta.ToVector2();

        var color = spiralColor + new Color(-0.5f, 0, 0);
        color.a = targetTransparency.value;

        Draw.Color = color;
        Draw.Ring(pt, .08f);
        ShapesUtils.DrawCross(pt, .1f);

        Draw.Ring(pt, 1f);

    }


    void drawReverseSpiral(Camera cam, Zeta.Spiral spiral)
    {
        if (!showReverseSpiral.isOn)
            return;

        if (spiral.joints[0] == null)
            return;

        Draw.Thickness = 1;
        var c  = reverseSpiralColor;
        c.a = transparency.value;
        Draw.Color = c;

        var startIndex = 0;
        var endIndex = spiral.joints.Length - 1;;
        bool limitVisibleLinks = visibleLinks.value < visibleLinks.maxValue && CameraTracking.trackingIndex > -1;
        if (limitVisibleLinks)
        {
            startIndex = (int)Mathf.Clamp(CameraTracking.trackingIndex - (int)visibleLinks.value, 1, CameraTracking.trackingIndex - (int)visibleLinks.value + 1);
            endIndex = (int)Mathf.Clamp(CameraTracking.trackingIndex + (int)visibleLinks.value + 1, CameraTracking.trackingIndex + (int)visibleLinks.value + 1, spiral.numLinks);
        }

        var zeta = spiral.zeta.ToVector();
        var z2 = zeta / 2;

        // Copy zeta vector and normalize it.
        var norm = zeta.Normalized();

        var middleLink = spiral.middleIndex;

        var from = zeta + spiral.joints[endIndex].Reflect(norm);
        for (int i = endIndex - 1; i >= startIndex; i--)
        {
            var color = reverseSpiralColor;
            color.a = transparency.value;
            Draw.Thickness = 1 + transparency.value;

            if (i == middleLink - 1)
            {
                color = new Color(.6f, 1f, .2f, 1f);
                color.a = transparency.value;
                Draw.Thickness = 4;
            }
            else if (i == middleLink)
            {
                color = new Color(1, .5f, .5f, 1f); // orange
                color.a = transparency.value;
                Draw.Thickness = 4;
            }
            else if (i == middleLink + 1)
            {
                color = new Color(1, 0, .5f, 1f);
                color.a = transparency.value;
                Draw.Thickness = 4;
            }

            var to = zeta + spiral.joints[i].Reflect(norm);

            Draw.Color = color;
            Draw.Line(from, to);
            from = to;
        }
    }
}
