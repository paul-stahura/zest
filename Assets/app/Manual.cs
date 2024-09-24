using System;
using TMPro;
using UnityEngine;

public class Manual : MonoBehaviour
{
    public static Action<string> OnUpdateDescription;
    public bool showManual = false;
    private GameObject _manualPanel;
    private TMP_Text _description;

    void Awake()
    {
        _manualPanel = GameObject.Find("ManualPanel");
        _description = GameObject.Find("ManualDescription")?.GetComponent<TMP_Text>();

        _manualPanel.SetActive(showManual);
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
        showManual = !showManual;
        _manualPanel.SetActive(showManual);
    }
}
