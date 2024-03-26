using System;
using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class SpiralGramPoints : MonoBehaviour
{
    [SerializeField] private App _app;
    [SerializeField] private FloatInput _gramPointInput;
    private GramPoints _gramPoints;

    void Awake()
    {
        _gramPoints = new GramPoints();

        _app = GameObject.Find("App")?.GetComponent<App>();

        _gramPointInput = GameObject.Find("GramPointInput")?.GetComponent<FloatInput>();
        _gramPointInput.onValueChanged.AddListener((value) =>
        {
            LoadGramPoint((int)value);
        });
    }

    public void LoadGramPoint(int index)
    {
        _app.imagDisplay.onValueChanged?.Invoke((float)_gramPoints.GetValue(index));
    }
}
