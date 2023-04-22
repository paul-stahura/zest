using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Shapes;
using Complex = System.Numerics.Complex;

public class ZOutput : MonoBehaviour
{
    public ZInput input;
    public double draggingStep = .01;
    public double step = .0001;
    public float scalar = 1;
    public Color color = Color.yellow;
    public Slider transparency;


    void Start()
    {
        transparency.value = PlayerPrefs.GetFloat(name + "-Transparency", color.a);

        input.OnDragStart += () =>
        {
            calculatePoints(true);
        };

        input.OnDragEnd += () =>
        {
            calculatePoints(false);
        };

        input.OnDragEnd();
    }

    void OnApplicationQuit()
    {
        PlayerPrefs.SetFloat(name + "-Transparency", transparency.value);
        PlayerPrefs.Save();
    }

    List<Vector2> points = new List<Vector2>();

    public int pointCount;
    public void OnDrawShapes(Camera cam)
    {
        using (Draw.StyleScope)
        {
            Draw.Thickness = 1;

            var col = color;
            col.a = transparency.value; // SRMath.Ease(0, 1f, transparency.value, SRMath.EaseType.ExpoEaseOut);

            if (input.dragging)
            {
                calculatePoints(true); 
            }

            pointCount = points.Count;
            
            if (points.Count == 0)
                return;

            var start = points[0];
            for (int i = 1; i < points.Count; i++)
            {
                var end = points[i];
                Draw.Line(start, end, col);
                start = end;
            }
        }
    }

    void calculatePoints(bool fast)
    {
        double inc = fast ? draggingStep : step;

        points.Clear();
        for (double i = 0; i <= 1; i += inc)
        {
            var c = input.imagStart.Lerp(input.imagEnd, i);
            points.Add(Zeta.EulerMaclauren(c).ToVector2());
        }
    }
}
