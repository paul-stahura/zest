using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Shapes;

public class ZOutput : MonoBehaviour
{
    public ZInput input;

    public void OnDrawShapes(Camera cam)
    {
        using (Draw.StyleScope)
        {
            var dir = input.imagEnd - input.imagStart;
            var dist = input.imagStart.DistanceTo(input.imagEnd);

            for (var i = 0; i < 500; i++)
            {

            }
        }
    }
}
