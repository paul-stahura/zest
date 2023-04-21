using System;
using Complex = System.Numerics.Complex;

using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class IOApp : ImmediateModeShapeDrawer
{
    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;
            Draw.Matrix = transform.localToWorldMatrix;

            using (Draw.StyleScope)
            {
                drawGrid();
            }
        }
    }

    void drawGrid() 
    {
        Draw.Thickness = 1f;
        var c = Color.gray;
        

        for (var x = -10.0f; x <= 10.0f; x += .5f)
        {
            if (x % 10f == 0)
{                Draw.Thickness = 4f;
                c.a = 1f;
                Draw.Color = c;
}            else
{                Draw.Thickness = .5f;
}
            Draw.Line(new Vector2(x, -10), new Vector2(x, 10));
        }
        
        for (var y = -10.0f; y <= 10.0f; y += .5f)
        {
            if (y % 10 == 0)
                Draw.Thickness = 4f;
            else
                Draw.Thickness = .5f;

            Draw.Line(new Vector2(-10, y), new Vector2(10, y));
        }

    }

    void OnApplicationQuit()
    {
    }

    public void Start()
    {

    }

    void Update()
    {

   }
}
