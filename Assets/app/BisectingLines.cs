using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class BisectingLines : ImmediateModeShapeDrawer
{
    public ZetaSpiral spiral;
    public Slider transparency;
    [SerializeField] public Color color = Color.cyan;
    public float thickness = 1f;

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
                Draw.Matrix = transform.localToWorldMatrix;
                Draw.Thickness = thickness;
                Draw.Color = new Color(color.r, color.g, color.b, transparency.value);

                var zetaPt = spiral.S.zeta.ToVector2();

                var bipt = BisectPoint(spiral.S);
                Draw.Line(Vector2.zero, zetaPt);
                Draw.Line(Vector2.zero, bipt);
                Draw.Line(bipt, zetaPt);



                // Draw dashed bisecting line. Extend it past a little bit
                var z2 = (zetaPt / 2);
                var dir = (z2 - bipt).normalized * .5f;
                Draw.Thickness = thickness * 2;
                Draw.UseDashes = true;
                Draw.Line(z2 + dir, bipt - dir);
            }
        }
    }


    public static Vector2 BisectPoint(Zeta.Spiral spiral)
    {
        var idx = spiral.middleIndex;
        var M1 = spiral.links[idx];
        var M2 = spiral.links[idx + 1];

        var pt = spiral.zeta.ToVector();

        // Finds the intersecting point between the bisecting line and the middle link
        var slope1 = -pt.x / pt.y;
        var slope2 = (M2.y - M1.y) / (M2.x - M1.x);

        var x = ((slope2 * M2.x - slope1 * pt.x / 2) - (M2.y - pt.y / 2)) / (slope2 - slope1);

        var y = slope1 * (x - pt.x / 2) + pt.y / 2;

        return new Vector2((float)x, (float)y);
    }
}