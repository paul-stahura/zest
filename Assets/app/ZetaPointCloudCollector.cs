using System.Collections;
using System.Collections.Generic;
using System.IO;
using Complex = System.Numerics.Complex;
using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class ZetaPointCloudCollector : MonoBehaviour
{
    public App app;
    public Toggle collectPoints;

    public ZetaSpiral spiral;

    public int index;

    public List<Tx> transforms = new List<Tx>();

    public struct Tx
    {
        public Vector2 pos;
        public Quaternion rot;
    }

    // public override void DrawShapes(Camera cam)
    // {
    //     var zeros = ZetaZeros.Get();
    //     if (index >= zeros.Length)
    //         return;

    //     if (!collectPoints.isOn)
    //         return;

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

    //         }
    //     }
    // }

    StreamWriter w;

    // Start is called before the first frame update
    void Start()
    {
        w = File.CreateText("Assets/data/zero-transforms.csv");
    }

    void OnApplicationQuit()
    {
        if (w != null)
        {
            w.Flush();
            w.Close();
        }
    }

    // Update is called once per frame
    void Update()
    {
        var zeros = ZetaZeros.Get();
        if (index >= zeros.Length)
            return;

        if (!collectPoints.isOn)
            return;

        var i = zeros[index];
        app.Imag = i;

        var s = new Zeta.Spiral(new Complex(.5, i), false);
        var idx = s.middleIndex;
        var start = s.links[idx];
        var end = s.links[idx + 1];

        var pos = (start + (end - start) / 2).ToVector2();
        var rot = rotationOfLink(s, idx);

        w.WriteLine($"{index},{idx},{pos.x},{pos.y},{rot.x},{rot.y},{rot.z},{rot.w}");
        index++;
    }

    // Calculates the rotation required to orient the camera so that the link
    // at the given index appears horizontal when rendered.
    Quaternion rotationOfLink(Zeta.Spiral s, int idx)
    {
        Vector3 start = s.links[idx];
        Vector3 end = s.links[idx + 1];

        var temp = end - start;
        var angle = Mathf.Atan2(temp.y, temp.x) * Mathf.Rad2Deg;

        return Quaternion.AngleAxis(angle, Vector3.forward);
    }
}
