using System;
using UnityEngine;
using UnityEngine.UI;

public class FineTuneSlider : MonoBehaviour
{
    public Slider intPart;
    public Slider slider;
    public Button zoomInButton;
    public Button zoomOutButton;
    public Text display;

    public float factor = 1f;

    const float MIN_VALUE = 0;
    const float MAX_VALUE = .999999f;
    const float MIN_FACTOR = .00001f;

    void Start()
    {
        slider.minValue = MIN_VALUE;
        slider.maxValue = MAX_VALUE;
        zoomInButton.onClick.AddListener(decreaseRange);
        zoomOutButton.onClick.AddListener(increaseRange);

        updateDisplay();
    }

    public void reset()
    {
        factor = 1;
        setRange(0, 1);
        zoomInButton.interactable = true;
        zoomOutButton.interactable = false;
        updateDisplay();
    }

    void updateDisplay()
    {
        display.text = slider.minValue.ToString("0.#######") + " to " + slider.maxValue.ToString(".#######");
        // + ": " + slider.minValue.ToString(".#######") + " - " + slider.maxValue.ToString(".#######");
    }

    void decreaseRange()
    {
        // the slider's current value is the new middle.
        // decrease the range by a factor of .1
        factor *= .1f;
        factor = Mathf.Max(factor, MIN_FACTOR);
        factor = Mathf.Clamp(factor, 0, 1);
        var value = slider.value;
        var min = (float)Math.Round(Mathf.Max(MIN_VALUE, slider.value - factor), 6);
        var max = (float)Math.Round(MathF.Min(MAX_VALUE, slider.value + factor), 6);

        if (setRange(min, max) && factor - MIN_FACTOR > MIN_FACTOR)
        {
            zoomOutButton.interactable = true;
        }
        else
        {
            zoomInButton.interactable = false;
        }

        updateDisplay();
    }

    void increaseRange()
    {
        // the slider's current value is the new middle.
        // decrease the range by a factor of .1
        factor *= 10f;
        factor = Mathf.Clamp(factor, 0, 1);
        var value = slider.value;
        var min = (float)Math.Round(Mathf.Max(MIN_VALUE, slider.value - factor), 6);
        var max = (float)Math.Round(MathF.Min(MAX_VALUE, slider.value + factor), 6);

        setRange(min, max);

        if (min == MIN_VALUE && max == MAX_VALUE)
        {
            zoomOutButton.interactable = false;
        }
        else
        {
            zoomInButton.interactable = true;
        }

        updateDisplay();
    }

    bool setRange(float min, float max)
    {
        if (min != max)
        {
            slider.minValue = min;
            slider.maxValue = max;
            return true;
        }

        return false;
    }

    void Update()
    {
        if (Input.GetKeyDown(KeyCode.LeftShift))
        {
            decreaseRange();
            decreaseRange();
        }

        if (Input.GetKeyUp(KeyCode.LeftShift))
        {
            increaseRange();
            increaseRange();
        }    
    }
}