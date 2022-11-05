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
                trackLink(spiral.middleLink);
        }
    }

    void trackLink(Vector2[] link)
    {
        var start = link[0];
        var end = link[1];

        var pos = link[0] + (link[1] - link[0]) / 2;
        var rot = rotationOfLink(link);
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
    Quaternion rotationOfLink(Vector2[] link)
    {
        Vector3 start = link[0];
        Vector3 end = link[1];

        var temp = end - start;
        var angle = Mathf.Atan2(temp.y, temp.x) * Mathf.Rad2Deg;

        return Quaternion.AngleAxis(angle, Vector3.forward);
    }

}