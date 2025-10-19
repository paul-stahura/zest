using UnityEngine;
using UnityEngine.UI;
using System.Collections.Generic;
using System.Text;
using System;

/// <summary>
/// Renders labels along the side of the critical strip viewport.
/// Can display either index or imaginary values based on current mode.
/// </summary>
public class IndexLabelsRenderer : MonoBehaviour
{
    [Header("Label Properties")]
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
    
    [Header("Imaginary Space Settings")]
    [Tooltip("Target number of labels to show in imaginary space")]
    [SerializeField] private float imagTargetLabelCount = 8f;
    [Tooltip("Whether to use adaptive spacing for imaginary values")]
    [SerializeField] private bool useAdaptiveSpacing = true;
    [Tooltip("Label prefix to show in imaginary space")]
    [SerializeField] private string imagPrefix = "t=";

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
    private bool useImaginarySpace = false;                   // Current space mode

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

    public void InvertColor()
    {
        // Invert the text color for all labels in the pool
        Color invertedColor = ColorInverter.InvertColor(labelPool[0].color);
        foreach (var label in labelPool)
        {
            label.color = invertedColor;
        }
    }

    private void HandleViewportChanged()
    {
        if (!isInitialized || stripTransform == null) return;

        logs.AppendLine("Viewport changed, updating labels");
        // Update using MinValue/MaxValue which automatically uses the correct space
        UpdateLabels(stripTransform.MinValue, stripTransform.MaxValue);
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

        // Check if we need to initialize in imaginary space
        if (stripTransform != null)
        {
            useImaginarySpace = stripTransform.UseImaginarySpace;
        }

        logs.AppendLine($"Initial value range: [{stripTransform.MinValue}, {stripTransform.MaxValue}], space mode: {(useImaginarySpace ? "Imaginary" : "Index")}");
        isInitialized = true;  // Set initialized flag before calling UpdateLabels
        UpdateLabels(stripTransform.MinValue, stripTransform.MaxValue);
        logs.AppendLine("IndexLabelsRenderer initialization complete");
        EmitLogs("InitializeWhenReady - complete");
    }
    
    /// <summary>
    /// Set whether to display labels in imaginary space
    /// </summary>
    public void SetUseImaginarySpace(bool useImag)
    {
        if (useImaginarySpace == useImag) return;
        
        useImaginarySpace = useImag;
        logs.AppendLine($"Space mode changed to: {(useImaginarySpace ? "Imaginary" : "Index")}");
        
        if (isInitialized && stripTransform != null)
        {
            UpdateLabels(stripTransform.MinValue, stripTransform.MaxValue);
        }
        
        EmitLogs("SetUseImaginarySpace");
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
    /// Calculates appropriate data spacing based on viewport pixel constraints
    /// </summary>
    private float CalculatePixelAwareSpacing(float visibleRange, bool isImaginarySpace)
    {
        // Calculate minimum pixel spacing needed for readability (label height * margin)
        float labelHeightPixels = fontSize * 1.5f;
        float marginMultiplier = isImaginarySpace ? 2.0f : 1.8f; // More space for imaginary labels
        float minPixelSpacing = labelHeightPixels * marginMultiplier;

        // Calculate how many labels can physically fit in the viewport
        float viewportHeightPixels = viewportRect.rect.height;
        int maxLabelsToFit = Mathf.Max(1, Mathf.FloorToInt(viewportHeightPixels / minPixelSpacing));

        // Calculate required data spacing to fit that many labels
        float idealDataSpacing = visibleRange / maxLabelsToFit;

        // Round to nice numbers (powers of 10 with 1, 2, 5 multipliers)
        float log10 = Mathf.Log10(idealDataSpacing);
        int power = Mathf.FloorToInt(log10);
        float magnitude = Mathf.Pow(10, power);

        // Choose between 1×, 2×, or 5× the magnitude
        float niceSpacing;
        if (idealDataSpacing >= 5 * magnitude)
            niceSpacing = 10 * magnitude; // Jump to next power of 10
        else if (idealDataSpacing >= 2 * magnitude)
            niceSpacing = 5 * magnitude;
        else if (idealDataSpacing >= magnitude)
            niceSpacing = 2 * magnitude;
        else
            niceSpacing = magnitude;

        logs.AppendLine($"Pixel-aware spacing: viewport={viewportHeightPixels}px, labelHeight={labelHeightPixels}px, " +
                       $"minSpacing={minPixelSpacing}px, maxLabels={maxLabelsToFit}, " +
                       $"idealSpacing={idealDataSpacing:F3}, niceSpacing={niceSpacing}");

        return niceSpacing;
    }
    
    /// <summary>
    /// Updates the position and text of all labels
    /// </summary>
    public void UpdateLabels(float minValue, float maxValue)
    {
        if (!isInitialized)
        {
            logs.AppendLine("UpdateLabels called before initialization completed");
            EmitLogs("UpdateLabels - not initialized");
            return;
        }

        logs.AppendLine($"UpdateLabels called with range: [{minValue}, {maxValue}], space mode: {(useImaginarySpace ? "Imaginary" : "Index")}");
        
        currentMinIndex = minValue;
        currentMaxIndex = maxValue;
        
        // Calculate visible range and determine appropriate spacing and format
        float visibleRange = maxValue - minValue;

        // Use pixel-aware spacing calculation for both index and imaginary space
        float currentSpacing = CalculatePixelAwareSpacing(visibleRange, useImaginarySpace);

        // Determine decimal places based on spacing magnitude
        int decimalPlaces;
        if (currentSpacing >= 1)
        {
            decimalPlaces = 0;
        }
        else if (currentSpacing >= 0.1f)
        {
            decimalPlaces = 1;
        }
        else if (currentSpacing >= 0.01f)
        {
            decimalPlaces = 2;
        }
        else
        {
            decimalPlaces = 3;
        }
        decimalPlaces = Mathf.Min(decimalPlaces, maxDecimalPlaces);
        
        string format = $"F{decimalPlaces}";

        logs.AppendLine($"Visible range: {visibleRange:F3}, Decimal places: {decimalPlaces}, Spacing: {currentSpacing:F3}");
        
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
        
        // Position and activate needed labels with overlap detection
        // Use double for more precise decimal calculations
        double dCurrentSpacing = currentSpacing;
        double dMinIndex = minValue;
        double startIndex = Math.Floor(dMinIndex / dCurrentSpacing) * dCurrentSpacing;

        // Track last label position to detect overlaps
        float lastLabelY = float.MinValue;
        float minPixelSpacing = fontSize * 1.5f * (useImaginarySpace ? 2.0f : 1.8f);

        int labelIndex = 0;
        for (double index = startIndex; index <= maxValue && labelIndex < labelPool.Count; index += dCurrentSpacing)
        {
            // Skip labels below minimum allowed value
            if (useImaginarySpace)
            {
                // For imaginary space, enforce minimum imaginary bound (safe constant, avoiding IndexToImag(-1) which is undefined)
                const double MIN_IMAGINARY_VALUE = 10.0; // Safe lower bound, actual first zero is ~14.13
                if (index < MIN_IMAGINARY_VALUE) continue;
            }
            else
            {
                // For index space, ensure we don't go below -1
                if (index < -1) continue;
            }

            // Skip if below minValue (after minimum allowed check to ensure we don't miss the first label)
            if (index < dMinIndex) continue;

            // Convert strip coordinates to viewport coordinates
            Vector2 viewportPos = stripTransform.StripToViewport(new Vector2(0, (float)index));

            // Overlap detection: skip this label if it's too close to the previous one
            if (labelIndex > 0 && Mathf.Abs(viewportPos.y - lastLabelY) < minPixelSpacing)
            {
                logs.AppendLine($"Skipping label at {index} - too close to previous (deltaY: {Mathf.Abs(viewportPos.y - lastLabelY):F1}px < {minPixelSpacing}px)");
                continue;
            }

            Text label = labelPool[labelIndex];
            label.gameObject.SetActive(true);

            // Format the label text based on the space mode
            if (useImaginarySpace)
            {
                // Format imaginary values with appropriate precision
                double roundedValue = Math.Round(index, decimalPlaces);
                label.text = imagPrefix + roundedValue.ToString(format);
            }
            else
            {
                // Format index values with original logic
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
            }

            logs.AppendLine($"Label {index}: text='{label.text}', pos={viewportPos}, active={label.gameObject.activeSelf}");

            // Modified label positioning
            RectTransform labelRect = label.GetComponent<RectTransform>();
            float scaledOffset = Mathf.Max(offsetFromEdge, viewportRect.rect.width * 0.02f); // Make offset responsive
            labelRect.anchoredPosition = new Vector2(-scaledOffset, viewportPos.y);

            // Remember this label's position for next iteration
            lastLabelY = viewportPos.y;

            labelIndex++;
        }

        logs.AppendLine($"Updated {labelIndex} labels");
        EmitLogs("UpdateLabels - complete");
    }
} 