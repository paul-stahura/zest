using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Shapes;
using Complex = System.Numerics.Complex;

public class ZOutput : MonoBehaviour
{
    public ZInput input;
    public double step = .001;
    public float scalar = 20;

    public void OnDrawShapes(Camera cam)
    {
        
        using (Draw.StyleScope)
        {
            var dir = (input.imagEnd - input.imagStart);
            var dist = dir.Length;
        
            var start =  Zeta.EulerMaclauren(input.imagStart);
            for (double i = 0; i <= 1; i += step)
            {
                var c = input.imagStart.Lerp(input.imagEnd, i);
                var end = Zeta.EulerMaclauren(c);

                Draw.Line(start.ToVector2() * scalar, end.ToVector2() * scalar, 1, Color.yellow);
                start = end;
            }
        }
    }


}
