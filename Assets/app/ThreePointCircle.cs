using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class ThreePointCircle : MonoBehaviour
{
    public App app;
    public Slider transparency;
    public Color color;

    // Start is called before the first frame update
    void Start()
    {
        transparency.onValueChanged.AddListener(value => color = new Color(color.r, color.g, color.b, value));
        transparency.value = PlayerPrefs.GetFloat(name + "-Transparency", color.a);

        app.DrawSprial += drawShapes;
    }

    /// <summary>
    /// Draws a circle using the three "dark spirals" near the middle link. A
    /// "dark spiral" is where a spiral would be theoretically but since there
    /// aren't enough links to define it / show it around the middle link, you
    /// can't see it. 
    ///
    /// They are essentially calculated the same as the regular spiral
    /// locations, we just keep going to and past the middle link.
    /// </summary>
    /// <param name="cam"></param>
    /// <param name="spiral"></param>
    void drawShapes(Camera cam, Zeta.Spiral spiral)
    {
        var i = spiral.middleIndex - 1;
        var pt1 = spiral.joints[i++];
        var pt2 = spiral.joints[i++];
        var pt3 = spiral.joints[i];

        // https://www.geeksforgeeks.org/equation-of-circle-when-three-points-on-the-circle-are-given/

        double x12 = pt1.x - pt2.x;
        double x13 = pt1.x - pt3.x;

        double y12 = pt1.y - pt2.y;
        double y13 = pt1.y - pt3.y;

        double y31 = pt3.y - pt1.y;
        double y21 = pt2.y - pt1.y;

        double x31 = pt3.x - pt1.x;
        double x21 = pt2.x - pt1.x;

        // x1^2 - x3^2
        double sx13 = Math.Pow(pt1.x, 2) -
                        Math.Pow(pt3.x, 2);

        // y1^2 - y3^2
        double sy13 = Math.Pow(pt1.y, 2) -
                        Math.Pow(pt3.y, 2);

        double sx21 = Math.Pow(pt2.x, 2) -
                        Math.Pow(pt1.x, 2);

        double sy21 = Math.Pow(pt2.y, 2) -
                        Math.Pow(pt1.y, 2);

        double f = ((sx13) * (x12)
                + (sy13) * (x12)
                + (sx21) * (x13)
                + (sy21) * (x13))
                / (2 * ((y31) * (x12) - (y21) * (x13)));
        double g = ((sx13) * (y12)
                + (sy13) * (y12)
                + (sx21) * (y13)
                + (sy21) * (y13))
                / (2 * ((x31) * (y12) - (x21) * (y13)));

        double c = -Math.Pow(pt1.x, 2) - Math.Pow(pt1.y, 2) -
                                    2 * g * pt1.x - 2 * f * pt1.y;

        // eqn of circle be x^2 + y^2 + 2*g*x + 2*f*y + c = 0
        // where centre is (h = -g, k = -f) and radius r
        // as r^2 = h^2 + k^2 - c
        var center = new Vector(-g, -f);
        double sqr_of_r = center.x * center.x + center.y * center.y - c;

        // r is the radius
        float radius = (float)Math.Sqrt(sqr_of_r);

        using (Draw.StyleScope)
        {
            Draw.Color = color;
            Draw.Thickness = 1;

            Draw.Ring(center, radius);
        }        
    }
}
