using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

[RequireComponent(typeof(Toggle))]
public class TextToggle : MonoBehaviour
{
    [SerializeField] private Text _label;
    [SerializeField] private string _onText;
    [SerializeField] private string _offText;
    private Toggle _toggle;

    void Awake()
    {
        _toggle = GetComponent<Toggle>();
        ChangeText(_toggle.isOn);
        _toggle.onValueChanged.AddListener((value) => {
            ChangeText(value);
        });
    }

    private void ChangeText(bool value)
    {
        _label.text = value ? _onText : _offText;
    }
}
