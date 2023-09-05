using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class ProjectedMidLink : MonoBehaviour
{
    public App app;
    public Slider transparency;
    
    [SerializeField] public Color color = new Color(1, .5f, 0, 1);
    public float thickness = 6f;

    void Start()
    {
        transparency.onValueChanged.AddListener(value => color = new Color(color.r, color.g, color.b, value));
        // transparency.value = color.a;

        app.DrawSprial += drawShapes;
    }

    void drawShapes(Camera cam, Zeta.Spiral spiral)
    {
        if (transparency.value == 0)
            return;

        using (Draw.StyleScope)
        {
            Draw.Thickness = thickness;
            Draw.Color = new Color(color.r, color.g, color.b, transparency.value);

            var mi = spiral.middleIndex;
            var pt1 = spiral.joints[mi].ToVector2();
            var pt2 = spiral.joints[mi + 1].ToVector2();
            var z = spiral.zeta.ToVector2();

            pt1 = z.normalized * Vector2.Dot(pt1, z) / z.magnitude;
            pt2 = z.normalized * Vector2.Dot(pt2, z) / z.magnitude;


            // for some reason in the release build, the projected line
            // (below) isn't drawn unless I draw something else so that's
            // why I draw these tiny crosses. (shrug)
            ShapesUtils.DrawCross(pt1, .001f);
            ShapesUtils.DrawCross(pt2, .001f);

            Draw.Line(pt1, pt2);
        }
    }
}