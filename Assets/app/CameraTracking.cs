using UnityEngine;
using UnityEngine.UI;
using Shapes;
public class CameraTracking : MonoBehaviour
{
    public Toggle trackOrigin;
    public Toggle trackMiddle;
    public Toggle trackSpiralCenter;
    public Toggle trackSpiralLink;
    public App app;
    public IntInput spiralNumber;

    public Canvas canvas;

    public float canvasOffset;

    void OnApplicationQuit()
    {
        PlayerPrefs.SetInt("TrackOrigin", trackOrigin.isOn ? 1 : 0);
        PlayerPrefs.SetInt("TrackMiddle", trackMiddle.isOn ? 1 : 0);
        PlayerPrefs.SetInt("TrackSpiralCenter", trackSpiralCenter.isOn ? 1 : 0);
        PlayerPrefs.SetInt("TrackSpiralLink", trackSpiralLink.isOn ? 1 : 0);

        PlayerPrefs.SetInt("TrackSpiralNum", spiralNumber.Value);

        PlayerPrefs.Save();
    }

    public void Start()
    {
        #region Camera Tracking
        trackOrigin.onValueChanged.AddListener(tracking =>
        {
            if (tracking)
                resetCamera();
        });
        trackOrigin.isOn = PlayerPrefs.GetInt("TrackOrigin") != 0 ? true : false;

        trackMiddle.isOn = PlayerPrefs.GetInt("TrackMiddle") != 0 ? true : false;
        trackSpiralCenter.isOn = PlayerPrefs.GetInt("TrackSpiralCenter") != 0 ? true : false;
        trackSpiralLink.isOn = PlayerPrefs.GetInt("TrackSpiralLink") != 0 ? true : false;
        spiralNumber.Value = PlayerPrefs.GetInt("TrackSpiralNum");

        #endregion

        app.DrawSprial += drawShapes;

    }

    public float OFFSET = .44f;
    void drawShapes(Camera cam, Zeta.Spiral spiral)
    {
        var active = canvas.gameObject.activeSelf;
        if (active)
        {            
            canvasOffset = OFFSET * cam.orthographicSize;
        }
        else 
        {
            canvasOffset = 0;
        }

        if (trackMiddle.isOn)
        {
            trackLink(spiral.middleIndex, spiral);
            return;
        }

        if (spiralNumber.Value >= spiral.middleIndex)
            spiralNumber.Value = spiral.middleIndex - 1;

        if (trackSpiralCenter.isOn)
        {
            var rot = Quaternion.AngleAxis(0, Vector3.forward);

            var pt = spiral.spirals[spiralNumber.Value];
            setCamera(pt, rot);
        }

        if (trackSpiralLink.isOn)
        {
            var mi = Zeta.ImagToIndex(app.Imag);
            var i = (int)spiral.SpiralMiddleIndex(mi, spiralNumber.Value);

            trackLink(i, spiral);
        }
    }

    void trackLink(int idx, Zeta.Spiral spiral)
    {
        var s = spiral;
        var start = s.joints[idx];
        var end = s.joints[idx + 1];

        var pos = start + (end - start) / 2;
        var rot = RotationOfLink(s, idx);
        setCamera(pos, rot);
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
    void setCamera(Vector3 pos, Quaternion rot)
    {
        // Make Camera z opposite when tracking is enabled.
        pos = new Vector3(pos.x + canvasOffset, pos.y, Camera.main.transform.position.z);


        Camera.main.transform.rotation = rot;
        Camera.main.transform.position = transform.position + pos;
    }

    void resetCamera()
    {
        var rot = Quaternion.AngleAxis(0, Vector3.forward);
        var pos = new Vector3(0, 0, -10);
        setCamera(pos, rot);
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
}