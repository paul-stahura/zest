using UnityEngine;
using UnityEngine.UI;

[RequireComponent(typeof(Button))]
public class ColorInverter : MonoBehaviour
{
    [SerializeField] private SpiralRenderer _spiralRenderer;
    private CriticalStripRenderer _criticalStripRenderer;
    private Button _invertButton;
    private Camera _cam;

    void Awake() 
    {
        _cam = Camera.main;

        _spiralRenderer = FindObjectOfType<SpiralRenderer>();
        _criticalStripRenderer = FindObjectOfType<CriticalStripRenderer>();

        _invertButton = GetComponent<Button>();
        _invertButton.onClick.AddListener(Invert);
    }
    
    public void Invert()
    {
        _cam.backgroundColor = InvertColor(_cam.backgroundColor);
        _spiralRenderer.InvertColors();
        
        if (_criticalStripRenderer != null)
        {
            _criticalStripRenderer.InvertColors();
        }
    }

    // takes a color and returns the inverse
    public static Color InvertColor(Color originalColor)
    {
        return new Color(1.0f - originalColor.r, 1.0f - originalColor.g, 1.0f - originalColor.b, originalColor.a);
    }
}
