using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class Manual : MonoBehaviour
{
    public static Action<string> OnUpdateDescription;
    [SerializeField] private Toggle _manualToggle;
    [SerializeField] private GameObject _manualPanel;
    [SerializeField] private TMP_Text _description;

    void Awake()
    {
        _manualPanel = GameObject.Find("ManualPanel");
        _manualToggle = GameObject.Find("ManualToggle")?.GetComponent<Toggle>();
        _manualToggle.onValueChanged.AddListener((value) => _manualPanel.SetActive(value));

        _description = GameObject.Find("ManualDescription")?.GetComponent<TMP_Text>();


        _manualPanel.SetActive(_manualToggle.isOn);
        OnUpdateDescription += ChangeDescription;

        ChangeDescription("");
    }

    void OnDestroy() 
    {
        OnUpdateDescription -= ChangeDescription;
    }

    void Update()
    {
        if(Input.GetKeyDown(KeyCode.M))
        {
            ToggleManual();
        }
    }

    public static void UpdateDescription(string text)
    {
        OnUpdateDescription?.Invoke(text);
    }

    public void ChangeDescription(string text)
    {
        if(text == "")
        {
            text = " M to hide";
        }

        _description.text = text;
    }

    private void ToggleManual()
    {
        _manualToggle.isOn = !_manualToggle.isOn;
    }
}
