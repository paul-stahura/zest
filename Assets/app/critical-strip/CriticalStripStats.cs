using UnityEngine;
using TMPro;

public class CriticalStripStats : MonoBehaviour
{
    [SerializeField] private TextMeshProUGUI statsText;
    private PointSetManager pointSetManager;

    private void Awake()
    {
        pointSetManager = FindObjectOfType<PointSetManager>();
        if (pointSetManager == null)
        {
            Debug.LogError("Stats component requires a PointSetManager in the scene");
        }
        if (statsText == null)
        {
            Debug.LogError("Stats component requires a TextMeshProUGUI component to be assigned");
        }
    }

    public void UpdateTotalPoints(int totalPoints)
    {
        if (statsText != null)
        {
            statsText.text = $"Total Points: {totalPoints:N0}";
        }
    }
} 