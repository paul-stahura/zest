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
    public int numLinksReference = 100;

    // Dont draw a line until the total length of the vectors is at least this
    public float lengthCutoff = .01f;
    // Don't draw the spiral after the middle links.  Only draw a line to each spiral
    public bool drawLinkSpirals = false;
    // Draw a cross marking the location of each spiral
    public bool drawSprialMarkers = false;
    // Skip drawing this many lines before drawing the next line. They are so short you can't see them anyway
    public int skipEvery = 2;
    public int spiralCount; 
    public Zeta.Spiral S;

    void OnApplicationQuit()
    {
        PlayerPrefs.SetFloat(name + "-Transparency", transparency.value);
        PlayerPrefs.Save();
    }
    public void Start()
    {
        S = new Zeta.Spiral(new Complex(app.Real, app.Imag), app.useReimannSiegel.isOn);

        transparency.value = PlayerPrefs.GetFloat(name + "-Transparency", .7f);
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
            drawZeta();

            drawOutline();
            drawSpiralMarker();
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

            Draw.Thickness = 1; // 4px wide

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

                spiralCount = S.spirals.Length;

                if (i >= middleLink + 2 && S.middleIndex > 150)
                {
                    if (drawLinkSpirals)
                        return;

                    // // Debug.Log($"i:{i} len-sq:{(end - start).sqrMagnitude}");
                    if (app.fps < 5)
                        lengthCutoff += .000001f;
                    else if (app.fps > 30)
                        lengthCutoff -= .000001f;

                    lengthCutoff = Mathf.Clamp(lengthCutoff, 0, .01f);
                    if ((end - start).sqrMagnitude < lengthCutoff)
                        continue;

                    if (skipCount > skipEvery)
                    {
                        skipCount = 0;
                    }
                    else
                    {
                        skipCount++;
                        continue;
                    }
                }

                Draw.Line(start, end, color);
                start = end;
            }
        }
    }

    void drawOutline()
    {
        if (!drawLinkSpirals)
            return;

        var start = S.spirals[0];
        for (var i = 0; i < S.spirals.Length - 1; i++)
        {
            var end = S.spirals[i];
            Draw.Line(start, end);
            start = end;
        }
    }

    void drawSpiralMarker()
    {
        if (!drawSprialMarkers)
            return;

        for (var i = 0; i < S.middleIndex; i++)
            ShapesUtils.DrawCross(S.spirals[i]);
    }



    void drawZeta()
    {
        using (Draw.StyleScope)
        {
            var pt = S.zeta.ToVector2();

            // Draw the Reiman Siegel
            Draw.Color = Color.green;
            Draw.Thickness = 1;
            Draw.Ring(pt, .08f);
            ShapesUtils.DrawCross(pt, .1f);

            // Draw David's aglo from Zzrob
            Draw.Color = Color.cyan;
            Draw.Ring(pt, .08f);
            ShapesUtils.DrawCross(pt, .1f);
        }
    }
}
