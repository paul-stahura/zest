using System;
using UnityEngine;
using UnityEngine.UI;
using Shapes;
public class CameraTracking : MonoBehaviour
{
    public Toggle trackOrigin;
    public Toggle trackMiddle;
    public Toggle trackSpiralCenter;
    public Toggle trackSpiralLink;
    public Toggle trackJointIMinusN;
    public App app;
    public Slider spiralNumber;

    public RectTransform verticalUI;

    [Header("Tracked Link")]
    /// <summary>
    /// Controls the transparency of the highlight on the tracked link
    /// </summary>
    public Slider linkHighlightTransparency;
    /// <summary>
    /// The color of the highlight over the tracked link
    /// </summary>
    public Color linkHighlight;
    public float thickness;

    [Header("Teardrop")]
    public Slider TeardropTransparency;
    public Color TeardropColorA = Color.red;
    public Color TeardropColorB = Color.green;

    /// <summary>
    /// This is the index of the link the camera is tracking. If the camera is
    /// not tracking a link, this will be -1
    /// </summary>
    public static int trackingIndex;

    void OnApplicationQuit()
    {
        savePlayerPrefs();
    }

    public void Start()
    {
        #region Camera Tracking
        trackOrigin.onValueChanged.AddListener(tracking =>
        {
            if (tracking)
                resetCamera(Camera.main);
        });
        trackOrigin.isOn = PlayerPrefs.GetInt("TrackOrigin") != 0 ? true : false;

        trackMiddle.isOn = PlayerPrefs.GetInt("TrackMiddle") != 0 ? true : false;
        trackSpiralCenter.isOn = PlayerPrefs.GetInt("TrackSpiralCenter") != 0 ? true : false;
        trackSpiralLink.isOn = PlayerPrefs.GetInt("TrackSpiralLink") != 0 ? true : false;
        trackJointIMinusN.isOn = PlayerPrefs.GetInt("TrackJointI-N") != 0 ? true : false;
        spiralNumber.value = PlayerPrefs.GetInt("TrackSpiralNum");

        #endregion

        app.DrawSprial += drawShapes;
        app.SceneChange += savePlayerPrefs;
    }

    void savePlayerPrefs() {
        PlayerPrefs.SetInt("TrackOrigin", trackOrigin.isOn ? 1 : 0);
        PlayerPrefs.SetInt("TrackMiddle", trackMiddle.isOn ? 1 : 0);
        PlayerPrefs.SetInt("TrackSpiralCenter", trackSpiralCenter.isOn ? 1 : 0);
        PlayerPrefs.SetInt("TrackSpiralLink", trackSpiralLink.isOn ? 1 : 0);
        PlayerPrefs.SetInt("TrackJointI-N", trackJointIMinusN.isOn ? 1 : 0);

        PlayerPrefs.SetInt("TrackSpiralNum", (int)spiralNumber.value);

        PlayerPrefs.Save();
    }

    void drawShapes(Camera cam, Zeta.Spiral spiral)
    {
        if (trackMiddle.isOn)
        {
            trackLink(cam, spiral.middleIndex, spiral);
            DrawTeardrop(spiral);
            return;
        }

        // default to not tracking any link index
        trackingIndex = -1;

        if (trackSpiralCenter.isOn)
        {
            var rot = Quaternion.AngleAxis(0, Vector3.forward);

            var pt = spiral.spirals[(int)spiralNumber.value];
            setCamera(cam, pt, rot);
        }

        if (trackSpiralLink.isOn)
        {
            spiralNumber.minValue = 0;
            spiralNumber.maxValue = spiral.middleIndex;

            var mi = Zeta.ImagToIndex(app.Imag);
            var i = (int)spiral.SpiralMiddleIndex(mi, spiralNumber.value);

            trackLink(cam, i, spiral);
        }

        if (trackJointIMinusN.isOn)
        {
            var mi = Zeta.ImagToIndex(spiral.input.Imaginary);

            spiralNumber.minValue = 0;
            spiralNumber.maxValue = (int)mi; // cannot be greater than middle index or you get a negative joint value below

            // 2/11/2023 "changes to code" email
            var joint = Math.Floor(mi) - spiralNumber.value;
            var i = (int)spiral.SpiralMiddleIndex(mi, joint);
            trackLink(cam, i, spiral, false);
        }

        DrawTeardrop(spiral);
    }

    void trackLink(Camera cam, int idx, Zeta.Spiral spiral, bool trackCenter=true)
    {
        trackingIndex = idx;

        var s = spiral;

        var start = s.joints[idx];
        var end = s.joints[idx + 1];

        var pos = end;
        if (trackCenter)
        {
            pos = start + (end - start) / 2;;
        }

        var rot = RotationOfLink(s, idx);
        setCamera(cam, pos, rot);

        // using (Draw.StyleScope)
        // {
        //     linkHighlight.a = linkHighlightTransparency.value;
        //     Draw.Color = linkHighlight;
        //     Draw.Thickness = thickness;
        //     Draw.Line(start, end);
        // }
    }

    void DrawTeardrop(Zeta.Spiral spiral)
    {
        if(TeardropTransparency.value < 0.05f)
        {
            return;
        }

        using (Draw.StyleScope)
        {
            TeardropColorA.a = TeardropTransparency.value;
            TeardropColorB.a = TeardropTransparency.value;
            Draw.Color = TeardropColorA;
            Draw.Thickness = 1 + TeardropTransparency.value;

            double psi(double t) => Math.Cos(2 * Math.PI * (t*t - t - 1.0 / 16.0)) / Math.Cos(2 * Math.PI * t);
            Vector a(double t) => new Vector(-Math.Cos(2*Math.PI * (t*t - 1.0/16.0)), Math.Sin(2*Math.PI * (t*t - 1.0/16.0)));
            Vector tDropa(double t) => a(t) * psi(t);// + new Vector(1.0, 0.0);
            Vector tDropb(double t) => tDropa(t) * Math.Cos(Math.PI);// + new Vector(1.0, 0.0);
            
            Vector trackDrop(Vector v, Vector link) => RotateAround(v, new Vector(0.0, 0.0), LinkRad(spiral, spiral.middleIndex)) / Math.Sqrt(spiral.middleIndex+1) + link; 

            double i = 0;
            double inc = 1d/200;
            var start = trackDrop(tDropa(i), spiral.joints[spiral.middleIndex + 1]);
            for (i = inc; i <= 1+inc; i += inc)
            {
                var end = trackDrop(tDropa(i), spiral.joints[spiral.middleIndex + 1]);
                Draw.Line(start, end);
                start = end;
            }

            Draw.Color = TeardropColorB;
            i = 0;
            start = trackDrop(tDropb(i), spiral.joints[spiral.middleIndex]);
            for (i = inc; i <= 1+inc; i += inc)
            {
                var end = trackDrop(tDropb(i), spiral.joints[spiral.middleIndex]);
                Draw.Line(start, end);
                start = end;
            }
        }
    }

    /// <summary>
    /// Sets the camera's position to an offset from the Robot3's position. 
    /// Also sets the camera's absolute rotation.
    /// 
    /// The camera's transform can only be updated during the Update() phase, which
    /// is also when Robot3.calc() is called.
    /// </summary>
    /// <param name="pos"></param>
    /// <param name="rot"></param>
    void setCamera(Camera cam, Vector3 pos, Quaternion rot)
    {
        var OFFSET = Vector2.zero;
        if (verticalUI.gameObject.activeInHierarchy)
            OFFSET = new Vector2(1f - verticalUI.position.x / Screen.width, 0);
            
        var aspect = (float)Screen.width / (float)Screen.height;
        var canvasOffset = rot * (OFFSET * new Vector3(cam.orthographicSize, cam.orthographicSize * aspect));

        // Make Camera z opposite when tracking is enabled.
        pos = new Vector3(pos.x + canvasOffset.x, pos.y + canvasOffset.y, cam.transform.position.z);


        cam.transform.rotation = rot;
        cam.transform.position = transform.position + pos;
    }

    void resetCamera(Camera cam)
    {
        var rot = Quaternion.AngleAxis(0, Vector3.forward);
        var pos = new Vector3(0, 0, -10);
        setCamera(cam, pos, rot);
    }

    // Calculates the rotation required to orient the camera so that the link
    // at the given index appears horizontal when rendered.
    public static Quaternion RotationOfLink(Zeta.Spiral s, int idx)
    {
        Vector3 start = s.joints[idx];
        Vector3 end = s.joints[idx + 1];

        var temp = end - start;
        var angle = Mathf.Atan2(temp.y, temp.x) * Mathf.Rad2Deg;

        return Quaternion.AngleAxis(angle, Vector3.forward);
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