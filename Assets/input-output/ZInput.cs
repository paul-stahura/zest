using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Shapes;

public class ZInput : MonoBehaviour
{
    public Vector imagStart = new Vector(.5, 189.5416); // index: 5.0
    public Vector imagEnd = new Vector(.5, 264.9393); // index: 5.999999
    
    public void OnDrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;
            Draw.Matrix = transform.localToWorldMatrix;

            var start = Vector2.zero;

            var radius = cam.orthographicSize / 50;
            
            using (Draw.StyleScope)
            {
                Draw.Thickness = 1;
                Draw.Disc(imagStart, radius, Color.red);
                Draw.Disc(imagEnd, radius, Color.red);
                Draw.Line(imagStart, imagEnd, Color.red);
            }
        }
    }
}
