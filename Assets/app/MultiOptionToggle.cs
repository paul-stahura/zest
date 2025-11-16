using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

/// <summary>
/// A toggle that cycles through a list of options when clicked.
/// </summary>
[RequireComponent(typeof(Image))]
public class MultiOptionToggle : MonoBehaviour
{
    public Action<int> OnOptionChanged;

    [SerializeField] int _selectedOption = 0;
    [SerializeField] List<string> _options;
    [SerializeField] List<Color> _colors;

    Image _image;
    TMPro.TMP_Text _textObject;

    void Awake()
    {
        var trigger = new EventTrigger.Entry
        {
            eventID = EventTriggerType.PointerDown,
            callback = new EventTrigger.TriggerEvent()
        };
        trigger.callback.AddListener((data) => OnToggleClicked());
        gameObject.AddComponent<EventTrigger>().triggers.Add(trigger);

        _image = GetComponent<Image>();
        _textObject = GetComponentInChildren<TMPro.TMP_Text>();

        UpdateText();
        UpdateColor();
    }
    
    public void SetSelectedOption(int index)
    {
        if (index < 0 || index >= Math.Max(_options.Count, _colors.Count))
        {
            Debug.Log("Index is out of range of options or colors.");
            return;
        }

        _selectedOption = index;
        UpdateText();
        UpdateColor();
        OnOptionChanged?.Invoke(_selectedOption);
    }

    public (int, string) GetSelectedOption()
    {
        return (_selectedOption, _options[_selectedOption]);
    }

    private void OnToggleClicked()
    {
        _selectedOption = (_selectedOption + 1) % Math.Max(_options.Count, _colors.Count);
        UpdateText();
        UpdateColor();
        OnOptionChanged?.Invoke(_selectedOption);
    }

    private void UpdateText()
    {
        if(_textObject == null)
            return;

        int textIndex = _selectedOption;
        if(textIndex >= _options.Count)
        {
            textIndex = _options.Count - 1;
        }
        _textObject.text = _options[textIndex];
    }

    private void UpdateColor()
    {
        if(_image == null)
            return;

        int colorIndex = _selectedOption;
        if(colorIndex >= _colors.Count)
        {
            colorIndex = _colors.Count - 1;
        }
        _image.color = _colors[colorIndex];
    }
}
