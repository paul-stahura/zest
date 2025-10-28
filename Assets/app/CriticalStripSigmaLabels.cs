using TMPro;
using UnityEngine;

public class CriticalStripSigmaLabels : MonoBehaviour
{
    [SerializeField] private TMP_Text _sigmaMinLabel;
    [SerializeField] private TMP_Text _sigmaMaxLabel;
    [SerializeField] private MultiOptionToggle _sigmaRangeToggle;

    void Awake()
    {
        _sigmaMaxLabel = GameObject.Find("MaxSigmaLabel").GetComponent<TMP_Text>();
        _sigmaMinLabel = GameObject.Find("MinSigmaLabel").GetComponent<TMP_Text>();

        CriticalStripWindow.OnSigmaRangeChanged += UpdateSigmaLabels;
    }

    private void UpdateSigmaLabels()
    {
        int range = CriticalStripWindow.sigmaWindowRange;
        _sigmaMinLabel.text = $"{(range - 1) * -1}";
        _sigmaMaxLabel.text = $"{range}";
    }
}
