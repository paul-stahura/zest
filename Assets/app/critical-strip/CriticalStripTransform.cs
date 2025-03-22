using UnityEngine;

public class CriticalStripTransform
{
    private float minIndex;
    private float maxIndex;
    private RectTransform viewportRect;
    
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
    public float CriticalValueThreshold => CRITICAL_LINE_PIXELS / viewportRect.rect.width;
    
    public CriticalStripTransform(RectTransform viewport, float minIndex = 0f, float maxIndex = 7f)
    {
        this.viewportRect = viewport;
        this.minIndex = minIndex;
        this.maxIndex = maxIndex;
        
        Debug.Log($"[CriticalStripTransform] Initialized with viewport width: {viewport.rect.width}, " +
                  $"critical threshold: {CriticalValueThreshold:F6} ({CRITICAL_LINE_PIXELS} pixels)");
    }
    
    // Convert from critical strip coordinates (real [0,1], index) to viewport coordinates
    public Vector2 StripToViewport(Vector2 stripPos)
    {
        float x = stripPos.x * viewportRect.rect.width;
        float y = Mathf.InverseLerp(minIndex, maxIndex, stripPos.y) * viewportRect.rect.height;
        // Adjust for viewport position
        x += viewportRect.rect.x;
        y += viewportRect.rect.y;
        var result = new Vector2(x, y);
        
        // Special logging for critical value 0.5
        if (Mathf.Approximately(stripPos.x, 0.5f))
        {
            Debug.Log($"[CriticalStripTransform] CRITICAL VALUE: StripToViewport 0.5 -> {result.x / viewportRect.rect.width:F6}");
        }
        
        return result;
    }
    
    // Convert from viewport coordinates to critical strip coordinates
    public Vector2 ViewportToStrip(Vector2 viewportPos)
    {
        // Remove viewport position offset
        float adjustedX = viewportPos.x - viewportRect.rect.x;
        float adjustedY = viewportPos.y - viewportRect.rect.y;
        
        float normalizedX = adjustedX / viewportRect.rect.width;
        
        // Check if we're close to the critical line (0.5)
        float distanceFromHalf = Mathf.Abs(normalizedX - 0.5f);
        float real;
        if (distanceFromHalf <= CriticalValueThreshold)
        {
            real = 0.5f;
            Debug.Log($"[CriticalStripTransform] CRITICAL VALUE: Snapped {normalizedX:F6} to exactly 0.5 " +
                     $"(distance: {distanceFromHalf:F6}, threshold: {CriticalValueThreshold:F6})");
        }
        else
        {
            real = Mathf.Clamp01(normalizedX);
        }
        
        float index = Mathf.Lerp(minIndex, maxIndex, adjustedY / viewportRect.rect.height);
        return new Vector2(real, index);
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
    
    public void SetIndexRange(float min, float max)
    {
        if (min >= max)
        {
            Debug.LogWarning($"[CriticalStripTransform] Invalid index range: [{min}, {max}]");
            return;
        }
        minIndex = min;
        maxIndex = max;
        Debug.Log($"[CriticalStripTransform] Index range updated: [{minIndex}, {maxIndex}]");
    }
    
    public float MinIndex => minIndex;
    public float MaxIndex => maxIndex;
} 