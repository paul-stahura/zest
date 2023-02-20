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
    public Slider targetTransparency;
    public Slider visibleLinks;



    // Dont draw a line until the total length of the vectors is at least this
    public Slider cutoffLength;

    // Skip drawing this many lines before drawing the next line. They are so short you can't see them anyway
    public Slider skipEvery;

    public int numLinksReference = 100;


    // Don't draw the spiral after the middle links.  Only draw a line to each spiral
    public Toggle onlyDrawOutline;
    // Draw a cross marking the location of each spiral

    void OnApplicationQuit()
    {
        PlayerPrefs.SetFloat(name + "-Transparency", transparency.value);
        PlayerPrefs.SetFloat(name + "-ZetaTargetTransparency", targetTransparency.value);
        PlayerPrefs.Save();
    }
    public void Start()
    {
        transparency.value = PlayerPrefs.GetFloat(name + "-Transparency", .7f);
        targetTransparency.value = PlayerPrefs.GetFloat(name + "-ZetaTargetTransparency", 1f);

        app.DrawSprial += drawShapes;
    }

    void drawShapes(Camera cam, Zeta.Spiral spiral)
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
    }

    void drawSpiral(Zeta.Spiral sprial)
    {
        if (sprial.joints[0] == null)
            return;

        Draw.Thickness = 1;
        // Since our links are zero-based, the middle index into the array
        // is not the middle link number starting from one.
        var middleLink = sprial.middleIndex + 1;


        numLinksReference = sprial.numLinks;

        int skipCount = 0;

        // If the visibleLinks slider is at max value, don't limit visibility.  Draw all links
        bool limitVisibleLinks = visibleLinks.value < visibleLinks.maxValue;

        var startIndex = 1;
        var endIndex = sprial.numLinks;

        if (limitVisibleLinks) {
            startIndex = (int)Mathf.Clamp(CameraTracking.trackingIndex - (int)visibleLinks.value + 1, 1, CameraTracking.trackingIndex - (int)visibleLinks.value + 1);
            endIndex = (int)Mathf.Clamp(CameraTracking.trackingIndex + (int)visibleLinks.value + 2, CameraTracking.trackingIndex + (int)visibleLinks.value + 2, sprial.numLinks);
        }

        var start = sprial.joints[startIndex - 1].ToVector2();
        for (int i = startIndex; i < endIndex; i++)
        {
            var color = Color.white;
            color.a = transparency.value;
            Draw.Thickness = 1 + transparency.value;

            if (i == middleLink - 1)
            {
                color = Color.green;
                Draw.Thickness = 4;
            }
            else if (i == middleLink)
            {
                color = new Color(1, .5f, 0, 1f); // orange
                Draw.Thickness = 4;
            }
            else if (i == middleLink + 1)
            {
                color = Color.red;
                Draw.Thickness = 4;
            }
            // else if (i == sprial.numLinks - 1)
            // {
            //     color = Color.red;
            //     Draw.Thickness = 2;
            // }


            var end = sprial.joints[i];


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

        var color = Color.cyan;
        color.a = targetTransparency.value;

        Draw.Color = color;
        Draw.Ring(pt, .08f);
        ShapesUtils.DrawCross(pt, .1f);

        Draw.Ring(pt, 1f);

    }
}
