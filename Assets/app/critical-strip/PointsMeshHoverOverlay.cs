using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using System.Collections;

/// <summary>
/// This component adds hover functionality to a PointsMeshRenderer. 
/// It detects the closest point (from the Points list) to the mouse pointer and, if within a certain threshold, 
/// instantiates or shows a hover indicator prefab at that position with an animated scale effect.
/// This is the simplest solution to provide hover feedback without dynamically modifying the mesh.
/// </summary>
public class PointsMeshHoverOverlay : MonoBehaviour, IPointerMoveHandler, IPointerEnterHandler, IPointerExitHandler, IPointerClickHandler
{
    // Reference to the PointsMeshRenderer component, must be assigned in the Inspector or on the same GameObject
    public PointsMeshRenderer meshRenderer;

    // Prefab for the hover indicator (should be a simple UI element with an Image component)
    public GameObject hoverPrefab;

    // Distance threshold in local coordinates (pixels) to detect a hover
    public float hoverThreshold = 10f;

    // Starting and ending scale for hover animation
    public float startScale = 1f;
    public float endScale = 2f;
    
    // Duration of the hover animation
    public float animationDuration = 0.3f;
    
    // The hover indicator instance
    private GameObject hoverIndicator;
    private RectTransform hoverRect;
    private Image hoverImage;

    // Cached RectTransform of the meshRenderer (used for converting screen to local coordinates)
    private RectTransform meshRectTransform;
    
    // Animation coroutine reference
    private Coroutine animationCoroutine;
    
    // Currently hovered point data
    private Vector2 currentHoverPos;
    private Color currentHoverColor;
    private bool isHovering = false;
    
    // Reference to the App instance for updating real/index values on click
    private App app;
    
    // Reference to the CriticalStripRenderer for coordinate transform
    private CriticalStripRenderer renderer;
    
    // Last time we scrolled (to prevent click right after scroll)
    private float lastScrollTime;
    private const float SCROLL_CLICK_THRESHOLD = 0.1f;

    private void Awake()
    {
        if (meshRenderer == null)
            meshRenderer = GetComponent<PointsMeshRenderer>();
        if (meshRenderer != null)
            meshRectTransform = meshRenderer.GetComponent<RectTransform>();
        
        // Find app reference
        app = FindObjectOfType<App>();
        
        // Find renderer reference
        renderer = FindObjectOfType<CriticalStripRenderer>();
            
        // Initialize the hover indicator
        InitializeHoverIndicator();
    }
    
    private void InitializeHoverIndicator()
    {
        if (hoverPrefab != null && hoverIndicator == null)
        {
            hoverIndicator = Instantiate(hoverPrefab, meshRectTransform);
            hoverRect = hoverIndicator.GetComponent<RectTransform>();
            hoverImage = hoverIndicator.GetComponent<Image>();
            
            if (hoverRect != null)
            {
                // Match the size to the mesh renderer's point size to maintain consistency
                hoverRect.sizeDelta = new Vector2(meshRenderer.PointSize, meshRenderer.PointSize);
                
                // Initial state - invisible and at scale 0
                hoverRect.localScale = Vector3.zero;
                hoverIndicator.SetActive(false);
                
                // Ensure the indicator is rendered on top
                hoverIndicator.transform.SetAsLastSibling();
            }
        }
    }

    public void OnPointerEnter(PointerEventData eventData)
    {
        UpdateHoverIndicator(eventData);
    }

    public void OnPointerMove(PointerEventData eventData)
    {
        UpdateHoverIndicator(eventData);
    }

    public void OnPointerExit(PointerEventData eventData)
    {
        HideHoverIndicator();
    }
    
    public void OnPointerClick(PointerEventData eventData)
    {
        // Ignore clicks that happen right after scrolling
        if (Time.time - lastScrollTime < SCROLL_CLICK_THRESHOLD)
        {
            return;
        }
        
        // Only handle left mouse button clicks
        if (eventData.button != PointerEventData.InputButton.Left)
        {
            return;
        }
        
        if (app == null || renderer == null || !isHovering || meshRectTransform == null)
            return;
            
        // Get the position in local coordinates
        Vector2 localPoint;
        if (!RectTransformUtility.ScreenPointToLocalPointInRectangle(meshRectTransform, eventData.position, eventData.pressEventCamera, out localPoint))
        {
            return;
        }
        
        // Find the nearest point to the click position
        Vector2 closestPoint = Vector2.zero;
        float minDistance = float.MaxValue;
        foreach (var point in meshRenderer.Points)
        {
            float d = Vector2.Distance(localPoint, point);
            if (d < minDistance)
            {
                minDistance = d;
                closestPoint = point;
            }
        }
        
        // If the click is within hover threshold of a point
        if (minDistance <= hoverThreshold)
        {
            // Convert viewport position back to strip coordinates
            Vector2 stripPos = renderer.GetTransform().ViewportToStrip(closestPoint);
            
            // Check if the click is near the critical line (x=0.5)
            float distanceFromHalf = Mathf.Abs(stripPos.x - 0.5f);
            
            // If the click is near the critical line, use the dedicated method
            float criticalValueThreshold = renderer.GetTransform().CriticalValueThreshold;
            if (distanceFromHalf <= criticalValueThreshold)
            {
                // Use critical line exact value
                app.SetToExactCriticalLine();
            }
            else
            {
                // Set real value directly
                app.Real = stripPos.x;
            }
            
            // Update index
            app.Index = stripPos.y;
        }
    }

    private void UpdateHoverIndicator(PointerEventData eventData)
    {
        if (meshRectTransform == null || meshRenderer == null || meshRenderer.Points == null || meshRenderer.Points.Count == 0)
            return;
        
        // Convert mouse position to local coordinates of the meshRectTransform
        Vector2 localPoint;
        if (!RectTransformUtility.ScreenPointToLocalPointInRectangle(meshRectTransform, eventData.position, eventData.pressEventCamera, out localPoint))
        {
            HideHoverIndicator();
            return;
        }

        // Find the nearest point to the localPoint
        Vector2 closestPoint = Vector2.zero;
        float minDistance = float.MaxValue;
        foreach (var point in meshRenderer.Points)
        {
            float d = Vector2.Distance(localPoint, point);
            if (d < minDistance)
            {
                minDistance = d;
                closestPoint = point;
            }
        }

        // If within the hover threshold, show/update the hover indicator
        if (minDistance <= hoverThreshold)
        {
            // If we're already hovering over this point, don't restart the animation
            if (isHovering && Vector2.Distance(closestPoint, currentHoverPos) < 0.1f)
            {
                return;
            }
            
            currentHoverPos = closestPoint;
            currentHoverColor = meshRenderer.color;
            
            // Initialize the hover indicator if needed
            if (hoverIndicator == null)
            {
                InitializeHoverIndicator();
            }
            
            if (hoverIndicator != null)
            {
                // Position the indicator at the closest point
                if (hoverRect != null)
                {
                    hoverRect.anchoredPosition = closestPoint;
                    
                    // Set the color to match the point being hovered
                    if (hoverImage != null)
                    {
                        hoverImage.color = currentHoverColor;
                    }
                    
                    // Restart the animation
                    if (animationCoroutine != null)
                    {
                        StopCoroutine(animationCoroutine);
                    }
                    
                    // Start animation
                    isHovering = true;
                    hoverIndicator.SetActive(true);
                    animationCoroutine = StartCoroutine(AnimateHover());
                }
            }
        }
        else
        {
            HideHoverIndicator();
        }
    }

    private void HideHoverIndicator()
    {
        if (!isHovering)
            return;
            
        isHovering = false;
        
        if (animationCoroutine != null)
        {
            StopCoroutine(animationCoroutine);
        }
        
        // Start fade out animation
        animationCoroutine = StartCoroutine(AnimateHoverOut());
    }
    
    private IEnumerator AnimateHover()
    {
        // Ensure the hover indicator is shown
        hoverIndicator.SetActive(true);
        
        // Animate from startScale to endScale
        float startTime = Time.time;
        float progress = 0f;
        
        // Start from a small scale
        hoverRect.localScale = Vector3.one * startScale;
        
        while (progress < 1f)
        {
            progress = (Time.time - startTime) / animationDuration;
            // Use smooth step for a nice easing effect
            float easedProgress = Mathf.SmoothStep(0, 1, progress);
            float currentScale = Mathf.Lerp(startScale, endScale, easedProgress);
            
            hoverRect.localScale = Vector3.one * currentScale;
            
            yield return null;
        }
        
        // Ensure we end at the target scale
        hoverRect.localScale = Vector3.one * endScale;
    }
    
    private IEnumerator AnimateHoverOut()
    {
        // Animate from current scale to 0
        float startTime = Time.time;
        float progress = 0f;
        float currentStartScale = hoverRect.localScale.x;
        
        while (progress < 1f)
        {
            progress = (Time.time - startTime) / (animationDuration * 0.5f); // Faster fade out
            // Use smooth step for a nice easing effect
            float easedProgress = Mathf.SmoothStep(0, 1, progress);
            float currentScale = Mathf.Lerp(currentStartScale, 0f, easedProgress);
            
            hoverRect.localScale = Vector3.one * currentScale;
            
            yield return null;
        }
        
        // Hide the indicator when animation is complete
        hoverRect.localScale = Vector3.zero;
        hoverIndicator.SetActive(false);
    }
    
    // Update this method when scrolling is detected, similar to the CriticalStripRenderer
    public void UpdateScrollTime()
    {
        lastScrollTime = Time.time;
    }
} 