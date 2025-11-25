using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public enum SlideTitles
{
    Zeta,
    Symmetry,
    Index,
    Frame,
    YinYang,
    Remainder,
    SigmaNotHalf,
    Legs,
    Equal,
    RakZero,

    // Candy
    Galaxy,
    Taffy,
    Saver
}

public class ZestSlides : MonoBehaviour
{
    private Button _panelButton;
    private GameObject _slidesPanel;
    private List<MultiOptionToggle> _slides;

    private PresetHandler _presetHandler;
    private MultiOptionToggle _currentSlide;

    void Awake()
    {
        _presetHandler = FindObjectOfType<PresetHandler>();

        _panelButton = GameObject.Find("ToggleSlidesButton").GetComponent<Button>();
        _panelButton.onClick.AddListener(ToggleSlidesPanel);
        _slidesPanel = GameObject.Find("SlidesPanel");

        _slides = new List<MultiOptionToggle>{
            GameObject.Find("ZetaSlide").GetComponent<MultiOptionToggle>(),
            GameObject.Find("SymSlide").GetComponent<MultiOptionToggle>(),
            GameObject.Find("IndexSlide").GetComponent<MultiOptionToggle>(),
            GameObject.Find("FrameSlide").GetComponent<MultiOptionToggle>(),
            GameObject.Find("YinYangSlide").GetComponent<MultiOptionToggle>(),
            GameObject.Find("RemainderSlide").GetComponent<MultiOptionToggle>(),
            GameObject.Find("SigmaNotHalfSlide").GetComponent<MultiOptionToggle>(),
            GameObject.Find("LegsSlide").GetComponent<MultiOptionToggle>(),
            GameObject.Find("EqualSlide").GetComponent<MultiOptionToggle>(),
            GameObject.Find("RakZeroSlide").GetComponent<MultiOptionToggle>(),

            GameObject.Find("GalaxySlide").GetComponent<MultiOptionToggle>(),
            GameObject.Find("TaffySlide").GetComponent<MultiOptionToggle>(),
            GameObject.Find("SaverSlide").GetComponent<MultiOptionToggle>()
        };

        InitSlides();
    }

    private void InitSlides()
    {
        ResetSlides();

        _currentSlide = _slides[0];

        for(int i = 0; i < _slides.Count; i++)
        {
            int index = i; // Capture variable for closure
            var slide = _slides[index];
            slide.OnOptionChanged += (optionIndex) =>
            {
                if(slide != _currentSlide)
                {
                    _currentSlide.SetSilently(0);
                    _currentSlide = slide;
                }

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
