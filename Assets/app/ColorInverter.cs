using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;

public class ColorInverter : MonoBehaviour
{
    public Camera cam;
    public ZetaSpiral zSpiral;
    public bool invertButton = false;

    private bool invertActive = false;
    private List<Text> texts;

    void OnValidate()
    {
        // invert button
        if(invertButton)
        {
            OnClick();
            invertButton = false;
        }
    }

    void Start()
    {
        // ASSUMPTION: we only want to invert text objects with a white value
        texts = new List<Text>();
        foreach(Text txt in FindObjectsOfType<Text>())
        {
            
            if(txt.color.grayscale > 0.5f)
            {
                texts.Add(txt);
            }
        }
    }
    
    public void OnClick()
    {
        cam.backgroundColor = InvertColor(cam.backgroundColor);
        zSpiral.spiralColor = InvertColor(zSpiral.spiralColor);
        InvertText();
        invertActive = !invertActive;
    }

    // takes a color and returns the inverse
    private Color InvertColor(Color originalColor)
    {
        return new Color(1.0f - originalColor.r, 1.0f - originalColor.g, 1.0f - originalColor.b, originalColor.a);
    }

    private void InvertText()
    {
        foreach(Text txt in texts)
        {
            txt.color = InvertColor(txt.color);
        }
    }
}
