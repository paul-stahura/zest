using UnityEngine;

public class CriticalStripTransform
{
    private float minIndex;
    private float maxIndex;
    private RectTransform viewportRect;
    
    public RectTransform ViewportRect => viewportRect;
    
    public CriticalStripTransform(RectTransform viewport, float minIndex = 0f, float maxIndex = 7f)
    {
        this.viewportRect = viewport;
        this.minIndex = minIndex;
        this.maxIndex = maxIndex;
        
        Debug.Log($"[CriticalStripTransform] Initialized with viewport size: {viewport.rect.size}, " +
                  $"index range: [{minIndex}, {maxIndex}]");
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
        
        Debug.Log($"[CriticalStripTransform] StripToViewport: strip({stripPos}) -> viewport({result}), " +
                  $"viewport size: {viewportRect.rect.size}, viewport pos: ({viewportRect.rect.x}, {viewportRect.rect.y})");
        return result;
    }
    
    // Convert from viewport coordinates to critical strip coordinates
    public Vector2 ViewportToStrip(Vector2 viewportPos)
    {
        // Remove viewport position offset
        float adjustedX = viewportPos.x - viewportRect.rect.x;
        float adjustedY = viewportPos.y - viewportRect.rect.y;
        
        float real = Mathf.Clamp01(adjustedX / viewportRect.rect.width);
        float index = Mathf.Lerp(minIndex, maxIndex, adjustedY / viewportRect.rect.height);
        var result = new Vector2(real, index);
        
        Debug.Log($"[CriticalStripTransform] ViewportToStrip: viewport({viewportPos}) -> strip({result}), " +
                  $"viewport size: {viewportRect.rect.size}, viewport pos: ({viewportRect.rect.x}, {viewportRect.rect.y})");
        return result;
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
        
        Debug.Log($"[CriticalStripTransform] ScreenToStrip: screen({screenPos}) -> local({localPos})");
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