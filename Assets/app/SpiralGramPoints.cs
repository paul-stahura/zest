using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class SpiralGramPoints : MonoBehaviour
{
    [SerializeField] private App _app;
    [SerializeField] private Slider _gramPointInputSlider;
    [SerializeField] private TMP_Text _gramPointInputText;
    [SerializeField] private FloatInput _gramPointInputMin;
    [SerializeField] private FloatInput _gramPointInputMax;
    private GramPoints _gramPoints;

    void Awake()
    {
        _gramPoints = new GramPoints();

        _app = GameObject.Find("App")?.GetComponent<App>();

        _gramPointInputText = GameObject.Find("GramPointInputText")?.GetComponent<TMP_Text>();


        _gramPointInputSlider = GameObject.Find("GramPointInputSlider")?.GetComponent<Slider>();
        _gramPointInputSlider.onValueChanged.AddListener((value) =>
        {
            int pt = (int)value;
            LoadGramPoint(pt);
            _gramPointInputText.SetText(pt.ToString());
        });

        _gramPointInputMin = GameObject.Find("GramPointInputMIN")?.GetComponent<FloatInput>();
        _gramPointInputMin.onValueChanged.AddListener((value) =>
        {
            _gramPointInputSlider.minValue = (int)value;
        });

        _gramPointInputMax = GameObject.Find("GramPointInputMAX")?.GetComponent<FloatInput>();
        _gramPointInputMax.onValueChanged.AddListener((value) =>
        {
            _gramPointInputSlider.maxValue = (int)value;
        });

        _gramPointInputSlider.minValue = _gramPointInputMin.Value;
        _gramPointInputSlider.maxValue = _gramPointInputMax.Value;
    }

    public void LoadGramPoint(int index)
    {
        _app.imagDisplay.onValueChanged?.Invoke((float)_gramPoints.GetValue(index));
    }
}
