using System;
using System.IO;
using System.Collections.Generic;

using UnityEngine;
using UnityEngine.UI;
using Shapes;


public partial class ZetaSpiral : ImmediateModeShapeDrawer {

    [SerializeField]
    public App app;

    [SerializeField]
    public Slider transparency;
    public int numLinksReference = 100;

    public Vector2[] middleLink = new Vector2[2];
    // Middle point on the middle link
    public Vector2 midPt = new Vector2();
    public int middleIndex;
    // Zeta coordinate calculated from Reiman Siegel algo
    public Vector2 rsZeta;
    // Zeta coordinate calculated from our old Zzrob algo
    public Vector2 drZeta;



	public override void DrawShapes( Camera cam ){

        rsZeta = Zeta.ReimannSiegel(app.Imag).ToVector2();
        drZeta = Zeta.Compute(new System.Numerics.Complex(0.5, app.Imag)).ToVector2(); 

		using( Draw.Command( cam ) ){

			// set up static parameters. these are used for all following Draw.Line calls
			Draw.LineGeometry = LineGeometry.Volumetric3D;
			Draw.ThicknessSpace = ThicknessSpace.Pixels;
            Draw.Thickness = 1;

			// set static parameter to draw in the local space of this object
			Draw.Matrix = transform.localToWorldMatrix;

            middleIndex = Mathf.FloorToInt((float)Zeta.ImagToIndex(app.Imag)) + 1;

            drawSpiral();
            drawZeta();
		}
	}


    public float distance;

    void drawSpiral() {
        var start = Vector3.zero;
        numLinksReference = (int)(app.Imag);
        using (Draw.StyleScope) {
            Draw.Thickness = 1; // 4px wide
            for (int i = 1; i < numLinksReference; i++) {
                var x = Mathf.Cos((float)-app.Imag * Mathf.Log(i)) / Mathf.Pow(i, .5f);
                var y = Mathf.Sin((float)-app.Imag * Mathf.Log(i)) / Mathf.Pow(i, .5f);
                var end = new Vector3(start.x + x, start.y + y, 0);

                var color = Color.grey;
                color.a = transparency.value;
                Draw.Thickness = 1;

                if (i == middleIndex - 1) {
                    color = Color.green;
                    Draw.Thickness = 4;
                }
                else if (i == middleIndex)
                {
                    color = new Color(1, .5f, 0, 1f);
                    middleLink[0] = start;
                    middleLink[1] = end;
                    midPt = start + (end - start) / 2;
                    Draw.Thickness = 4;
                }
                else if (i == middleIndex + 1) {
                    color = Color.red;
                    Draw.Thickness = 4;
                }

                Draw.Line(start, end, color);
                start = end;
                distance = Mathf.Abs(rsZeta.magnitude - start.magnitude);
            }
        }
    }

    void drawZeta() {
        using (Draw.StyleScope) {
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
