using UnityEngine;
using UnityEngine.UI;
using Shapes;
public class CameraTracking : ImmediateModeShapeDrawer
{
    public Toggle trackMiddle;
    public ZetaSpiral spiral;

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
        trackMiddle.onValueChanged.Invoke(trackMiddle.isOn);
        #endregion

    }
    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {
            if (trackMiddle.isOn)
                trackLink(spiral.spiral.MiddleIndex);
        }
    }

    void trackLink(int idx)
    {
        var s = spiral.spiral;
        var start = s.Links[idx];
        var end = s.Links[idx + 1];

        var pos = s.Links[0] + (s.Links[1] - s.Links[0]) / 2;
        var rot = rotationOfLink(idx);
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
    Quaternion rotationOfLink(int idx)
    {
        var s = spiral.spiral;
        Vector3 start = s.Links[idx];
        Vector3 end = s.Links[idx = 1];

        var temp = end - start;
        var angle = Mathf.Atan2(temp.y, temp.x) * Mathf.Rad2Deg;

        return Quaternion.AngleAxis(angle, Vector3.forward);
    }

}