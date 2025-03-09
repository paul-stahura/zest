using UnityEngine;
using Lean.Touch;
using TMPro;
using System.Collections;
using System;

public class CameraPositionTracking : MonoBehaviour
{
    [SerializeField] private TMP_Dropdown _camTrackingDropdown;
    [Header("Zeta Target Options")]
    [SerializeField] private TMP_Dropdown _ZetaTargetDropdown;
    private enum ZetaTarget
    {
        Auto = 0,
        Ems = 1,
        Zps = 2,
        Zrs = 3,
        Eta = 4
    }
    private ZetaTarget _zetaTarget = ZetaTarget.Auto;
    [SerializeField] private SpiralCalculator _spiralCalculator;

    [SerializeField] public Camera _cam;

    [Header("Tracking Settings")]
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
        _camTrackingDropdown.onValueChanged.AddListener((int value) => ResetOffset());

        _spiralCalculator = GameObject.Find("Spiral Calculator").GetComponent<SpiralCalculator>();
        
        _cam = Camera.main;
    }

    void Update()
    {
        HandlePanning();
        HandleZooming();
        UpdateProjectionMatrix();
    }

    private void ResetOffset()
    {
        _cameraTrackingOffset = Vector2.zero;
    }

    private Vector2 GetTrackingTarget()
    {
        Vector2 target = new Vector2(0, 0);
        switch (_camTrackingDropdown.value)
        {
            case 0:
                target = new Vector2(0, 0);
                break;
            case 1:
                target = GetZetaTarget();
                break;
        }

        return target;
    }

    private Vector2 GetZetaTarget()
    {
        if(_ZetaTargetDropdown == null)
        {
            _ZetaTargetDropdown = GameObject.Find("ZetaTargetDropdown").GetComponent<TMP_Dropdown>();
            _ZetaTargetDropdown.onValueChanged.AddListener((int value) => _zetaTarget = (ZetaTarget)value);
        }

        switch(_zetaTarget)
        {
            case ZetaTarget.Auto:
                return GetAutoZetaTarget();
            case ZetaTarget.Ems:
                return _spiralCalculator.GetEms().zeta.ToVector2();
            case ZetaTarget.Zps:
                return _spiralCalculator.GetZps().ToVector2();
            case ZetaTarget.Zrs:
                return _spiralCalculator.GetZrs().zeta.ToVector2();
            case ZetaTarget.Eta:
                return _spiralCalculator.GetEta().zeta.ToVector2();
            default:
                return _spiralCalculator.GetZrs().zeta.ToVector2();
        }
    }

    private Vector2 GetAutoZetaTarget()
    {
        Vector2 target = new Vector2(0, 0);
        if(SpiralCalculator.UpdateEms != null && SpiralCalculator.UpdateEms.GetInvocationList().Length > 0)
        {
            target = _spiralCalculator.GetEms().zeta.ToVector2();
        }
        else if(SpiralCalculator.UpdateZps != null && SpiralCalculator.UpdateZps.GetInvocationList().Length > 0)
        {
            target = _spiralCalculator.GetZps().ToVector2();
        }
        else if(SpiralCalculator.UpdateZrs != null && SpiralCalculator.UpdateZrs.GetInvocationList().Length > 0)
        {
            target = _spiralCalculator.GetZrs().zeta.ToVector2();
        }
        else if(SpiralCalculator.UpdateEta != null && SpiralCalculator.UpdateEta.GetInvocationList().Length > 0)
        {
            target = _spiralCalculator.GetEta().zeta.ToVector2();
        }

        return target;
    }

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
        if (Mathf.Abs(scroll) > 0.01f) // Ensure small scrolls are ignored
        {
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

        var pos = GetTrackingTarget() + _cameraTrackingOffset;
        // Apply the offset to the camera's position
        _cam.transform.position = new Vector3(pos.x, pos.y, _cam.transform.position.z);
    }
}
