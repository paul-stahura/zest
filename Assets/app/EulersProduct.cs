using System;
using System.IO;
using System.Collections.Generic;
using Complex = System.Numerics.Complex;

using UnityEngine;
using UnityEngine.UI;
using Shapes;

// 27 Mar, 2023 - currently unused
public partial class EulersProduct : MonoBehaviour
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
        savePlayerPrefs();
    }
    public void Start()
    {
        transparency.value = PlayerPrefs.GetFloat(name + "-Transparency", .2f);
        iterations.value = PlayerPrefs.GetFloat(name + "-Iterations", 20f);

        app.ImagChanged += i => {
            if (transparency.value > 0)
                points = Zeta.EulersProduct(new Complex(app.Real, i), (int)iterations.value);
            };
        app.RealChanged += r => {
            if (transparency.value > 0)
            points = Zeta.EulersProduct(new Complex(r, app.GetImag()), (int)iterations.value);
        };
        iterations.onValueChanged.AddListener(v =>
        {
            points = Zeta.EulersProduct(new Complex(app.Real, app.GetImag()), (int)iterations.value);
            iterLabel.text = $"Iterations: {v}";
        });
        iterations.onValueChanged.Invoke(iterations.value);

        app.DrawSprial += drawShapes;
        app.SceneChange += savePlayerPrefs;
    }

    void drawShapes(Camera cam, Zeta.Spiral spiral)
    {
        using (Draw.StyleScope)
        {
            drawSpiral();
        }
    }

    void savePlayerPrefs() 
    {
        PlayerPrefs.SetFloat(name + "-Transparency", transparency.value);
        PlayerPrefs.SetFloat(name + "-Iterations", iterations.value);
        PlayerPrefs.Save();
    }

    void drawSpiral()
    {
        if (points == null)
            return;

        if (transparency.value == 0)
            return;

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
