using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// A toggle that cycles through a list of options when clicked.
/// </summary>
[RequireComponent(typeof(Button))]
public class MultiOptionToggle : MonoBehaviour
{
    [SerializeField] int _selectedOption = 0;
    [SerializeField] List<string> _options;
    [SerializeField] List<Color> _colors;

    Button _toggleButton;

    void Awake()
    {
        _toggleButton = GetComponent<Button>();
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
        _toggleButton.GetComponentInChildren<TMPro.TMP_Text>().text = _options[_selectedOption];
    }

    private void UpdateColor()
    {
        _toggleButton.GetComponent<Image>().color = _colors[_selectedOption];
    }
}
