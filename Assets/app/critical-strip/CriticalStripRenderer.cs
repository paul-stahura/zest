using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using System.Collections.Generic;
using System.Collections;
using System;

/// <summary>
/// Renders and manages interactive points in the critical strip visualization.
/// Handles point creation, hover effects, and click interactions.
/// </summary>
[RequireComponent(typeof(RectTransform))]
public class CriticalStripRenderer : MonoBehaviour, IPointerClickHandler, IPointerEnterHandler, IPointerExitHandler, IPointerMoveHandler
{
    [Header("Point Properties")]
    [SerializeField] private float pointSize = 8f;        // Base size of points in pixels
    [SerializeField] private float hoverScale = 4f;       // How much larger points become when hovered (multiplier)
    [SerializeField] private float hoverThresholdMultiplier = 1.2f; // Multiplier of pointSize for hover detection
    [SerializeField] private float hoverAnimationDuration = 0.4f;  // Total duration of hover animation in seconds
    [SerializeField] private float overshootScale = 6f;   // Maximum scale during rubber band effect
    [SerializeField] private GameObject pointPrefab;      // Prefab used to create point objects
    
    [Header("References")]
    [SerializeField] private CoordinateDisplay coordinateDisplay;  // UI component to show point coordinates
    
    // Core components
    private CriticalStripTransform transform;  // Handles coordinate transformations between strip and viewport
    private Dictionary<PointSet, List<RectTransform>> pointObjects;  // Maps point sets to their UI representations
    private RectTransform hoveredPoint;  // Currently hovered point, if any
    private App app;  // Reference to main app for updating selected coordinates
    private Queue<PointSet> pendingPointSets = new Queue<PointSet>();  // Points waiting to be added after initialization
    private bool isInitialized = false;  // Whether the renderer is ready to display points
    
    // Animation state tracking
    private Dictionary<RectTransform, Coroutine> hoverAnimations = new Dictionary<RectTransform, Coroutine>();  // Active hover animations
    private Dictionary<RectTransform, bool> isPointHovered = new Dictionary<RectTransform, bool>();  // Hover state of each point

    private void Awake()
    {
        pointObjects = new Dictionary<PointSet, List<RectTransform>>();
        app = FindObjectOfType<App>();
    }

    /// <summary>
    /// Initializes the renderer and processes any pending point sets
    /// </summary>
    private void Start()
    {
        InitializeTransform();
        
        // Process any point sets that were added before initialization
        while (pendingPointSets.Count > 0)
        {
            var pointSet = pendingPointSets.Dequeue();
            AddPointSetInternal(pointSet);
        }
    }

    /// <summary>
    /// Sets up the coordinate transformation system
    /// </summary>
    private void InitializeTransform()
    {
        if (!isInitialized)
        {
            var rectTransform = GetComponent<RectTransform>();
            if (rectTransform != null)
            {
                Debug.Log($"[CriticalStripRenderer] Initializing transform with viewport rect: {rectTransform.rect}");
                transform = new CriticalStripTransform(rectTransform, 1f, 7f);  // Changed from default 0,7 to 1,7
                isInitialized = true;
                Debug.Log("[CriticalStripRenderer] Transform initialized successfully");
            }
            else
            {
                Debug.LogError("CriticalStripRenderer: Failed to get RectTransform component");
            }
        }
    }
    
    /// <summary>
    /// Updates the visible range of indices in the strip
    /// </summary>
    public void SetIndexRange(float min, float max)
    {
        if (!isInitialized)
        {
            Debug.LogWarning("CriticalStripRenderer: Attempting to set index range before initialization");
            return;
        }
        transform.SetIndexRange(min, max);
        UpdateAllPoints();
    }
    
    /// <summary>
    /// Adds a new set of points to the visualization
    /// </summary>
    public void AddPointSet(PointSet pointSet)
    {
        if (pointSet == null) return;

        if (!isInitialized)
        {
            // Queue the point set for addition after initialization
            pendingPointSets.Enqueue(pointSet);
            return;
        }

        AddPointSetInternal(pointSet);
    }

    /// <summary>
    /// Internal method to create UI elements for a point set
    /// </summary>
    private void AddPointSetInternal(PointSet pointSet)
    {
        if (pointObjects.ContainsKey(pointSet)) return;
        
        var points = new List<RectTransform>();
        pointObjects[pointSet] = points;
        
        foreach (var point in pointSet.Points)
        {
            CreatePointObject(point, pointSet.Color, points);
        }
    }
    
    /// <summary>
    /// Removes a point set and its UI elements from the visualization
    /// </summary>
    public void RemovePointSet(PointSet pointSet)
    {
        if (!isInitialized || pointSet == null) return;
        
        if (!pointObjects.TryGetValue(pointSet, out var points)) return;
        
        foreach (var point in points)
        {
            if (point != null)
                Destroy(point.gameObject);
        }
        
        pointObjects.Remove(pointSet);
    }
    
    /// <summary>
    /// Creates a single point UI element at the specified position
    /// </summary>
    private void CreatePointObject(Vector2 stripPos, Color color, List<RectTransform> points)
    {
        if (!isInitialized || pointPrefab == null) return;

        // Debug.Log($"[CriticalStripRenderer] Creating point at strip coordinates: {stripPos}");
        var viewportPos = transform.StripToViewport(stripPos);
        // Debug.Log($"[CriticalStripRenderer] Point viewport position: {viewportPos}, " + 
        //           $"viewport rect: {GetComponent<RectTransform>().rect}");

        var obj = Instantiate(pointPrefab, viewportPos, Quaternion.identity, transform.ViewportRect);
        var rectTransform = obj.GetComponent<RectTransform>();
        var image = obj.GetComponent<Image>();
        
        if (rectTransform != null && image != null)
        {
            rectTransform.sizeDelta = new Vector2(pointSize, pointSize);
            rectTransform.anchoredPosition = viewportPos;
            image.color = color;
            points.Add(rectTransform);
            
            // Debug.Log($"[CriticalStripRenderer] Point created with anchoredPosition: {rectTransform.anchoredPosition}, " +
            //         $"size: {rectTransform.sizeDelta}, color: {color}");
        }
        else
        {
            Debug.LogError("[CriticalStripRenderer] Failed to get RectTransform or Image component on point prefab");
        }
    }
    
    /// <summary>
    /// Updates the positions of all points in the visualization
    /// </summary>
    private void UpdateAllPoints()
    {
        if (!isInitialized) return;

        Debug.Log($"[CriticalStripRenderer] Updating all points. Viewport rect: {GetComponent<RectTransform>().rect}");

        foreach (var kvp in pointObjects)
        {
            var pointSet = kvp.Key;
            var points = kvp.Value;
            
            // Ensure we have the right number of point objects
            while (points.Count < pointSet.Points.Count)
            {
                CreatePointObject(Vector2.zero, pointSet.Color, points);
            }
            
            // Update positions
            for (int i = 0; i < pointSet.Points.Count; i++)
            {
                var stripPos = pointSet.Points[i];
                var viewportPos = transform.StripToViewport(stripPos);
                points[i].anchoredPosition = viewportPos;
                
                Debug.Log($"[CriticalStripRenderer] Updated point {i} - strip: {stripPos}, " +
                          $"viewport: {viewportPos}, anchored: {points[i].anchoredPosition}");
            }
        }
    }
    
    /// <summary>
    /// Handles point click events, updating the app's real and index values
    /// </summary>
    public void OnPointerClick(PointerEventData eventData)
    {
        if (app == null || !isInitialized) return;
        
        // First check if we clicked directly on a point
        Vector2 viewportMousePos;
        RectTransformUtility.ScreenPointToLocalPointInRectangle(
            transform.ViewportRect, 
            eventData.position, 
            null,
            out viewportMousePos
        );

        float closestDist = float.MaxValue;
        Point closestPoint = null;
        float hoverThreshold = pointSize * hoverThresholdMultiplier;
        
        foreach (var kvp in pointObjects)
        {
            if (!kvp.Key.IsActive) continue;
            
            var pointSet = kvp.Key;
            var originalPoints = pointSet.OriginalPoints;
            var points = kvp.Value;
            
            for (int i = 0; i < points.Count; i++)
            {
                var dist = Vector2.Distance(viewportMousePos, points[i].anchoredPosition);
                if (dist < closestDist && dist < hoverThreshold)
                {
                    closestDist = dist;
                    closestPoint = originalPoints[i];
                }
            }
        }
        
        if (closestPoint != null)
        {
            // Use the original double-precision coordinates
            app.Real = closestPoint.Real;
            app.Index = closestPoint.Index;
            Debug.Log($"Clicked point: using original coordinates ({closestPoint.Real:G17}, {closestPoint.Index:G17})");
            return;
        }
        
        // If we didn't click on a point, use the strip coordinates from the click position
        var stripPos = transform.ScreenToStrip(eventData.position);
        Debug.Log($"Click in empty space: using transformed coordinates ({stripPos.x:G17}, {stripPos.y:G17})");
        
        // If the click is near the critical line, use the dedicated method
        float distanceFromHalf = Mathf.Abs(stripPos.x - 0.5f);
        if (distanceFromHalf <= transform.CriticalValueThreshold)
        {
            Debug.Log($"Click near critical line, setting to exact 0.5");
            app.SetToExactCriticalLine();
        }
        else
        {
            app.Real = stripPos.x;
        }
        
        app.Index = stripPos.y;
    }
    
    public void OnPointerEnter(PointerEventData eventData)
    {
        // Handle pointer enter if needed
    }
    
    /// <summary>
    /// Animates a point's scale with a rubber band effect
    /// Phase 1: Quick growth to overshoot scale
    /// Phase 2: Elastic bounce back to target scale
    /// </summary>
    private IEnumerator AnimateHoverScale(RectTransform point, float targetScale)
    {
        float startScale = point.localScale.x;
        float elapsedTime = 0f;
        float overshootDuration = hoverAnimationDuration * 0.4f; // Time to reach max overshoot
        float settleDuration = hoverAnimationDuration * 0.6f; // Time to settle back to target
        
        // Phase 1: Overshoot animation
        while (elapsedTime < overshootDuration)
        {
            elapsedTime += Time.deltaTime;
            float t = elapsedTime / overshootDuration;
            // Ease out quad for smooth acceleration
            t = t * (2 - t);
            float currentScale = Mathf.Lerp(startScale, targetScale == 1f ? 1f : overshootScale, t);
            point.localScale = Vector3.one * currentScale;
            yield return null;
        }
        
        // Phase 2: Settle back to target scale
        float currentOvershootScale = point.localScale.x;
        elapsedTime = 0f;
        
        while (elapsedTime < settleDuration)
        {
            elapsedTime += Time.deltaTime;
            float t = elapsedTime / settleDuration;
            // Elastic ease out for bouncy effect
            t = Mathf.Sin(-13f * Mathf.PI * 0.5f * (t + 1)) * Mathf.Pow(2f, -10f * t) + 1f;
            float currentScale = Mathf.Lerp(currentOvershootScale, targetScale, t);
            point.localScale = Vector3.one * currentScale;
            yield return null;
        }
        
        point.localScale = Vector3.one * targetScale;
        
        if (hoverAnimations.ContainsKey(point))
        {
            hoverAnimations.Remove(point);
        }
    }

    /// <summary>
    /// Manages point scaling animations and hover state
    /// Prevents re-triggering animations while a point is already hovered
    /// </summary>
    private void SetPointScale(RectTransform point, float scale)
    {
        if (point == null) return;

        // If we're trying to set hover scale and point is already hovered, ignore
        if (scale > 1f && isPointHovered.TryGetValue(point, out bool hovered) && hovered)
        {
            return;
        }
        
        // Stop any existing animation
        if (hoverAnimations.TryGetValue(point, out var existingCoroutine))
        {
            StopCoroutine(existingCoroutine);
            hoverAnimations.Remove(point);
        }
        
        // Update hover state
        isPointHovered[point] = scale > 1f;
        
        // Start new animation
        var newCoroutine = StartCoroutine(AnimateHoverScale(point, scale));
        hoverAnimations[point] = newCoroutine;
    }

    /// <summary>
    /// Handles mouse exit events, resetting point scale and coordinate display
    /// </summary>
    public void OnPointerExit(PointerEventData eventData)
    {
        if (hoveredPoint != null)
        {
            SetPointScale(hoveredPoint, 1f);
            hoveredPoint = null;
        }
        
        if (coordinateDisplay != null)
        {
            coordinateDisplay.UpdateDisplay();
        }
    }
    
    /// <summary>
    /// Handles mouse movement, managing point hover states and coordinate display
    /// Uses distance-based detection with hoverThreshold to determine hover state
    /// </summary>
    public void OnPointerMove(PointerEventData eventData)
    {
        if (!isInitialized) return;

        // Convert screen position to viewport coordinates for consistent distance calculations
        Vector2 viewportMousePos;
        RectTransformUtility.ScreenPointToLocalPointInRectangle(
            transform.ViewportRect, 
            eventData.position, 
            null, // No camera needed for overlay canvas
            out viewportMousePos
        );

        float closestDist = float.MaxValue;
        RectTransform newHoveredPoint = null;
        Vector2 closestPointStripPos = Vector2.zero;
        
        // Calculate hover threshold in viewport coordinates
        float hoverThreshold = pointSize * hoverThresholdMultiplier;
        
        foreach (var kvp in pointObjects)
        {
            if (!kvp.Key.IsActive) continue;
            
            foreach (var point in kvp.Value)
            {
                // Use viewport coordinates for distance calculation
                var dist = Vector2.Distance(viewportMousePos, point.anchoredPosition);
                
                if (dist < closestDist && dist < hoverThreshold)
                {
                    closestDist = dist;
                    newHoveredPoint = point;
                    closestPointStripPos = transform.ViewportToStrip(point.anchoredPosition);
                }
            }
        }
        
        // Only trigger changes if we're hovering a different point
        if (newHoveredPoint != hoveredPoint)
        {
            if (hoveredPoint != null)
            {
                SetPointScale(hoveredPoint, 1f);
            }
            
            hoveredPoint = newHoveredPoint;
            
            if (hoveredPoint != null)
            {
                SetPointScale(hoveredPoint, hoverScale);
            }
        }
        
        if (coordinateDisplay != null)
        {
            Vector2 displayPos = hoveredPoint != null ? closestPointStripPos : transform.ScreenToStrip(eventData.position);
            coordinateDisplay.UpdateHoverCoordinates(displayPos.x, displayPos.y);
        }
    }
} 