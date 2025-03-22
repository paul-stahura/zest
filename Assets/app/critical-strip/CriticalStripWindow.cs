using UnityEngine;
using UnityEngine.UI;
using System;

[RequireComponent(typeof(RectTransform))]
public class CriticalStripWindow : MonoBehaviour
{
    [Header("Window Properties")]
    [SerializeField] private float width = 300f;
    [SerializeField] private float animationDuration = 0.3f;
    [SerializeField] private RectTransform windowContent;
    [SerializeField] private Button toggleButton;
    [SerializeField] private Button closeButton;
    [SerializeField] private Button saveButton;
    
    private RectTransform rectTransform;
    private bool isExpanded = true;
    private float targetX;
    private float currentX;
    private PointSetManager pointSetManager;
    
    public bool IsExpanded => isExpanded;
    public float Width => width;

    private void Awake()
    {
        rectTransform = GetComponent<RectTransform>();
        pointSetManager = FindObjectOfType<PointSetManager>();
        
        if (toggleButton != null)
            toggleButton.onClick.AddListener(Toggle);
            
        if (closeButton != null)
            closeButton.onClick.AddListener(() => SetExpanded(false));
            
        if (saveButton != null && pointSetManager != null)
            saveButton.onClick.AddListener(pointSetManager.SaveCurrentPoint);
            
        // Initialize position
        currentX = isExpanded ? 0 : -width;
        UpdatePosition(currentX);
    }

    private void Update()
    {
        targetX = isExpanded ? 0 : -width;
        
        if (Mathf.Abs(currentX - targetX) > 0.01f)
        {
            currentX = Mathf.Lerp(currentX, targetX, Time.deltaTime / animationDuration);
            UpdatePosition(currentX);
        }
    }

    public void Toggle()
    {
        SetExpanded(!isExpanded);
    }

    public void SetExpanded(bool expand)
    {
        if (isExpanded == expand) return;
        
        isExpanded = expand;
        targetX = expand ? 0 : -width;
    }

    private void UpdatePosition(float x)
    {
        if (rectTransform == null) return;
        
        var anchoredPosition = rectTransform.anchoredPosition;
        anchoredPosition.x = x;
        rectTransform.anchoredPosition = anchoredPosition;
    }

    private void OnValidate()
    {
        if (width < 100) width = 100;
        if (animationDuration < 0.1f) animationDuration = 0.1f;
    }
} 