using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class LinkToPoints : MonoBehaviour
{
    [SerializeField] float tolerance = 0.001f;
    [SerializeField] float thickness = 1f;
    [SerializeField] Color color = new Color(1, .5f, 0, 1);
    [SerializeField] Slider transparency;
    [SerializeField] App app;


    void Start()
    {
        transparency.onValueChanged.AddListener(value => color = new Color(color.r, color.g, color.b, value));
        transparency.value = PlayerPrefs.GetFloat(name + "-Transparency", color.a);
        app.DrawSprial += drawShapes;
        app.SceneChange += savePlayerPrefs;
    }

    void OnApplicationQuit()
    {
        savePlayerPrefs();
    }

    void savePlayerPrefs() {
        PlayerPrefs.SetFloat(name + "-Transparency", transparency.value);
        PlayerPrefs.Save();
    }

    void drawShapes(Camera cam, Zeta.Spiral spiral)
    {
        using (Draw.StyleScope)
        {
            Draw.Thickness = thickness;
            Draw.Color = new Color(color.r, color.g, color.b, transparency.value);
            var mi = spiral.middleIndex;
            var pt1 = spiral.joints[mi];
            var pt2 = spiral.joints[mi + 1];
            var end = spiral.zeta.ToVector2();

            // Define your colors here
            Color equalColor = Color.green * new Color(1, 1, 1, transparency.value); // For equal lengths
            Color startColor = Color.red * new Color(1, 1, 1, transparency.value);   // Starting color for unequal lengths
            Color endColor = Color.blue * new Color(1, 1, 1, transparency.value);    // Ending color for unequal lengths

            // get 100 starting points evenly from pt1 to pt2
            var numPoints = 1000f;
            var dx = pt2.x - pt1.x;
            var dy = pt2.y - pt1.y;
            var stepX = dx / numPoints;
            var stepY = dy / numPoints;

            var equalPts = new List<Vector2>();
            for (var i = 0; i < numPoints; i++)
            {
                var pt = new Vector2((float)(pt1.x + stepX * i), (float)(pt1.y + stepY * i));

                var len1 = Vector2.Distance(pt, spiral.zeta.ToVector2());
                var len2 = Vector2.Distance(pt, Vector2.zero);

                // Check if the lengths are equal
                if (Approximately(len1, len2, tolerance))
                {
                    equalPts.Add(pt);
                }
                else
                {
                    // Calculate lerp factor based on the ratio of the lengths
                    float lerpFactor = len1 / (len1 + len2);
                    Color lerpedColor = Color.Lerp(startColor, endColor, lerpFactor);
                    
                    Draw.Line(pt, end, lerpedColor);
                    Draw.Line(pt, Vector2.zero, lerpedColor);
                }
            }

            foreach (var pt in equalPts)
            {
                Draw.Line(pt, end, equalColor);
                Draw.Line(pt, Vector2.zero, equalColor);
            }
        }
    }
    bool Approximately(float a, float b, float tolerance)
    {
        return Mathf.Abs(a - b) <= tolerance;
    }

}
