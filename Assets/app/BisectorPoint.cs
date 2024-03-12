using System;
using System.Drawing.Text;
using Shapes;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class BisectorPoint : MonoBehaviour
{
    [SerializeField] private App _app;
    [SerializeField] private Color _lineColor = Color.cyan;
    private Slider _bisectorPointTransparency;
    private Text _bpLengthDiff;
    private Text _bpAngle;
    

    void Awake()
    {
        _app = GameObject.Find("App")?.GetComponent<App>();
        _bisectorPointTransparency = GameObject.Find("BisectorPointTransparencySlider")?.GetComponent<Slider>();
        _bpLengthDiff = GameObject.Find("BisectorLineLengthDiff")?.GetComponent<Text>();
        _bpAngle = GameObject.Find("BisectorLineAngle")?.GetComponent<Text>();

        _app.DrawSprial += DrawBisectorPoints;
    }

    private void DrawBisectorPoints(Camera cam, Zeta.Spiral s)
    {
        Vector zeta = s.zeta.ToVector();
        Vector origin = s.joints[0];
        Vector middleLink = s.joints[s.middleIndex + 1] - s.joints[s.middleIndex];
        Vector bp = s.joints[s.middleIndex] + (middleLink * Math.Pow(0.5d, 1 - s.input.Real) / 2);

        using(Draw.StyleScope)
        {
            var color = _lineColor;
            color.a = _bisectorPointTransparency.value;
            Draw.Color = color;
            Draw.Thickness = 1 + color.a;

            Draw.Line(bp, origin);
            Draw.Line(bp, zeta);

            Vector a = bp;
            Vector b = zeta - bp;
            _bpLengthDiff.text = Math.Abs(a.Length - b.Length).ToString();

            double angle = Vector2.Dot((Vector2)a.Normalized(), (Vector2)b.Normalized());
            _bpAngle.text = angle.ToString();
        }
    }
}
