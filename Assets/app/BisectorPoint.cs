using System;
using System.Drawing.Text;
using System.IO.Compression;
using System.Numerics;
using Shapes;
using SRF;
using SRF.UI;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Vector2 = UnityEngine.Vector2;
using Vector3 = UnityEngine.Vector3;

public class BisectorPoint : MonoBehaviour
{
    // [SerializeField] private bool _prevButton = false;
    [SerializeField] private App _app;
    [SerializeField] private Color _lineColorR = Color.red;
    [SerializeField] private Color _lineColorG = Color.green;
    [SerializeField] private Color _lineColor = Color.cyan;
    private Toggle _bisectorPointToggle;
    private Slider _transparencySilider;
    // private Text _bpLengthDiff;
    // private Text _bpAngle;

    // private Button _seekNextButton;
    // private Button _seekPrevButton;
    // private Text _infoText;
    

    void Awake()
    {
        _app = GameObject.Find("App")?.GetComponent<App>();
        _bisectorPointToggle = GameObject.Find("BisectorPointToggle")?.GetComponent<Toggle>();
        _transparencySilider = GameObject.Find("BisectorTransparencySlider")?.GetComponent<Slider>();
        // _bpLengthDiff = GameObject.Find("BisectorLineLengthDiff")?.GetComponent<Text>();
        // _bpAngle = GameObject.Find("BisectorLineAngle")?.GetComponent<Text>();
        
        // _seekNextButton = GameObject.Find("FindNextBisectorButton")?.GetComponent<Button>();
        // _seekPrevButton = GameObject.Find("FindPrevBisectorButton")?.GetComponent<Button>();
        // _infoText = GameObject.Find("FindBisectorText")?.GetComponent<Text>();

        // _seekNextButton.onClick.AddListener(() => {
        //     double next = SeekNextEqualLength(_app.Real, _app.Index);
        //     _app.Index = next;
        // });

        // _seekPrevButton.onClick.AddListener(() => {
        //     double next = SeekNextEqualLength(_app.Real, _app._index, true);
        //     _app.Index = next;
        // });

        _app.DrawSprial += DrawBisectorPoints;
    }

    void OnDestroy()
    {
        _app.DrawSprial -= DrawBisectorPoints;
    }

    private void DrawBisectorPoints(Camera cam, Zeta.Spiral s)
    {
        if (!_bisectorPointToggle.isOn || _transparencySilider.value == 0)
            return;

        Vector zeta = s.zeta.ToVector();
        Vector zeta2 = s.zeta.ToVector() / 2.0;
        Vector origin = s.joints[0];
        Vector bp = GetScaledBisectorPoint(s, _app.useNewImagToggle.isOn);

        using(Draw.StyleScope)
        {
            var color = _lineColorR;
            color.a = _transparencySilider.value;
            Draw.Color = color;
            Draw.Thickness = 1 + color.a;

            Draw.Line(bp, origin);

            color = _lineColorG;
            color.a = _transparencySilider.value;
            Draw.Color = color;
            Draw.Line(bp, zeta);

            color = _lineColor;
            color.a = _transparencySilider.value;
            Draw.Color = color;

            // dashed bisecting line
            Vector a1 = (origin - bp).Normalized();
            Vector b1 = (zeta - bp).Normalized();
            double angle1 = Math.Acos(a1.Dot(b1)) / 2.0;
            double cross = Vector3.Cross(a1, b1).normalized.z;
            Vector unitVector = RotateVector(a1, angle1 * cross).Normalized();
            Draw.UseDashes = true;
            Draw.Line(bp - unitVector*0.5, bp + (unitVector * (bp - zeta2).Length) + unitVector*0.5);


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
            // _bpLengthDiff.text = Math.Abs(a.Length - b.Length).ToString();

            double angle = Vector2.Dot((Vector2)a.Normalized(), (Vector2)b.Normalized());
            // _bpAngle.text = angle.ToString();


            // check same length
            var sameLength = Mathf.Abs(Vector2.Distance(bp, origin) - Vector2.Distance(bp, zeta));
            color = Color.magenta;
            color.a = _transparencySilider.value;
            Draw.Color = color;
            Draw.UseDashes = false;
            var similarityLineCenter = zeta / 2;
            var offset = (zeta).Normalized() * sameLength / 2;
            Draw.Line(similarityLineCenter - offset, similarityLineCenter + offset);
        }
    }

    private Vector RotateVector(Vector vector, double angleRadians)
    {
        double newX = (vector.x * Math.Cos(angleRadians)) - (vector.y * Math.Sin(angleRadians));
        double newY = (vector.x * Math.Sin(angleRadians)) + (vector.y * Math.Cos(angleRadians));
        return new Vector(newX, newY);
    }

    public static Vector GetScaledBisectorPoint(Zeta.Spiral s, bool useNewImag)
    {
        // take bisector point at real 0.5 and scale it by y=x^1-real
        Zeta.Spiral s5 = new Zeta.Spiral(0.5f, s.index, SpiralFormulas.EulerMaclauren, useNewImag);
        Vector2 bp5 = BisectingLines.CrotchPoint(s5) - s5.joints[s5.middleIndex];
        Vector ml5 = s5.joints[s5.middleIndex + 1] - s5.joints[s5.middleIndex];

        double bpInput = bp5.magnitude / ml5.Length;

        // scale the middle link by the formula
        Vector middleLink = s.joints[s.middleIndex + 1] - s.joints[s.middleIndex];
        Vector a5 = middleLink;
        string method = "One Half";
        switch(method)
        {
            case "First Guess":
                a5 = middleLink * Math.Pow(bpInput, 2d*(1d -s.real));
                break;
            case "Shrink":
                a5 = middleLink * Math.Pow(bpInput, 1.5d -s.real);
                break;
            case "No Scale":
                a5 = BisectingLines.CrotchPoint(s5) - s5.joints[s5.middleIndex];
                break;
            case "One Half":
                a5 = BisectingLines.CrotchPoint(s5) - s5.joints[s5.middleIndex];
                return s5.joints[s5.middleIndex] + a5;
        }

        // Debug.Log("input: "+ bpInput);
        // Debug.Log("out: "+ a5.Length / middleLink.Length);

        Vector bp = s.joints[s.middleIndex] + a5;

        return bp;
    }

    private double SeekNextEqualLength(double real, double index, Text infoText, bool reverse = false)
    {
        if(real == 0.5f)
        {
            infoText.text = $"Real 0.5";
            return real;
        }

        double inc = 0.001;
        int maxDepth = 100000;
        int depth = 0;

        if(reverse)
        {
            inc *= -1;
        }

        infoText.text = $"Searching...";

        Zeta.Spiral s = new Zeta.Spiral(real, index, SpiralFormulas.EulerMaclauren, _app.useNewImagToggle.isOn);
        Vector bp = GetScaledBisectorPoint(s, _app.useNewImagToggle.isOn);
        
        bool dir = Vector3.Dot(BisectingLines.CrotchPoint(s) - s.joints[s.middleIndex], s.joints[s.middleIndex +1] - s.joints[s.middleIndex]) > 0;
        double lastPos = (BisectingLines.CrotchPoint(s) - s.joints[s.middleIndex]).Length * (dir ? 1d : -1d);
        double lastIndex = s.index;

        while(depth < maxDepth)
        {
            // int searchPersentage = depth / maxDepth * 100;
            // _infoText.text = $"Find Next: Searching... {searchPersentage}%";

            s = new Zeta.Spiral(real, index + inc, SpiralFormulas.EulerMaclauren, _app.useNewImagToggle.isOn);
            bp = GetScaledBisectorPoint(s, _app.useNewImagToggle.isOn);

            Vector ml = s.joints[s.middleIndex + 1] - s.joints[s.middleIndex];
            double bpPos = (bp - s.joints[s.middleIndex]).Length;
            dir = Vector3.Dot(BisectingLines.CrotchPoint(s) - s.joints[s.middleIndex], s.joints[s.middleIndex +1] - s.joints[s.middleIndex]) > 0;
            double newPos = (BisectingLines.CrotchPoint(s) - s.joints[s.middleIndex]).Length * (dir ? 1d : -1d);
            bool changedDir = (bpPos < lastPos && bpPos > newPos) || (bpPos > lastPos && bpPos < newPos);
            bool jumped = Math.Abs(newPos - lastPos) > (s.joints[s.middleIndex + 1] - s.joints[s.middleIndex]).Length / 2;
            if(changedDir && !jumped)
            {
                if(Math.Floor(lastIndex) != Math.Floor(s.index))
                {
                    infoText.text = $"NEW INDEX";
                }
                else
                {
                    infoText.text = $"Found: {s.index}";
                }
                return s.index;
            }
            
            depth += 1;

            lastPos = newPos;
            lastIndex = s.index;
        }

        infoText.text = $"MAX DEPTH";

        return s.index;
    }
}
