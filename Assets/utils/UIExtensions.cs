using UnityEngine;
using UnityEngine.UI;

public static class UIExtensions
{
    public static void ScreenPosition(this Text label, double x, double y)
    {
        label.ScreenPosition(new Vector(x, y));
    }

    public static void ScreenPosition(this Text label, float x, float y)
    {
        label.ScreenPosition(new Vector2(x, y));
    }

    public static void ScreenPosition(this Text label, Vector2 pos)
    {
        label.rectTransform.anchoredPosition = new Vector2(pos.x, -pos.y) * label.rectTransform.localScale;
    }
}