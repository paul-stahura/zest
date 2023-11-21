using System.Collections;
using System.Collections.Generic;
using Lean.Touch;
using UnityEngine;

[RequireComponent(typeof(Camera))]
public class LeanSelectableCamera : LeanSelectable
{
    Camera cam;

    void Awake()
    {
        cam = GetComponent<Camera>();
    }

    // Update is called once per frame
    void Update()
    {
        if(Input.GetMouseButtonDown(0) || Input.GetMouseButtonDown(1)) {
            // check if mouse is within view
            Vector2 normalizedMousePos = new Vector2(Input.mousePosition.x / Screen.width, Input.mousePosition.y / Screen.height);
            
            IsSelected = cam.rect.Contains(normalizedMousePos) ? true : false;
        }
    }
}
