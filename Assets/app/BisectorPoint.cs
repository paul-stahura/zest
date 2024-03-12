using System;
using System.Drawing.Text;
using System.IO.Compression;
using System.Numerics;
using Shapes;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Vector2 = UnityEngine.Vector2;
using Vector3 = UnityEngine.Vector3;

public class BisectorPoint : MonoBehaviour
{
    [SerializeField] private bool _prevButton = false;
    [SerializeField] private App _app;
    [SerializeField] private Color _lineColor = Color.cyan;
    private Slider _bisectorPointTransparency;
    private Text _bpLengthDiff;
    private Text _bpAngle;

    private Button _seekNextButton;
    private Button _seekPrevButton;
    private Text _infoText;
    

    void Awake()
    {
        _app = GameObject.Find("App")?.GetComponent<App>();
        _bisectorPointTransparency = GameObject.Find("BisectorPointTransparencySlider")?.GetComponent<Slider>();
        _bpLengthDiff = GameObject.Find("BisectorLineLengthDiff")?.GetComponent<Text>();
        _bpAngle = GameObject.Find("BisectorLineAngle")?.GetComponent<Text>();
        
        _seekNextButton = GameObject.Find("FindNextBisectorButton")?.GetComponent<Button>();
        _seekPrevButton = GameObject.Find("FindPrevBisectorButton")?.GetComponent<Button>();
        _infoText = GameObject.Find("FindBisectorText")?.GetComponent<Text>();

        _seekNextButton.onClick.AddListener(() => {
            Complex next = SeekNextEqualLength(new Complex(_app.Real, _app._imag));
            _app.Real = next.Real;
            _app.Imag = next.Imaginary;
        });

        _seekPrevButton.onClick.AddListener(() => {
            Complex next = SeekNextEqualLength(new Complex(_app.Real, _app._imag), true);
            _app.Real = next.Real;
            _app.Imag = next.Imaginary;
        });

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

    private Complex SeekNextEqualLength(Complex input, bool reverse = false)
    {
        double inc = 0.01;
        double magnitudeThreashold = 0.01;
        int maxDepth = 5000;
        int depth = 0;

        if(reverse)
        {
            inc *= -1;
        }

        _infoText.text = $"Find Next: Searching...";

        Zeta.Spiral s = new Zeta.Spiral(input, SpiralFormulas.EulerMaclauren);
        Vector middleLink = s.joints[s.middleIndex + 1] - s.joints[s.middleIndex];
        Vector bp = s.joints[s.middleIndex] + (middleLink * Math.Pow(0.5d, 1 - s.input.Real) / 2);
        Vector2 lastDist = BisectingLines.BisectPoint(s) - bp;
        double lastIndex = Zeta.ImagToIndex(s.input.Imaginary);

        while(depth < maxDepth)
        {
            // int searchPersentage = depth / maxDepth * 100;
            // _infoText.text = $"Find Next: Searching... {searchPersentage}%";

            input = new Complex(input.Real, input.Imaginary + inc);

            s = new Zeta.Spiral(input, SpiralFormulas.EulerMaclauren);
            middleLink = s.joints[s.middleIndex + 1] - s.joints[s.middleIndex];
            bp = s.joints[s.middleIndex] + (middleLink * Math.Pow(0.5d, 1 - s.input.Real) / 2);
            Vector2 newDist = BisectingLines.BisectPoint(s) - bp;
            
            bool dirChanged = Vector3.Cross(lastDist.normalized, newDist.normalized).z > 0;
            if(reverse) dirChanged = !dirChanged;

            // check if we changed directions and that it was close to the bisector point
            if(dirChanged && Math.Abs(newDist.magnitude - lastDist.magnitude) < magnitudeThreashold)
            {
                if(Math.Floor(lastIndex) != Math.Floor(Zeta.ImagToIndex(s.input.Imaginary)))
                {
                    _infoText.text = $"Find Next: NEW INDEX";
                }
                else
                {
                    _infoText.text = $"Found: {input.Imaginary.ToString("F2")}";
                }
                return input;
            }
            
            depth += 1;

            lastDist = newDist;
            lastIndex = Zeta.ImagToIndex(s.input.Imaginary);
        }

        _infoText.text = $"Find Next: MAX DEPTH";

        return input;
    }
}
