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


    private bool _INFSubbed = false;
    private double _lastINFIndex;
    private List<Vector> _InfA;
    private List<Vector> _InfB;
    private List<Vector> _InfTdropPointsA;
    private List<Vector> _InfTdropPointsB;
    private List<Vector> _InfTdropPointsReverseA;
    private List<Vector> _InfTdropPointsReverseB;

    private double _lastExactIndex;
    private bool _ExactSubbed = false;
    private List<Vector> _exactR;
    private List<Vector> _exactG;
    private List<Vector> _exactTdropG;
    private List<Vector> _exactTdropR;
    private List<Vector> _exactTdropInverseR;
    private List<Vector> _exactTdropInverseG;

    private double _lastYYIndex;
    private bool _YYSubbed = false;
    private List<Vector> _Yang;
    private List<Vector> _Yin;
    private List<Vector> _YangPoints;
    private List<Vector> _YinPoints;
    private List<Vector> _YangPointsReverse;
    private List<Vector> _YinPointsReverse;

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

        // INF Teardrop init
        _InfA = new();
        _InfB = new();
        double i = 0;
        double inc = 1d/200;
        for (i = 0; i <= 1+inc; i += inc)
        {
            // Tdrop is undefined at 0.25 and 0.75, so we skip these values
            if(Mathf.Approximately((float)i, 0.25f) || Mathf.Approximately((float)i, 0.75f)) {
                i += inc;
            }

            _InfA.Add(Zeta.InfinityTdrop(i, true));
            _InfB.Add(Zeta.InfinityTdrop(i, false));
        }
    }

    public void Update()
    {
        if(INFTeardropTransparency.value > 0.01f || _drawINFLink)
        {
            if(!_INFSubbed)
            {   
                app.DrawSprial += HandleINFTdrop;
                _INFSubbed = true;
            }
        }
        else if(_INFSubbed)
        {
            app.DrawSprial -= HandleINFTdrop;
            _INFSubbed = false;
        }


        if(GRTeardropTransparency.value > 0.01f)
        {
            if(!_ExactSubbed)
            {   
                app.DrawSprial += HandleExactTeardrop;
                _ExactSubbed = true;
            }
        }
        else if(_ExactSubbed)
        {
            app.DrawSprial -= HandleExactTeardrop;
            _ExactSubbed = false;
        }

        if(YinYangTeardropTransparency.value > 0.01f)
        {
            if(!_YYSubbed)
            {   
                app.DrawSprial += HandleYinYangTeardrop;
                _YYSubbed = true;
            }
        }
        else if(_YYSubbed)
        {
            app.DrawSprial -= HandleYinYangTeardrop;
            _YYSubbed = false;
        }
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

    private void HandleINFTdrop(Camera cam, Zeta.Spiral s)
    {
        if(_lastINFIndex != s.index)
        {
            CalcINFTeardrop(s);
            _lastINFIndex = s.index;
        }

        DrawINFTeardrop(cam);
    }

    private void CalcINFTeardrop(Zeta.Spiral s)
    {
        Vector trackDrop(Vector v, Vector link) => RotateAround(v, new Vector(0.0, 0.0), LinkRad(s, s.middleIndex)) / Math.Sqrt(s.middleIndex+1) + link;
        Vector trackInverseDrop(Vector v, Vector link) => RotateAround(v, new Vector(0.0, 0.0), 2*Math.PI - LinkRad(s, s.middleIndex)) / Math.Sqrt(s.middleIndex+1) + link; 

        // R-G realtime points
        var index = s.index;
        index -= Math.Floor(index);
        TdropDotR = trackDrop(Zeta.InfinityTdrop(index, true), s.joints[s.middleIndex + 1]);
        index = 1 - index;
        TdropDotG = trackDrop(Zeta.InfinityTdrop(index, false), s.joints[s.middleIndex]);

        _InfTdropPointsA = new List<Vector>();
        _InfTdropPointsB = new List<Vector>();
        _InfTdropPointsReverseA = new List<Vector>();
        _InfTdropPointsReverseB = new List<Vector>();

        var z = s.zeta.ToVector();
        var norm = z.Normalized();
        for (int i = 0; i < _InfA.Count; i++)
        {
            _InfTdropPointsA.Add(trackDrop(_InfA[i], s.joints[s.middleIndex + 1]));
            _InfTdropPointsB.Add(trackDrop(_InfB[i], s.joints[s.middleIndex]));

            _InfTdropPointsReverseA.Add(trackInverseDrop(_InfA[i].Reflect(norm), z + s.joints[s.middleIndex + 1].Reflect(norm)));
            _InfTdropPointsReverseB.Add(trackInverseDrop(_InfB[i].Reflect(norm), z + s.joints[s.middleIndex].Reflect(norm)));
        }
    }

    private void DrawINFTeardrop(Camera cam)
    {
        // Draws two dots/circles at the current location of teardrop A and B given the Zeta index
        if(_drawINFLink)
        {
            using (Draw.StyleScope)
            {
                Color dotColor = Color.cyan;
                dotColor.a = 0.5f;
                Draw.Color = dotColor;
                Draw.Thickness = 1 + 0.5f;

                var orth = Mathf.Min(1f, cam.orthographicSize);
                var size = 50.0f;

                Draw.Ring(TdropDotR, orth / size / 2);
                ShapesUtils.DrawCross(TdropDotR, orth / size, .5f);

                Draw.Ring(TdropDotG, orth / size / 2);
                ShapesUtils.DrawCross(TdropDotG, orth / size, .5f);

                Draw.Line(TdropDotR, TdropDotG);
            }
        }

        if(INFTeardropTransparency.value > 0.01f)
        {
            using (Draw.StyleScope)
            {
                TeardropColorInf.a = INFTeardropTransparency.value / 4;
                Draw.Color = TeardropColorInf;
                Draw.Thickness = 1 + INFTeardropTransparency.value;
                
                for (int i = 0; i < _InfTdropPointsA.Count - 1; i++)
                {
                    Draw.Line(_InfTdropPointsA[i], _InfTdropPointsA[i + 1]);
                    Draw.Line(_InfTdropPointsB[i], _InfTdropPointsB[i + 1]);
                }
            }

            if(_drawInverseTdrops)
            {
                using (Draw.StyleScope)
                {
                    var color = new Color(0, .6f, 1, 1);
                    color.a = INFTeardropTransparency.value / 4;
                    Draw.Color = color;
                    Draw.Thickness = 1 + INFTeardropTransparency.value;

                    for (int i = 0; i < _InfTdropPointsA.Count - 1; i++)
                    {
                        Draw.Line(_InfTdropPointsReverseA[i], _InfTdropPointsReverseA[i + 1]);
                        Draw.Line(_InfTdropPointsReverseB[i], _InfTdropPointsReverseB[i + 1]);
                    }
                }
            }
        }
    }

    private void HandleYinYangTeardrop(Camera cam, Zeta.Spiral s)
    {
        if(_lastYYIndex != s.index)
        {
            CalcYinYang(s);
            _lastYYIndex = s.index;
        }

        DrawYinYang(cam);
    }

    private void CalcYinYang(Zeta.Spiral s)
    {
        int index = (int)Math.Floor(s.index);

        if(_Yang == null || (int)Math.Floor(_lastYYIndex) != index)
        {
            _Yang = new();
            _Yin = new();

            double inc = 1d / (_pointsPerTdrop - 1);
            Debug.Assert(inc > 0);
            for (int i = 0; i < _pointsPerTdrop; i++)
            {
                double t = i * inc;
                if(t < 0.0001) 
                {
                    t = 0.0001;
                }
                else if(t > 0.9999) {
                    t = 0.9999;
                }

                _Yang.Add(Yang(index + t) - new Vector(0.5, 0));
                _Yin.Add(Yin(index + t) + new Vector(0.5, 0));
            }
        }
        
        Vector trackDrop(Vector v, Vector link) => RotateAround(v, new Vector(0.0, 0.0), LinkRad(s, s.middleIndex)) / Math.Sqrt(s.middleIndex+1) + link;
        Vector trackInverseDrop(Vector v, Vector link) => RotateAround(v, new Vector(0.0, 0.0), 2*Math.PI - LinkRad(s, s.middleIndex)) / Math.Sqrt(s.middleIndex+1) + link;

        _YangPoints = new();
        _YinPoints = new();
        _YangPointsReverse = new();
        _YinPointsReverse = new();

        var z = s.zeta.ToVector();
        var norm = z.Normalized();
        for (int i = 0; i < _Yang.Count; i++)
        {
            _YangPoints.Add(trackDrop(_Yang[i], s.joints[s.middleIndex + 1]));
            _YinPoints.Add(trackDrop(_Yin[i], s.joints[s.middleIndex]));

            _YangPointsReverse.Add(trackInverseDrop(_Yang[i].Reflect(norm), z + s.joints[s.middleIndex + 1].Reflect(norm)));
            _YinPointsReverse.Add(trackInverseDrop(_Yin[i].Reflect(norm), z + s.joints[s.middleIndex].Reflect(norm)));
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
    }

    private void DrawYinYang(Camera cam)
    {
        if(YinYangTeardropTransparency.value > 0.01f)
        {
            using (Draw.StyleScope)
            {
                TeardropColorR.a = YinYangTeardropTransparency.value;
                TeardropColorG.a = YinYangTeardropTransparency.value;
                Draw.Thickness = 1 + YinYangTeardropTransparency.value;

                for (int i = 1; i < _YinPoints.Count - 1; i++)
                {
                    Draw.Color = TeardropColorR;
                    Draw.Line(_YangPoints[i], _YangPoints[i + 1]);

                    Draw.Color = TeardropColorG;
                    Draw.Line(_YinPoints[i], _YinPoints[i + 1]);
                }
            }
        }

        if(_drawInverseTdrops)
        {
            using (Draw.StyleScope)
            {
                Draw.Thickness = 1 + YinYangTeardropTransparency.value;

                var colorR = new Color(1, 0, .5f, 1f); // red ish
                colorR.a = YinYangTeardropTransparency.value;

                var colorG = new Color(.6f, 1f, .2f, 1f); // green ish
                colorG.a = YinYangTeardropTransparency.value;

                for (int i = 1; i < _YinPointsReverse.Count - 1; i++)
                {
                    Draw.Color = colorR;
                    Draw.Line(_YangPointsReverse[i], _YangPointsReverse[i + 1]);

                    Draw.Color = colorG;
                    Draw.Line(_YinPointsReverse[i], _YinPointsReverse[i + 1]);
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


    private void HandleExactTeardrop(Camera cam, Zeta.Spiral s)
    {
        if(_lastExactIndex != s.index)
        {
            CalcExactTeardrop(s);
            _lastExactIndex = s.index;
        }

        DrawExactTeardrop(cam);
    }

    private void CalcExactTeardrop(Zeta.Spiral s)
    {
        Vector trackDrop(Vector v, Vector link) => RotateAround(v, new Vector(0.0, 0.0), LinkRad(s, s.middleIndex)) / Math.Sqrt(s.middleIndex+1) + link;
        Vector trackInverseDrop(Vector v, Vector link) => RotateAround(v, new Vector(0.0, 0.0), 2*Math.PI - LinkRad(s, s.middleIndex)) / Math.Sqrt(s.middleIndex+1) + link;

        int index = (int)Math.Floor(s.index);
        double inc = 1d / (_pointsPerTdrop - 1);
        Debug.Assert(inc > 0);

        if(_exactR == null || (int)Math.Floor(_lastExactIndex) != index)
        {
            _exactR = new();
            _exactG = new();
            for (int i = 0; i < _pointsPerTdrop; i++)
            {
                double t = i * inc;
                _exactR.Add(Zeta.TearDrop(index + 1, s.real, Zeta.IndexToImag(index + t, app.useNewImagToggle.isOn), true) - new Vector(1, 0));
                _exactG.Add(Zeta.TearDrop(index + 1, s.real, Zeta.IndexToImag(index + t, app.useNewImagToggle.isOn)));
            }
        }

        _exactTdropR = new();
        _exactTdropG = new();
        _exactTdropInverseR = new();
        _exactTdropInverseG = new();

        var z = s.zeta.ToVector();
        var norm = z.Normalized();

        for (int i = 0; i < _exactR.Count; i++)
        {
            _exactTdropR.Add(trackDrop(_exactR[i], s.joints[s.middleIndex + 1]));
            _exactTdropG.Add(trackDrop(_exactG[i], s.joints[s.middleIndex]));// * Math.Cos(Math.PI) + new Vector(1, 0));

            _exactTdropInverseR.Add(trackInverseDrop(_exactR[i].Reflect(norm), z + s.joints[s.middleIndex + 1].Reflect(norm)));
            _exactTdropInverseG.Add(trackInverseDrop(_exactG[i].Reflect(norm), z + s.joints[s.middleIndex].Reflect(norm)));
        }
    }

    private void DrawExactTeardrop(Camera cam)
    {
        using (Draw.StyleScope)
        {
            TeardropColorR.a = GRTeardropTransparency.value;
            TeardropColorG.a = GRTeardropTransparency.value;
            Draw.Thickness = 1 + GRTeardropTransparency.value;
            
            for (int i = 0; i < _exactTdropR.Count - 1; i++)
            {
                Draw.Color = TeardropColorR;
                Draw.Line(_exactTdropR[i], _exactTdropR[i + 1]);

                Draw.Color = TeardropColorG;
                Draw.Line(_exactTdropG[i], _exactTdropG[i + 1]);
            }
        }

        if(_drawInverseTdrops)
        {
            using (Draw.StyleScope)
            {
                Draw.Thickness = 1 + GRTeardropTransparency.value;

                var colorR = new Color(1, 0, .5f, 1f); // red ish
                colorR.a = GRTeardropTransparency.value;

                var colorG = new Color(.6f, 1f, .2f, 1f); // green ish
                colorG.a = GRTeardropTransparency.value;
                
                for (int i = 1; i < _exactTdropInverseR.Count - 1; i++)
                {
                    Draw.Color = colorR;
                    Draw.Line(_exactTdropInverseR[i], _exactTdropInverseR[i + 1]);

                    Draw.Color = colorG;
                    Draw.Line(_exactTdropInverseG[i], _exactTdropInverseG[i + 1]);
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
