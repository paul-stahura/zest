using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class ColorInverter : MonoBehaviour
{
    public Camera cam;
    public ZetaSpiral zSpiral;
    public bool invert = false;

    void OnValidate()
    {
        // invert button
        if(invert)
        {
            OnClick();
            invert = false;
        }
    }
    
    public void OnClick()
    {
        cam.backgroundColor = InvertColor(cam.backgroundColor);
        zSpiral.spiralColor = InvertColor(zSpiral.spiralColor);
        invert = true;
    }

    // takes a color and returns the inverse
    private Color InvertColor(Color originalColor)
    {
        return new Color(1.0f - originalColor.r, 1.0f - originalColor.g, 1.0f - originalColor.b, originalColor.a);
    }
}
