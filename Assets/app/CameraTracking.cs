using UnityEngine;
using UnityEngine.UI;
using Shapes;
public class CameraTracking : ImmediateModeShapeDrawer
{
    public Toggle trackMiddle;
    public ZetaSpiral spiral;

    void OnApplicationQuit()
    {
        PlayerPrefs.SetInt("CameraTracking", trackMiddle.isOn ? 1 : 0);
        PlayerPrefs.Save();
    }

    public void Start()
    {
        #region Camera Tracking
        trackMiddle.onValueChanged.AddListener(val =>
        {
            if (!val)
            {
                var rot = Quaternion.AngleAxis(0, Vector3.forward);
                Camera.main.transform.rotation = rot;
            }
            else
            {
                Camera.main.transform.position = new Vector3(0, 0, -10);
                Camera.main.transform.rotation = Quaternion.identity;
            }
        });
        trackMiddle.isOn = PlayerPrefs.GetInt("CameraTracking") != 0 ? true : false;

        trackMiddle.onValueChanged.Invoke(trackMiddle.isOn);
        #endregion

    }
    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {
            if (trackMiddle.isOn)
                trackLink(spiral.S.middleIndex);
        }
    }

    void trackLink(int idx)
    {
        var s = spiral.S;
        var start = s.links[idx];
        var end = s.links[idx + 1];

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
        pos = new Vector3(pos.x, pos.y, Camera.main.transform.position.z);


        Camera.main.transform.rotation = rot;
        Camera.main.transform.position = transform.position + pos;
    }


    // Calculates the rotation required to orient the camera so that the link
    // at the given index appears horizontal when rendered.
    public static Quaternion RotationOfLink(Zeta.Spiral s, int idx)
    {
        Vector3 start = s.links[idx];
        Vector3 end = s.links[idx + 1];

        var temp = end - start;
        var angle = Mathf.Atan2(temp.y, temp.x) * Mathf.Rad2Deg;

        return Quaternion.AngleAxis(angle, Vector3.forward);
    }
}