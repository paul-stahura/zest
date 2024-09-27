using System;
using UnityEngine;
using UnityEngine.UI;
using Shapes;
using System.Linq;
using Lean.Touch;
public class CameraTracking : MonoBehaviour
{
    [SerializeField] private LeanDragCamera _cameraDrag;
    public Toggle trackOrigin;
    public Toggle trackMiddle;
    public Toggle trackBisectorPt;
    public Toggle trackScaledBisectorPt;
    private bool _bisectorCamUp = true;
    public Toggle trackTdropR;
    public Toggle trackTdropG;
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

    private MiddleLinkTeardrop middleLinkTeardrop;
    [SerializeField] private Vector2 _cameraTackingOffset;
    [SerializeField] private Vector2 _cameraZoomOffset;

    /// <summary>
    /// This is the index of the link the camera is tracking. If the camera is
    /// not tracking a link, this will be -1
    /// </summary>
    public static int trackingIndex;

    void OnApplicationQuit()
    {
        savePlayerPrefs();
    }

    public void Awake()
    {
        trackBisectorPt = GameObject.Find("Track Bisector")?.GetComponent<Toggle>();
        trackScaledBisectorPt = GameObject.Find("Track Scaled Bisector")?.GetComponent<Toggle>();

        trackTdropR = GameObject.Find("CamTrackR")?.GetComponent<Toggle>();
        trackTdropG = GameObject.Find("CamTrackG")?.GetComponent<Toggle>();

        _cameraDrag = Camera.main.GetComponent<LeanDragCamera>();

        trackOrigin.onValueChanged.AddListener((bool v) => {
            ResetCameraOffsets();
        });
        trackMiddle.onValueChanged.AddListener((bool v) => {
            ResetCameraOffsets();
        });
        trackBisectorPt.onValueChanged.AddListener((bool v) => {
            ResetCameraOffsets();
        });
        trackScaledBisectorPt.onValueChanged.AddListener((bool v) => {
            ResetCameraOffsets();
        });
        trackTdropG.onValueChanged.AddListener((bool v) => {
            ResetCameraOffsets();
        });
        trackTdropR.onValueChanged.AddListener((bool v) => {
            ResetCameraOffsets();
        });
        trackSpiralCenter.onValueChanged.AddListener((bool v) => {
            ResetCameraOffsets();
        });
        trackSpiralLink.onValueChanged.AddListener((bool v) => {
            ResetCameraOffsets();
        });
        trackJointIMinusN.onValueChanged.AddListener((bool v) => {
            ResetCameraOffsets();
        });
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
        trackBisectorPt.isOn = PlayerPrefs.GetInt("TrackBisector") != 0 ? true : false;
        trackScaledBisectorPt.isOn = PlayerPrefs.GetInt("TrackScaledBisector") != 0 ? true : false;
        trackSpiralCenter.isOn = PlayerPrefs.GetInt("TrackSpiralCenter") != 0 ? true : false;
        trackSpiralLink.isOn = PlayerPrefs.GetInt("TrackSpiralLink") != 0 ? true : false;
        trackJointIMinusN.isOn = PlayerPrefs.GetInt("TrackJointI-N") != 0 ? true : false;
        spiralNumber.value = PlayerPrefs.GetInt("TrackSpiralNum");
        
        middleLinkTeardrop = GameObject.Find("YinYang")?.GetComponent<MiddleLinkTeardrop>();
        #endregion

        app.DrawSprial += drawShapes;
        app.SceneChange += savePlayerPrefs;
        middleLinkTeardrop.InfinityTdropPoints += TrackTdrop;
    }

    public void Update()
    {
        var windowSize = new Vector2(Screen.width, Screen.height).normalized;
       _cameraTackingOffset += _cameraDrag.localDelta * windowSize * -0.0025f;
    }

    public void AddCameraZoomOffset(Vector2 offset, float orthoScalar)
    {
        _cameraZoomOffset += offset;

        // since the offset scales with the camera zoom we need to make sure it stays in the same place 
        // when we are in the middle of zooming
        _cameraTackingOffset /= orthoScalar;
    }

    void savePlayerPrefs() {
        PlayerPrefs.SetInt("TrackOrigin", trackOrigin.isOn ? 1 : 0);
        PlayerPrefs.SetInt("TrackMiddle", trackMiddle.isOn ? 1 : 0);
        PlayerPrefs.SetInt("TrackBisector", trackBisectorPt.isOn ? 1 : 0);
        PlayerPrefs.SetInt("TrackScaledBisector", trackScaledBisectorPt.isOn ? 1 : 0);
        PlayerPrefs.SetInt("TrackSpiralCenter", trackSpiralCenter.isOn ? 1 : 0);
        PlayerPrefs.SetInt("TrackSpiralLink", trackSpiralLink.isOn ? 1 : 0);
        PlayerPrefs.SetInt("TrackJointI-N", trackJointIMinusN.isOn ? 1 : 0);

        PlayerPrefs.SetInt("TrackSpiralNum", (int)spiralNumber.value);

        PlayerPrefs.Save();
    }

    void drawShapes(Camera cam, Zeta.Spiral spiral)
    {
        spiralNumber.maxValue = spiral.spirals.Count() - 1;

        // default to not tracking any link index
        trackingIndex = -1;

        if(trackOrigin.isOn)
        {
            setCamera(cam, Vector3.zero, Quaternion.identity);
        }

        if (trackMiddle.isOn)
        {
            trackLink(cam, spiral.middleIndex, spiral);
            return;
        }

        if(trackBisectorPt.isOn || trackScaledBisectorPt.isOn)
        {
            Vector2 pt = trackBisectorPt.isOn ? BisectingLines.CrotchPoint(spiral) : BisectorPoint.GetScaledBisectorPoint(spiral, app.useNewImagToggle.isOn);

            Vector3 start = Vector2.zero;
            Vector3 end = spiral.zeta.ToVector();

            var temp = _bisectorCamUp ? end - start : start - end;

            var angle = Mathf.Atan2(temp.y, temp.x) * Mathf.Rad2Deg;
            var rot =  Quaternion.AngleAxis(angle, Vector3.forward);

            Transform newRot = transform;
            newRot.rotation = rot;

            // keep us upright
            if(Vector3.Dot(cam.transform.up, newRot.up) < 0)
            {
                _bisectorCamUp = !_bisectorCamUp;
                temp = _bisectorCamUp ? end - start : start - end;

                angle = Mathf.Atan2(temp.y, temp.x) * Mathf.Rad2Deg;
                rot =  Quaternion.AngleAxis(angle, Vector3.forward);
            }

            setCamera(cam, pt, rot);

            trackingIndex = spiral.middleIndex;
        }

        if (trackSpiralCenter.isOn)
        {
            var rot = Quaternion.AngleAxis(0, Vector3.forward);

            

            var pt = spiral.spirals[(int)spiralNumber.value];
            setCamera(cam, pt, rot);

            trackingIndex = (int)spiralNumber.value;
        }

        if (trackSpiralLink.isOn)
        {
            spiralNumber.minValue = 0;
            spiralNumber.maxValue = spiral.middleIndex + 2;

            // var mi = Zeta.ImagToIndex(app.Imag);
            var mi = app.indexIntPart.value + app.indexRealPart.value;

            var i = (int)spiral.SpiralMiddleIndex(mi, spiralNumber.value);

            trackLink(cam, i, spiral);
        }

        if (trackJointIMinusN.isOn)
        {
            var mi = spiral.index;

            spiralNumber.minValue = -2;
            spiralNumber.maxValue = (int)mi; // cannot be greater than middle index or you get a negative joint value below

            // 2/11/2023 "changes to code" email
            var joint = Math.Floor(mi) - spiralNumber.value;
            var i = (int)spiral.SpiralMiddleIndex(mi, joint);
            trackLink(cam, i, spiral, false);
        }
    }

    private void TrackTdrop(Camera cam, Zeta.Spiral spiral)
    {
        if(trackTdropG.isOn)
        {
            setCamera(cam, middleLinkTeardrop.TdropDotG, RotationOfLink(spiral, spiral.middleIndex));
        }

        if(trackTdropR.isOn)
        {
            setCamera(cam, middleLinkTeardrop.TdropDotR, RotationOfLink(spiral, spiral.middleIndex));
        }
        trackingIndex = spiral.middleIndex;
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
        OFFSET += _cameraTackingOffset;
        
        // scale the offset by the camera zoom
        OFFSET *= new Vector3(cam.orthographicSize, cam.orthographicSize * aspect);

        // apply mouse offset for zoom
        OFFSET += _cameraZoomOffset;

        // rotate offset to the desired camera pos
        var canvasOffset = rot * OFFSET;
        
        // Make Camera z opposite when tracking is enabled.
        pos = new Vector3(pos.x + canvasOffset.x, pos.y + canvasOffset.y, cam.transform.position.z);

        cam.transform.rotation = rot;
        cam.transform.position = transform.position + pos;

        // cam.transform.Translate(_cameraZoomOffset, Space.World);
    }

    private void ResetCameraOffsets()
    {
        _cameraTackingOffset = Vector2.zero;
        _cameraZoomOffset = Vector2.zero;
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