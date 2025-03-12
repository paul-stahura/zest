using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

[RequireComponent(typeof(ScrollRect))]
public class UIScroll : MonoBehaviour
{
    public static float sensitivity = 10f;
    public static float GetScrollSpeed()
    {
        var sense = sensitivity;
        #if UNITY_EDITOR_WIN
        // Scrolling on Windows seems way less sensitive than the Mac trackpad
        sense *= -5;
        #endif
        return sensitivity;
    }

    void Awake()
    {
        this.GetComponent<ScrollRect>().scrollSensitivity = GetScrollSpeed();
    }
}
