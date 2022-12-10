using System;
using System.IO;
using System.Collections.Generic;
using Complex = System.Numerics.Complex;

using UnityEngine;
using UnityEngine.UI;
using Shapes;


public partial class EulersProduct : ImmediateModeShapeDrawer
{

    [SerializeField]
    public App app;

    [SerializeField]
    public Slider transparency;

    [SerializeField]
    public Slider iterations;
    [SerializeField]
    public Text iterLabel;

    Complex[] points;

    void OnApplicationQuit()
    {
        PlayerPrefs.SetFloat(name + "-Transparency", transparency.value);
        PlayerPrefs.SetFloat(name + "-Iterations", iterations.value);
        PlayerPrefs.Save();
    }
    public void Start()
    {
        transparency.value = PlayerPrefs.GetFloat(name + "-Transparency", .2f);
        iterations.value = PlayerPrefs.GetFloat(name + "-Iterations", 20f);

        app.ImagChanged += i => points = Zeta.EulersProduct(new Complex(app.Real, i), (int)iterations.value);
        app.RealChanged += r => points = Zeta.EulersProduct(new Complex(r, app.Imag), (int)iterations.value);
        iterations.onValueChanged.AddListener(v =>
        {
            points = Zeta.EulersProduct(new Complex(app.Real, app.Imag), (int)iterations.value);
            iterLabel.text = $"Iterations: {v}";
        });
        iterations.onValueChanged.Invoke(iterations.value);
    }

    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {

            // set up static parameters. these are used for all following Draw.Line calls
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;

            // set static parameter to draw in the local space of this object
            Draw.Matrix = transform.localToWorldMatrix;

            drawSpiral();
        }
    }

    void drawSpiral()
    {
        if (points == null)
            return;

        if (transparency.value == 0)
            return;

        using (Draw.StyleScope)
        {
            Draw.Thickness = 1;
            var color = Color.yellow;
            color.a = transparency.value;
            Draw.Color = color;

            var start = points[0].ToVector2();
            for (var i = 1; i < points.Length; i++)
            {
                var end = points[i].ToVector2();
                Draw.Line(start, end);
                start = end;
            }

            Draw.Color = Color.yellow;
            Draw.Ring(start, .04f);
            ShapesUtils.DrawCross(start);
        }
    }
}
