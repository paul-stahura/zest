using UnityEngine;
using Shapes;

public static class ShapesUtils {

   public static void DrawCross(Vector2 pt, float length) {
        Draw.Line(new Vector2(pt.x, pt.y - length), new Vector2(pt.x, pt.y + length));
        Draw.Line(new Vector2(pt.x - length, pt.y), new Vector2(pt.x + length, pt.y));
    }
}