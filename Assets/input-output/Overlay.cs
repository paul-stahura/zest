using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class Overlay : MonoBehaviour
{
    Vector2[] points1;
    Vector2[] points2;

    public Toggle show;

    public void Start()
    {
        // Read the CSV file
        var lines = File.ReadAllLines("Assets/data/teardrops.csv");

        // Parse each line to get the x,y values
        var coordinates = lines.Select(line =>
        {

            var values = line.Split(',');

            var v1 = new Vector2(float.Parse(values[0]), float.Parse(values[1]));
            var v2 = new Vector2(float.Parse(values[2]), float.Parse(values[3]));

            return (v1, v2);
        });

        // Get the points
        points1 = coordinates.Select(c => c.Item1).ToArray();
        points2 = coordinates.Select(c => c.Item2).ToArray();

        show.isOn = false;
    }

    public void OnDrawShapes(Camera cam)
    {
        if (!show.isOn)
            return;

        Draw.LineGeometry = LineGeometry.Volumetric3D;
        Draw.ThicknessSpace = ThicknessSpace.Pixels;
        Draw.Matrix = transform.localToWorldMatrix;

        using (Draw.StyleScope)
        {
            if (points1 != null)
            {
                var start = points1[0];
                for (int i = 1; i < points1.Length; i++)
                {
                    var end = points1[i];
                    Draw.Line(start, end, 1, Color.red);
                    start = end;
                }
            }

            if (points2 != null)
            {
                var start = points2[0];
                for (int i = 1; i < points2.Length; i++)
                {
                    var end = points2[i];
                    Draw.Line(start, end, 1, Color.blue);
                    start = end;
                }
            }
        }
    }
    
}
