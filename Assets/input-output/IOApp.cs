using System;
using Complex = System.Numerics.Complex;

using UnityEngine;
using UnityEngine.UI;
using UnityEngine.Events;
using Shapes;

public class IOApp : ImmediateModeShapeDrawer
{
    Vector imagStart = new Vector(.5, 189.5416); // index: 5.0
    Vector imagEnd = new Vector(5.24, 264.9393); // index: 5.999999

    public Camera camera;
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
                onDrawShapes.Invoke(camera);
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
}
