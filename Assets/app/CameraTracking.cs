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

    public Canvas canvas;

    public Vector3 canvasOffset;

    void OnApplicationQuit()
    {
        PlayerPrefs.SetInt("TrackOrigin", trackOrigin.isOn ? 1 : 0);
        PlayerPrefs.SetInt("TrackMiddle", trackMiddle.isOn ? 1 : 0);
        PlayerPrefs.SetInt("TrackSpiralCenter", trackSpiralCenter.isOn ? 1 : 0);
        PlayerPrefs.SetInt("TrackSpiralLink", trackSpiralLink.isOn ? 1 : 0);
        PlayerPrefs.SetInt("TrackJointI-N", trackJointIMinusN.isOn ? 1 : 0);

        PlayerPrefs.SetInt("TrackSpiralNum", (int)spiralNumber.value);

        PlayerPrefs.Save();
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

    }

    public Vector2 OFFSET = new Vector2(.44f, 0f);
    void drawShapes(Camera cam, Zeta.Spiral spiral)
    {
        var active = canvas.gameObject.activeSelf;
        if (active)
        {
            canvasOffset = Vector2.one;
        }
        else
        {
            canvasOffset = Vector2.zero;
        }

        if (trackMiddle.isOn)
        {
            trackLink(cam, spiral.middleIndex, spiral);
            return;
        }

        // if (spiralNumber.value >= spiral.middleIndex)
        // {
        //     spiralNumber.value = spiral.middleIndex - 1;
        // }

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

            spiralNumber.minValue = 1;
            spiralNumber.maxValue = (int)mi; // cannot be greater than middle index or you get a negative joint value below

            // 2/11/2023 "changes to code" email
            var joint = Math.Floor(mi) - spiralNumber.value;
            var i = (int)spiral.SpiralMiddleIndex(mi, joint);
            trackLink(cam, i, spiral);
        }
    }

    void trackLink(Camera cam, int idx, Zeta.Spiral spiral)
    {
        var s = spiral;

        var start = s.joints[idx];
        var end = s.joints[idx + 1];

        var pos = start + (end - start) / 2;
        var rot = RotationOfLink(s, idx);
        setCamera(cam, pos, rot);
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
        var aspect = (float)Screen.width / (float)Screen.height;
        canvasOffset = rot * (OFFSET * new Vector3(cam.orthographicSize, cam.orthographicSize * aspect));
        // canvasOffset += (rot * OFFSET);


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
}