using System;
using System.Collections;
using System.Collections.Generic;
using System.Drawing.Drawing2D;
using Shapes;
using UnityEngine;
using UnityEngine.UI;

public class MiddleLinkTeardrop : MonoBehaviour
{
    public App app;
    
    [SerializeField] private Toggle _inverseTdropsToggle;
    [SerializeField] private bool _drawInverseTdrops = false;
    [SerializeField] private bool _drawINFLink = false;
    [SerializeField] private int _pointsPerTdrop = 250;
    public Slider GRTeardropTransparency;
    public Slider YinYangTeardropTransparency;
    public Slider INFTeardropTransparency;
    public Toggle INFLinkToggle;

    public Color TeardropColorR = Color.red;
    public Color TeardropColorG = Color.green;
    public Color TeardropColorInf = Color.cyan;

    public Vector TdropDotR { get; private set; }
    public Vector TdropDotG { get; private set; }

    public event Action<Camera, Zeta.Spiral> InfinityTdropPoints;

    private List<Vector> _exactTdropR;
    private List<Vector> _YangPoints;
    private List<Vector> _exactTdropG;
    private List<Vector> _YinPoints;

    public void Awake()
    {
        _inverseTdropsToggle = GameObject.Find("InverseTdropsToggle")?.GetComponent<Toggle>();
        _inverseTdropsToggle?.onValueChanged.AddListener((bool v) => {
            _drawInverseTdrops = v;
        });

        INFLinkToggle = GameObject.Find("INFLinkToggle")?.GetComponent<Toggle>();
        INFLinkToggle?.onValueChanged.AddListener((bool v) => {
            _drawINFLink = v;
        });

        TdropDotR = new Vector(0, 0);
        TdropDotG = new Vector(0, 0);

        GRTeardropTransparency = GameObject.Find("GR Transparency Slider")?.GetComponent<Slider>();
        YinYangTeardropTransparency = GameObject.Find("YinYang Transparency Slider")?.GetComponent<Slider>();
        INFTeardropTransparency = GameObject.Find("INF Transparency Slider")?.GetComponent<Slider>();

        // player prefs
        GRTeardropTransparency.value = PlayerPrefs.GetFloat("GRTeardropTransparency", 0);
        YinYangTeardropTransparency.value = PlayerPrefs.GetFloat("YinYangTeardropTransparency", 0);
        INFTeardropTransparency.value = PlayerPrefs.GetFloat("INFTeardropTransparency", 0);

        INFLinkToggle.isOn = PlayerPrefs.GetInt("INFLinkToggle") == 1;
        _inverseTdropsToggle.isOn = PlayerPrefs.GetInt("InverseTdropToggle") == 1;
    }
    
    public void Start()
    {
        app.DrawSprial += DrawINFTeardrop;
        app.DrawSprial += DrawExactTeardrop;
        app.DrawSprial += DrawYinYang;
    }

    void OnApplicationQuit()
    {
        savePlayerPrefs();
    }

    private void savePlayerPrefs()
    {
        PlayerPrefs.SetFloat("GRTeardropTransparency", GRTeardropTransparency.value);
        PlayerPrefs.SetFloat("YinYangTeardropTransparency", YinYangTeardropTransparency.value);
        PlayerPrefs.SetFloat("INFTeardropTransparency", INFTeardropTransparency.value);
        PlayerPrefs.SetInt("INFLinkToggle", INFLinkToggle.isOn ? 1 : 0);
        PlayerPrefs.SetInt("InverseTdropToggle", _inverseTdropsToggle.isOn ? 1 : 0);
    }

    private void DrawINFTeardrop(Camera cam, Zeta.Spiral s)
    {
        // Draws two dots/circles at the current location of teardrop A and B given the Zeta index
        var index = s.index;
        index -= Math.Floor(index);
        var orth = Mathf.Min(1f, cam.orthographicSize);
        var size = 50.0f;
        
        Vector trackDrop(Vector v, Vector link) => RotateAround(v, new Vector(0.0, 0.0), LinkRad(s, s.middleIndex)) / Math.Sqrt(s.middleIndex+1) + link; 

        TdropDotR = trackDrop(Zeta.InfinityTdrop(index, true), s.joints[s.middleIndex + 1]);

        index = 1 - index;
        TdropDotG = trackDrop(Zeta.InfinityTdrop(index, false), s.joints[s.middleIndex]);

        InfinityTdropPoints.Invoke(cam, s);

        if(_drawINFLink)
        {
            using (Draw.StyleScope)
            {
                Color dotColor = Color.cyan;
                dotColor.a = 0.5f;
                Draw.Color = dotColor;
                Draw.Thickness = 1 + 0.5f;

                Draw.Ring(TdropDotR, orth / size / 2);
                ShapesUtils.DrawCross(TdropDotR, orth / size, .5f);

                Draw.Ring(TdropDotG, orth / size / 2);
                ShapesUtils.DrawCross(TdropDotG, orth / size, .5f);

                Draw.Line(TdropDotR, TdropDotG);
            }
        }

        if(INFTeardropTransparency.value < 0.01f)
        {
            return;
        }

        using (Draw.StyleScope)
        {
            TeardropColorInf.a = INFTeardropTransparency.value / 4;
            Draw.Color = TeardropColorInf;
            Draw.Thickness = 1 + INFTeardropTransparency.value;
            
            double i = 0;
            double inc = 1d/200;
            var startA = trackDrop(Zeta.InfinityTdrop(i, true), s.joints[s.middleIndex + 1]);
            var startB = trackDrop(Zeta.InfinityTdrop(i, false), s.joints[s.middleIndex]);
            for (i = inc; i <= 1+inc; i += inc)
            {
                // Tdrop is undefined at 0.25 and 0.75, so we skip these values
                if(Mathf.Approximately((float)i, 0.25f) || Mathf.Approximately((float)i, 0.75f)) {
                    i += inc;
                }

                var endA = trackDrop(Zeta.InfinityTdrop(i, true), s.joints[s.middleIndex + 1]);
                var endB = trackDrop(Zeta.InfinityTdrop(i, false), s.joints[s.middleIndex]);

                Draw.Line(startA, endA);
                startA = endA;

                Draw.Line(startB, endB);
                startB = endB;
            }
        }

        if(_drawInverseTdrops)
        {
            Vector trackInverseDrop(Vector v, Vector link) => RotateAround(v, new Vector(0.0, 0.0), 2*Math.PI - LinkRad(s, s.middleIndex)) / Math.Sqrt(s.middleIndex+1) + link; 

            using (Draw.StyleScope)
            {
                var color = new Color(0, .6f, 1, 1);
                color.a = INFTeardropTransparency.value / 4;
                Draw.Color = color;
                Draw.Thickness = 1 + INFTeardropTransparency.value;

                var z = s.zeta.ToVector();
                var norm = z.Normalized();
                
                double i = 0;
                double inc = 1d/200;
                var startInverseA = trackInverseDrop(Zeta.InfinityTdrop(i, true).Reflect(norm), z + s.joints[s.middleIndex + 1].Reflect(norm));
                var startInverseB = trackInverseDrop(Zeta.InfinityTdrop(i, false).Reflect(norm), z + s.joints[s.middleIndex].Reflect(norm));
                for (i = inc; i <= 1+inc; i += inc)
                {
                    // Tdrop is undefined at 0.25 and 0.75, so we skip these values
                    if(Mathf.Approximately((float)i, 0.25f) || Mathf.Approximately((float)i, 0.75f)) {
                        i += inc;
                    }

                    var endInverseA = trackInverseDrop(Zeta.InfinityTdrop(i, true).Reflect(norm), z + s.joints[s.middleIndex + 1].Reflect(norm));
                    var endInverseB = trackInverseDrop(Zeta.InfinityTdrop(i, false).Reflect(norm), z + s.joints[s.middleIndex].Reflect(norm));

                    Draw.Line(startInverseA, endInverseA);
                    startInverseA = endInverseA;

                    Draw.Line(startInverseB, endInverseB);
                    startInverseB = endInverseB;
                }
            }
        }
    }

    private void DrawYinYang(Camera cam, Zeta.Spiral s)
    {
        _YinPoints = new();
        _YangPoints = new();

        int index = (int)Math.Floor(s.index);
        double inc = 1d / (_pointsPerTdrop - 1);
        Debug.Assert(inc > 0);
        for (int i = 0; i < _pointsPerTdrop; i++)
        {
            double t = i * inc;
            _YinPoints.Add(Yin(index + t) + new Vector(0.5, 0));
            _YangPoints.Add(Yang(index + t) - new Vector(0.5, 0));
        }

        Vector trackDrop(Vector v, Vector link) => RotateAround(v, new Vector(0.0, 0.0), LinkRad(s, s.middleIndex)) / Math.Sqrt(s.middleIndex+1) + link; 

        using (Draw.StyleScope)
        {
            TeardropColorR.a = YinYangTeardropTransparency.value;
            TeardropColorG.a = YinYangTeardropTransparency.value;
            Draw.Thickness = 1 + YinYangTeardropTransparency.value;
            
            var startR = trackDrop(_YangPoints[0], s.joints[s.middleIndex + 1]);
            var startG = trackDrop(_YinPoints[0], s.joints[s.middleIndex]);
            for (int i = 1; i < _YinPoints.Count; i++)
            {
                var endR = trackDrop(_YangPoints[i], s.joints[s.middleIndex + 1]);
                var endG = trackDrop(_YinPoints[i], s.joints[s.middleIndex]);

                Draw.Color = TeardropColorR;
                Draw.Line(startR, endR);
                startR = endR;

                Draw.Color = TeardropColorG;
                Draw.Line(startG, endG);
                startG = endG;
            }
        }

        // test calculations
        // double index = s.index;
        // Debug.Log(index);
        // Debug.Log(Yin(s.index));
        // Debug.Log(Yang(s.index));
        // Debug.Log(Dyangl(index));
        // Debug.Log(Dyinl(index));
        // Debug.Log(Beta(index));
        // Debug.Log(Square(index));
        // double imag = Zeta.IndexToImag(index, app.useNewImagToggle.isOn);
        // Debug.Log(P(imag));
        // Debug.Log(C1(imag));
        // Debug.Log(Zeta.PsiThirdDerivative(imag));

        if(_drawInverseTdrops)
        {
            Vector trackInverseDrop(Vector v, Vector link) => RotateAround(v, new Vector(0.0, 0.0), 2*Math.PI - LinkRad(s, s.middleIndex)) / Math.Sqrt(s.middleIndex+1) + link;

            using (Draw.StyleScope)
            {
                Draw.Thickness = 1 + YinYangTeardropTransparency.value;

                var colorR = new Color(1, 0, .5f, 1f); // red ish
                colorR.a = YinYangTeardropTransparency.value;

                var colorG = new Color(.6f, 1f, .2f, 1f); // green ish
                colorG.a = YinYangTeardropTransparency.value;
                
                var z = s.zeta.ToVector();
                var norm = z.Normalized();
                
                var startInverseR = trackInverseDrop(_YangPoints[0].Reflect(norm), z + s.joints[s.middleIndex + 1].Reflect(norm));
                var startInverseG = trackInverseDrop(_YinPoints[0].Reflect(norm), z + s.joints[s.middleIndex].Reflect(norm));
                for (int i = 1; i < _YinPoints.Count; i++)
                {
                    var endInverseR = trackInverseDrop(_YangPoints[i].Reflect(norm), z + s.joints[s.middleIndex + 1].Reflect(norm));
                    var endInverseG = trackInverseDrop(_YinPoints[i].Reflect(norm), z + s.joints[s.middleIndex].Reflect(norm));

                    Draw.Color = colorR;
                    Draw.Line(startInverseR, endInverseR);
                    startInverseR = endInverseR;

                    Draw.Color = colorG;
                    Draw.Line(startInverseG, endInverseG);
                    startInverseG = endInverseG;
                }
            }
        }
    }

    private Vector Yang(double index)
    {
        Vector pt = new Vector(Math.Cos(Beta(index)), Math.Sin(Beta(index)));
        return pt * Dyangl(index) + new Vector(0.5, 0);
    }

    private double Dyangl(double index)
    {
        return -2*Math.Cos(Beta(index)) - Dyinl(index);
    }

    private Vector Yin(double index)
    {
        Vector pt = new Vector(-Math.Cos(Beta(index)), -Math.Sin(Beta(index)));
        return pt * Dyinl(index) - new Vector(0.5, 0);
    }

    private double Dyinl(double index)
    {
        double psi(double t) => Math.Cos(2.0 * Math.PI * (t*t - t - 1.0 / 16.0)) / Math.Cos(2.0 * Math.PI * t);
        double imag = Zeta.IndexToImag(index, app.useNewImagToggle.isOn);
        return (-Square(index) * 2.0*Math.Cos(Beta(index))) + (Math.Pow(-1.0, Square(index)) * Math.Sqrt(Math.Ceiling(index)) * Math.Pow(imag / (2.0*Math.PI), -0.25) * (psi(P(imag)) + C1(imag)));
    }

    private double Beta(double index)
    {
        int i = (int)Math.Ceiling(index);
        double imag = Zeta.IndexToImag(index, app.useNewImagToggle.isOn);
        double Theta(double t) => t / 2 * Math.Log(t / (2 * Math.PI)) - t / 2 - Math.PI / 8 + 1 / (48 * t) + 7 / (5760 * Math.Pow(t, 3)) + 31 / (80640 * Math.Pow(t, 5)) + 127 / (430080 * Math.Pow(t, 7)) + 511 / (1216512 * Math.Pow(t, 9));
        
        return Math.Log(i) * imag - Theta(imag) - Math.PI*(i*i - 1.0);
    }

    private int Square(double index)
    {
        return (int)(Math.Floor(Math.Sqrt(Zeta.IndexToImag(index, app.useNewImagToggle.isOn)/(2*Math.PI))) - Math.Floor(index));
    }

    private double P(double imag)
    {
        double Psqrt = Math.Sqrt(imag / (2*Math.PI));
        return Psqrt - Math.Floor(Psqrt);
    }

    private double C1(double imag)
    {
        return -Zeta.PsiThirdDerivative(P(imag)) / (96.0 * Math.Pow(Math.PI, 2.0)) * Math.Pow(imag/(2*Math.PI), -0.5);
    }


    private void DrawExactTeardrop(Camera cam, Zeta.Spiral s)
    {
        if(GRTeardropTransparency.value < 0.01f)
        {
            return;
        }

        _exactTdropR = new();
        _exactTdropG = new();
        int index = (int)Math.Floor(s.index);
        double inc = 1d / (_pointsPerTdrop - 1);
        Debug.Assert(inc > 0);
        for (int i = 0; i < _pointsPerTdrop; i++)
        {
            double t = i * inc;
            _exactTdropR.Add(Zeta.TearDrop(index + 1, s.real, Zeta.IndexToImag(index + t, app.useNewImagToggle.isOn), true) - new Vector(1, 0));
            _exactTdropG.Add(Zeta.TearDrop(index + 1, s.real, Zeta.IndexToImag(index + t, app.useNewImagToggle.isOn)));// * Math.Cos(Math.PI) + new Vector(1, 0));
        }

        Vector trackDrop(Vector v, Vector link) => RotateAround(v, new Vector(0.0, 0.0), LinkRad(s, s.middleIndex)) / Math.Sqrt(s.middleIndex+1) + link; 

        using (Draw.StyleScope)
        {
            TeardropColorR.a = GRTeardropTransparency.value;
            TeardropColorG.a = GRTeardropTransparency.value;
            Draw.Thickness = 1 + GRTeardropTransparency.value;
            
            var startR = trackDrop(_exactTdropR[0], s.joints[s.middleIndex + 1]);
            var startG = trackDrop(_exactTdropG[0], s.joints[s.middleIndex]);
            for (int i = 1; i < _exactTdropR.Count; i++)
            {
                var endR = trackDrop(_exactTdropR[i], s.joints[s.middleIndex + 1]);
                var endG = trackDrop(_exactTdropG[i], s.joints[s.middleIndex]);

                Draw.Color = TeardropColorR;
                Draw.Line(startR, endR);
                startR = endR;

                Draw.Color = TeardropColorG;
                Draw.Line(startG, endG);
                startG = endG;
            }
        }

        if(_drawInverseTdrops)
        {
            Vector trackInverseDrop(Vector v, Vector link) => RotateAround(v, new Vector(0.0, 0.0), 2*Math.PI - LinkRad(s, s.middleIndex)) / Math.Sqrt(s.middleIndex+1) + link;

            using (Draw.StyleScope)
            {
                Draw.Thickness = 1 + GRTeardropTransparency.value;

                var colorR = new Color(1, 0, .5f, 1f); // red ish
                colorR.a = GRTeardropTransparency.value;

                var colorG = new Color(.6f, 1f, .2f, 1f); // green ish
                colorG.a = GRTeardropTransparency.value;
                
                var z = s.zeta.ToVector();
                var norm = z.Normalized();
                
                var startInverseR = trackInverseDrop(_exactTdropR[0].Reflect(norm), z + s.joints[s.middleIndex + 1].Reflect(norm));
                var startInverseG = trackInverseDrop(_exactTdropG[0].Reflect(norm), z + s.joints[s.middleIndex].Reflect(norm));
                for (int i = 1; i < _exactTdropR.Count; i++)
                {
                    var endInverseR = trackInverseDrop(_exactTdropR[i].Reflect(norm), z + s.joints[s.middleIndex + 1].Reflect(norm));
                    var endInverseG = trackInverseDrop(_exactTdropG[i].Reflect(norm), z + s.joints[s.middleIndex].Reflect(norm));

                    Draw.Color = colorR;
                    Draw.Line(startInverseR, endInverseR);
                    startInverseR = endInverseR;

                    Draw.Color = colorG;
                    Draw.Line(startInverseG, endInverseG);
                    startInverseG = endInverseG;
                }
            }
        }
    }

    public static double LinkRad(Zeta.Spiral s, int idx)
    {
        Vector3 start = s.joints[idx];
        Vector3 end = s.joints[idx + 1];

        var temp = end - start;
        return Mathf.Atan2(temp.y, temp.x);
    }

    public static Vector RotateAround(Vector point, Vector pivot, double rad)
    {
        return new Vector ((point.x - pivot.x) * Math.Cos(rad) - (point.y - pivot.y) * Math.Sin(rad) + pivot.x, (point.x - pivot.x) * Math.Sin(rad) + (point.y - pivot.y) * Math.Cos(rad) + pivot.y);
    }
}
