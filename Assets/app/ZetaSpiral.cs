using System;
using System.IO;
using System.Collections.Generic;
using Complex=System.Numerics.Complex;

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

    public Zeta.Spiral S;

    public void Start()
    {
        S = new Zeta.Spiral(new Complex(app.Real, app.Imag), app.useReimannSiegel.isOn);
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

            S = new Zeta.Spiral(new Complex(app.Real, app.Imag), app.useReimannSiegel.isOn);
            drawSpiral();
            drawZeta();
        }
    }


    public float distance;

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
            for (int i = 1; i < S.links.Length; i++)
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
                else if (i == S.links.Length - 1)
                {
                    color = Color.red;
                    Draw.Thickness = 2;
                }

                var start = S.links[i - 1].ToVector2();
                var end = S.links[i];

                Draw.Line(start, end, color);
            }
        }
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
