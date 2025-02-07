using System.IO;
using Complex = System.Numerics.Complex;

using UnityEngine;
using UnityEngine.UI;
using Shapes;
using System.Linq;
using TMPro;


public partial class ZetaSpiral : MonoBehaviour
{

    public App app;
    public Slider transparency;
    public Slider visibleLinks;
    public Toggle toggleVisibleLinksFrom;
    public Slider targetTransparency;
    public Toggle _toggleZetaRealPoints;
    public Toggle _toggleColorLinks;

    public TMP_Dropdown _spiralFormula;

    public Text targetLabel;
    public Color spiralColor = Color.white;

    [Header("Reverse Spiral")]
    public Toggle showReverseSpiral;
    public Color reverseSpiralColor;


    // Use alternative Draw Method
    [HideInInspector]
    public Toggle drawPolyLine;

    // Dont draw a line until the total length of the vectors is at least this
    [HideInInspector]
    public Slider cutoffLength;

    // Skip drawing this many lines before drawing the next line. They are so short you can't see them anyway
    [HideInInspector]
    public Slider skipEvery;


    // Don't draw the spiral after the middle links.  Only draw a line to each spiral
    [HideInInspector]
    public Toggle onlyDrawOutline;
    // Draw a cross marking the location of each spiral

    private Polyline _spiralPolyline;
    private Vector _lastComplex;

    void OnApplicationQuit()
    {
        savePlayerPrefs();
    }
    public void Start()
    {
        _spiralFormula = GameObject.Find("SpiralFormulaDropdown")?.GetComponent<TMP_Dropdown>();

        transparency.value = PlayerPrefs.GetFloat(name + "-Transparency", .7f);
        // visibleLinks.value = PlayerPrefs.GetFloat(name + "-VisableLinks", 5f);
        visibleLinks.value = visibleLinks.maxValue;
        targetTransparency.value = PlayerPrefs.GetFloat(name + "-ZetaTargetTransparency", 1f);
        _toggleZetaRealPoints = GameObject.Find("ToggleZetaRealPoints")?.GetComponent<Toggle>();
        _toggleColorLinks = GameObject.Find("ToggleColorLinks")?.GetComponent<Toggle>();
        showReverseSpiral.isOn = PlayerPrefs.GetInt(name + "-ShowReverseSpiral", 1) == 1;

        targetLabel = GameObject.Find("ZetaPointLabel")?.GetComponent<Text>();
        toggleVisibleLinksFrom = GameObject.Find("ToggleShowLinksFrom")?.GetComponent<Toggle>();

        _spiralPolyline = GameObject.Find("Polyline")?.GetComponent<Polyline>();
        drawPolyLine = GameObject.Find("PolylineToggle")?.GetComponent<Toggle>();

        app.DrawSprial += DrawShapes;
        app.SceneChange += savePlayerPrefs;
    }

    void savePlayerPrefs() 
    {
        PlayerPrefs.SetFloat(name + "-Transparency", transparency.value);
        // PlayerPrefs.SetFloat(name + "-VisableLinks", visibleLinks.value);
        PlayerPrefs.SetFloat(name + "-ZetaTargetTransparency", targetTransparency.value);
        PlayerPrefs.SetInt(name + "-ShowReverseSpiral", showReverseSpiral.isOn ? 1 : 0);
        PlayerPrefs.Save();
    }

    public void DrawShapes(Camera cam, Zeta.Spiral spiral)
    {
        using (Draw.StyleScope)
        {
            drawSpiral(spiral);
        }

        using (Draw.StyleScope)
        {
            drawZetaTarget(spiral);
        }

        using (Draw.StyleScope)
        {
            drawOutline(spiral);
        }

        using (Draw.StyleScope)
        {
            drawReverseSpiral(cam, spiral);
        }
    }

    public void DrawOffsetSpiral(Camera cam, Zeta.Spiral spiral, Vector offset)
    {
        for(int i = 0; i < spiral.joints.Length; i++)
        {
            spiral.joints[i] += offset;
        }

        using (Draw.StyleScope)
        {
            drawSpiral(spiral, true);
        }
    }

    void drawSpiral(Zeta.Spiral spiral, bool fanSpiral = false)
    {
        if (spiral.joints[0] == null)
            return;

        if(drawPolyLine.isOn)
        {
            if (_spiralPolyline.gameObject.activeSelf == false)
            {
                _spiralPolyline.gameObject.SetActive(true);
            }

            if(_lastComplex == null || _lastComplex.x != spiral.index || _lastComplex.y != spiral.real)
            {
                Vector3[] points = new Vector3[spiral.joints.Length];
                for (int i = 0; i < spiral.joints.Length; i++)
                {
                    points[i] = spiral.joints[i].ToVector3();
                }
                
                _spiralPolyline.SetPoints(points);

                _lastComplex = new Vector(spiral.index, spiral.real);
            }

            _spiralPolyline.Thickness = 0.001f * Camera.main.orthographicSize;
            var SpiralColor = spiralColor;
            SpiralColor.a = transparency.value;
            _spiralPolyline.Color = SpiralColor;

            return;
        }
        else
        {
            if (_spiralPolyline.gameObject.activeSelf == true)
            {
                _spiralPolyline.gameObject.SetActive(false);
            }
        }
        
        Draw.Thickness = 1;
        // Since our links are zero-based, the middle index into the array
        // is not the middle link number starting from one.
        var middleLink = spiral.middleIndex + 1;

        int skipCount = 0;

        // If the visibleLinks slider is at max value, don't limit visibility.  Draw all links
        bool limitVisibleLinks = visibleLinks.value < visibleLinks.maxValue && CameraTracking.trackingIndex > -1;

        var startIndex = 1;
        var endIndex = spiral.numLinks;
        
        if (limitVisibleLinks)
        {
            AdjustVisibleLinkMax(spiral.middleIndex);

            if(toggleVisibleLinksFrom.isOn)
            {   
                startIndex = 1;
                endIndex = (int)Mathf.Clamp((int)visibleLinks.value + 2, (int)visibleLinks.value + 2, spiral.numLinks);
            }
            else
            {
                startIndex = (int)Mathf.Clamp(CameraTracking.trackingIndex - (int)visibleLinks.value + 1, 1, CameraTracking.trackingIndex - (int)visibleLinks.value + 1);
                endIndex = (int)Mathf.Clamp(CameraTracking.trackingIndex + (int)visibleLinks.value + 2, CameraTracking.trackingIndex + (int)visibleLinks.value + 2, spiral.numLinks);
            }
        }

        var start = spiral.joints[startIndex - 1].ToVector2();
        for (int i = startIndex; i < endIndex; i++)
        {
            var color = spiralColor;
            color.a = transparency.value;
            Draw.Thickness = 1 + transparency.value;

            if(!_toggleColorLinks.isOn)
            {
                if (i == middleLink - 1)
                {
                    color = Color.green;
                    color.a = transparency.value;
                    Draw.Thickness = 4;
                }
                else if (i == middleLink)
                {
                    color = new Color(1, .5f, 0, 1f); // orange
                    color.a = transparency.value;
                    Draw.Thickness = 4;
                }
                else if (i == middleLink + 1)
                {
                    color = Color.red;
                    color.a = transparency.value;
                    Draw.Thickness = 4;
                }
                // else if (i == sprial.numLinks - 1)
                // {
                //     color = Color.red;
                //     Draw.Thickness = 2;
                // }
            }


            var end = spiral.joints[i];


            if (i >= middleLink + 2)
            {
                if ((end - start).sqrMagnitude < cutoffLength.value)
                    continue;


                if (skipCount >= skipEvery.value)
                {
                    skipCount = 0;
                }
                else
                {
                    skipCount++;
                    continue;
                }

                if (onlyDrawOutline.isOn)
                    return;
            }

            if(fanSpiral)
            {
                color.a -= 0.1f;
                if(color.a < 0) color.a = 0;
            }
            Draw.Line(start, end, color);
            start = end;
        }

    }

    private void AdjustVisibleLinkMax(int middleIndex)
    {
        int adjust = (middleIndex + 2) - (int)visibleLinks.maxValue;
        int newValue = (int)visibleLinks.value + adjust;
        visibleLinks.maxValue += adjust;
        visibleLinks.value = newValue;
    }

    void drawOutline(Zeta.Spiral spiral)
    {
        if (!onlyDrawOutline.isOn)
            return;

        var start = spiral.spirals[0];
        for (var i = 0; i < spiral.middleIndex; i++)
        {
            var end = spiral.spirals[i];
            Draw.Line(start, end);
            start = end;
        }
    }



    void drawZetaTarget(Zeta.Spiral s)
    {
        var pt = s.zeta.ToVector2();
        targetLabel.text = $"({s.zeta.Real.ToString("n8")}, {s.zeta.Imaginary.ToString("n8")})";

        var color = spiralColor + new Color(-0.5f, 0, 0);
        color.a = targetTransparency.value;

        Draw.Color = color;
        // Draw.Ring(pt, .08f);
        using (Draw.StyleScope)
        {
            var zColor = new Color(1, .5f, 0, color.a);
            zColor.a -= 0.5f;
            zColor.a = zColor.a < 0 ? 0 : zColor.a;
            Draw.Color = zColor;
            Draw.Thickness = 1;
            // ShapesUtils.DrawCross(pt, .1f);
            // -Z
            var r = .05f;
            Draw.Line(pt + new Vector2(-r/2, 0), pt + new Vector2(r/2, 0)); // -
            Draw.Line(pt + new Vector2(-r, -r), pt + new Vector2(r, r));    // /
            Draw.Line(pt + new Vector2(-r, r), pt + new Vector2(r, r));     // `
            Draw.Line(pt + new Vector2(-r, -r), pt + new Vector2(r,-r));    // _

            // +O
            r = .1f;
            ShapesUtils.DrawCross(Vector2.zero, r);
            Draw.Ring(Vector2.zero, r/2);
        }

        // Draw.Ring(pt, 1f);

        if(_toggleZetaRealPoints.isOn)
        {
            using(Draw.StyleScope)
            {
                var pathColor1 = Color.magenta;
                pathColor1.a = targetTransparency.value;

                var pathColor = Color.blue;
                pathColor.a = targetTransparency.value;

                Draw.Thickness = 1;
                Draw.Color = pathColor1;

                int ptCount = 100;
                Zeta.Spiral rspiral = new Zeta.Spiral(0, s.index, (SpiralFormulas)_spiralFormula.value, app.useNewImagToggle.isOn);
                pt = rspiral.zeta.ToVector2();
                // from real 0-6
                for(int i = 0; i <= 10; i++)
                {
                    if(i > 0) Draw.Color = pathColor;
                    
                    ptCount = 100 / (i + 1);
                    for(int j = 1; j <= ptCount; j++)
                    {
                        float r = (float)j/ptCount + i;
                        rspiral = new Zeta.Spiral(r, s.index, (SpiralFormulas)_spiralFormula.value, app.useNewImagToggle.isOn);
                        Vector2 nextTarget = rspiral.zeta.ToVector2();
                        Draw.Line(pt, nextTarget);
                        pt = nextTarget;
                    }

                    if(i == 10)
                    {
                        Draw.Line(pt, new Vector2(1, 0));
                    }
                }

                // Draw.Line(new Zeta.Spiral(0, s.index, (SpiralFormulas)_spiralFormula.value, app.useNewImagToggle.isOn).zeta.ToVector2(), pt);
                // Draw.Line(pt, new Zeta.Spiral(1, s.index, (SpiralFormulas)_spiralFormula.value, app.useNewImagToggle.isOn).zeta.ToVector2());
            }
        }
    }


    void drawReverseSpiral(Camera cam, Zeta.Spiral spiral)
    {
        if (!showReverseSpiral.isOn)
            return;

        if (spiral.joints[0] == null)
            return;

        Draw.Thickness = 1;
        var c  = reverseSpiralColor;
        c.a = transparency.value;
        Draw.Color = c;

        var startIndex = 0;
        var endIndex = spiral.joints.Length - 1;;
        bool limitVisibleLinks = visibleLinks.value < visibleLinks.maxValue && CameraTracking.trackingIndex > -1;
        if (limitVisibleLinks)
        {
            AdjustVisibleLinkMax(spiral.middleIndex);

            if(toggleVisibleLinksFrom.isOn)
            {   
                startIndex = 0;
                endIndex = (int)Mathf.Clamp((int)visibleLinks.value + 1, (int)visibleLinks.value + 1, spiral.numLinks);
            }
            else
            {
                startIndex = (int)Mathf.Clamp(CameraTracking.trackingIndex - (int)visibleLinks.value, 0, CameraTracking.trackingIndex - (int)visibleLinks.value + 1);
                endIndex = (int)Mathf.Clamp(CameraTracking.trackingIndex + (int)visibleLinks.value + 1, CameraTracking.trackingIndex + (int)visibleLinks.value + 1, spiral.numLinks);
            }

            if(endIndex >= spiral.joints.Count()) endIndex = spiral.joints.Count() - 1;
        }

        var zeta = spiral.zeta.ToVector();
        var z2 = zeta / 2;

        // Copy zeta vector and normalize it.
        var norm = zeta.Normalized();

        var middleLink = spiral.middleIndex;

        var from = zeta + spiral.joints[endIndex].Reflect(norm);
        for (int i = endIndex - 1; i >= startIndex; i--)
        {
            var color = reverseSpiralColor;
            color.a = transparency.value;
            Draw.Thickness = 1 + transparency.value;

            if(!_toggleColorLinks.isOn)
            {
                if (i == middleLink - 1)
                {
                    color = new Color(.6f, 1f, .2f, 1f); // green ish
                    color.a = transparency.value;
                    Draw.Thickness = 4;
                }
                else if (i == middleLink)
                {
                    color = new Color(1, .5f, .5f, 1f); // orange ish
                    color.a = transparency.value;
                    Draw.Thickness = 4;
                }
                else if (i == middleLink + 1)
                {
                    color = new Color(1, 0, .5f, 1f); // red ish
                    color.a = transparency.value;
                    Draw.Thickness = 4;
                }
            }

            var to = zeta + spiral.joints[i].Reflect(norm);

            Draw.Color = color;
            Draw.Line(from, to);
            from = to;
        }
    }
}
