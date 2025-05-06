using System;
using Shapes;
using UnityEngine;
using UnityEngine.UI;
using Vector2 = UnityEngine.Vector2;
using Vector3 = UnityEngine.Vector3;

public class BisectorPoint : MonoBehaviour
{
    // [SerializeField] private bool _prevButton = false;
    [SerializeField] private App _app;
    [SerializeField] private Color _lineColorG = Color.red;
    [SerializeField] private Color _lineColorR = Color.green;
    [SerializeField] private Color _lineColor = Color.cyan;
    private Toggle _bisectorPointToggle;
    private Toggle _legLengthToggle;
    private Slider _transparencySilider;
    // private Text _bpLengthDiff;
    // private Text _bpAngle;

    // private Button _seekNextButton;
    // private Button _seekPrevButton;
    // private Text _infoText;

    private bool _zpsZubbed = false;
    private double _lastZPSIndex;
    private Vector _ZPS;

    private bool _bpSubbed = false;
    private double _lastBPIndex;
    private Vector _BP;
    

    void Awake()
    {
        _app = GameObject.Find("App")?.GetComponent<App>();
        _bisectorPointToggle = GameObject.Find("BisectorPointToggle")?.GetComponent<Toggle>();
        _legLengthToggle = GameObject.Find("LegLengthToggle")?.GetComponent<Toggle>();
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

        // _app.DrawSprial += DrawBisectorPoints;
        // _app.DrawSprial += DrawZps;
    }

    void Update()
    {
        if(_bisectorPointToggle.isOn && _transparencySilider.value > 0.01f)
        {
            if(!_zpsZubbed)
            {   
                _app.DrawSprial += HandleZPS;
                _zpsZubbed = true;
            }
        }
        else if(_zpsZubbed)
        {
            _app.DrawSprial -= HandleZPS;
            _zpsZubbed = false;
        }

        if(_bisectorPointToggle.isOn && _transparencySilider.value > 0.01f)
        {
            if(!_bpSubbed)
            {   
                _app.DrawSprial += HandleBP;
                _bpSubbed = true;
            }
        }
        else if(_bpSubbed)
        {
            _app.DrawSprial -= HandleBP;
            _bpSubbed = false;
        }
    }

    #region Formulas
    private static double Psi(double x)
    {
        return Math.Cos(2 * Math.PI * (Math.Pow(x, 2) - x - 1.0 / 16)) / Math.Cos(2 * Math.PI * x);
    }
    
    private static double PsiThirdDerivative(double imag)
    {
        if (Math.Abs(imag) < 1e-15) return 0;

        double pi = Math.PI;
        double pi2 = pi * pi;
        double pi3 = pi2 * pi;

        // Precompute common values
        double cos2piImag = Math.Cos(2 * pi * imag);
        double sin2piImag = Math.Sin(2 * pi * imag);
        double cosPiExpr = Math.Cos(pi * (2 * Math.Pow(imag, 2) - 2 * imag - 1.0 / 8));
        double sinPiExpr = Math.Sin(pi * (2 * Math.Pow(imag, 2) - 2 * imag - 1.0 / 8));
        double sin2piImagSquared = Math.Pow(sin2piImag, 2);

        // Calculate terms using precomputed values
        double term1 = pi3 * Math.Pow(4 * imag - 2, 3) * sinPiExpr / cos2piImag;
        double term2 = -6 * pi3 * Math.Pow(4 * imag - 2, 2) * sin2piImag * cosPiExpr / Math.Pow(cos2piImag, 2);
        double term3 = -24 * pi3 * (4 * imag - 2) * sin2piImagSquared * sinPiExpr / Math.Pow(cos2piImag, 3);
        double term4 = -12 * pi3 * (4 * imag - 2) * sinPiExpr / cos2piImag;
        double term5 = -4 * pi2 * (4 * imag - 2) * cosPiExpr / cos2piImag;
        double term6 = -pi2 * (32 * imag - 16) * cosPiExpr / cos2piImag;
        double term7 = 48 * pi3 * Math.Pow(sin2piImag, 3) * cosPiExpr / Math.Pow(cos2piImag, 4);
        double term8 = -24 * pi2 * sin2piImag * sinPiExpr / Math.Pow(cos2piImag, 2);
        double term9 = 40 * pi3 * sin2piImag * cosPiExpr / Math.Pow(cos2piImag, 2);

        // Return the sum of terms
        return term1 + term2 + term3 + term4 + term5 + term6 + term7 + term8 + term9;
    }

    private static double Beta(double index)
    {
        int i = (int)Math.Ceiling(index);
        double imag = Zeta.IndexToImag(index, false);
        double theta = Theta(imag);

        return Math.Log(i) * imag - theta - Math.PI * (i * i - 1);
    }

    private static double Theta(double t)
    {

        return (t / 2 * Math.Log(t / (2 * Math.PI)) - t / 2 - Math.PI / 8 +
                1 / (48 * t) +
                7 / (5760 * Math.Pow(t, 3)) +
                31 / (80640 * Math.Pow(t, 5)) +
                127 / (430080 * Math.Pow(t, 7)) +
                511 / (1216512 * Math.Pow(t, 9)));
    }

    private static int Square(double index)
    {
        return (int)(Math.Floor(Math.Sqrt(Zeta.IndexToImag(index, false) / (2 * Math.PI))) - Math.Floor(index));
    }

    private static double P(double imag)
    {
        double psqrt = Math.Sqrt(imag / (2 * Math.PI));
        return psqrt - Math.Floor(psqrt);
    }

    private static double C1(double imag)
    {
        return (-PsiThirdDerivative(P(imag)) /
                (96 * Math.PI * Math.PI) *
                Math.Pow(imag / (2 * Math.PI), -0.5));
    }
    public static double Djoint(double index)
    {
        double imag = Zeta.IndexToImag(index, false);
        double sq = (Math.Pow(-1, Square(index)) * Math.Sqrt(Math.Ceiling(index))) / (2 * Math.Cos(Beta(index)));
        double im = Math.Pow(imag / (2 * Math.PI), -0.25);
        double ps = Psi(P(imag)) + C1(imag);

        return Square(index) - (sq * im * ps);
    }

    private static Vector SpiralF(double stretch, double index, double real, double imag)
        {
            Vector2 c = Cjoint(index, real, imag);
            Vector2 c1 = Cjoint(index - 1, real, imag);
            return new Vector((float)((1 - stretch) * c.x + stretch * c1.x), (float)((1 - stretch) * c.y + stretch * c1.y));
        }

    private static Vector2 Cjoint(double index, double real, double imag)
    {
        Vector2 p = new Vector2(0, 0);
        int nLimit = (int)Math.Ceiling(index);
        for (int n = 1; n <= nLimit; n++)
        {
            p.x += (float)(Math.Cos(-imag * Math.Log(n)) / Math.Pow(n, real));
            p.y += (float)(Math.Sin(-imag * Math.Log(n)) / Math.Pow(n, real));
        }
        return p;
    }

    public static (Vector2, Vector2) BisectorLink(double real, double index)
    {
        double imag = Zeta.IndexToImag(index);
        Vector2 p1 = new Vector2(0, 0);
        int nLimit = (int)Math.Ceiling(index);
        for (int n = 1; n < nLimit; n++)
        {
            p1.x += (float)(Math.Cos(-imag * Math.Log(n)) / Math.Pow(n, real));
            p1.y += (float)(Math.Sin(-imag * Math.Log(n)) / Math.Pow(n, real));
        }

        Vector2 p2 = p1;
        p2.x += (float)(Math.Cos(-imag * Math.Log(nLimit)) / Math.Pow(nLimit, real));
        p2.y += (float)(Math.Sin(-imag * Math.Log(nLimit)) / Math.Pow(nLimit, real));

        return (p1, p2);
    }
    #endregion

    private void HandleZPS(Camera cam, Zeta.Spiral s)
    {
        if(_ZPS == null || _lastZPSIndex != s.index)
        {
            CalcZPS(s);
            _lastZPSIndex = s.index;
        }

        DrawZps(cam);
    }

    public static Vector GetZPS(double index)
    {
        return GetPaulStahuraZeta(index);
    }

    private void CalcZPS(Zeta.Spiral s)
    {
        _ZPS = GetPaulStahuraZeta(s.index);
    }

    private void DrawZps(Camera cam)
    {
        if (!_bisectorPointToggle.isOn || _transparencySilider.value < 0.01)
            return;
        
        using(Draw.StyleScope)
        {
            var color = Color.cyan;
            color.a = _transparencySilider.value;
            color.a -= 0.5f;
            Draw.Color = color;
            Draw.Thickness = 1 + color.a;

            var r = .05f;
            Draw.Line(_ZPS + new Vector2(-r/2, 0), _ZPS + new Vector2(r/2, 0)); // -
            Draw.Line(_ZPS + new Vector2(-r, -r), _ZPS + new Vector2(r, r));    // /
            Draw.Line(_ZPS + new Vector2(-r, r), _ZPS + new Vector2(r, r));     // `
            Draw.Line(_ZPS + new Vector2(-r, -r), _ZPS + new Vector2(r,-r));    // _
        }
    }

    private void HandleBP(Camera cam, Zeta.Spiral s)
    {
        if(_lastBPIndex != s.index)
        {   
            CalcBP(s);
            _lastBPIndex = s.index;
        }

        DrawBisectorPoints(cam, s);
    }
    private void CalcBP(Zeta.Spiral s)
    {   
        _ZPS = GetPaulStahuraZeta(s.index);
        _BP = GetScaledBisectorPoint(s, _app.usingPolyImag);
    }
    private void DrawBisectorPoints(Camera cam, Zeta.Spiral s)
    {
        Vector zps2 = _ZPS / 2.0;
        Vector origin = new Vector(0, 0);

        using(Draw.StyleScope)
        {
            var color = _lineColorG;
            color.a = _transparencySilider.value;
            Draw.Color = color;
            Draw.Thickness = 1 + color.a;

            Draw.Line(_BP, origin);

            color = _lineColorR;
            color.a = _transparencySilider.value;
            Draw.Color = color;
            Draw.Line(_BP, _ZPS);

            color = _lineColor;
            color.a = _transparencySilider.value;
            Draw.Color = color;

            // dashed bisecting line
            Vector a1 = (origin - _BP).Normalized();
            Vector b1 = (_ZPS - _BP).Normalized();
            double angle1 = Math.Acos(a1.Dot(b1)) / 2.0;
            double cross = Vector3.Cross(a1, b1).normalized.z;
            Vector unitVector = RotateVector(a1, angle1 * cross).Normalized();
            Draw.UseDashes = true;
            Draw.Line(_BP - unitVector*0.5, _BP + (unitVector * (_BP - zps2).Length) + unitVector*0.5);


            color.a -= 0.3f;
            if(color.a > 0.1f)
            {
                Draw.Color = color;
                Draw.Ring(_BP, .005f);
                ShapesUtils.DrawCross45(_BP, .05f);
            }

            // Vector a = bp;
            // Vector b = zeta - bp;
            // // _bpLengthDiff.text = Math.Abs(a.Length - b.Length).ToString();

            // double angle = Vector2.Dot((Vector2)a.Normalized(), (Vector2)b.Normalized());
            // _bpAngle.text = angle.ToString();


            // check same length

            if (_legLengthToggle.isOn)
            {
                // var sameLength = Mathf.Abs(Vector2.Distance(bp, origin) - Vector2.Distance(bp, zeta));
                // color = Color.magenta;
                // color.a = _transparencySilider.value;
                // Draw.Color = color;
                // Draw.UseDashes = false;
                // var similarityLineCenter = zeta / 2;
                // var offset = (zeta).Normalized() * sameLength / 2;
                // Draw.Line(similarityLineCenter - offset, similarityLineCenter + offset);

                Draw.Color = Color.magenta;
                color.a = _transparencySilider.value;
                Draw.Thickness = 1;
                Draw.Ring(_BP, Vector3.Distance(_BP, s.zeta.ToVector2()));
            }
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
        string method = "BpFormula";
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
            case "Symmetry at OneHalf":
                a5 = BisectingLines.CrotchPoint(s5) - s5.joints[s5.middleIndex];
                return s5.joints[s5.middleIndex] + a5;
            case "BpFormula":
                return BpOneHalf(s.index);
        }

        // Debug.Log("input: "+ bpInput);
        // Debug.Log("out: "+ a5.Length / middleLink.Length);

        Vector bp = s.joints[s.middleIndex] + a5;

        return bp;
    }

    private static Vector GetPaulStahuraZeta(double index)
    {
        double beta(double index)
        {
            double i = Math.Ceiling(index);
            double imag = Zeta.IndexToImag(index);

            return Math.Log(i) * imag - Theta(imag) - Math.PI * (i * i - 1);
        }

        double LegR(Vector2 bp)
        {
            return Vector2.Distance(new Vector2(0, 0), bp);
        }

        double AlegR(Vector2 bp)
        {
            return Math.Atan2(bp.y, bp.x);
        }

        double ABlink(double index)
        {
            return -Zeta.IndexToImag(index) * Math.Log(Math.Ceiling(index));
        }

        double AlegG(Vector2 bp, double index)
        {
            return 2 * (beta(index) + ABlink(index) - AlegR(bp));
        }

        var Bp = BpOneHalf(index);

        double Alr = AlegR(Bp);
        double Alg = AlegG(Bp, index);
        double Lr = LegR(Bp);

        return new Vector(
            (float)(Lr * (Math.Cos(Alr) + Math.Cos(Alr + Alg))),
            (float)(Lr * (Math.Sin(Alr) + Math.Sin(Alr + Alg)))
        );
    }

    public static double ThetaTwo(double index)
    {
        var bp = BpOneHalf(index);
        var theta1 = Math.Atan2(bp.y, bp.x);
        var theta2 = -2*(Theta(Zeta.IndexToImag(index)) + Math.PI * (Math.Pow(Math.Ceiling(index), 2) - 1) + theta1);
        return theta2;
    }

    public static double ThetaOne(double index)
    {
        var bp = BpOneHalf(index);
        return Math.Atan2(bp.y, bp.x);
    }

    public static Vector RightAngleVertex(Vector bp, double index)
    {
        var theta1 = Math.Atan2(bp.y, bp.x);
        var theta2 = -2*(Theta(Zeta.IndexToImag(index)) + Math.PI * (Math.Pow(Math.Ceiling(index), 2) - 1) + theta1);

        return bp * (Math.Cos(theta2) + 1);
    }

    public static Vector BpOneHalf(double index)
    {
        double stretch = 1 - Djoint(index);
        return SpiralF(stretch, index, 0.5, Zeta.IndexToImag(index, false));
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

        Zeta.Spiral s = new Zeta.Spiral(real, index, SpiralFormulas.EulerMaclauren, _app.usingPolyImag);
        Vector bp = GetScaledBisectorPoint(s, _app.usingPolyImag);
        
        bool dir = Vector3.Dot(BisectingLines.CrotchPoint(s) - s.joints[s.middleIndex], s.joints[s.middleIndex +1] - s.joints[s.middleIndex]) > 0;
        double lastPos = (BisectingLines.CrotchPoint(s) - s.joints[s.middleIndex]).Length * (dir ? 1d : -1d);
        double lastIndex = s.index;

        while(depth < maxDepth)
        {
            // int searchPersentage = depth / maxDepth * 100;
            // _infoText.text = $"Find Next: Searching... {searchPersentage}%";

            s = new Zeta.Spiral(real, index + inc, SpiralFormulas.EulerMaclauren, _app.usingPolyImag);
            bp = GetScaledBisectorPoint(s, _app.usingPolyImag);

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
