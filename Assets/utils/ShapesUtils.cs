using UnityEngine;
using Shapes;

public static class ShapesUtils {

   public static void DrawCross(Vector2 pt, float length = .1f, float thickness = .5f) {
        Draw.Line(new Vector2(pt.x, pt.y - length), new Vector2(pt.x, pt.y + length), thickness);
        Draw.Line(new Vector2(pt.x - length, pt.y), new Vector2(pt.x + length, pt.y), thickness);
    }

    public static void DrawCross45(Vector2 pt, float length = .1f, float thickness = .5f) {
        length /= 2;
        Draw.Line(new Vector2(pt.x- length, pt.y - length), new Vector2(pt.x + length, pt.y + length), thickness);
        Draw.Line(new Vector2(pt.x - length, pt.y + length), new Vector2(pt.x + length, pt.y - length), thickness);
    }
}