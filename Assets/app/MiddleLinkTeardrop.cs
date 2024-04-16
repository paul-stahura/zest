using System;
using System.Collections;
using System.Collections.Generic;
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
    public Slider RGTeardropTransparency;
    public Slider INFTeardropTransparency;
    public Toggle INFLinkToggle;

    public Color TeardropColorA = Color.red;
    public Color TeardropColorB = Color.green;
    public Color TeardropColorInf = Color.cyan;

    public Vector TdropDotA { get; private set; }
    public Vector TdropDotB { get; private set; }

    public event Action<Camera, Zeta.Spiral> InfinityTdropPoints;

    private List<Vector> _exactTdropA;
    private List<Vector> _exactTdropB;

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

        TdropDotA = new Vector(0, 0);
        TdropDotB = new Vector(0, 0);

        RGTeardropTransparency = GameObject.Find("RG Transparency Slider")?.GetComponent<Slider>();
        INFTeardropTransparency = GameObject.Find("INF Transparency Slider")?.GetComponent<Slider>();

        // player prefs
        RGTeardropTransparency.value = PlayerPrefs.GetFloat("RGTeardropTransparency");
        INFTeardropTransparency.value = PlayerPrefs.GetFloat("INFTeardropTransparency");

        INFLinkToggle.isOn = PlayerPrefs.GetInt("INFLinkToggle") == 1;
        _inverseTdropsToggle.isOn = PlayerPrefs.GetInt("InverseTdropToggle") == 1;
    }
    
    public void Start()
    {
        app.DrawSprial += DrawINFTeardrop;
        app.DrawSprial += DrawExactTeardrop;
    }

    void OnApplicationQuit()
    {
        savePlayerPrefs();
    }

    private void savePlayerPrefs()
    {
        PlayerPrefs.SetFloat("RGTeardropTransparency", RGTeardropTransparency.value);
        PlayerPrefs.SetFloat("INFTeardropTransparency", INFTeardropTransparency.value);
        PlayerPrefs.SetInt("INFLinkToggle", INFLinkToggle.isOn ? 1 : 0);
        PlayerPrefs.SetInt("InverseTdropToggle", _inverseTdropsToggle.isOn ? 1 : 0);
    }

    private void DrawINFTeardrop(Camera cam, Zeta.Spiral s)
    {
        // Draws two dots/circles at the current location of teardrop A and B given the Zeta index
        var index = Zeta.ImagToIndex(s.input.ToVector().y);
        index -= Math.Floor(index);
        var orth = Mathf.Min(1f, cam.orthographicSize);
        var size = 50.0f;

        TdropDotA = trackDrop(Zeta.InfinityTdrop(index, true), s.joints[s.middleIndex + 1]);

        index = 1 - index;
        TdropDotB = trackDrop(Zeta.InfinityTdrop(index, false), s.joints[s.middleIndex]);

        InfinityTdropPoints.Invoke(cam, s);

        if(_drawINFLink)
        {
            using (Draw.StyleScope)
            {
                Color dotColor = Color.cyan;
                dotColor.a = 0.5f;
                Draw.Color = dotColor;
                Draw.Thickness = 1 + 0.5f;

                Draw.Ring(TdropDotA, orth / size / 2);
                ShapesUtils.DrawCross(TdropDotA, orth / size, .5f);

                Draw.Ring(TdropDotB, orth / size / 2);
                ShapesUtils.DrawCross(TdropDotB, orth / size, .5f);

                Draw.Line(TdropDotA, TdropDotB);
            }
        }

        if(INFTeardropTransparency.value < 0.01f)
        {
            return;
        }
        
        Vector trackDrop(Vector v, Vector link) => RotateAround(v, new Vector(0.0, 0.0), LinkRad(s, s.middleIndex)) / Math.Sqrt(s.middleIndex+1) + link; 

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

    private void DrawExactTeardrop(Camera cam, Zeta.Spiral s)
    {
        if(RGTeardropTransparency.value < 0.01f)
        {
            return;
        }

        _exactTdropA = new();
        _exactTdropB = new();
        int index = (int)Math.Floor(Zeta.ImagToIndex(s.input.Imaginary));
        double inc = 1d / (_pointsPerTdrop - 1);
        Debug.Assert(inc > 0);
        for (int i = 0; i < _pointsPerTdrop; i++)
        {
            double t = i * inc;
            _exactTdropA.Add(Zeta.TearDrop(index + 1, s.input.Real, Zeta.IndexToImag(index + t)) - new Vector(1, 0));
            _exactTdropB.Add(Zeta.TearDrop(index + 1, s.input.Real, Zeta.IndexToImag(index + t), true));// * Math.Cos(Math.PI) + new Vector(1, 0));
        }

        Vector trackDrop(Vector v, Vector link) => RotateAround(v, new Vector(0.0, 0.0), LinkRad(s, s.middleIndex)) / Math.Sqrt(s.middleIndex+1) + link; 

        using (Draw.StyleScope)
        {
            TeardropColorA.a = RGTeardropTransparency.value;
            TeardropColorB.a = RGTeardropTransparency.value;
            Draw.Thickness = 1 + RGTeardropTransparency.value;
            
            var startA = trackDrop(_exactTdropA[0], s.joints[s.middleIndex + 1]);
            var startB = trackDrop(_exactTdropB[0], s.joints[s.middleIndex]);
            for (int i = 1; i < _exactTdropA.Count; i++)
            {
                var endA = trackDrop(_exactTdropA[i], s.joints[s.middleIndex + 1]);
                var endB = trackDrop(_exactTdropB[i], s.joints[s.middleIndex]);

                Draw.Color = TeardropColorA;
                Draw.Line(startA, endA);
                startA = endA;

                Draw.Color = TeardropColorB;
                Draw.Line(startB, endB);
                startB = endB;
            }
        }

        if(_drawInverseTdrops)
        {
            Vector trackInverseDrop(Vector v, Vector link) => RotateAround(v, new Vector(0.0, 0.0), 2*Math.PI - LinkRad(s, s.middleIndex)) / Math.Sqrt(s.middleIndex+1) + link;

            using (Draw.StyleScope)
            {
                Draw.Thickness = 1 + RGTeardropTransparency.value;

                var colorR = new Color(1, 0, .5f, 1f); // red ish
                colorR.a = RGTeardropTransparency.value;

                var colorG = new Color(.6f, 1f, .2f, 1f); // green ish
                colorG.a = RGTeardropTransparency.value;
                
                var z = s.zeta.ToVector();
                var norm = z.Normalized();
                
                var startInverseA = trackInverseDrop(_exactTdropA[0].Reflect(norm), z + s.joints[s.middleIndex + 1].Reflect(norm));
                var startInverseB = trackInverseDrop(_exactTdropB[0].Reflect(norm), z + s.joints[s.middleIndex].Reflect(norm));
                for (int i = 1; i < _exactTdropA.Count; i++)
                {
                    var endInverseA = trackInverseDrop(_exactTdropA[i].Reflect(norm), z + s.joints[s.middleIndex + 1].Reflect(norm));
                    var endInverseB = trackInverseDrop(_exactTdropB[i].Reflect(norm), z + s.joints[s.middleIndex].Reflect(norm));

                    Draw.Color = colorR;
                    Draw.Line(startInverseA, endInverseA);
                    startInverseA = endInverseA;

                    Draw.Color = colorG;
                    Draw.Line(startInverseB, endInverseB);
                    startInverseB = endInverseB;
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
