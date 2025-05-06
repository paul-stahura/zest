using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;
using System.Collections;

[RequireComponent(typeof(RectTransform))]
public class PointSetInteractionHandler : MonoBehaviour, IPointerClickHandler, IPointerMoveHandler, IPointerEnterHandler, IPointerExitHandler
{
    public PointSet pointSet;
    public CriticalStripRenderer criticalStripRenderer;
    public App app;
    public float pointSize = 10f;
    [SerializeField] private float hoverThresholdMultiplier = 1.2f;
    [SerializeField] private float hoverScale = 3f;
    [SerializeField] private float hoverAnimationDuration = 0.3f;
    
    public RectTransform hoverPoint; // Assigned by PointSetManager
    public PointSetManager pointSetManager; // Reference to the manager for all point sets
    
    private Vector2 lastHoverPosition;
    private Coroutine hoverAnimation;
    private bool isHovered = false;

    // When clicked, find the closest point and update App
    public void OnPointerClick(PointerEventData eventData)
    {
        if (criticalStripRenderer == null || app == null || pointSetManager == null)
            return;

        // Convert pointer position to local position
        Vector2 localPoint;
        RectTransform viewportRect = criticalStripRenderer.GetTransform().ViewportRect;
        if (!RectTransformUtility.ScreenPointToLocalPointInRectangle(viewportRect, eventData.position, eventData.pressEventCamera, out localPoint))
            return;

        float closestDist = float.MaxValue;
        Point closestPoint = null;
        float threshold = pointSize * hoverThresholdMultiplier;
        
        // Get all active point sets
        var activeSets = pointSetManager.GetAllActiveSets();
        
        // Find the closest point across all active sets
        foreach (var activeSet in activeSets)
        {
            foreach (var pt in activeSet.OriginalPoints)
            {
                Vector2 stripPos = new Vector2((float)pt.Real, (float)pt.Index);
                Vector2 viewportPos = criticalStripRenderer.GetTransform().StripToViewport(stripPos);
                float dist = Vector2.Distance(localPoint, viewportPos);
                
                if (dist < closestDist && dist < threshold)
                {
                    closestDist = dist;
                    closestPoint = pt;
                }
            }
        }
        
        if (closestPoint != null)
        {
            app.Real = closestPoint.Real;
            app.Index = closestPoint.Index;
        }
    }

    // Handle pointer movement for hover effects
    public void OnPointerMove(PointerEventData eventData)
    {
        if (criticalStripRenderer == null || pointSetManager == null || hoverPoint == null)
            return;

        // Convert pointer position to local position
        Vector2 localPoint;
        RectTransform viewportRect = criticalStripRenderer.GetTransform().ViewportRect;
        if (!RectTransformUtility.ScreenPointToLocalPointInRectangle(viewportRect, eventData.position, eventData.pressEventCamera, out localPoint))
            return;

        float closestDist = float.MaxValue;
        float threshold = pointSize * hoverThresholdMultiplier;
        Point closestOriginalPoint = null;
        Vector2 closestViewportPos = Vector2.zero;
        Color closestPointColor = pointSet != null ? pointSet.Color : Color.white;
        
        // Get all active point sets
        var activeSets = pointSetManager.GetAllActiveSets();
        
        // Find the closest point across all active sets
        foreach (var activeSet in activeSets)
        {
            foreach (var pt in activeSet.OriginalPoints)
            {
                Vector2 stripPos = new Vector2((float)pt.Real, (float)pt.Index);
                Vector2 viewportPos = criticalStripRenderer.GetTransform().StripToViewport(stripPos);
                float dist = Vector2.Distance(localPoint, viewportPos);
                
                if (dist < closestDist && dist < threshold)
                {
                    closestDist = dist;
                    closestOriginalPoint = pt;
                    closestViewportPos = viewportPos;
                    closestPointColor = activeSet.Color; // Store the color of the set this point belongs to
                }
            }
        }
        
        // Handle hover animation locally instead of via CriticalStripRenderer
        if (closestOriginalPoint != null)
        {
            // Position and show the hover point
            if (!isHovered || Vector2.Distance(lastHoverPosition, closestViewportPos) > 0.1f)
            {
                // Reset the size to the fixed base size if we're hovering a new point
                if (Vector2.Distance(lastHoverPosition, closestViewportPos) > 0.1f)
                {
                    hoverPoint.sizeDelta = new Vector2(pointSize, pointSize);
                    // Update the color of the hover point to match the point's set
                    Image hoverImage = hoverPoint.GetComponent<Image>();
                    if (hoverImage != null)
                    {
                        hoverImage.color = closestPointColor;
                    }
                }
                
                lastHoverPosition = closestViewportPos;
                hoverPoint.anchoredPosition = closestViewportPos;
                
                if (!isHovered)
                {
                    isHovered = true;
                    hoverPoint.gameObject.SetActive(true);
                    
                    // Start the hover animation
                    if (hoverAnimation != null)
                    {
                        StopCoroutine(hoverAnimation);
                    }
                    hoverAnimation = StartCoroutine(AnimateHoverScale());
                }
            }
        }
        else
        {
            // Hide the hover point
            if (isHovered)
            {
                isHovered = false;
                hoverPoint.gameObject.SetActive(false);
                
                if (hoverAnimation != null)
                {
                    StopCoroutine(hoverAnimation);
                    hoverAnimation = null;
                }
            }
        }
    }

    private IEnumerator AnimateHoverScale()
    {
        // Use a fixed size instead of the current size to prevent compounding growth
        Vector2 originalSize = new Vector2(pointSize, pointSize);
        Vector2 targetSize = originalSize * hoverScale;
        
        // Reset to the original size at the start of the animation
        hoverPoint.sizeDelta = originalSize;
        
        // Animate to larger size
        float elapsed = 0f;
        while (elapsed < hoverAnimationDuration * 0.5f)
        {
            elapsed += Time.deltaTime;
            float t = elapsed / (hoverAnimationDuration * 0.5f);
            t = t * (2 - t); // Ease out
            hoverPoint.sizeDelta = Vector2.Lerp(originalSize, targetSize, t);
            yield return null;
        }
        
        // Hold for a moment
        yield return new WaitForSeconds(0.1f);
        
        // Animate back to original size (with a slight bounce)
        elapsed = 0f;
        while (elapsed < hoverAnimationDuration * 0.5f)
        {
            elapsed += Time.deltaTime;
            float t = elapsed / (hoverAnimationDuration * 0.5f);
            
            // Bounce effect
            t = 1 + (1 - t) * (1 - t) * (2.7f * t - 1.7f);
            
            hoverPoint.sizeDelta = Vector2.Lerp(targetSize, originalSize, t);
            yield return null;
        }
        
        hoverPoint.sizeDelta = originalSize;
    }

    public void OnPointerEnter(PointerEventData eventData)
    {
        // Intentionally empty
    }

    public void OnPointerExit(PointerEventData eventData)
    {
        // Hide the hover point
        if (isHovered && hoverPoint != null)
        {
            isHovered = false;
            hoverPoint.gameObject.SetActive(false);
            
            if (hoverAnimation != null)
            {
                StopCoroutine(hoverAnimation);
                hoverAnimation = null;
            }
        }
    }
} 