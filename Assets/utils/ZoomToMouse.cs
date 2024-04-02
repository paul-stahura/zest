using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using System;

/// <summary>
/// Attached to Main Camera (LatticeView > Camera)
/// </summary>
public class ZoomToMouse : MonoBehaviour
{
    [SerializeField] private CameraTracking _camTracking;

    const float MAXIMUM_ZOOM = 0.00005f;
    const float DEFAULT_ZOOM = 690f;
    const float MINIMUM_ZOOM = 2400f;

    // warning CS0649: Field '___' is never assigned to, and will always have its default value null
#pragma warning disable 649
    [SerializeField] float _sensitivity = 10;
    [SerializeField] Camera _camera;
    [SerializeField] bool _allowZoom;

    // warning CS0649: Field '___' is never assigned to, and will always have its default value null
#pragma warning restore 649

    void Awake()
    {
        _camTracking = GameObject.Find("ZetaSpiral").GetComponent<CameraTracking>();
    }

    void Start()
    {
        _camera = GetComponent<Camera>();
    }

    // The camera's orthographicSize is the number of world space units in the top 
    // half of the viewport. If it's 0.5, then a 1 unit cube will exactly fill the 
    // viewport (vertically).
    //
    // So to zoom in on your target region, center your camera on it 
    // (by setting (x,y) to the target's center) and set orthographicSize to 
    // half the region's height.

    void Update()
    {
        // If the mouse is outside the camera viewport rect, bail out
        Vector2 normalizedMousePos = new Vector2(Input.mousePosition.x / Screen.width, Input.mousePosition.y / Screen.height);
        if (!_camera.rect.Contains(normalizedMousePos))
            return;

        var sensitivity = _sensitivity;

#if UNITY_EDITOR_WIN
        // Scrolling on Windows seems way less sensitive than the Mac trackpad
        sensitivity *= -5;
#endif

        var zoom = Input.GetAxis("Mouse ScrollWheel") * sensitivity;
        if (_allowZoom)
        {
            var focused = EventSystem.current.currentSelectedGameObject;
            if (focused != null)
            {
                // var dd = focused.GetComponentInChildren<Dropdown>();
                // var ms = focused.GetComponentInChildren<Occult.UI.MultiSelectDropdown>();
                // Debug.LogFormat("Current focus: {0}", focused.name);
                if (
                    focused.name.StartsWith("Item ") ||
                    focused.name == "Scrollbar" ||
                    focused.name == "Viewport")
                {
                    // We have a dropdown item focused.  Don't zoom
                    return;
                }
            }

            // if (zoom != 0 && MouseScrolled != null)
            //     MouseScrolled(zoom);
            Zoom(zoom);
        }
    }

    public void Zoom(float amount)
    {
        var screenCenter = new Vector2(Screen.width / 2f, Screen.height / 2f);
        var mouse = Input.mousePosition;

        // So I want too keep the mouse offset from center
        var worldCenter = _camera.ScreenToWorldPoint(screenCenter);
        var worldMouse = _camera.ScreenToWorldPoint(mouse);

        // As we zoom in or out, move the camera enough to keep the
        // world mouse the same 

        if (_camera.orthographicSize < 10)
            amount /= 10f;

        if (_camera.orthographicSize < 1f)
            amount /= 10f;

        if (_camera.orthographicSize < .1f)
            amount /= 10f;

        if (_camera.orthographicSize < .01f)
            amount /= 10f;

        if (_camera.orthographicSize < .001f)
            amount /= 10f;

        if (_camera.orthographicSize < .0001f)
            amount /= 10f;

        _camera.orthographicSize -= amount;
        _camera.orthographicSize = Mathf.Clamp(_camera.orthographicSize, MAXIMUM_ZOOM, MINIMUM_ZOOM);

        var newWorldMouse = _camera.ScreenToWorldPoint(mouse);

        var diff = worldMouse - newWorldMouse;

        if(diff.magnitude > 0)
        {
            if(_camTracking != null)
            {
                Debug.Log(diff);
                _camTracking.AddCameraZoomOffset(diff);
            }
            else
            {
                transform.Translate(diff, Space.World);
            }
        }
    }

    public float ZoomLevel
    {
        get
        {
            return Math.Max(
                Math.Min(1f, 1f - _camera.orthographicSize / DEFAULT_ZOOM),
                0f);
        }
    }
}
