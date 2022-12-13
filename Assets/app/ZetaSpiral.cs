using System;
using System.IO;
using System.Collections.Generic;
using Complex = System.Numerics.Complex;

using UnityEngine;
using UnityEngine.UI;
using Shapes;


public partial class ZetaSpiral : ImmediateModeShapeDrawer
{

    [SerializeField]
    public App app;

    [SerializeField]
    public Slider transparency;

    [SerializeField]
    public Slider targetTransparency;

    // Dont draw a line until the total length of the vectors is at least this
    [SerializeField]
    public Slider cutoffLength;

    // Skip drawing this many lines before drawing the next line. They are so short you can't see them anyway
    [SerializeField]
    public Slider skipEvery;

    public int numLinksReference = 100;


    // Don't draw the spiral after the middle links.  Only draw a line to each spiral
    public Toggle onlyDrawOutline;
    // Draw a cross marking the location of each spiral
    public Zeta.Spiral S;

    void OnApplicationQuit()
    {
        PlayerPrefs.SetFloat(name + "-Transparency", transparency.value);
        PlayerPrefs.SetFloat(name + "-ZetaTargetTransparency", targetTransparency.value);
        PlayerPrefs.Save();
    }
    public void Start()
    {
        S = new Zeta.Spiral(new Complex(app.Real, app.Imag), app.useReimannSiegel.isOn);

        transparency.value = PlayerPrefs.GetFloat(name + "-Transparency", .7f);
        targetTransparency.value = PlayerPrefs.GetFloat(name + "-ZetaTargetTransparency", 1f);
    }

    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {

            // set up static parameters. these are used for all following Draw.Line calls
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;
            Draw.Thickness = 1;

            // set static parameter to draw in the local space of this object
            Draw.Matrix = transform.localToWorldMatrix;

            if (S == null)
                S = new Zeta.Spiral(new Complex(app.Real, app.Imag), app.useReimannSiegel.isOn);
            else
                S.Update(new Complex(app.Real, app.Imag), app.useReimannSiegel.isOn);

            drawSpiral();
            drawZetaTarget();

            drawOutline();
        }
    }

    void drawSpiral()
    {
        if (S.links[0] == null)
            return;

        using (Draw.StyleScope)
        {
            // Since our links are zero-based, the middle index into the array
            // is not the middle link number starting from one.
            var middleLink = S.middleIndex + 1;


            numLinksReference = S.numLinks;

            int skipCount = 0;

            var start = S.links[0].ToVector2();
            for (int i = 1; i < S.numLinks; i++)
            {
                var color = Color.grey;
                color.a = transparency.value;
                Draw.Thickness = 1;

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
                else if (i == S.numLinks - 1)
                {
                    color = Color.red;
                    Draw.Thickness = 2;
                }


                var end = S.links[i];


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
    }

    void drawOutline()
    {
        if (!onlyDrawOutline.isOn)
            return;

        var start = S.spirals[0];
        for (var i = 0; i < S.middleIndex; i++)
        {
            var end = S.spirals[i];
            Draw.Line(start, end);
            start = end;
        }
    }



    void drawZetaTarget()
    {
        using (Draw.StyleScope)
        {
            var pt = S.zeta.ToVector2();

            var color = Color.cyan;
            color.a = targetTransparency.value;

            Draw.Color = color;
            Draw.Ring(pt, .08f);
            ShapesUtils.DrawCross(pt, .1f);

            Draw.Ring(pt, 1f);
        }
    }
}
