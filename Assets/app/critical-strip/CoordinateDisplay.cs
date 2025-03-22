using UnityEngine;
using TMPro;

[RequireComponent(typeof(TextMeshProUGUI))]
public class CoordinateDisplay : MonoBehaviour
{
    private TextMeshProUGUI text;
    private App app;
    
    private void Awake()
    {
        text = GetComponent<TextMeshProUGUI>();
        app = FindObjectOfType<App>();
        
        if (app != null)
        {
            app.RealChanged += OnRealChanged;
            app.IndexChanged += OnIndexChanged;
        }
        
        UpdateDisplay();
    }
    
    private void OnDestroy()
    {
        if (app != null)
        {
            app.RealChanged -= OnRealChanged;
            app.IndexChanged -= OnIndexChanged;
        }
    }
    
    private void OnRealChanged(double real)
    {
        UpdateDisplay();
    }
    
    private void OnIndexChanged(double index)
    {
        UpdateDisplay();
    }
    
    public void UpdateDisplay()
    {
        if (app == null || text == null) return;
        
        text.text = $"Real: {app.Real:F3}, Index: {app.Index:F3}";
    }
    
    public void UpdateHoverCoordinates(float real, float index)
    {
        if (text == null) return;
        text.text = $"Real: {real:F3}, Index: {index:F3}";
    }
} 