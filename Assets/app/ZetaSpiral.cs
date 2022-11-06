using System;
using System.IO;
using System.Collections.Generic;

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

    // Zeta coordinate calculated from Reiman Siegel algo
    public Vector2 rsZeta;
    // Zeta coordinate calculated from our old Zzrob algo
    public Vector2 drZeta;

    public Zeta.Spiral spiral;

    public void Start()
    {
        spiral = new Zeta.Spiral(app.Imag);
    }

    public override void DrawShapes(Camera cam)
    {

        rsZeta = Zeta.ReimannSiegel(app.Imag).ToVector2();
        drZeta = Zeta.Compute(new System.Numerics.Complex(0.5, app.Imag)).ToVector2();

        using (Draw.Command(cam))
        {

            // set up static parameters. these are used for all following Draw.Line calls
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;
            Draw.Thickness = 1;

            // set static parameter to draw in the local space of this object
            Draw.Matrix = transform.localToWorldMatrix;

            spiral = new Zeta.Spiral(app.Imag);
            drawSpiral();
            drawZeta();
        }
    }


    public float distance;

    void drawSpiral()
    {
        if (spiral.Links[0] == null)
            return;
            
        using (Draw.StyleScope)
        {
            Draw.Thickness = 1; // 4px wide
            for (int i = 1; i < spiral.Links.Length; i++)
            {
                var color = Color.grey;
                color.a = transparency.value;
                Draw.Thickness = 1;

                if (i == spiral.MiddleIndex - 1)
                {
                    color = Color.green;
                    Draw.Thickness = 4;
                }
                else if (i == spiral.MiddleIndex)
                {
                    color = new Color(1, .5f, 0, 1f);
                    Draw.Thickness = 4;
                }
                else if (i == spiral.MiddleIndex + 1)
                {
                    color = Color.red;
                    Draw.Thickness = 4;
                }

                var start = spiral.Links[i - 1].ToVector2();
                var end = spiral.Links[i];

                Draw.Line(start, end, color);
            }
        }
    }

    void drawZeta()
    {
        using (Draw.StyleScope)
        {
            // Draw the Reiman Siegel
            Draw.Color = Color.green;
            Draw.Thickness = 1;
            Draw.Ring(rsZeta, .08f);
            ShapesUtils.DrawCross(rsZeta, .1f);

            // Draw David's aglo from Zzrob
            Draw.Color = Color.cyan;
            Draw.Ring(drZeta, .08f);
            ShapesUtils.DrawCross(drZeta, .1f);
        }
    }
}
