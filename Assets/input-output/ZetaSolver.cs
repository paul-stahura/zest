using System;
using System.Collections;
using System.Collections.Generic;
using Shapes;
using UnityEditor.Experimental.GraphView;
using UnityEngine;

public class ZetaSolver : MonoBehaviour
{
    [Header("IndexPlane")]
    public Camera IndexCamera;
    public Transform IndexPlaneOrigin;
    public int NumOfBands = 3;
    public Vector2 BandSize = new Vector2(0.25f, 1);
    [Tooltip("Number of dots between")] public Vector2 BandDensity = new Vector2(10, 40);
    public List<Color> BandColors = new List<Color>() 
    {
        Color.red,
        Color.green,
        Color.blue,
        Color.magenta,
    };
    [Range(0, 1)] public float BandTransparency = 1;
    public float dotRadiusScalar = 300;

    [Header("TeardropPlane")]
    public Camera TeardropCamera;

    public void OnDrawShapes(Camera cam)
    {
        drawIndexPlanePoints();
    }

    private void drawIndexPlanePoints()
    {
        for(int band = 0; band < NumOfBands; band++)
        {
            using (Draw.StyleScope)
            {
                Draw.Matrix = IndexPlaneOrigin.localToWorldMatrix;

                Color drawColor = BandColors[band];
                drawColor.a = BandTransparency;
                Draw.Color = drawColor;

                var dotRadius = IndexCamera.orthographicSize / dotRadiusScalar;

                double xIncrement = BandSize.x / BandDensity.x;
                double yIncrement = BandSize.y / BandDensity.y;
                for(double x = 0; x < BandSize.x; x += xIncrement)
                {
                    for(double y = 0; y < BandSize.y; y += yIncrement)
                    {
                        var offset = new Vector(IndexPlaneOrigin.position.x, IndexPlaneOrigin.position.y) + new Vector(BandSize.x * band, 0);
                        var pt = new Vector(x, y) + offset;
                        Draw.Disc(pt, dotRadius, drawColor);
                    }
                }
            }
        }
    }
}
