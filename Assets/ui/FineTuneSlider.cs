using System;
using UnityEngine;
using UnityEngine.UI;

public class FineTuneSlider : MonoBehaviour
{
    public Slider slider;
    public Button zoomInButton;
    public Button zoomOutButton;
    public Button resetButton;
    public Text rangeDisplay;
    public Text sliderValueDisplay;

    public float factor = 1f;
    
    // will only reset if value is positive
    public float resetValue = -1f;

    const float MIN_VALUE = 0;
    float MAX_VALUE = 1.0f;
    const float MIN_FACTOR = 0.0f;

    void OnApplicationQuit()
    {
        var name = gameObject.name;
        // PlayerPrefs.SetFloat(name + "-Factor", factor);
        // PlayerPrefs.SetString(name + "-RangeDisplay", rangeDisplay.text);
        // PlayerPrefs.SetString(name + "-SliderValueDisplay", sliderValueDisplay.text);
        // PlayerPrefs.SetFloat(name + "-MinValue", slider.minValue);
        // PlayerPrefs.SetFloat(name + "-MaxValue", slider.maxValue);
        // PlayerPrefs.SetFloat(name + "-Slider", slider.value);
        // PlayerPrefs.Save();
    }

    void Start()
    {
        var name = gameObject.name;
        // factor = PlayerPrefs.GetFloat(name + "-Factor", 1f);
        // rangeDisplay.text = PlayerPrefs.GetString(name + "-RangeDisplay", rangeDisplay.text);
        // sliderValueDisplay.text = PlayerPrefs.GetString(name + "-SliderValueDisplay", sliderValueDisplay.text);
        // slider.minValue = PlayerPrefs.GetFloat(name + "-MinValue", MIN_VALUE);
        // slider.maxValue = PlayerPrefs.GetFloat(name + "-MaxValue", MAX_VALUE);
        // slider.value = PlayerPrefs.GetFloat(name + "-Slider", slider.value);

        MAX_VALUE = slider.maxValue;

        zoomInButton.onClick.AddListener(decreaseRange);
        zoomOutButton.onClick.AddListener(increaseRange);

        if (resetButton != null)
            resetButton.onClick.AddListener( () => {
                reset();

                if(resetValue >= 0)
                {
                    slider.value = resetValue;
                }
            });

        updateDisplay();

        // slider.onValueChanged.Invoke(slider.value);
    }

    public void reset()
    {
        factor = 1;
        setRange(MIN_VALUE, MAX_VALUE);
        zoomInButton.interactable = true;
        zoomOutButton.interactable = false;
        updateDisplay();
    }

    void updateDisplay()
    {
        rangeDisplay.text = slider.minValue.ToString("0.#######") + " to " + slider.maxValue.ToString(".#######");
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
        var max = (float)Math.Round(Mathf.Min(MAX_VALUE, slider.value + factor), 6);

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
        max = Mathf.Clamp(max, slider.value, MAX_VALUE);
        min = Mathf.Clamp(min, MIN_VALUE, slider.value);

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