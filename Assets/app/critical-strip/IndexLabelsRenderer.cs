using UnityEngine;
using UnityEngine.UI;
using System.Collections.Generic;
using System.Text;
using System;

/// <summary>
/// Renders index labels along the side of the critical strip viewport
/// </summary>
public class IndexLabelsRenderer : MonoBehaviour
{
    [Header("Label Properties")]
    [SerializeField] private float labelSpacing = 1.0f;        // Base spacing between labels in strip units
    [SerializeField] private int fontSize = 18;                // Font size for the labels
    [SerializeField] private Color textColor = Color.white;    // Color of the label text
    [SerializeField] private float offsetFromEdge = 10f;      // Distance from the viewport edge in pixels

    [Header("Label Density")]
    [Tooltip("Target number of labels to show in viewport. More labels = more detail but may get crowded")]
    [SerializeField] private float targetLabelCount = 10f;
    [Tooltip("Maximum number of decimal places to show")]
    [SerializeField] private int maxDecimalPlaces = 3;
    [Tooltip("Minimum spacing between labels in strip units")]
    [SerializeField] private float minSpacing = 1;

    [Header("Decimal Display Thresholds")]
    [Tooltip("Show first decimal place when visible range is less than this")]
    [SerializeField] private float firstDecimalThreshold = 5f;
    [Tooltip("Show second decimal place when visible range is less than this")]
    [SerializeField] private float secondDecimalThreshold = .5f;
    [Tooltip("Show third decimal place when visible range is less than this")]
    [SerializeField] private float thirdDecimalThreshold = 0.05f;
    [Tooltip("Multiplier for spacing between labels. Lower values = more labels")]
    [SerializeField] [Range(1f, 5f)] private float spacingMultiplier = 1.5f;

    [Header("Strip Properties")]
    [SerializeField] private Color stripColor = new Color(1, 1, 1, 0.2f);  // Color of the strip background
    
    [Header("References")]
    [SerializeField] private CriticalStripRenderer stripRenderer;  // Reference to the main strip renderer - now set via inspector
    [SerializeField] private RectTransform viewportRect;          // Reference to the viewport - now set via inspector

    private CriticalStripTransform stripTransform;            // Reference to the coordinate transform
    private List<Text> labelPool;                             // Pool of reusable text components
    private float currentMinIndex;                            // Current minimum visible index
    private float currentMaxIndex;                            // Current maximum visible index
    private bool isInitialized = false;                       // Whether we've completed initialization
    private StringBuilder logs = new StringBuilder();         // Collects logs for batch output

    private void OnEnable()
    {
        if (stripRenderer != null)
        {
            stripRenderer.OnViewportChanged += HandleViewportChanged;
        }
    }

    private void OnDisable()
    {
        if (stripRenderer != null)
        {
            stripRenderer.OnViewportChanged -= HandleViewportChanged;
        }
    }

    private void HandleViewportChanged()
    {
        if (!isInitialized || stripTransform == null) return;
        
        logs.AppendLine("Viewport changed, updating labels");
        UpdateLabels(stripTransform.MinIndex, stripTransform.MaxIndex);
        EmitLogs("ViewportChanged");
    }

    private void EmitLogs(string context)
    {
        if (logs.Length > 0)
        {
            // Debug.Log($"[IndexLabelsRenderer - {context}]\n{logs}");
            logs.Clear();
        }
    }

    private void Awake()
    {
        logs.AppendLine("IndexLabelsRenderer.Awake() called");
        
        // No longer getting components from same GameObject
        if (stripRenderer != null)
        {
            stripRenderer.OnViewportChanged += HandleViewportChanged;
        }
        
        EmitLogs("Awake");
    }
    
    private void Start()
    {
        logs.AppendLine("IndexLabelsRenderer starting...");
        if (stripRenderer == null)
        {
            logs.AppendLine("ERROR: stripRenderer reference not set in the inspector");
            EmitLogs("Start");
            return;
        }
        if (viewportRect == null)
        {
            logs.AppendLine("ERROR: viewportRect reference not set in the inspector");
            EmitLogs("Start");
            return;
        }
        logs.AppendLine("Found required references");
        EmitLogs("Start");
        
        // Start the initialization process
        StartCoroutine(InitializeWhenReady());
    }

    private System.Collections.IEnumerator InitializeWhenReady()
    {
        // Wait for CriticalStripRenderer to initialize its transform
        while (true)
        {
            stripTransform = stripRenderer.GetTransform();
            if (stripTransform != null)
            {
                logs.AppendLine("Got stripTransform, proceeding with initialization");
                EmitLogs("InitializeWhenReady");
                break;
            }
            logs.AppendLine("Waiting for stripTransform to be ready...");
            EmitLogs("InitializeWhenReady - waiting");
            yield return new WaitForEndOfFrame();
        }

        // Now we can safely initialize
        labelPool = new List<Text>();
        InitializeLabels();

        logs.AppendLine($"Initial index range: [{stripTransform.MinIndex}, {stripTransform.MaxIndex}]");
        isInitialized = true;  // Set initialized flag before calling UpdateLabels
        UpdateLabels(stripTransform.MinIndex, stripTransform.MaxIndex);
        logs.AppendLine("IndexLabelsRenderer initialization complete");
        EmitLogs("InitializeWhenReady - complete");
    }
    
    /// <summary>
    /// Creates an initial pool of label objects
    /// </summary>
    private void InitializeLabels()
    {
        logs.AppendLine("Initializing labels...");
        
        // Use this GameObject's RectTransform but preserve editor settings
        RectTransform containerRect = GetComponent<RectTransform>();
        if (containerRect == null)
        {
            containerRect = gameObject.AddComponent<RectTransform>();
            // Only set default values if we had to create the RectTransform
            containerRect.anchorMin = new Vector2(0, 0);
            containerRect.anchorMax = new Vector2(0, 1);
            containerRect.pivot = new Vector2(1, 0.5f);
        }
        
        // Add a background image if not already present
        Image bgImage = GetComponent<Image>();
        if (bgImage == null)
        {
            bgImage = gameObject.AddComponent<Image>();
            bgImage.color = stripColor;
        }
        
        logs.AppendLine($"Using container with rect: {containerRect.rect}, anchors: {containerRect.anchorMin}-{containerRect.anchorMax}");
        
        logs.AppendLine("Creating initial label pool...");
        // Create initial set of labels
        for (int i = 0; i < 10; i++)
        {
            var label = CreateLabel(containerRect);
            logs.AppendLine($"Created label {i}: fontSize={label.fontSize}, color={label.color}, active={label.gameObject.activeSelf}");
        }
        logs.AppendLine($"Created {labelPool.Count} initial labels");
        EmitLogs("InitializeLabels");
    }
    
    /// <summary>
    /// Creates a new text label and adds it to the pool
    /// </summary>
    private Text CreateLabel(Transform parent)
    {
        GameObject labelObj = new GameObject("IndexLabel");
        labelObj.transform.SetParent(parent, false);
        
        Text text = labelObj.AddComponent<Text>();
        text.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
        text.fontSize = fontSize;
        text.color = textColor;
        text.alignment = TextAnchor.MiddleRight;
        text.raycastTarget = false;
        
        // Set up RectTransform for proper rendering
        RectTransform rect = text.GetComponent<RectTransform>();
        rect.anchorMin = new Vector2(0, 0.5f);
        rect.anchorMax = new Vector2(1, 0.5f); // Stretch full width
        rect.pivot = new Vector2(0.5f, 0.5f);  // Center pivot
        rect.sizeDelta = new Vector2(-offsetFromEdge * 2, fontSize * 1.5f); // Width with padding, height based on font
        rect.anchoredPosition = Vector2.zero;  // Center in parent
        
        labelPool.Add(text);
        text.gameObject.SetActive(false);
        return text;
    }
    
    /// <summary>
    /// Updates the position and text of all labels
    /// </summary>
    public void UpdateLabels(float minIndex, float maxIndex)
    {
        if (!isInitialized)
        {
            logs.AppendLine("UpdateLabels called before initialization completed");
            EmitLogs("UpdateLabels - not initialized");
            return;
        }

        logs.AppendLine($"UpdateLabels called with range: [{minIndex}, {maxIndex}]");
        
        currentMinIndex = minIndex;
        currentMaxIndex = maxIndex;
        
        // Calculate visible range and determine appropriate spacing and format
        float visibleRange = maxIndex - minIndex;
        float idealSpacing = visibleRange / targetLabelCount;
        
        // Find the appropriate power of 10 for spacing
        float log10 = Mathf.Log10(idealSpacing);
        int power = Mathf.FloorToInt(log10);
        
        // Never go larger than integer spacing (power > 0)
        power = Mathf.Min(0, power);
        
        // Calculate actual spacing and number of decimal places
        float currentSpacing = Mathf.Max(minSpacing, Mathf.Pow(10, power));
        int decimalPlaces = 0;
        
        // Determine decimal places based on visible range
        if (visibleRange <= thirdDecimalThreshold && maxDecimalPlaces >= 3)
        {
            decimalPlaces = 3;
            currentSpacing = 0.001f * spacingMultiplier;
        }
        else if (visibleRange <= secondDecimalThreshold && maxDecimalPlaces >= 2)
        {
            decimalPlaces = 2;
            currentSpacing = 0.01f * spacingMultiplier;
        }
        else if (visibleRange <= firstDecimalThreshold && maxDecimalPlaces >= 1)
        {
            decimalPlaces = 1;
            currentSpacing = 0.1f * spacingMultiplier;
        }
        else
        {
            decimalPlaces = 0;
            currentSpacing = 1f;
        }
        
        string format = $"F{decimalPlaces}";
        
        logs.AppendLine($"Range: {visibleRange:F3}, Ideal spacing: {idealSpacing:F3}");
        logs.AppendLine($"Visible range: {visibleRange}, Decimal places: {decimalPlaces}, Spacing: {currentSpacing}");
        
        // Calculate how many labels we need
        int labelsNeeded = Mathf.CeilToInt(visibleRange / currentSpacing) + 2; // +2 for edge cases
        logs.AppendLine($"Need {labelsNeeded} labels for range {visibleRange}");
        
        // Create more labels if needed
        while (labelPool.Count < labelsNeeded)
        {
            CreateLabel(labelPool[0].transform.parent);
        }
        
        // Deactivate all labels first
        foreach (var label in labelPool)
        {
            label.gameObject.SetActive(false);
        }
        
        // Position and activate needed labels
        // Use double for more precise decimal calculations
        double dCurrentSpacing = currentSpacing;
        double dMinIndex = minIndex;
        double startIndex = Math.Floor(dMinIndex / dCurrentSpacing) * dCurrentSpacing;
        
        int labelIndex = 0;
        for (double index = startIndex; index <= maxIndex && labelIndex < labelPool.Count; index += dCurrentSpacing)
        {
            // Skip labels below zero
            if (index < 0) continue;
            
            // Skip if below minIndex (after zero check to ensure we don't miss zero)
            if (index < dMinIndex) continue;
            
            Text label = labelPool[labelIndex];
            label.gameObject.SetActive(true);
            
            // Format the number with exact decimal places
            if (decimalPlaces > 0)
            {
                // Round to avoid floating point errors
                double roundedIndex = Math.Round(index, decimalPlaces);
                // Always show all decimal places with zero padding
                label.text = roundedIndex.ToString($"F{decimalPlaces}");
            }
            else
            {
                label.text = Math.Round(index).ToString("F0");
            }
            
            // Convert strip coordinates to viewport coordinates
            Vector2 viewportPos = stripTransform.StripToViewport(new Vector2(0, (float)index));
            logs.AppendLine($"Label {index}: text='{label.text}', pos={viewportPos}, active={label.gameObject.activeSelf}");
            
            // Modified label positioning
            RectTransform labelRect = label.GetComponent<RectTransform>();
            float scaledOffset = Mathf.Max(offsetFromEdge, viewportRect.rect.width * 0.02f); // Make offset responsive
            labelRect.anchoredPosition = new Vector2(-scaledOffset, viewportPos.y);
            
            labelIndex++;
        }

        logs.AppendLine($"Updated {labelIndex} labels");
        EmitLogs("UpdateLabels - complete");
    }
} 