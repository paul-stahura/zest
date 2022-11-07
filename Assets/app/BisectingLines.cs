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
        transparency.onValueChanged.AddListener(value => color = new Color(color.r, color.g, color.b, value) );
        transparency.value = color.a;
    }

    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {
			// set up static parameters. these are used for all following Draw.Line calls
			Draw.LineGeometry = LineGeometry.Volumetric3D;
			Draw.ThicknessSpace = ThicknessSpace.Pixels;

			// set static parameter to draw in the local space of this object
			Draw.Matrix = transform.localToWorldMatrix;            
            Draw.Thickness = thickness;
            Draw.Color = new Color(color.r, color.g, color.b, transparency.value);
            var bipt = BisectPoint(spiral.S);
            Draw.Line(Vector2.zero, spiral.rsZeta);
            Draw.Line(Vector2.zero, bipt);
            Draw.Line(bipt, spiral.rsZeta);
        }
    }


    public static Vector2 BisectPoint(Zeta.Spiral spiral)
    {
        var idx = spiral.MiddleIndex;
        var M1 = spiral.Links[idx];
        var M2 = spiral.Links[idx + 1];

        // Finds the intersecting point between the bisecting line and the middle link
        var slope1 = -spiral.ZetaPoint.x / spiral.ZetaPoint.y;
        var slope2 = (M2.y - M1.y) / (M2.x - M1.x);

        var x = ((slope2 * M2.x - slope1 * spiral.ZetaPoint.x / 2) - (M2.y - spiral.ZetaPoint.y / 2)) / (slope2 - slope1);

        var y = slope1 * (x - spiral.ZetaPoint.x / 2) + spiral.ZetaPoint.y / 2;

        return new Vector2((float)x, (float)y);
    }
}