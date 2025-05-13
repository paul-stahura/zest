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
    [SerializeField] private Button collapseTab;
    
    private RectTransform rectTransform;
    private bool isExpanded = true;
    private float targetX;
    private float currentX;
    private PointSetManager pointSetManager;
    private float animationTime;
    
    public bool IsExpanded => isExpanded;
    public float Width => width;

    private void Awake()
    {
        rectTransform = GetComponent<RectTransform>();
        pointSetManager = FindObjectOfType<PointSetManager>();
        
        if (collapseTab != null)
            collapseTab.onClick.AddListener(Toggle);
            
        // Initialize position
        currentX = isExpanded ? 0 : -width;
        UpdatePosition(currentX);
    }

    private void Update()
    {
        targetX = isExpanded ? 0 : -width;
        
        if (Mathf.Abs(currentX - targetX) > 0.01f)
        {
            animationTime += Time.deltaTime;
            float t = animationTime / animationDuration;
            
            // Apply easing function (ease-out cubic)
            t = 1f - Mathf.Pow(1f - t, 3f);
            t = Mathf.Clamp01(t);
            
            currentX = Mathf.Lerp(currentX, targetX, t);
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
        animationTime = 0f; // Reset animation time when starting new animation
        
        // Rotate the collapse tab if it exists
        if (collapseTab != null)
        {
            var tabRect = collapseTab.GetComponent<RectTransform>();
            if (tabRect != null)
            {
                // Rotate 180 degrees when collapsing
                tabRect.rotation = Quaternion.Euler(0, 0, expand ? 0 : 180);
            }
        }
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