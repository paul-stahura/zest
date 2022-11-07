using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;

/// <summary>
/// Using Unity's build-in onValueChanged for the slider creates an infinite
/// loop of updating the imaginary number. This separates the event so that
/// the value of the slider can be set without the recursion
/// </summary>
[RequireComponent(typeof(Slider))]
[RequireComponent(typeof(MouseEventCapture))]
public class SliderChangeMgr : MonoBehaviour
{
    Slider slider;
    
    [SerializeField] public FloatEvent onValueChanged = new FloatEvent();

    void Start()
    {
        slider = GetComponent<Slider>();
        slider.onValueChanged.AddListener(value =>
        {

        });

        var m = GetComponent<MouseEventCapture>();
        m.OnMouseUp += handleMouseEvent;
        m.OnMouseDrag += handleMouseEvent;
    }



    void handleMouseEvent(PointerEventData data) 
    {
        onValueChanged?.Invoke(slider.value);
    }
}
