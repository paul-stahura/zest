using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class ProjectedMidLink : ImmediateModeShapeDrawer
{
    public ZetaSpiral spiral;
    public Slider transparency;
    [SerializeField] public Color color = new Color(1, .5f, 0, 1);
    public float thickness = 6f;

    void Start()
    {
        transparency.onValueChanged.AddListener(value => color = new Color(color.r, color.g, color.b, value));
        // transparency.value = color.a;
    }

    public override void DrawShapes(Camera cam)
    {
        if (transparency.value == 0 || spiral.S == null)
            return;

        using (Draw.Command(cam))
        {
            using (Draw.StyleScope)
            {
                // set up static parameters. these are used for all following Draw.Line calls
                Draw.LineGeometry = LineGeometry.Volumetric3D;
                Draw.ThicknessSpace = ThicknessSpace.Pixels;
                Draw.Thickness = thickness;
                Draw.Color = new Color(color.r, color.g, color.b, transparency.value);

                var mi = spiral.S.middleIndex;
                var pt1 = spiral.S.links[mi].ToVector2();
                var pt2 = spiral.S.links[mi + 1].ToVector2();
                var z = spiral.S.zeta.ToVector2();

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
}