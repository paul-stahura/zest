using UnityEngine;
using UnityEngine.UI;
using System;
using System.Collections.Generic;
using System.Collections;

[RequireComponent(typeof(RectTransform))]
public class CriticalStripWindow : MonoBehaviour
{
    [Header("Window Properties")]
    [SerializeField] private float width = 500f;
    [SerializeField] private float extendedWidth = 700f;
    [SerializeField] private float animationDuration = 0.3f;
    [SerializeField] private RectTransform windowContent;
    [SerializeField] private Button collapseTab;
    [SerializeField] private MultiOptionToggle _realRangeToggle;

    [Header("References")]
    [SerializeField] private CriticalStripRenderer criticalStripRenderer;
    
    private RectTransform rectTransform;
    private static bool isExpanded = true;
    private float targetX;
    private float currentX;
    private PointSetManager pointSetManager;
    private float animationTime;

    private List<int> _sigmaRangeOptions = new List<int> { 1, 5, 10 };
    private int _sigmaRangeIndex = 0;
    public static int sigmaWindowRange = 1;
    public static Action OnSigmaRangeChanged;
    
    public static bool IsExpanded => isExpanded;
    public float Width => width;

    private void Awake()
    {
        rectTransform = GetComponent<RectTransform>();
        pointSetManager = FindObjectOfType<PointSetManager>();
        
        if (collapseTab != null)
            collapseTab.onClick.AddListener(ToggleExpand);

        _realRangeToggle = GameObject.Find("SigmaRangeToggle").GetComponent<MultiOptionToggle>();
        _realRangeToggle.OnOptionChanged += (option) => ToggleSigmaRange();
            
        // Initialize position
        currentX = isExpanded ? 0 : -width;
        UpdatePosition(currentX);
    }

    private void Update()
    {
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

    public void ToggleExpand()
    {
        SetExpanded(!isExpanded);
    }

    public void SetExpanded(bool expand)
    {
        if (isExpanded == expand) return;

        isExpanded = expand;
        targetX = expand ? 0 : (_sigmaRangeIndex > 0 ? -extendedWidth : -width);
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

        // Hide the rangeToggle when collapsed
        if (_realRangeToggle != null)
        {
            _realRangeToggle.gameObject.SetActive(expand);
        }
    }
    
    public void ToggleSigmaRange()
    {
        _sigmaRangeIndex = (_sigmaRangeIndex + 1) % _sigmaRangeOptions.Count;
        sigmaWindowRange = _sigmaRangeOptions[_sigmaRangeIndex];
        SetSigmaRange(sigmaWindowRange);
        OnSigmaRangeChanged?.Invoke();

        StartCoroutine(InvokeOnNextFrame(CriticalStripRenderer.OnViewportChanged));
    }

    private IEnumerator InvokeOnNextFrame(Action action)
    {
        yield return null; // Wait for the next frame
        action?.Invoke();
    }

    private void SetSigmaRange(int newRange)
    {
        if (!isExpanded) return; // should only be changeable when expanded

        bool extend = newRange > 1;
        rectTransform.sizeDelta = new Vector2(extend ? extendedWidth : width, rectTransform.sizeDelta.y);
        criticalStripRenderer.SetRealRange(newRange);
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