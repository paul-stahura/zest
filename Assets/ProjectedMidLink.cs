using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class ProjectedMidLink : ImmediateModeShapeDrawer
{
    public ZetaSpiral spiral;
    public Slider transparency;
    [SerializeField] public Color color = new Color(1, .5f, 0, 1);
    public float thickness = 4f;

    void Start()
    {
        transparency.onValueChanged.AddListener(value => color = new Color(color.r, color.g, color.b, value));
        transparency.value = color.a;
    }

    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {
            using (Draw.StyleScope)
            {
                // set up static parameters. these are used for all following Draw.Line calls
                Draw.LineGeometry = LineGeometry.Volumetric3D;
                Draw.ThicknessSpace = ThicknessSpace.Pixels;
                Draw.Thickness = thickness;
                Draw.Color = new Color(color.r, color.g, color.b, transparency.value / 2f);

                var mi = spiral.S.middleIndex;
                var pt1 = spiral.S.links[mi].ToVector2();
                var pt2 = spiral.S.links[mi + 1].ToVector2();
                var z = spiral.S.zeta.ToVector2();

                pt1 = z.normalized * Vector2.Dot(pt1, z) / z.magnitude;
                pt2 = z.normalized * Vector2.Dot(pt2, z) / z.magnitude;

                Draw.Line(pt1, pt2);
            }
        }
    }
}