using System.Collections;
using System.Collections.Generic;
using UnityEditor.Presets;
using UnityEngine;
using UnityEngine.UI;

public enum SlideTitles
{
    Zeta = 0,
    Symmetry = 1,
    Inverse = 2,
    Bisector = 3,
    YinYang = 4,
    Remainder = 5,
    Legs = 6,
}

public class ZestSlides : MonoBehaviour
{
    private Button _panelButton;
    private GameObject _slidesPanel;
    private List<MultiOptionToggle> _slides;

    private PresetHandler _presetHandler;

    void Awake()
    {
        _presetHandler = FindObjectOfType<PresetHandler>();

        _panelButton = GameObject.Find("ToggleSlidesButton").GetComponent<Button>();
        _panelButton.onClick.AddListener(ToggleSlidesPanel);
        _slidesPanel = GameObject.Find("SlidesPanel");

        _slides = new List<MultiOptionToggle>{
            GameObject.Find("ZetaSlide").GetComponent<MultiOptionToggle>(),
            GameObject.Find("SymSlide").GetComponent<MultiOptionToggle>(),
            GameObject.Find("InverseSlide").GetComponent<MultiOptionToggle>(),
            GameObject.Find("BisectorSlide").GetComponent<MultiOptionToggle>(),
            GameObject.Find("YinYangSlide").GetComponent<MultiOptionToggle>(),
            GameObject.Find("RemainderSlide").GetComponent<MultiOptionToggle>(),
            GameObject.Find("LegsSlide").GetComponent<MultiOptionToggle>()
        };

        InitSlides();
    }

    private void InitSlides()
    {
        ResetSlides();

        for(int i = 0; i < _slides.Count; i++)
        {
            int index = i; // Capture variable for closure
            _slides[i].OnOptionChanged += (optionIndex) =>
            {
                _presetHandler.ApplyPreset((SlideTitles)index, optionIndex);
            };
        }

        _slidesPanel.SetActive(false);
    }

    private void ToggleSlidesPanel()
    {
        _slidesPanel.SetActive(!_slidesPanel.activeSelf);
    }

    private void ResetSlides()
    {
        foreach (var slide in _slides)
        {
            slide.SetSelectedOption(0);
        }
    }
}
