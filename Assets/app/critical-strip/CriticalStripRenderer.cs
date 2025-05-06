using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using System.Collections.Generic;
using System.Collections;
using System;
using System.Linq;

/// <summary>
/// Renders and manages interactive points in the critical strip visualization.
/// Handles point creation, hover effects, and click interactions.
/// </summary>
[RequireComponent(typeof(RectTransform))]
public class CriticalStripRenderer : MonoBehaviour, IPointerClickHandler, IPointerEnterHandler, IPointerExitHandler, IPointerMoveHandler, IBeginDragHandler, IDragHandler, IEndDragHandler, IScrollHandler
{
    [Header("Point Properties")]
    [SerializeField] private float pointSize = 4f;        // Base size of points in pixels
    [SerializeField] private float hoverScale = 4f;       // How much larger points become when hovered (multiplier)
    [SerializeField] private float hoverThresholdMultiplier = 1.2f; // Multiplier of pointSize for hover detection
    [SerializeField] private float hoverAnimationDuration = 0.4f;  // Total duration of hover animation in seconds
    [SerializeField] private float overshootScale = 10f;   // Maximum scale during rubber band effect
    [SerializeField] private GameObject pointPrefab;      // Prefab used to create point objects
    
    [Header("Critical Line")]
    [SerializeField] private Color criticalLineColor = new Color(1, 1, 1, 0.1f);  // Very faint white color
    [SerializeField] private float criticalLineWidth = 1f;  // Width of the critical line in pixels
    private RectTransform criticalLine;  // Reference to the critical line object
    
    [Header("Current Position Indicator")]
    [SerializeField] private float currentPosSize = 8;        // Size of the current position indicator
    [SerializeField] private float blinkRate = 0.5f;            // How fast the indicator blinks (in seconds)
    [SerializeField] private Color indicatorColor = new Color(1f, 0f, 1f, .8f); // Fuchsia color
    
    [Header("Zoom and Scroll Properties")]
    [SerializeField] private float zoomSensitivity = 0.1f;  // How fast to zoom with mouse wheel
    [SerializeField] private float minZoom = 0.5f;        // Minimum zoom level (maximum range)
    [SerializeField] private float maxZoom = 500f;         // Maximum zoom level (minimum range)
    [SerializeField] private float scrollSensitivity = 1f;  // How fast to scroll when dragging
    [SerializeField] private float currentZoom = 0.8f;

    
    [Header("Centering")]
    [SerializeField] private Button centerButton; // UI button to center on current position
    private Coroutine centerCoroutine;
    private const float centerAnimDuration = 0.5f; // seconds
    
    // Core components
    private CriticalStripTransform transform;  // Handles coordinate transformations between strip and viewport
    private Dictionary<PointSet, List<RectTransform>> pointObjects;  // Maps point sets to their UI representations
    private RectTransform hoveredPoint;  // Currently hovered point, if any
    [SerializeField] private App app;  // Reference to main app for updating selected coordinates
    private Queue<PointSet> pendingPointSets = new Queue<PointSet>();  // Points waiting to be added after initialization
    private bool isInitialized = false;  // Whether the renderer is ready to display points
    
    // Animation state tracking
    private Dictionary<RectTransform, Coroutine> hoverAnimations = new Dictionary<RectTransform, Coroutine>();  // Active hover animations
    private Dictionary<RectTransform, bool> isPointHovered = new Dictionary<RectTransform, bool>();  // Hover state of each point

    private RectTransform currentPosIndicator;    // The UI element for current position
    private float blinkTimer;                     // Timer for blinking animation
    private bool isVisible = true;                // Current visibility state

    private Vector2 lastDragPosition;
    private bool isDragging = false;

    private float lastScrollTime;
    private const float SCROLL_CLICK_THRESHOLD = 0.1f; // Ignore clicks within 100ms of scrolling

    // Event for notifying when the viewport changes (zoom or pan)
    public event System.Action OnViewportChanged;

    private bool isUpdating = false;

    private bool isInRange = false; // Add this field to track if indicator is in visible range

    /// <summary>
    /// Component to store the original point data with each visual point
    /// </summary>
    private class PointData : MonoBehaviour
    {
        public Point originalPoint;
    }

    private void Awake()
    {
        pointObjects = new Dictionary<PointSet, List<RectTransform>>();
        app = FindObjectOfType<App>();
        
        if (app != null)
        {
            app.IndexChanged += OnIndexChanged;
            app.RealChanged += OnRealChanged;
        }
    }

    /// <summary>
    /// Initializes the renderer and processes any pending point sets
    /// </summary>
    private void Start()
    {
        InitializeTransform();
        
        // Initialize the critical line
        if (isInitialized)
        {
            InitializeCriticalLine();
        }
        
        // Initialize the current position indicator after transform is ready
        if (isInitialized && app != null)
        {
            InitializeCurrentPosIndicator();
        }

        // Configure the Image component for raycasts without blocking points
        var image = GetComponent<Image>();
        if (image == null)
        {
            // Add Image component if it doesn't exist
            image = gameObject.AddComponent<Image>();
        }
        
        // Configure image for raycasts only
        image.raycastTarget = true; // Keep raycast enabled

        // Add or ensure we have a RectMask2D for clipping points
        var mask = GetComponent<RectMask2D>();
        if (mask == null)
        {
            mask = gameObject.AddComponent<RectMask2D>();
        }
        
        // Make sure standard Mask is disabled if it exists
        var standardMask = GetComponent<Mask>();
        if (standardMask != null)
        {
            standardMask.enabled = false;
        }

        // Make sure we have a RectTransform (required by [RequireComponent])
        var rectTransform = GetComponent<RectTransform>();
        if (rectTransform == null)
        {
            Debug.LogError("[CriticalStripRenderer] Missing required RectTransform component");
            return;
        }

        // Ensure we have a parent Canvas
        Canvas parentCanvas = GetComponentInParent<Canvas>();
        if (parentCanvas == null)
        {
            Debug.LogError("[CriticalStripRenderer] Must be child of a Canvas");
            return;
        }

        // Clear any pending point sets to prevent auto-loading
        pendingPointSets.Clear();

        // Wire up center button if assigned
        if (centerButton != null)
        {
            centerButton.onClick.AddListener(CenterOnCurrentPosition);
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
                // Debug.Log($"[CriticalStripRenderer] Initializing transform with viewport rect: {rectTransform.rect}");
                transform = new CriticalStripTransform(rectTransform, 1f, 7f); 
                isInitialized = true;
                
                // Apply initial zoom level
                float currentRange = transform.MaxIndex - transform.MinIndex;
                float newRange = currentRange / currentZoom;
                float center = (transform.MaxIndex + transform.MinIndex) * 0.5f;
                float newMin = center - (newRange * 0.5f);
                float newMax = center + (newRange * 0.5f);
                
                // Prevent scrolling below -1
                if (newMin < -1f)
                {
                    float adjustment = -1f - newMin;
                    newMin = -1f;
                    newMax += adjustment;
                }
                
                transform.SetIndexRange(newMin, newMax);
                // Debug.Log("[CriticalStripRenderer] Transform initialized successfully");
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
        
        // Update the index labels
        var labelRenderer = GetComponent<IndexLabelsRenderer>();
        if (labelRenderer != null)
        {
            labelRenderer.UpdateLabels(min, max);
        }

        // Notify listeners that the viewport has changed
        OnViewportChanged?.Invoke();
    }
    
    /// <summary>
    /// Adds a new set of points to the visualization
    /// </summary>
    public void AddPointSet(PointSet pointSet)
    {
        if (pointSet == null) return;

        // Debug.Log($"[CriticalStripRenderer] Adding point set '{pointSet.Name}' with SkipCriticalLine={pointSet.SkipCriticalLine}");

        if (!isInitialized)
        {
            // Queue the point set for addition after initialization
            pendingPointSets.Enqueue(pointSet);
            // Debug.Log("[CriticalStripRenderer] Not initialized yet, queuing point set");
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
        
        // Create points for each point in the set
        foreach (var point in pointSet.OriginalPoints)
        {
            // Create point using original coordinates
            Vector2 stripPos = new Vector2((float)point.Real, (float)point.Index);
            CreatePointObject(stripPos, pointSet.Color, points, point);
        }
    }
    
    /// <summary>
    /// Removes a point set and its UI elements from the visualization
    /// </summary>
    public void RemovePointSet(PointSet pointSet)
    {
        // Debug.Log($"[CriticalStripRenderer] RemovePointSet called for point set: {(pointSet != null ? pointSet.Name : "null")}");
        // Debug.Log($"[CriticalStripRenderer] Current initialization state: {isInitialized}");
        
        if (!isInitialized || pointSet == null)
        {
            Debug.LogWarning($"[CriticalStripRenderer] Cannot remove point set: {(pointSet == null ? "null point set" : "not initialized")}");
            return;
        }
        
        // Debug.Log($"[CriticalStripRenderer] Looking up point set in dictionary. Current sets: {string.Join(", ", pointObjects.Keys.Select(ps => ps.Name))}");
        
        if (!pointObjects.TryGetValue(pointSet, out var points))
        {
            Debug.LogWarning($"[CriticalStripRenderer] Point set '{pointSet.Name}' not found in pointObjects dictionary");
            return;
        }
        
        // Debug.Log($"[CriticalStripRenderer] Found {points.Count} points to remove for set '{pointSet.Name}'");
        // Debug.Log($"[CriticalStripRenderer] Parent transform is: {transform.ViewportRect.name}");
        
        int destroyedCount = 0;
        int nullCount = 0;
        
        foreach (var point in points)
        {
            if (point != null)
            {
                // Debug.Log($"[CriticalStripRenderer] Destroying point GameObject at position {point.anchoredPosition} under parent {point.parent?.name}");
                
                // Remove any hover animations
                if (hoverAnimations.TryGetValue(point, out var coroutine))
                {
                    if (coroutine != null)
                    {
                        // Debug.Log("[CriticalStripRenderer] Stopping hover animation coroutine");
                        StopCoroutine(coroutine);
                    }
                    hoverAnimations.Remove(point);
                }
                isPointHovered.Remove(point);
                
                // Try both Destroy and DestroyImmediate
                try
                {
                    DestroyImmediate(point.gameObject);
                    destroyedCount++;
                    // Debug.Log("[CriticalStripRenderer] Successfully destroyed point GameObject");
                }
                catch (Exception e)
                {
                    Debug.LogError($"[CriticalStripRenderer] Error destroying point: {e.Message}");
                    try
                    {
                        Destroy(point.gameObject);
                        destroyedCount++;
                        // Debug.Log("[CriticalStripRenderer] Fallback to Destroy successful");
                    }
                    catch (Exception e2)
                    {
                        Debug.LogError($"[CriticalStripRenderer] Error in fallback Destroy: {e2.Message}");
                    }
                }
            }
            else
            {
                nullCount++;
                Debug.LogWarning("[CriticalStripRenderer] Found null point in points list");
            }
        }
        
        // Debug.Log($"[CriticalStripRenderer] Cleanup summary - Destroyed: {destroyedCount}, Null points: {nullCount}");
        
        points.Clear();
        pointObjects.Remove(pointSet);
        
        // Debug.Log($"[CriticalStripRenderer] Point set removed. Remaining sets: {pointObjects.Count}");
        if (pointObjects.Count > 0)
        {
            // Debug.Log($"[CriticalStripRenderer] Remaining sets: {string.Join(", ", pointObjects.Keys.Select(ps => ps.Name))}");
        }
    }
    
    /// <summary>
    /// Creates a single point UI element at the specified position
    /// </summary>
    private void CreatePointObject(Vector2 stripPos, Color color, List<RectTransform> points, Point originalPoint)
    {
        if (!isInitialized || pointPrefab == null) return;

        // Convert strip coordinates to viewport
        var viewportPos = transform.StripToViewport(stripPos);
        
        // Get the viewport rect and check if the point (including its size) is within the bounds
        var rect = transform.ViewportRect.rect;
        float halfSize = pointSize * 0.5f;
        
        // Skip points entirely outside the viewport bounds (both x and y)
        if (viewportPos.x + halfSize < rect.x || viewportPos.x - halfSize > rect.x + rect.width ||
            viewportPos.y + halfSize < rect.y || viewportPos.y - halfSize > rect.y + rect.height)
        {
            // Point is outside viewport bounds, don't create it
            return;
        }

        var obj = Instantiate(pointPrefab, viewportPos, Quaternion.identity, transform.ViewportRect);
        var rectTransform = obj.GetComponent<RectTransform>();
        var image = obj.GetComponent<Image>();
        
        if (rectTransform != null && image != null)
        {
            rectTransform.sizeDelta = new Vector2(pointSize, pointSize);
            rectTransform.anchoredPosition = viewportPos;
            image.color = color;
            
            // Add the original point data
            var pointData = obj.AddComponent<PointData>();
            pointData.originalPoint = originalPoint;
            
            points.Add(rectTransform);
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

        foreach (var kvp in pointObjects)
        {
            var pointSet = kvp.Key;
            var points = kvp.Value;
            var originalPoints = pointSet.OriginalPoints;
            
            // Clear existing points if we're rebuilding
            foreach (var point in points)
            {
                if (point != null)
                {
                    Destroy(point.gameObject);
                }
            }
            points.Clear();
            
            // Create points for each point in the set
            foreach (var point in originalPoints)
            {
                // Create point using original coordinates
                Vector2 stripPos = new Vector2((float)point.Real, (float)point.Index);
                CreatePointObject(stripPos, pointSet.Color, points, point);
            }
        }
    }
    
    /// <summary>
    /// Handles point click events, updating the app's real and index values
    /// </summary>
    public void OnPointerClick(PointerEventData eventData)
    {
        if (app == null || !isInitialized) return;
        
        // Ignore clicks that happen right after scrolling or during drag
        if (Time.time - lastScrollTime < SCROLL_CLICK_THRESHOLD || isDragging)
        {
            // Debug.Log("[CriticalStripRenderer] Ignoring click due to recent scroll or drag");
            return;
        }
        
        // Only handle left mouse button clicks
        if (eventData.button != PointerEventData.InputButton.Left)
        {
            return;
        }

        // Guard against reentrant updates
        if (isUpdating) return;
        isUpdating = true;
        
        try
        {
            // First check if we clicked directly on a point
            Vector2 viewportMousePos;
            RectTransformUtility.ScreenPointToLocalPointInRectangle(
                transform.ViewportRect, 
                eventData.position, 
                null,
                out viewportMousePos
            );

            // Debug.Log($"[CriticalStripRenderer] Click at viewport position: {viewportMousePos}");

            float closestDist = float.MaxValue;
            Point closestPoint = null;
            RectTransform closestTransform = null;
            float hoverThreshold = pointSize * hoverThresholdMultiplier;
            
            foreach (var kvp in pointObjects)
            {
                if (!kvp.Key.IsActive) continue;
                
                foreach (var pointTransform in kvp.Value)
                {
                    var dist = Vector2.Distance(viewportMousePos, pointTransform.anchoredPosition);
                    if (dist < closestDist && dist < hoverThreshold)
                    {
                        var pointData = pointTransform.GetComponent<PointData>();
                        if (pointData != null)
                        {
                            closestDist = dist;
                            closestPoint = pointData.originalPoint;
                            closestTransform = pointTransform;
                        }
                    }
                }
            }
            
            if (closestPoint != null)
            {
                // Debug.Log($"[CriticalStripRenderer] Found closest point:");
                // Debug.Log($"  Original coordinates (double): Real={closestPoint.Real:G17}, Index={closestPoint.Index:G17}");
                // Debug.Log($"  Visual position (viewport): {closestTransform.anchoredPosition}");
                Vector2 transformedStripPos = transform.ViewportToStrip(closestTransform.anchoredPosition);
                // Debug.Log($"  Transformed back to strip: Real={transformedStripPos.x:G17}, Index={transformedStripPos.y:G17}");
                // Debug.Log($"  Distance from click: {closestDist} pixels (threshold: {hoverThreshold})");
                // Debug.Log($"  Current zoom level: {currentZoom}");

                // Batch the updates together
                double newReal = closestPoint.Real;
                double newIndex = closestPoint.Index;
                
                // Debug.Log($"[CriticalStripRenderer] Sending to App: Real={newReal:G17}, Index={newIndex:G17}");
                
                // Temporarily unsubscribe from events
                app.IndexChanged -= OnIndexChanged;
                app.RealChanged -= OnRealChanged;
                
                // Update both values
                app.Real = newReal;
                app.Index = newIndex;
                
                // Resubscribe to events
                app.IndexChanged += OnIndexChanged;
                app.RealChanged += OnRealChanged;
                
                // Do a single update of the indicator
                UpdateCurrentPosIndicator();
                return;
            }
            
            // If we didn't click on a point, use the strip coordinates from the click position
            var stripPos = transform.ScreenToStrip(eventData.position);
            
            // Debug.Log($"[CriticalStripRenderer] No point clicked, using strip coordinates: Real={stripPos.x:G17}, Index={stripPos.y:G17}");
            
            // If the click is near the critical line, use the dedicated method
            float distanceFromHalf = Mathf.Abs(stripPos.x - 0.5f);
            if (distanceFromHalf <= transform.CriticalValueThreshold)
            {
                // Debug.Log($"[CriticalStripRenderer] Click near critical line (distance: {distanceFromHalf:G17}), snapping to 0.5");
                app.SetToExactCriticalLine();
            }
            else
            {
                app.Real = stripPos.x;
            }
            
            app.Index = stripPos.y;
        }
        finally
        {
            isUpdating = false;
        }
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
        if (point == null) yield break;

        float startScale = point.localScale.x;
        float localOvershootScale = targetScale > 1f ? this.overshootScale : targetScale;
        float overshootDuration = hoverAnimationDuration * 0.4f;
        float settleDuration = hoverAnimationDuration * 0.6f;
        float elapsedTime = 0f;

        // Phase 1: Overshoot
        while (elapsedTime < overshootDuration)
        {
            if (point == null)
            {
                if (hoverAnimations.ContainsKey(point))
                {
                    hoverAnimations.Remove(point);
                }
                if (isPointHovered.ContainsKey(point))
                {
                    isPointHovered.Remove(point);
                }
                yield break;
            }

            elapsedTime += Time.deltaTime;
            float t = elapsedTime / overshootDuration;
            // Ease out quad for smooth acceleration
            t = t * (2 - t);
            float currentScale = Mathf.Lerp(startScale, targetScale == 1f ? 1f : localOvershootScale, t);
            point.localScale = Vector3.one * currentScale;
            yield return null;
        }

        if (point == null)
        {
            CleanupPointTracking(point);
            yield break;
        }
        
        // Phase 2: Settle back to target scale
        float currentOvershootScale = point.localScale.x;
        elapsedTime = 0f;
        
        while (elapsedTime < settleDuration)
        {
            if (point == null)
            {
                CleanupPointTracking(point);
                yield break;
            }

            elapsedTime += Time.deltaTime;
            float t = elapsedTime / settleDuration;
            // Elastic ease out for bouncy effect
            t = Mathf.Sin(-13f * Mathf.PI * 0.5f * (t + 1)) * Mathf.Pow(2f, -10f * t) + 1f;
            float currentScale = Mathf.Lerp(currentOvershootScale, targetScale, t);
            point.localScale = Vector3.one * currentScale;
            yield return null;
        }

        if (point != null)
        {
            point.localScale = Vector3.one * targetScale;
        }
        
        CleanupPointTracking(point);
    }

    private void CleanupPointTracking(RectTransform point)
    {
        if (hoverAnimations.ContainsKey(point))
        {
            hoverAnimations.Remove(point);
        }
        if (isPointHovered.ContainsKey(point))
        {
            isPointHovered.Remove(point);
        }
    }

    /// <summary>
    /// Manages point scaling animations and hover state
    /// Prevents re-triggering animations while a point is already hovered
    /// </summary>
    private void SetPointScale(RectTransform point, float scale)
    {
        if (point == null) 
        {
            Debug.LogWarning("[CriticalStripRenderer] SetPointScale called with null point");
            return;
        }

        Debug.Log($"[CriticalStripRenderer] SetPointScale called for point at {point.anchoredPosition} with scale {scale}");

        // If we're trying to set hover scale and point is already hovered, ignore
        if (scale > 1f && isPointHovered.TryGetValue(point, out bool hovered) && hovered)
        {
            Debug.Log($"[CriticalStripRenderer] Point at {point.anchoredPosition} is already hovered, ignoring");
            return;
        }
        
        // Stop any existing animation
        if (hoverAnimations.TryGetValue(point, out var existingCoroutine))
        {
            Debug.Log($"[CriticalStripRenderer] Stopping existing hover animation for point at {point.anchoredPosition}");
            StopCoroutine(existingCoroutine);
            hoverAnimations.Remove(point);
        }
        
        // Update hover state
        isPointHovered[point] = scale > 1f;
        
        // Start new animation
        Debug.Log($"[CriticalStripRenderer] Starting new hover animation for point at {point.anchoredPosition} with scale {scale}");
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
    }

    private void InitializeCurrentPosIndicator()
    {
        if (!isInitialized || transform == null || transform.ViewportRect == null)
        {
            Debug.LogError("CriticalStripRenderer: Cannot initialize position indicator before transform is ready");
            return;
        }

        // Create the indicator point
        var obj = Instantiate(pointPrefab, Vector2.zero, Quaternion.identity, transform.ViewportRect);
        currentPosIndicator = obj.GetComponent<RectTransform>();
        var image = obj.GetComponent<Image>();
        
        if (currentPosIndicator != null && image != null)
        {
            currentPosIndicator.sizeDelta = new Vector2(currentPosSize, currentPosSize);
            image.color = indicatorColor;
            // Ensure the indicator is rendered on top of all other points
            currentPosIndicator.SetAsLastSibling();
            UpdateCurrentPosIndicator();
        }
        else
        {
            Debug.LogError("CriticalStripRenderer: Failed to initialize position indicator components");
        }
    }

    private void OnIndexChanged(double index)
    {
        UpdateCurrentPosIndicator();
    }

    private void OnRealChanged(double real)
    {
        UpdateCurrentPosIndicator();
    }

    private void UpdateCurrentPosIndicator()
    {
        if (!isInitialized || currentPosIndicator == null || app == null) return;
        
        Vector2 stripPos = new Vector2((float)app.Real, (float)app.Index);
        
        // Check if the index is within the visible range
        isInRange = stripPos.y >= transform.MinIndex && stripPos.y <= transform.MaxIndex;
        
        // Update position if in range
        if (isInRange)
        {
            Vector2 viewportPos = transform.StripToViewport(stripPos);
            currentPosIndicator.anchoredPosition = viewportPos;
        }
        
        // Update visibility based on both range and blink state
        UpdateIndicatorVisibility();
    }

    private void UpdateIndicatorVisibility()
    {
        if (currentPosIndicator != null)
        {
            currentPosIndicator.gameObject.SetActive(isInRange && isVisible);
        }
    }

    private void Update()
    {
        if (currentPosIndicator != null)
        {
            // Update blink animation
            blinkTimer += Time.deltaTime;
            if (blinkTimer >= blinkRate)
            {
                blinkTimer = 0f;
                isVisible = !isVisible;
                UpdateIndicatorVisibility();
            }
        }
    }

    private void OnDestroy()
    {
        if (app != null)
        {
            app.IndexChanged -= OnIndexChanged;
            app.RealChanged -= OnRealChanged;
        }
    }

    public void OnScroll(PointerEventData eventData)
    {
        if (!isInitialized) return;

        lastScrollTime = Time.time;

        // Get the mouse position in strip coordinates before zooming
        var mouseStripPos = transform.ScreenToStrip(eventData.position);
        
        // Calculate new zoom level
        float zoomDelta = eventData.scrollDelta.y * zoomSensitivity;
        float newZoom = Mathf.Clamp(currentZoom * (1f + zoomDelta), minZoom, maxZoom);
        
        if (newZoom != currentZoom)
        {            
            // Calculate the current range and center
            float currentRange = transform.MaxIndex - transform.MinIndex;
            float currentCenter = (transform.MaxIndex + transform.MinIndex) * 0.5f;
            
            // Calculate the new range based on zoom
            float newRange = currentRange * (currentZoom / newZoom);
            
            // Calculate how far the mouse is from the center in normalized coordinates
            float mouseOffset = (mouseStripPos.y - currentCenter) / currentRange;
            
            // Calculate new min and max indices that keep the mouse position stable
            float newCenter = mouseStripPos.y - (mouseOffset * newRange);
            float newMin = newCenter - (newRange * 0.5f);
            float newMax = newCenter + (newRange * 0.5f);
            
            // Prevent scrolling below -1
            if (newMin < -1f)
            {
                float adjustment = -1f - newMin;
                newMin = -1f;
                newMax += adjustment;
            }
            
            // Update the transform and current zoom
            transform.SetIndexRange(newMin, newMax);
            currentZoom = newZoom;
            
            // Update all point positions and the current position indicator
            UpdateAllPoints();
            UpdateCurrentPosIndicator();
            
            // Notify listeners that the viewport has changed
            OnViewportChanged?.Invoke();
        }
    }

    public void OnBeginDrag(PointerEventData eventData)
    {
        if (!isInitialized) return;
        
        isDragging = true;
        lastDragPosition = eventData.position;
        // Debug.Log($"[CriticalStripRenderer] Begin drag at screen position: {lastDragPosition}");
    }

    public void OnDrag(PointerEventData eventData)
    {
        if (!isInitialized || !isDragging) return;

        // Debug.Log($"[CriticalStripRenderer] Dragging from {lastDragPosition} to {eventData.position}");

        // Calculate the drag delta in screen coordinates
        Vector2 dragDelta = (eventData.position - lastDragPosition) * scrollSensitivity;
        // Debug.Log($"[CriticalStripRenderer] Drag delta (with sensitivity {scrollSensitivity}): {dragDelta}");
        lastDragPosition = eventData.position;
        
        // Convert the drag distance to strip space
        float stripDelta = dragDelta.y / transform.ViewportRect.rect.height * (transform.MaxIndex - transform.MinIndex);
        // Debug.Log($"[CriticalStripRenderer] Strip space delta: {stripDelta}");
        
        // Update the index range
        float newMin = transform.MinIndex - stripDelta;
        float newMax = transform.MaxIndex - stripDelta;
        
        // Prevent dragging below -1
        if (newMin < -1f)
        {
            float adjustment = -1f - newMin;
            newMin = -1f;
            newMax += adjustment;
        }
        
        // Debug.Log($"[CriticalStripRenderer] New index range: [{newMin}, {newMax}] (current: [{transform.MinIndex}, {transform.MaxIndex}])");
        
        transform.SetIndexRange(newMin, newMax);
        
        // Update all point positions and the current position indicator
        UpdateAllPoints();
        UpdateCurrentPosIndicator();
        
        // Notify listeners that the viewport has changed
        OnViewportChanged?.Invoke();
    }

    public void OnEndDrag(PointerEventData eventData)
    {
        isDragging = false;
        // Debug.Log("[CriticalStripRenderer] End drag");
    }

    /// <summary>
    /// Gets the CriticalStripTransform used by this renderer
    /// </summary>
    public CriticalStripTransform GetTransform()
    {
        return transform;
    }

    /// <summary>
    /// Notifies the renderer that a point at the specified viewport position is being hovered
    /// </summary>
    /// <param name="viewportPos">The position in viewport coordinates</param>
    /// <param name="isHovered">Whether the point is hovered</param>
    public void NotifyPointHover(Vector2 viewportPos, bool isHovered)
    {
        Debug.Log($"[CriticalStripRenderer] NotifyPointHover called with position: {viewportPos}, isHovered: {isHovered}");

        if (!isHovered)
        {
            // Clear hover state
            if (hoveredPoint != null)
            {
                Debug.Log($"[CriticalStripRenderer] Clearing hover state for point at {hoveredPoint.anchoredPosition}");
                SetPointScale(hoveredPoint, 1f);
                hoveredPoint = null;
            }
            return;
        }

        Debug.Log($"[CriticalStripRenderer] Looking for closest point to {viewportPos}. Total point sets: {pointObjects.Count}");
        
        // Find the closest point to the specified position
        float closestDist = float.MaxValue;
        RectTransform newHoveredPoint = null;
        
        foreach (var kvp in pointObjects)
        {
            if (!kvp.Key.IsActive) continue;
            
            Debug.Log($"[CriticalStripRenderer] Checking points in set '{kvp.Key.Name}'. Points: {kvp.Value.Count}");
            
            foreach (var point in kvp.Value)
            {
                var dist = Vector2.Distance(viewportPos, point.anchoredPosition);
                
                if (dist < closestDist)
                {
                    closestDist = dist;
                    newHoveredPoint = point;
                }
            }
        }
        
        Debug.Log($"[CriticalStripRenderer] Closest point found: {(newHoveredPoint != null ? newHoveredPoint.anchoredPosition.ToString() : "none")}, distance: {closestDist}");
        
        // Only trigger changes if we're hovering a different point
        if (newHoveredPoint != hoveredPoint)
        {
            if (hoveredPoint != null)
            {
                Debug.Log($"[CriticalStripRenderer] Resetting scale of previously hovered point at {hoveredPoint.anchoredPosition}");
                SetPointScale(hoveredPoint, 1f);
            }
            
            hoveredPoint = newHoveredPoint;
            
            if (hoveredPoint != null)
            {
                Debug.Log($"[CriticalStripRenderer] Setting scale of new hovered point at {hoveredPoint.anchoredPosition} to {hoverScale}");
                SetPointScale(hoveredPoint, hoverScale);
            }
        }
    }

    /// <summary>
    /// Initializes the critical line at x=0.5
    /// </summary>
    private void InitializeCriticalLine()
    {
        // Create critical line
        GameObject lineObj = new GameObject("CriticalLine");
        lineObj.transform.SetParent(transform.ViewportRect, false);
        criticalLine = lineObj.AddComponent<RectTransform>();
        Image lineImage = lineObj.AddComponent<Image>();
        
        // Configure critical line
        lineImage.color = criticalLineColor;
        
        // Set the line to be anchored at the horizontal center and stretch vertically
        criticalLine.anchorMin = new Vector2(0.5f, 0);
        criticalLine.anchorMax = new Vector2(0.5f, 1);
        criticalLine.pivot = new Vector2(0.5f, 0.5f);
        criticalLine.sizeDelta = new Vector2(criticalLineWidth, 0); // Height will be set by anchors
        
        // Since we're using centered anchors (0.5), the anchoredPosition should be zero
        // This will automatically place it at 50% of the viewport width
        criticalLine.anchoredPosition = Vector2.zero;
    }

    /// <summary>
    /// Smoothly animates the viewport to center the current App.Real/App.Index position if possible.
    /// </summary>
    public void CenterOnCurrentPosition()
    {
        if (!isInitialized || app == null || transform == null) return;
        float targetIndex = (float)app.Index;
        float currentRange = transform.MaxIndex - transform.MinIndex;
        float minAllowed = -1f;
        float maxAllowed = float.MaxValue; // No explicit upper bound in current logic

        // Compute new min/max to center targetIndex
        float newMin = targetIndex - currentRange * 0.5f;
        float newMax = targetIndex + currentRange * 0.5f;

        // Clamp so min >= -1
        if (newMin < minAllowed)
        {
            float adjust = minAllowed - newMin;
            newMin = minAllowed;
            newMax += adjust;
        }
        // Optionally, clamp newMax if you have a max bound (not present in current code)

        // If already centered (within epsilon), do nothing
        if (Mathf.Abs(transform.MinIndex - newMin) < 1e-4f && Mathf.Abs(transform.MaxIndex - newMax) < 1e-4f)
            return;

        // Stop any existing centering animation
        if (centerCoroutine != null)
            StopCoroutine(centerCoroutine);
        centerCoroutine = StartCoroutine(CenterViewportCoroutine(newMin, newMax, centerAnimDuration));
    }

    private IEnumerator CenterViewportCoroutine(float targetMin, float targetMax, float duration)
    {
        float startMin = transform.MinIndex;
        float startMax = transform.MaxIndex;
        float elapsed = 0f;
        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = Mathf.Clamp01(elapsed / duration);
            // Smoothstep for ease-in-out
            float lerpT = t * t * (3f - 2f * t);
            float min = Mathf.Lerp(startMin, targetMin, lerpT);
            float max = Mathf.Lerp(startMax, targetMax, lerpT);
            transform.SetIndexRange(min, max);
            UpdateAllPoints();
            UpdateCurrentPosIndicator();
            OnViewportChanged?.Invoke();
            yield return null;
        }
        // Final set
        transform.SetIndexRange(targetMin, targetMax);
        UpdateAllPoints();
        UpdateCurrentPosIndicator();
        OnViewportChanged?.Invoke();
        centerCoroutine = null;
    }
} 