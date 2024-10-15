using UnityEngine;
using UnityEngine.UI;
using Shapes;
using UnityEngine.Experimental.AI;

public class BisectingLines : MonoBehaviour
{
    public App app;
    public Slider transparency;
    private Toggle _bisectorPointToggle;
    [SerializeField] public Color color = new Color(1, 0.56f, 0, 0.5f);
    public float thickness = 1f;

    void OnApplicationQuit()
    {
        savePlayerPrefs();
    }

    void Awake()
    {
        _bisectorPointToggle = GameObject.Find("OldBisectorPointToggle")?.GetComponent<Toggle>();
    }

    void Start()
    {
        transparency.onValueChanged.AddListener(value => color = new Color(color.r, color.g, color.b, value));
        transparency.value = PlayerPrefs.GetFloat(name + "-Transparency", color.a);

        app.DrawSprial += drawShapes;
        app.SceneChange += savePlayerPrefs;
    }

    void savePlayerPrefs() {
        PlayerPrefs.SetFloat(name + "-Transparency", transparency.value);
        PlayerPrefs.Save();
    }

    void drawShapes(Camera cam, Zeta.Spiral spiral)
    {
        if (!_bisectorPointToggle.isOn || transparency.value == 0)
            return;

        using (Draw.StyleScope)
        {
            Draw.Thickness = thickness;
            Draw.Color = new Color(color.r, color.g, color.b, transparency.value);

            var zetaPt = spiral.zeta.ToVector2();

            var bipt = CrotchPoint(spiral);
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


    public static Vector CrotchPoint(Zeta.Spiral spiral)
    {
        var idx = spiral.middleIndex;
        var M1 = spiral.joints[idx];
        var M2 = spiral.joints[idx + 1];

        var pt = spiral.zeta.ToVector();

        // Finds the intersecting point between the bisecting line and the middle link
        var slope1 = -pt.x / pt.y;
        var slope2 = (M2.y - M1.y) / (M2.x - M1.x);

        var x = ((slope2 * M2.x - slope1 * pt.x / 2) - (M2.y - pt.y / 2)) / (slope2 - slope1);

        var y = slope1 * (x - pt.x / 2) + pt.y / 2;

        return new Vector(x, y);
    }
}