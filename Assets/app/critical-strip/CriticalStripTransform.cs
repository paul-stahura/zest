using UnityEngine;
using UnityEngine.UIElements;

public class CriticalStripTransform
{
    private double minIndex;
    private double maxIndex;
    private double minImag; // New field for min imaginary value
    private double maxImag; // New field for max imaginary value
    private RectTransform viewportRect;
    private bool useImaginarySpace = false; // Default to index space

    // Cached rect values to avoid expensive RectTransform.get_rect() calls
    // The get_rect() method triggers C++ to C# marshalling which is very expensive
    // when called millions of times per frame during point rendering
    private float cachedRectWidth;
    private float cachedRectHeight;
    private float cachedRectX;
    private float cachedRectY;
    
    /// <summary>
    /// The critical line at real = 0.5 is of utmost importance in the Riemann hypothesis.
    /// All non-trivial zeros of the Riemann zeta function are conjectured to lie on this line.
    /// Due to floating-point arithmetic, transformations between viewport and strip coordinates
    /// might introduce tiny errors that could make points appear slightly off the critical line.
    /// 
    /// The threshold is dynamically calculated to be equivalent to 3 pixels on the current viewport width.
    /// This means any click within 3 pixels of the critical line will snap to 0.5.
    /// For example, with a 500px viewport, this creates a snap range of [0.497 to 0.503].
    /// 
    /// We err on the side of being more generous with the threshold because:
    /// 1. It's more important to correctly identify points intended to be on the critical line
    /// 2. Mouse precision and human hand steadiness typically have a margin of error of 2-3 pixels
    /// 3. The cost of a false positive (snapping a point that wasn't meant to be 0.5) is less
    ///    than a false negative (failing to snap a point that was meant to be 0.5)
    /// 
    /// You can use the "Analyze Critical Line Threshold" context menu item in PointSetManagerEditor
    /// to see exactly what range of values will be snapped to 0.5 with the current threshold.
    /// </summary>
    private const float CRITICAL_LINE_PIXELS = 3f; // Number of pixels to use for snapping
    
    public RectTransform ViewportRect => viewportRect;
    
    // Calculate threshold based on current viewport width
    public float CriticalValueThreshold => CRITICAL_LINE_PIXELS / cachedRectWidth;  // Use cached value
    
    // Property to get/set the space mode
    public bool UseImaginarySpace
    {
        get { return useImaginarySpace; }
        set 
        { 
            if (useImaginarySpace != value)
            {
                useImaginarySpace = value;
                // No need to update bounds here as they're already maintained in parallel
            }
        }
    }
    
    public CriticalStripTransform(RectTransform viewport, float minIndex = 0f, float maxIndex = 7f)
    {
        this.viewportRect = viewport;
        this.minIndex = minIndex;
        this.maxIndex = maxIndex;

        // Initialize imaginary values
        this.minImag = Zeta.IndexToImag(minIndex);
        this.maxImag = Zeta.IndexToImag(maxIndex);

        // Cache rect values to avoid expensive get_rect() calls
        InvalidateRectCache();

        // Debug.Log($"[CriticalStripTransform] Initialized with viewport width: {viewport.rect.width}, " +
        //           $"critical threshold: {CriticalValueThreshold:F6} ({CRITICAL_LINE_PIXELS} pixels)");
        // Debug.Log($"[CriticalStripTransform] Index range: [{minIndex}, {maxIndex}], Imag range: [{minImag:F2}, {maxImag:F2}]");
    }

    /// <summary>
    /// Invalidate the cached rect values and refresh from the RectTransform.
    /// Call this whenever the viewport size or position changes.
    /// </summary>
    public void InvalidateRectCache()
    {
        Rect rect = viewportRect.rect;
        cachedRectWidth = rect.width;
        cachedRectHeight = rect.height;
        cachedRectX = rect.x;
        cachedRectY = rect.y;
    }
    
    // Convert from critical strip coordinates (real [0,1], index/imag) to viewport coordinates
    public Vector2 StripToViewport(Vector2 stripPos)
    {
        int range = CriticalStripRenderer.realRange;
        float x;
        if (range == 0)
        {
            // real [0,1]
            x = stripPos.x * cachedRectWidth;  // Use cached value
        }
        else
        {
            // Shift the real axis so that 0.5 is at the center, then map [-realScale, realScale] to [0, cachedRectWidth]
            float shiftedX = stripPos.x - 0.5f;
            x = ((shiftedX + range) / (2f * range)) * cachedRectWidth;  // Use cached value
        }

        // Use double for calculations to maintain precision
        double normalizedY;
        if (useImaginarySpace)
        {
            normalizedY = (stripPos.y - minImag) / (maxImag - minImag);
            // Debug.Log($"[CriticalStripTransform] (imaginary) StripToViewport: {stripPos.y} -> {normalizedY}");
        }
        else
        {
            normalizedY = (stripPos.y - minIndex) / (maxIndex - minIndex);
            // Debug.Log($"[CriticalStripTransform] (index) StripToViewport: {stripPos.y} -> {normalizedY}");
        }
        float y = (float)(normalizedY * cachedRectHeight);  // Use cached value

        // Adjust for viewport position
        x += cachedRectX;  // Use cached value
        y += cachedRectY;  // Use cached value

        return new Vector2(x, y);
    }
    
    // Convert from viewport coordinates to critical strip coordinates
    public Vector2 ViewportToStrip(Vector2 viewportPos)
    {
        // Remove viewport position offset
        float adjustedX = viewportPos.x - cachedRectX;  // Use cached value
        float adjustedY = viewportPos.y - cachedRectY;  // Use cached value

        float normalizedX = adjustedX / cachedRectWidth;  // Use cached value

        // Check if we're close to the critical line (0.5)
        float distanceFromHalf = Mathf.Abs(normalizedX - 0.5f);
        float real;
        if (distanceFromHalf <= CriticalValueThreshold)
        {
            real = 0.5f;
        }
        else
        {
            float realMin = 0;
            float realMax = 1;
            // Support extended real axis range (e.g., -4.5 to 5.5)
            if (CriticalStripWindow.IsExtended)
            {
                realMin = -4.5f;
                realMax = 5.5f;
            }

            real = realMin + normalizedX * (realMax - realMin);
            real = Mathf.Clamp(real, realMin, realMax);
        }

        // Use double for y-coordinate calculations to maintain precision
        double normalizedY = adjustedY / cachedRectHeight;  // Use cached value
        double value;
        
        if (useImaginarySpace)
        {
            value = minImag + (normalizedY * (maxImag - minImag));
        }
        else
        {
            value = minIndex + (normalizedY * (maxIndex - minIndex));
        }
        
        return new Vector2(real, (float)value);
    }
    
    // Convert from screen coordinates to critical strip coordinates
    public Vector2 ScreenToStrip(Vector2 screenPos)
    {
        Vector2 localPos;
        bool success = RectTransformUtility.ScreenPointToLocalPointInRectangle(
            viewportRect, screenPos, null, out localPos);
            
        if (!success)
        {
            Debug.LogWarning($"[CriticalStripTransform] Failed to convert screen({screenPos}) to local coordinates");
            return Vector2.zero;
        }
        
        return ViewportToStrip(localPos);
    }
    
    // Set the range in the current coordinate space (index or imaginary)
    public void SetRange(float min, float max)
    {
        if (min >= max)
        {
            Debug.LogWarning($"[CriticalStripTransform] Invalid range: [{min}, {max}]");
            return;
        }
        
        if (useImaginarySpace)
        {
            minImag = min;
            maxImag = max;
            
            // Update corresponding index values
            minIndex = Zeta.ImagToIndex(minImag);
            maxIndex = Zeta.ImagToIndex(maxImag);
        }
        else
        {
            minIndex = min;
            maxIndex = max;
            
            // Update corresponding imaginary values
            minImag = Zeta.IndexToImag(minIndex);
            maxImag = Zeta.IndexToImag(maxIndex);
        }
        
        // Debug.Log($"[CriticalStripTransform] Range updated. Index: [{minIndex:F3}, {maxIndex:F3}], Imag: [{minImag:F2}, {maxImag:F2}]");
    }
    
    // Maintain backward compatibility
    public void SetIndexRange(float min, float max)
    {
        if (useImaginarySpace)
        {
            // If in imaginary space, convert the index values to imaginary values
            double minImag = Zeta.IndexToImag(min);
            double maxImag = Zeta.IndexToImag(max);
            SetRange((float)minImag, (float)maxImag);
        }
        else
        {
            SetRange(min, max);
        }
    }
    
    // Properties to get min/max values based on current space
    public float MinValue => (float)(useImaginarySpace ? minImag : minIndex);
    public float MaxValue => (float)(useImaginarySpace ? maxImag : maxIndex);
    
    // Keep original properties for backward compatibility
    public float MinIndex => (float)minIndex;
    public float MaxIndex => (float)maxIndex;
    
    // New properties to access imaginary range directly
    public float MinImag => (float)minImag;
    public float MaxImag => (float)maxImag;
} 