using System.Collections;
using System.Collections.Generic;
using System.IO;
using Complex = System.Numerics.Complex;
using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class ZetaPointCloud : ImmediateModeShapeDrawer
{
    public List<Vector3> mats = new List<Vector3>();

    public Material material;
    ComputeBuffer buffer;

    public float size = .05f;
    void Start()
    {
        string line;
        using (var sr = File.OpenText("Assets/data/zero-transforms.csv"))
        {
            while ((line = sr.ReadLine()) != null)
            {
                var tokens = line.Split(",");
                var i = int.Parse(tokens[0]);
                var idx = int.Parse(tokens[1]);
                var pos = new Vector3(float.Parse(tokens[2]), float.Parse(tokens[3]), 0);
                // var x = float.Parse(tokens[4]);
                // var y = float.Parse(tokens[5]);
                // var z = float.Parse(tokens[6]);
                // var w = float.Parse(tokens[7]);
                // var rot = new Quaternion(x, y, z, w);

                // var m = new Matrix4x4();
                // m.SetTRS(pos, rot, Vector3.one);
                // if (!m.ValidTRS())
                // {
                //     Debug.Log($"not valid: {pos}, {rot}");
                // }

                // var pos = m.GetPosition();
                mats.Add(pos);
                // mats.Add((float)0);
                // mats.Add((float)0);
            }
        }
        // buffer = new ComputeBuffer(mats.Count, sizeof(float) * 4);
        // buffer.SetData(mats.ToArray());

        MeshUtils.QuadsFromPoints(transform, mats.ToArray(), material, size);
    }

    void OnDestroy()
    {
        if (buffer != null)
            buffer.Release();
    }

    // void OnRenderObject()
    // {
    //     if (buffer == null)
    //         return;
            
    //     material.SetPass(0);
    //     Graphics.DrawProceduralNow(MeshTopology.Points, buffer.count);
    // }

    // public override void DrawShapes(Camera cam)
    // {
    //     using (Draw.Command(cam))
    //     {
    //         using (Draw.StyleScope)
    //         {
    //             Draw.LineGeometry = LineGeometry.Volumetric3D;
    //             Draw.ThicknessSpace = ThicknessSpace.Pixels;
    //             Draw.Thickness = 1f;
    //             // set static parameter to draw in the local space of this object
    //             Draw.Matrix = transform.localToWorldMatrix;

    //             Draw.Color = Color.yellow;

    //             var len = Camera.main.orthographicSize/100;

    //             for (var i = 0; i < 10; i++)
    //             {
    //                 Draw.Matrix = mats[i];
    //                 // ShapesUtils.DrawCross(Vector2.zero);
    //                 Draw.Line(new Vector2(0, -len), new Vector2(0, len));
    //             }
    //         }
    //     }
    // }
}
