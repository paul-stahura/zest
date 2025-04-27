using UnityEngine;
using TMPro;
using System;
using UnityEngine.UI;
using Shapes;

public class CameraPositionTracking : ImmediateModeShapeDrawer
{
    private enum TrackingTarget
    {
        Origin = 0,
        Zeta = 1,
        Symmetry = 2,
        YinYang = 3,
        Spiral = 4
    }
    [SerializeField] private TMP_Dropdown _camTrackingDropdown;
    [SerializeField] public static Action OnCameraTrackingChanged;
    [SerializeField] private SpiralCalculator _spiralCalculator;

    private Vector2 _cameraUp = Vector2.up;

    [Header("Zeta Target")]
    [SerializeField] private TMP_Dropdown _zetaTargetDropdown;
    private enum ZetaTarget
    {
        Auto,
        Ems,
        Zem,
        ZetaPS,
        Zps,
        Zrs,
        Eta
    }

    [Header("Symmetry Target")]
    [SerializeField] private TMP_Dropdown _symmetryTargetDropdown;
    private enum SymmetryTarget
    {
        Auto = 0,
        BisectorLink = 1,
        SymmetryPoint = 2,
        BpOneHalf = 3,
        ForwardBisector = 4,
    }

    [Header("YinYang Target")]
    [SerializeField] private TMP_Dropdown _yinYangTargetDropdown;
    private enum YinYangTarget
    {
        BisectorLink = 0,
        Yin = 1,
        Yang = 2,
    }

    [Header("Spiral Target")]
    [SerializeField] private TMP_Dropdown _spiralLinkTrackingOption;
    [SerializeField] private Slider _spiralTargetSlider;
    [SerializeField] private TMP_Text _spiralHandle;
    [SerializeField] private Text _spiralMaxText;

    [Header("Cam Control")]
    [SerializeField] public Camera _cam;

    [Header("Tracking Settings")]
    [SerializeField] private Button _refocusButton;
    private Vector2 _cameraTrackingOffset = Vector2.zero;
    private Vector2 _lastMousePosition;
    private bool _drag;

    [Header("Zoom Settings")]
    public float _scrollSensitivity = 0.25f;
    public float minZoom = 0.0001f;
    public float maxZoom = 10f;
    [SerializeField] private float _zoomLevel = 4f;

    void Awake()
    {
        _camTrackingDropdown = GameObject.Find("Camera Tracking Options").GetComponent<TMP_Dropdown>();
        _camTrackingDropdown.onValueChanged.AddListener((int v) => OnTargetChanged(v));

        _spiralCalculator = GameObject.Find("Spiral Calculator").GetComponent<SpiralCalculator>();

        _refocusButton = GameObject.Find("CamRefocusButton").GetComponent<Button>();
        _refocusButton.onClick.AddListener(() =>
        {
            ResetCamOffset();
        });
        
        _cam = Camera.main;
    }

    void Update()
    {
        HandlePanning();
        HandleZooming();
    }

    void LateUpdate()
    {
        UpdateProjectionMatrix();
    }

    public float GetZoomLevel()
    {
        return _zoomLevel;
    }

    private void OnTargetChanged(int v)
    {
        ResetCamOffset();

        switch((TrackingTarget)v)
        {
            case TrackingTarget.Zeta:
                if(_zetaTargetDropdown != null)
                    _zetaTargetDropdown.value = (int)ZetaTarget.Auto;
                break;

            case TrackingTarget.Symmetry:
                if(_symmetryTargetDropdown != null)
                    _symmetryTargetDropdown.value = (int)SymmetryTarget.Auto;
                break;
            
            case TrackingTarget.YinYang:
                if(_yinYangTargetDropdown != null)
                    _yinYangTargetDropdown.value = (int)YinYangTarget.BisectorLink;
                break;

            case TrackingTarget.Spiral:
                if(_spiralLinkTrackingOption != null)
                    _spiralLinkTrackingOption.value = 0;
                break;
        }
    }

    private void ResetCamOffset()
    {
        _cameraTrackingOffset = Vector2.zero;
        _cameraUp = Vector2.up;

        OnCameraTrackingChanged?.Invoke();
    }

    private Vector2 GetTrackingTarget()
    {
        Vector2 target = new Vector2(0, 0);
        switch ((TrackingTarget)_camTrackingDropdown.value)
        {
            case TrackingTarget.Origin:
                target = new Vector2(0, 0);
                break;
            case TrackingTarget.Zeta:
                target = GetZetaTarget();
                break;
            case TrackingTarget.Symmetry:
                target = GetSymmetryTarget();
                break;
            case TrackingTarget.YinYang:
                target = GetYinYangTarget();
                break;
            case TrackingTarget.Spiral:
                target = GetSpiralTarget();
                break;
        }

        return target;
    }

    #region Zeta Target
    private Vector2 GetZetaTarget()
    {
        if(_zetaTargetDropdown == null)
        {
            _zetaTargetDropdown = GameObject.Find("ZetaTargetDropdown").GetComponent<TMP_Dropdown>();
            _zetaTargetDropdown.onValueChanged.AddListener((v) => ResetCamOffset());
        }

        ZetaTarget zTarget = (ZetaTarget)_zetaTargetDropdown.value;
        if(zTarget == ZetaTarget.Auto)
        {
            if(SpiralCalculator.UpdateEms != null && SpiralCalculator.UpdateEms.GetInvocationList().Length > 0)
            {
                zTarget = ZetaTarget.Ems;
            }
            else if(SpiralCalculator.UpdateZem != null && SpiralCalculator.UpdateZem.GetInvocationList().Length > 0)
            {
                zTarget = ZetaTarget.Zem;
            }
            else if(SpiralCalculator.UpdateZetaPS != null && SpiralCalculator.UpdateZetaPS.GetInvocationList().Length > 0)
            {
                zTarget = ZetaTarget.ZetaPS;
            }
            else if(SpiralCalculator.UpdateZps != null && SpiralCalculator.UpdateZps.GetInvocationList().Length > 0)
            {
                zTarget = ZetaTarget.Zps;
            }
            else if(SpiralCalculator.UpdateZrs != null && SpiralCalculator.UpdateZrs.GetInvocationList().Length > 0)
            {
                zTarget = ZetaTarget.Zrs;
            }
            else if(SpiralCalculator.UpdateEta != null && SpiralCalculator.UpdateEta.GetInvocationList().Length > 0)
            {
                zTarget = ZetaTarget.Eta;
            }
        }
        
        switch(zTarget)
        {
            case ZetaTarget.Ems:
                return _spiralCalculator.GetEms().zeta.ToVector2();
            case ZetaTarget.Zem:
                return _spiralCalculator.GetZem();
            case ZetaTarget.ZetaPS:
                return _spiralCalculator.GetZetaPS();
            case ZetaTarget.Zps:
                return _spiralCalculator.GetZps();
            case ZetaTarget.Zrs:
                return _spiralCalculator.GetZrs().zeta.ToVector2();
            case ZetaTarget.Eta:
                return _spiralCalculator.GetEta().zeta.ToVector2();
            default:
                return _spiralCalculator.GetZrs().zeta.ToVector2();
        }
    }
    #endregion

    #region Symmetry Target
    private Vector2 GetSymmetryTarget()
    {
        if(_symmetryTargetDropdown == null)
        {
            _symmetryTargetDropdown = GameObject.Find("SymmetryTargetDropdown").GetComponent<TMP_Dropdown>();
            _symmetryTargetDropdown.onValueChanged.AddListener((v) => ResetCamOffset());
        }

        SymmetryTarget sTarget = (SymmetryTarget)_symmetryTargetDropdown.value;
        if(sTarget == SymmetryTarget.Auto)
        {
            if(SpiralCalculator.UpdateEms != null && SpiralCalculator.UpdateEms.GetInvocationList().Length > 0)
            {
                sTarget = SymmetryTarget.BisectorLink;
            }
            else if(SpiralCalculator.UpdateZrs != null && SpiralCalculator.UpdateZrs.GetInvocationList().Length > 0)
            {
                sTarget = SymmetryTarget.BisectorLink;
            }
            else if(SpiralCalculator.UpdateZps != null && SpiralCalculator.UpdateZps.GetInvocationList().Length > 0)
            {
                sTarget = SymmetryTarget.BpOneHalf;
            }
            else if(SpiralCalculator.UpdateZetaPS != null && SpiralCalculator.UpdateZetaPS.GetInvocationList().Length > 0)
            {
                sTarget = SymmetryTarget.ForwardBisector;
            }
        }

        Zeta.Spiral spiral = Mathf.Approximately((float)_spiralCalculator.GetReal(), 0.5f) ? _spiralCalculator.GetZrs() : _spiralCalculator.GetEms();
        Vector2 zeta = spiral.zeta.ToVector2();
        Vector2 midLink = spiral.joints[spiral.middleIndex + 1] - spiral.joints[spiral.middleIndex];
        Vector2 target = Vector2.zero;
        Vector2 newUP = Vector2.up;
        switch(sTarget)
        {
            case SymmetryTarget.BisectorLink:
                target = spiral.joints[spiral.middleIndex];
                target += midLink / 2f;
                newUP = new Vector2(-midLink.y, midLink.x).normalized;
                break;

            case SymmetryTarget.SymmetryPoint:
                target = _spiralCalculator.GetSymmetryPoint().ToVector2();
                newUP = new Vector2(-zeta.y, zeta.x).normalized;
                break;   

            case SymmetryTarget.BpOneHalf:
                zeta = _spiralCalculator.GetZps();
                newUP = new Vector2(-zeta.y, zeta.x).normalized;
                target = _spiralCalculator.GetBpOneHalf().ToVector2();
                break;
            
            case SymmetryTarget.ForwardBisector:
                newUP = new Vector2(-midLink.y, midLink.x).normalized;
                target = _spiralCalculator.GetForwardBisector().ToVector2();
                break;

            default:
                target = spiral.joints[spiral.middleIndex];
                target += midLink / 2f;
                newUP = new Vector2(-midLink.y, midLink.x).normalized;
                break;
        }

        // keep us upright
        if(Vector2.Dot(_cameraUp, newUP) < 0)
        {
            newUP *= -1;
        }
        _cameraUp = newUP;
        return target;
    }
    #endregion

    #region YinYang Target
    private Vector2 GetYinYangTarget()
    {
        if(_yinYangTargetDropdown == null)
        {
            _yinYangTargetDropdown = GameObject.Find("YinYangTargetDropdown").GetComponent<TMP_Dropdown>();
            _yinYangTargetDropdown.onValueChanged.AddListener((v) => ResetCamOffset());
        }

        bool isEms = SpiralCalculator.UpdateEms != null && SpiralCalculator.UpdateEms.GetInvocationList().Length > 0;
        YinYangTarget yyTarget = (YinYangTarget)_yinYangTargetDropdown.value;
        Vector2 pt = Vector2.zero;

        Zeta.Spiral spiral = null;
        if(isEms) spiral = _spiralCalculator.GetEms();
        else spiral = _spiralCalculator.GetZrs();
        Vector2 midLink = spiral.joints[spiral.middleIndex + 1] - spiral.joints[spiral.middleIndex];
        pt = spiral.joints[spiral.middleIndex] + midLink / 2f;
        _cameraUp = new Vector2(-midLink.y, midLink.x).normalized;

        switch(yyTarget)
        {
            case YinYangTarget.Yin:
                var rotYin = (Vector2)(Quaternion.Euler(0, 0, Vector2.SignedAngle(Vector2.up, _cameraUp)) * _spiralCalculator.GetYin());
                pt += rotYin * midLink.magnitude;
                break;

            case YinYangTarget.Yang:
                var rotYang = (Vector2)(Quaternion.Euler(0, 0, Vector2.SignedAngle(Vector2.up, _cameraUp)) * _spiralCalculator.GetYang());
                pt += rotYang * midLink.magnitude;
                break;
        }

        return pt;
    }
    #endregion

    #region Spiral Target
    private Vector2 GetSpiralTarget()
    {
        if(_spiralLinkTrackingOption == null)
        {
            _spiralLinkTrackingOption = GameObject.Find("LinkTrackingOption").GetComponent<TMP_Dropdown>();
            _spiralLinkTrackingOption.onValueChanged.AddListener((v) => ResetCamOffset());

            _spiralTargetSlider = GameObject.Find("SprialTrackingRangeSlider").GetComponent<Slider>();
            _spiralHandle = GameObject.Find("SpiralRangeHandleText").GetComponent<TMP_Text>();
            _spiralMaxText = GameObject.Find("SpiralTrackingRangeEnd").GetComponent<Text>();

            _spiralTargetSlider.onValueChanged.AddListener((float v) => _spiralHandle.text = ((int)v).ToString());
            _spiralTargetSlider.onValueChanged.AddListener((float v) => ResetCamOffset());
        }
        
        ZetaTarget zTarget = ZetaTarget.Ems;
        if(SpiralCalculator.UpdateEms != null && SpiralCalculator.UpdateEms.GetInvocationList().Length > 0)
        {
            zTarget = ZetaTarget.Ems;
        }
        else if(SpiralCalculator.UpdateZrs != null && SpiralCalculator.UpdateZrs.GetInvocationList().Length > 0)
        {
            zTarget = ZetaTarget.Zrs;
        }
        else if(SpiralCalculator.UpdateEta != null && SpiralCalculator.UpdateEta.GetInvocationList().Length > 0)
        {
            zTarget = ZetaTarget.Eta;
        }

        Zeta.Spiral spiral = null;
        switch(zTarget)
        {
            case ZetaTarget.Ems:
                spiral = _spiralCalculator.GetEms();
                break;
            case ZetaTarget.Zrs:
                spiral = _spiralCalculator.GetZrs();
                break;
            case ZetaTarget.Eta:
                spiral = _spiralCalculator.GetEta();
                break;
        }

        _spiralTargetSlider.maxValue = spiral.spirals.Length - 1;
        _spiralMaxText.text = _spiralTargetSlider.maxValue.ToString();
        if(_spiralLinkTrackingOption.value == 0)
        {
            _cameraUp = Vector2.up;
            return spiral.spirals[(int)_spiralTargetSlider.value];
        }
        else
        {
            int index = (int)Math.Floor(spiral.SpiralMiddleIndex(spiral.index, (int)_spiralTargetSlider.value));
            Vector2 link = spiral.joints[index + 1] - spiral.joints[index];
            Vector2 pt = spiral.joints[index] + link / 2f;
            _cameraUp = new Vector2(-link.y, link.x).normalized;
            return pt;
        }
    }
    #endregion

    #region CameraControl
    private void HandlePanning()
    {
        if (Input.GetMouseButtonDown(0))
        {
            if(!IsPointerOverUIElement())
            {
                _drag = true;
                _lastMousePosition = Input.mousePosition;
            }
            else
            {
                _drag = false;
            }
        }

        if (_drag && Input.GetMouseButton(0))
        {
            Vector2 delta = (Vector2)Input.mousePosition - _lastMousePosition;
            _cameraTrackingOffset -= new Vector2(delta.x * _zoomLevel * 2 / Screen.height, delta.y * _zoomLevel * 2 / Screen.height);
            _lastMousePosition = Input.mousePosition;
        }
    }

    private bool IsPointerOverUIElement()
    {
        return UnityEngine.EventSystems.EventSystem.current.IsPointerOverGameObject();
    }

    private void HandleZooming()
    {
        if(IsPointerOverUIElement()) return;

        float sensitivity = _scrollSensitivity;
        #if UNITY_EDITOR_WIN
        // Scrolling on Windows seems way less sensitive than the Mac trackpad
        sensitivity *= -5;
        #endif
        float scroll = Input.GetAxis("Mouse ScrollWheel") * sensitivity;

        float zoomFactor = 1f - scroll;
        float dynamicZoomFactor = Mathf.Pow(Mathf.Abs(zoomFactor), 1.5f) * (Mathf.Abs(zoomFactor) > 0 ? 1 : -1); // Adjust the exponent to control the curve steepness
        _zoomLevel = Mathf.Clamp(_zoomLevel * dynamicZoomFactor, minZoom, maxZoom);

        // zoom to mouse position
        if(!Input.GetKey(KeyCode.LeftShift) && !Mathf.Approximately(_zoomLevel, minZoom) && !Mathf.Approximately(_zoomLevel, maxZoom))
        {
            Vector2 mousePosition = Input.mousePosition;
            Vector2 viewportPoint = _cam.ScreenToViewportPoint(mousePosition);
            Vector2 zoomCenter = new Vector2(viewportPoint.x - 0.5f, viewportPoint.y - 0.5f) * 2f;

            _cameraTrackingOffset -= zoomCenter * (1f - 1f / dynamicZoomFactor) * _zoomLevel;
        }
    }

    private void UpdateProjectionMatrix()
    {
        // Create a new orthographic projection matrix with fine-tuned control
        float orthographicSize = _zoomLevel;
        float aspectRatio = _cam.aspect;
        float left = -orthographicSize * aspectRatio;
        float right = orthographicSize * aspectRatio;
        float top = orthographicSize;
        float bottom = -orthographicSize;

        Matrix4x4 projectionMatrix = Matrix4x4.Ortho(left, right, bottom, top, _cam.nearClipPlane, _cam.farClipPlane);

        // Apply the new projection matrix to the camera
        _cam.projectionMatrix = projectionMatrix;


        var pos = GetTrackingTarget();
        var rot = Quaternion.LookRotation(Vector3.forward, _cameraUp);
        pos += (Vector2)(rot * _cameraTrackingOffset);

        // Apply the offset and rotation to the camera's transform
        _cam.transform.SetPositionAndRotation(new Vector3(pos.x, pos.y, _cam.transform.position.z), rot);
    }
    #endregion
}
