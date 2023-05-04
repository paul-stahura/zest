using System;
using System.IO;
using System.Linq;
using Complex = System.Numerics.Complex;

using UnityEngine;
using UnityEngine.UI;
using UnityEngine.Events;
using UnityEngine.SceneManagement;
using Shapes;

public class IOApp : ImmediateModeShapeDrawer
{

    public DrawShapesEvent onDrawShapes = new DrawShapesEvent();
    
    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;
            Draw.Matrix = transform.localToWorldMatrix;

            Draw.Thickness = 6;
            var c = Color.blue;
            c.a = .5f;
            
            Draw.Line(new Vector2(.00915f, 0), new Vector2(1, 0), c);
            // ShapesUtils.DrawCross()


            onDrawShapes.Invoke(cam);
        }
    }

    void OnApplicationQuit()
    {
    }



    void Update()
    {

    }

    public void onClick()
    {
        SceneManager.LoadScene("~Main");
    }
}
