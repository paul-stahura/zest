using System;
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

            using (Draw.StyleScope)
            {
                onDrawShapes.Invoke(cam);
            }
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

    public void onClick()
    {
        SceneManager.LoadScene("~Main");
    }
}
