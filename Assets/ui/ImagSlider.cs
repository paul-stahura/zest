using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;

[RequireComponent(typeof(Slider))]
[RequireComponent(typeof(MouseEventCapture))]
public class ImagSlider : MonoBehaviour
{
    Slider _slider;

#pragma warning disable 649
    [SerializeField] Text _display;
#pragma warning restore 649

    public float Max;
    public float Value { get; private set; }

    [SerializeField] public FloatEvent onValueChanged = new FloatEvent();

    void Start()
    {
        _slider = GetComponent<Slider>();
        _slider.onValueChanged.AddListener(value =>
        {
            var max = Max;
            if (value < 0)
                max = -Max;

            Value = easeInCirc(0, max, value);
            onValueChanged?.Invoke(Value);

            if (_display != null)
                _display.text = Value.ToString("0.000");
        });

        var m = GetComponent<MouseEventCapture>();
        m.OnMouseUp += handleMouseUp;
    }

    void handleMouseUp(PointerEventData data)
    {
        if (Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift))
        {
            return;
        }

        _slider.value = 0;
    }

    float easeInCirc(float start, float end, float val)
    {
        end -= start;
        return -end * (Mathf.Sqrt(1 - val * val) - 1) + start;
    }
}