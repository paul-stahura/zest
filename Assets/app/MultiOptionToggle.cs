using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// A toggle that cycles through a list of options when clicked.
/// </summary>
[RequireComponent(typeof(Button))]
[RequireComponent(typeof(Image))]
public class MultiOptionToggle : MonoBehaviour
{
    [SerializeField] int _selectedOption = 0;
    [SerializeField] List<string> _options;
    [SerializeField] List<Color> _colors;

    Button _toggleButton;
    Image _image;
    TMPro.TMP_Text _textObject;

    void Awake()
    {
        _toggleButton = GetComponent<Button>();
        _image = GetComponent<Image>();
        _textObject = _toggleButton.GetComponentInChildren<TMPro.TMP_Text>();
        _toggleButton.onClick.AddListener(OnToggleClicked);
        UpdateText();
        UpdateColor();
    }

    public (int, string) GetSelectedOption()
    {
        return (_selectedOption, _options[_selectedOption]);
    }

    private void OnToggleClicked()
    {
        _selectedOption = (_selectedOption + 1) % _options.Count;
        UpdateText();
        UpdateColor();
    }

    private void UpdateText()
    {
        if(_textObject != null)
            _textObject.text = _options[_selectedOption];
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
        _toggleButton.GetComponent<Image>().color = _colors[colorIndex];
    }
}
