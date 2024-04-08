using System;
using System.Drawing.Text;
using System.IO.Compression;
using System.Numerics;
using Shapes;
using SRF.UI;
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
    private Toggle _bisectorPointToggle;
    private Text _bpLengthDiff;
    private Text _bpAngle;

    private Button _seekNextButton;
    private Button _seekPrevButton;
    private Text _infoText;
    

    void Awake()
    {
        _app = GameObject.Find("App")?.GetComponent<App>();
        _bisectorPointToggle = GameObject.Find("BisectorPointToggle")?.GetComponent<Toggle>();
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

    void OnDestroy()
    {
        _app.DrawSprial -= DrawBisectorPoints;
    }

    private void DrawBisectorPoints(Camera cam, Zeta.Spiral s)
    {
        if(!_bisectorPointToggle.isOn) return;

        Vector zeta = s.zeta.ToVector();
        Vector origin = s.joints[0];
        Vector bp = GetScaledBisectorPoint(s);

        using(Draw.StyleScope)
        {
            var color = _lineColor;
            color.a = 0.5f;
            Draw.Color = color;
            Draw.Thickness = 1 + color.a;

            Draw.Line(bp, origin);
            Draw.Line(bp, zeta);

            // Draw dashed bisecting line. Extend it past a little bit
            var z = zeta.Normalized() * bp.Dot(zeta.Normalized());
            var dir = (z - bp).Normalized() * .5f;
            Draw.UseDashes = true;
            Draw.Line(z + dir, bp - dir);

            color.a -= 0.3f;
            if(color.a > 0.1f)
            {
                Draw.Color = color;
                Draw.Ring(bp, .005f);
                ShapesUtils.DrawCross45(bp, .05f);

                var crotch = BisectingLines.CrotchPoint(s);
                Draw.Color = new Color(1, 0.5697687f, 0, color.a);
                Draw.Ring(crotch, .005f);
                ShapesUtils.DrawCross45(crotch, .05f);
            }

            Vector a = bp;
            Vector b = zeta - bp;
            _bpLengthDiff.text = Math.Abs(a.Length - b.Length).ToString();

            double angle = Vector2.Dot((Vector2)a.Normalized(), (Vector2)b.Normalized());
            _bpAngle.text = angle.ToString();
        }
    }

    public Vector GetScaledBisectorPoint(Zeta.Spiral s)
    {
        // take bisector point at real 0.5 and scale it by y=x^1-real
        Zeta.Spiral s5 = new Zeta.Spiral(new Complex(0.5f, s.input.Imaginary), SpiralFormulas.EulerMaclauren);
        Vector2 bp5 = BisectingLines.CrotchPoint(s5);
        Vector ml5 = s5.joints[s5.middleIndex + 1] - s5.joints[s5.middleIndex];
        bp5 = bp5 - s5.joints[s5.middleIndex];

        double bpInput = bp5.magnitude / ml5.Length;

        // scale the middle link by the formula
        Vector middleLink = s.joints[s.middleIndex + 1] - s.joints[s.middleIndex];
        Vector a5 = middleLink * Math.Pow(bpInput, 2d*(1d -s.input.Real));
        // Debug.Log("input: "+ bpInput);
        // Debug.Log("out: "+ a5.Length / middleLink.Length);

        Vector bp = s.joints[s.middleIndex] + a5;

        return bp;
    }

    private Complex SeekNextEqualLength(Complex input, bool reverse = false)
    {
        if(input.Real == 0.5f)
        {
            _infoText.text = $"Real 0.5";
            return input;
        }

        double inc = 0.001;
        int maxDepth = 100000;
        int depth = 0;

        if(reverse)
        {
            inc *= -1;
        }

        _infoText.text = $"Searching...";

        Zeta.Spiral s = new Zeta.Spiral(input, SpiralFormulas.EulerMaclauren);
        Vector bp = GetScaledBisectorPoint(s);
        
        bool dir = Vector3.Dot(BisectingLines.CrotchPoint(s) - s.joints[s.middleIndex], s.joints[s.middleIndex +1] - s.joints[s.middleIndex]) > 0;
        double lastPos = (BisectingLines.CrotchPoint(s) - s.joints[s.middleIndex]).Length * (dir ? 1d : -1d);
        double lastIndex = Zeta.ImagToIndex(s.input.Imaginary);

        while(depth < maxDepth)
        {
            // int searchPersentage = depth / maxDepth * 100;
            // _infoText.text = $"Find Next: Searching... {searchPersentage}%";

            input = new Complex(input.Real, input.Imaginary + inc);

            s = new Zeta.Spiral(input, SpiralFormulas.EulerMaclauren);
            bp = GetScaledBisectorPoint(s);

            Vector ml = s.joints[s.middleIndex + 1] - s.joints[s.middleIndex];
            double bpPos = (bp - s.joints[s.middleIndex]).Length;
            dir = Vector3.Dot(BisectingLines.CrotchPoint(s) - s.joints[s.middleIndex], s.joints[s.middleIndex +1] - s.joints[s.middleIndex]) > 0;
            double newPos = (BisectingLines.CrotchPoint(s) - s.joints[s.middleIndex]).Length * (dir ? 1d : -1d);
            bool changedDir = (bpPos < lastPos && bpPos > newPos) || (bpPos > lastPos && bpPos < newPos);
            bool jumped = Math.Abs(newPos - lastPos) > (s.joints[s.middleIndex + 1] - s.joints[s.middleIndex]).Length / 2;
            if(changedDir && !jumped)
            {
                if(Math.Floor(lastIndex) != Math.Floor(Zeta.ImagToIndex(s.input.Imaginary)))
                {
                    _infoText.text = $"NEW INDEX";
                }
                else
                {
                    _infoText.text = $"Found: {input.Imaginary}";
                }
                return input;
            }
            
            depth += 1;

            lastPos = newPos;
            lastIndex = Zeta.ImagToIndex(s.input.Imaginary);
        }

        _infoText.text = $"MAX DEPTH";

        return input;
    }
}
