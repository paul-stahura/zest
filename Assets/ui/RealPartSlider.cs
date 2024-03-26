using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;

[RequireComponent(typeof(Slider))]
[RequireComponent(typeof(MouseEventCapture))]
public class RealPartSlider : MonoBehaviour
{
    public float tolerance = 0.02f;
    public bool snap;
    Slider _slider;

#pragma warning disable 649
    [SerializeField] Text _display;
#pragma warning restore 649

    public float Value { get; private set; }

    [SerializeField] public FloatEvent onValueChanged = new FloatEvent();

    void OnApplicationQuit()
    {
        var name = gameObject.name;
        // PlayerPrefs.SetFloat(name + "-Value", Value);
        // PlayerPrefs.Save();
    }
    void Start()
    {
        _slider = GetComponent<Slider>();

        _slider.onValueChanged.AddListener(value =>
        {
            Value = value;
            onValueChanged?.Invoke(Value);
                

            if (_display != null)
                _display.text = Value.ToString("0.000000");
        });
        // _slider.value = PlayerPrefs.GetFloat(gameObject.name + "-Value", _slider.value);

        var m = GetComponent<MouseEventCapture>();
        m.OnMouseUp += handleMouseUp;
    }

    void handleMouseUp(PointerEventData data)
    {
        if (snap && Mathf.Abs(Value - .5f) < tolerance)
        {
            _slider.value = .5f;
        }
    }

    float easeInCirc(float start, float end, float val)
    {
        end -= start;
        return -end * (Mathf.Sqrt(1 - val * val) - 1) + start;
    }
}
