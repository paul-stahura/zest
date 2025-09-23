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
    [SerializeField] private Color indicatorColor = new Color(1f, 1f, 1f, .8f); // Fuchsia color
    
    [Header("Zoom and Scroll Properties")]
    [SerializeField] private float zoomSensitivity = 0.1f;  // How fast to zoom with mouse wheel
    [SerializeField] private float minZoom = 0.5f;        // Minimum zoom level (maximum range)
    [SerializeField] private float maxZoom = 500f;         // Maximum zoom level (minimum range)
    [SerializeField] private float scrollSensitivity = 1f;  // How fast to scroll when dragging
    [SerializeField] private float currentZoom = 0.8f;

    [Header("Range Properties")]
    // 0 = [0,1], 1 = [-1,1], 2 = [-2,2], etc.
    [SerializeField] public static int realRange = 2; 

    
    [Header("Centering")]
    [SerializeField] private Button centerButton;
    [SerializeField] private float longPressDuration = 1f;
    [Tooltip("Animation duration for a single click of the center button.")]
    [SerializeField] private float centerAnimDuration = 0.5f;
    [Tooltip("Animation duration when centering is locked. A smaller value means a tighter, faster follow.")]
    [SerializeField] private float lockedCenterAnimDuration = 0.1f;
    [SerializeField] private Image lockedStateImage; // Image to show when locked (can be null)
    private bool isLocked = false; // Whether auto-centering is locked on
    private bool isPressingButton = false; // Whether button is currently being pressed
    private float buttonPressTime = 0f; // How long button has been pressed
    private bool longPressHandled = false; // Flag to prevent click after long press
    private Image defaultButtonImage; // Reference to the default button image
    private Coroutine centerCoroutine;

    // Core components
    private CriticalStripTransform criticalStripTransform;  // Handles coordinate transformations between strip and viewport
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

    [Header("Space Mode")]
    [SerializeField] private Button spaceToggleButton; // UI button to toggle space mode
    [SerializeField] private Text spaceModeText; // Optional: Text to display current space mode
    [SerializeField] private float imagZoomSensitivity = 2.0f; // Increased sensitivity for imaginary space
    [SerializeField] private float imagScrollSensitivity = 10f; // Increased sensitivity for imaginary space

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
            centerButton.onClick.AddListener(OnCenterButtonClick);
            SetupCenterButtonEventHandlers();
            if (lockedStateImage == null)
            {
                Debug.LogWarning("[CriticalStripRenderer] lockedStateImage is not assigned in the Inspector, so lock state changes will not be visible.");
            }
        }

        // Wire up space toggle button if assigned
        if (spaceToggleButton != null)
        {
            spaceToggleButton.onClick.AddListener(ToggleSpaceMode);
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
                criticalStripTransform = new CriticalStripTransform(rectTransform, 1f, 7f); 
                isInitialized = true;
                
                // Apply initial zoom level
                float currentRange = criticalStripTransform.MaxIndex - criticalStripTransform.MinIndex;
                float newRange = currentRange / currentZoom;
                float center = (criticalStripTransform.MaxIndex + criticalStripTransform.MinIndex) * 0.5f;
                float newMin = center - (newRange * 0.5f);
                float newMax = center + (newRange * 0.5f);
                
                // Prevent scrolling below -1
                if (newMin < -1f)
                {
                    float adjustment = -1f - newMin;
                    newMin = -1f;
                    newMax += adjustment;
                }
                
                criticalStripTransform.SetIndexRange(newMin, newMax);
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
        criticalStripTransform.SetIndexRange(min, max);
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

        // If we're in imaginary space, check if our current range is appropriate for the new points
        if (criticalStripTransform.UseImaginarySpace && pointSet.OriginalPoints.Count > 0)
        {
            // Calculate the min/max index values in the point set
            double minPointIndex = double.MaxValue;
            double maxPointIndex = double.MinValue;
            
            foreach (var point in pointSet.OriginalPoints)
            {
                minPointIndex = Math.Min(minPointIndex, point.Index);
                maxPointIndex = Math.Max(maxPointIndex, point.Index);
            }
            
            // Convert to imaginary values
            double minPointImag = Zeta.IndexToImag(minPointIndex);
            double maxPointImag = Zeta.IndexToImag(maxPointIndex);
            
            // Check if our current range encompasses the point set
            bool needsRangeAdjustment = false;
            float newMin = criticalStripTransform.MinImag;
            float newMax = criticalStripTransform.MaxImag;
            
            // If the point range extends beyond our current view, expand the range
            if (minPointImag < criticalStripTransform.MinImag)
            {
                newMin = (float)minPointImag - 50f; // Give some padding
                needsRangeAdjustment = true;
            }
            
            if (maxPointImag > criticalStripTransform.MaxImag)
            {
                newMax = (float)maxPointImag + 50f; // Give some padding
                needsRangeAdjustment = true;
            }
            
            // If the point range is much smaller than our current view, consider zooming in
            if ((maxPointImag - minPointImag) < (criticalStripTransform.MaxImag - criticalStripTransform.MinImag) * 0.3f)
            {
                // Only zoom in if we have a small number of points or if they're tightly clustered
                if (pointSet.OriginalPoints.Count < 20)
                {
                    newMin = (float)minPointImag - 50f;
                    newMax = (float)maxPointImag + 50f;
                    needsRangeAdjustment = true;
                }
            }
            
            // Apply the new range if needed
            if (needsRangeAdjustment)
            {
                // Ensure minimum imaginary value
                float minAllowedImag = (float)Zeta.IndexToImag(-1);
                if (newMin < minAllowedImag)
                {
                    newMin = minAllowedImag;
                }
                
                // Set the new range
                criticalStripTransform.SetRange(newMin, newMax);
                
                // Update existing points
                UpdateAllPoints();
                
                // Update the index labels
                var labelRenderer = GetComponent<IndexLabelsRenderer>();
                if (labelRenderer != null)
                {
                    labelRenderer.UpdateLabels(newMin, newMax);
                }
                
                // Notify listeners
                OnViewportChanged?.Invoke();
                
                Debug.Log($"[CriticalStripRenderer] Adjusted imaginary range for new point set: [{newMin:F2}, {newMax:F2}]");
            }
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
            // Create point using original coordinates, transforming to imaginary space if needed
            Vector2 stripPos;
            if (criticalStripTransform != null && criticalStripTransform.UseImaginarySpace)
            {
                // In imaginary space, convert index to imaginary value
                stripPos = new Vector2((float)point.Real, (float)Zeta.IndexToImag(point.Index));
            }
            else
            {
                // In index space, use index directly
                stripPos = new Vector2((float)point.Real, (float)point.Index);
            }
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
        var viewportPos = criticalStripTransform.StripToViewport(stripPos);
        
        // Get the viewport rect and check if the point (including its size) is within the bounds
        var rect = criticalStripTransform.ViewportRect.rect;
        float halfSize = pointSize * 0.5f;
        
        // Skip points entirely outside the viewport bounds (both x and y)
        if (viewportPos.x + halfSize < rect.x || viewportPos.x - halfSize > rect.x + rect.width ||
            viewportPos.y + halfSize < rect.y || viewportPos.y - halfSize > rect.y + rect.height)
        {
            // Point is outside viewport bounds, don't create it
            return;
        }

        var obj = Instantiate(pointPrefab, viewportPos, Quaternion.identity, criticalStripTransform.ViewportRect);
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
                // Create point using original coordinates, transforming to imaginary space if needed
                Vector2 stripPos;
                if (criticalStripTransform != null && criticalStripTransform.UseImaginarySpace)
                {
                    // In imaginary space, convert index to imaginary value
                    stripPos = new Vector2((float)point.Real, (float)Zeta.IndexToImag(point.Index));
                }
                else
                {
                    // In index space, use index directly
                    stripPos = new Vector2((float)point.Real, (float)point.Index);
                }
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
                criticalStripTransform.ViewportRect, 
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
                Vector2 transformedStripPos = criticalStripTransform.ViewportToStrip(closestTransform.anchoredPosition);
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
            var stripPos = criticalStripTransform.ScreenToStrip(eventData.position);
            
            // Debug.Log($"[CriticalStripRenderer] No point clicked, using strip coordinates: Real={stripPos.x:G17}, Index={stripPos.y:G17}");
            
            // If the click is near the critical line, use the dedicated method
            float distanceFromHalf = Mathf.Abs(stripPos.x - 0.5f);
            if (distanceFromHalf <= criticalStripTransform.CriticalValueThreshold)
            {
                // Debug.Log($"[CriticalStripRenderer] Click near critical line (distance: {distanceFromHalf:G17}), snapping to 0.5");
                app.SetToExactCriticalLine();
            }
            else
            {
                app.Real = stripPos.x;
            }
            
            // Convert from imaginary to index if needed
            if (criticalStripTransform.UseImaginarySpace)
            {
                double imag = stripPos.y;
                double index = Zeta.ImagToIndex(imag);
                app.Index = index;
            }
            else
            {
                app.Index = stripPos.y;
            }
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
            criticalStripTransform.ViewportRect, 
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
                    closestPointStripPos = criticalStripTransform.ViewportToStrip(point.anchoredPosition);
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
        if (!isInitialized || criticalStripTransform == null || criticalStripTransform.ViewportRect == null)
        {
            Debug.LogError("CriticalStripRenderer: Cannot initialize position indicator before transform is ready");
            return;
        }

        // Create the indicator point
        var obj = Instantiate(pointPrefab, Vector2.zero, Quaternion.identity, criticalStripTransform.ViewportRect);
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
        
        // If locked, auto-center on position changes
        if (isLocked)
        {
            CenterOnCurrentPosition();
        }
    }

    private void OnRealChanged(double real)
    {
        UpdateCurrentPosIndicator();
        
        // If locked, auto-center on position changes
        if (isLocked)
        {
            CenterOnCurrentPosition();
        }
    }

    private void UpdateCurrentPosIndicator()
    {
        if (!isInitialized || currentPosIndicator == null || app == null) return;
        
        Vector2 stripPos;
        if (criticalStripTransform.UseImaginarySpace)
        {
            // In imaginary space, convert index to imaginary
            float imag = (float)Zeta.IndexToImag(app.Index);
            stripPos = new Vector2((float)app.Real, imag);
        }
        else
        {
            // In index space, use index directly
            stripPos = new Vector2((float)app.Real, (float)app.Index);
        }
        
        // Check if the value is within the visible range
        isInRange = stripPos.y >= criticalStripTransform.MinValue && stripPos.y <= criticalStripTransform.MaxValue;
        
        // Update position if in range
        if (isInRange)
        {
            Vector2 viewportPos = criticalStripTransform.StripToViewport(stripPos);
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
        
        // Handle long press detection
        if (isPressingButton)
        {
            buttonPressTime += Time.deltaTime;
            if (buttonPressTime >= longPressDuration && !isLocked)
            {
                Debug.Log("[CriticalStripRenderer] Long press detected, setting lock state to true.");
                // Long press detected, activate lock
                SetLockedState(true);
                isPressingButton = false; // Stop checking for long press
                longPressHandled = true; // Set flag to consume the upcoming click event
            }
        }
    }

    /// <summary>
    /// Inverts the color of the current position indicator for better visibility when scene colors are inverted
    /// </summary>
    public void InvertColors()
    {
        indicatorColor = ColorInverter.InvertColor(indicatorColor);
        
        // Update the actual indicator's color if it exists
        if (currentPosIndicator != null)
        {
            var image = currentPosIndicator.GetComponent<Image>();
            if (image != null)
            {
                image.color = indicatorColor;
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
        var mouseStripPos = criticalStripTransform.ScreenToStrip(eventData.position);
        
        // Use appropriate sensitivity based on current space mode
        float zoomSensitivityToUse = criticalStripTransform.UseImaginarySpace ? imagZoomSensitivity : zoomSensitivity;
        
        // Calculate new zoom level
        float zoomDelta = eventData.scrollDelta.y * zoomSensitivityToUse;
        float newZoom = Mathf.Clamp(currentZoom * (1f + zoomDelta), minZoom, maxZoom);
        
        if (newZoom != currentZoom)
        {            
            // Calculate the current range and center
            float currentRange = criticalStripTransform.MaxValue - criticalStripTransform.MinValue;
            float currentCenter = (criticalStripTransform.MaxValue + criticalStripTransform.MinValue) * 0.5f;
            
            // Calculate the new range based on zoom
            float newRange = currentRange * (currentZoom / newZoom);
            
            // Calculate how far the mouse is from the center in normalized coordinates
            float mouseOffset = (mouseStripPos.y - currentCenter) / currentRange;
            
            // Calculate new min and max values that keep the mouse position stable
            float newCenter = mouseStripPos.y - (mouseOffset * newRange);
            float newMin = newCenter - (newRange * 0.5f);
            float newMax = newCenter + (newRange * 0.5f);
            
            // Prevent scrolling below minimum allowed value
            if (criticalStripTransform.UseImaginarySpace)
            {
                // When in imaginary space, use the imaginary equivalent of index = -1
                float minAllowedImag = (float)Zeta.IndexToImag(-1f);
                if (newMin < minAllowedImag)
                {
                    float adjustment = minAllowedImag - newMin;
                    newMin = minAllowedImag;
                    newMax += adjustment;
                }
            }
            else 
            {
                // Original index space behavior
                if (newMin < -1f)
                {
                    float adjustment = -1f - newMin;
                    newMin = -1f;
                    newMax += adjustment;
                }
            }
            
            // Update the transform range
            criticalStripTransform.SetRange(newMin, newMax);
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

        // Use appropriate sensitivity based on current space mode
        float scrollSensitivityToUse = criticalStripTransform.UseImaginarySpace ? imagScrollSensitivity : scrollSensitivity;
        
        // Calculate the drag delta in screen coordinates
        Vector2 dragDelta = (eventData.position - lastDragPosition) * scrollSensitivityToUse;
        lastDragPosition = eventData.position;
        
        // Convert the drag distance to strip space
        float stripDelta = dragDelta.y / criticalStripTransform.ViewportRect.rect.height * (criticalStripTransform.MaxValue - criticalStripTransform.MinValue);
        
        // Update the index range
        float newMin = criticalStripTransform.MinValue - stripDelta;
        float newMax = criticalStripTransform.MaxValue - stripDelta;
        
        // Prevent dragging below minimum allowed value
        if (criticalStripTransform.UseImaginarySpace)
        {
            // When in imaginary space, use the imaginary equivalent of index = -1
            float minAllowedImag = (float)Zeta.IndexToImag(-1f);
            if (newMin < minAllowedImag)
            {
                float adjustment = minAllowedImag - newMin;
                newMin = minAllowedImag;
                newMax += adjustment;
            }
        }
        else 
        {
            // Original index space behavior
            if (newMin < -1f)
            {
                float adjustment = -1f - newMin;
                newMin = -1f;
                newMax += adjustment;
            }
        }
        
        // Update the transform range
        criticalStripTransform.SetRange(newMin, newMax);
        
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
        return criticalStripTransform;
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
        lineObj.transform.SetParent(criticalStripTransform.ViewportRect, false);
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
    /// Sets up event handlers for long press detection on the center button
    /// </summary>
    private void SetupCenterButtonEventHandlers()
    {
        // Get reference to the default button image
        defaultButtonImage = centerButton.GetComponent<Image>();
        if (defaultButtonImage == null)
        {
            Debug.LogError("[CriticalStripRenderer] Center button is missing its Image component.");
        }
        
        // Add event triggers for pointer down/up
        EventTrigger trigger = centerButton.gameObject.GetComponent<EventTrigger>();
        if (trigger == null)
        {
            trigger = centerButton.gameObject.AddComponent<EventTrigger>();
        }
        
        // Pointer down event
        EventTrigger.Entry pointerDown = new EventTrigger.Entry();
        pointerDown.eventID = EventTriggerType.PointerDown;
        pointerDown.callback.AddListener((data) => OnButtonPointerDown());
        trigger.triggers.Add(pointerDown);
        
        // Pointer up event
        EventTrigger.Entry pointerUp = new EventTrigger.Entry();
        pointerUp.eventID = EventTriggerType.PointerUp;
        pointerUp.callback.AddListener((data) => OnButtonPointerUp());
        trigger.triggers.Add(pointerUp);
        
        // Pointer exit event (in case user drags off button)
        EventTrigger.Entry pointerExit = new EventTrigger.Entry();
        pointerExit.eventID = EventTriggerType.PointerExit;
        pointerExit.callback.AddListener((data) => OnButtonPointerUp());
        trigger.triggers.Add(pointerExit);
    }

    /// <summary>
    /// Called when center button is pressed down
    /// </summary>
    private void OnButtonPointerDown()
    {
        Debug.Log("[CriticalStripRenderer] Center button pointer down.");
        isPressingButton = true;
        buttonPressTime = 0f;
        longPressHandled = false; // Reset the flag on each new press
    }

    /// <summary>
    /// Called when center button is released or pointer exits
    /// </summary>
    private void OnButtonPointerUp()
    {
        Debug.Log("[CriticalStripRenderer] Center button pointer up.");
        isPressingButton = false;
        buttonPressTime = 0f;
    }

    /// <summary>
    /// Handles center button click - toggles lock state if already locked, otherwise centers once
    /// </summary>
    private void OnCenterButtonClick()
    {
        Debug.Log("[CriticalStripRenderer] Center button clicked.");
        // If a long press was just handled, do nothing on the subsequent click event
        if (longPressHandled)
        {
            Debug.Log("[CriticalStripRenderer] Click ignored because a long press was just handled.");
            return;
        }

        if (isLocked)
        {
            Debug.Log("[CriticalStripRenderer] Is locked, so unlocking.");
            // If locked, unlock it
            SetLockedState(false);
        }
        else
        {
            Debug.Log("[CriticalStripRenderer] Is not locked, so centering once.");
            // If not locked, just center once (normal behavior)
            CenterOnCurrentPosition();
        }
    }

    /// <summary>
    /// Sets the locked state and updates UI accordingly
    /// </summary>
    private void SetLockedState(bool locked)
    {
        isLocked = locked;
        Debug.Log($"[CriticalStripRenderer] Setting locked state to {locked}.");
        
        // Update button image based on state
        if (defaultButtonImage != null && lockedStateImage != null)
        {
            Debug.Log($"[CriticalStripRenderer] Updating button visuals. Default enabled: {!locked}, Locked active: {locked}.");
            defaultButtonImage.enabled = !locked;
            lockedStateImage.gameObject.SetActive(locked);
        }
        else
        {
            if (defaultButtonImage == null) Debug.LogWarning("[CriticalStripRenderer] defaultButtonImage is null.");
            if (lockedStateImage == null) Debug.LogWarning("[CriticalStripRenderer] lockedStateImage is null.");
        }
        
        // If locking, center immediately
        if (locked)
        {
            CenterOnCurrentPosition();
        }
    }

    /// <summary>
    /// Smoothly animates the viewport to center the current App.Real/App.Index position if possible.
    /// </summary>
    public void CenterOnCurrentPosition()
    {
        if (!isInitialized || app == null || criticalStripTransform == null) return;
        float targetIndex = (float)app.Index;
        float currentRange = criticalStripTransform.MaxIndex - criticalStripTransform.MinIndex;
        float minAllowed = -1f;

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
        if (Mathf.Abs(criticalStripTransform.MinIndex - newMin) < 1e-4f && Mathf.Abs(criticalStripTransform.MaxIndex - newMax) < 1e-4f)
            return;

        // Determine the animation duration based on the lock state
        float duration = isLocked ? lockedCenterAnimDuration : centerAnimDuration;

        // Stop any existing centering animation
        if (centerCoroutine != null)
            StopCoroutine(centerCoroutine);
        centerCoroutine = StartCoroutine(CenterViewportCoroutine(newMin, newMax, duration));
    }

    private IEnumerator CenterViewportCoroutine(float targetMin, float targetMax, float duration)
    {
        float startMin = criticalStripTransform.MinIndex;
        float startMax = criticalStripTransform.MaxIndex;
        float elapsed = 0f;
        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = Mathf.Clamp01(elapsed / duration);
            // Smoothstep for ease-in-out
            float lerpT = t * t * (3f - 2f * t);
            float min = Mathf.Lerp(startMin, targetMin, lerpT);
            float max = Mathf.Lerp(startMax, targetMax, lerpT);
            criticalStripTransform.SetIndexRange(min, max);
            UpdateAllPoints();
            UpdateCurrentPosIndicator();
            OnViewportChanged?.Invoke();
            yield return null;
        }
        // Final set
        criticalStripTransform.SetIndexRange(targetMin, targetMax);
        UpdateAllPoints();
        UpdateCurrentPosIndicator();
        OnViewportChanged?.Invoke();
        centerCoroutine = null;
    }

    /// <summary>
    /// Force a complete refresh of all point sets in the current space mode.
    /// This method will re-create all point objects with their correct positions.
    /// </summary>
    public void RefreshAllPointSets()
    {
        if (!isInitialized) return;
        
        // Debug.Log($"[CriticalStripRenderer] Refreshing all point sets in {(criticalStripTransform.UseImaginarySpace ? "imaginary" : "index")} space");
        
        // If we're in imaginary space with no points, set a default range
        if (criticalStripTransform.UseImaginarySpace && (pointObjects.Count == 0 || pointObjects.Values.All(list => list.Count == 0)))
        {
            // Set a default range for imaginary space that covers the typical zeros
            float minImag = (float)Zeta.IndexToImag(0);
            float maxImag = (float)Zeta.IndexToImag(10);
            float padding = 40f; // Add some padding
            
            // Debug.Log($"[CriticalStripRenderer] Setting default imaginary range: [{minImag-padding}, {maxImag+padding}]");
            criticalStripTransform.SetRange(minImag - padding, maxImag + padding);
            
            // Update the index labels
            var labelRenderer = GetComponent<IndexLabelsRenderer>();
            if (labelRenderer != null)
            {
                labelRenderer.UpdateLabels(criticalStripTransform.MinValue, criticalStripTransform.MaxValue);
                if (labelRenderer is IndexLabelsRenderer indexLabels)
                {
                    indexLabels.SetUseImaginarySpace(criticalStripTransform.UseImaginarySpace);
                }
            }
            
            // Notify listeners that the viewport has changed
            OnViewportChanged?.Invoke();
        }
        
        // Get a copy of the dictionary keys to iterate over
        var pointSetKeys = new List<PointSet>(pointObjects.Keys);
        
        // Remove and re-add each point set
        foreach (var pointSet in pointSetKeys)
        {
            RemovePointSet(pointSet);
            AddPointSetInternal(pointSet);
        }
        
        // Update position indicator
        UpdateCurrentPosIndicator();
        
        // Notify listeners that the viewport has changed
        OnViewportChanged?.Invoke();
    }
    
    public void ToggleSpaceMode()
    {
        if (!isInitialized || criticalStripTransform == null) return;
        
        // Store current viewport center and range before toggling
        float currentMin = criticalStripTransform.MinValue;
        float currentMax = criticalStripTransform.MaxValue;
        float currentRange = currentMax - currentMin;
        float currentCenter = (currentMax + currentMin) / 2f;
        
        // Toggle space mode
        bool newMode = !criticalStripTransform.UseImaginarySpace;
        criticalStripTransform.UseImaginarySpace = newMode;
        
        // Calculate appropriate range for the new space mode
        float newMin, newMax;
        
        if (newMode) // Switching to imaginary space
        {
            // Convert current index range to imaginary range
            newMin = (float)Zeta.IndexToImag(currentMin);
            newMax = (float)Zeta.IndexToImag(currentMax);
            
            // If range is too small in imaginary space, expand to show more points
            if (newMax - newMin < 50f) // Minimum useful range in imaginary space
            {
                float imagCenter = (newMax + newMin) / 2f;
                newMin = imagCenter - 200f; // Show a reasonable range centered around current view
                newMax = imagCenter + 200f;
                
                // Ensure we don't go below minimum imaginary value (approx t=14)
                float minImag = (float)Zeta.IndexToImag(-1);
                if (newMin < minImag)
                {
                    newMin = minImag;
                    newMax = minImag + 400f; // Keep the same range size
                }
            }
        }
        else // Switching to index space
        {
            // Convert current imaginary range to index range
            newMin = (float)Zeta.ImagToIndex(currentMin);
            newMax = (float)Zeta.ImagToIndex(currentMax);
            
            // Ensure minimum reasonable range in index space
            if (newMax - newMin > 25f) // If range too big in index space
            {
                float indexCenter = (newMax + newMin) / 2f;
                newMin = indexCenter - 6f; // Show reasonable index range
                newMax = indexCenter + 6f;
            }
            
            // Ensure we don't go below -1 index
            if (newMin < -1f)
            {
                newMin = -1f;
                newMax = Math.Max(newMax, 11f); // Ensure we see at least up to index 11
            }
        }
        
        // Update UI indicator if available
        if (spaceModeText != null)
        {
            spaceModeText.text = newMode ? "Imag Space" : "Index Space";
        }
        
        // Set the new range
        criticalStripTransform.SetRange(newMin, newMax);
        
        // Force a complete refresh of all point sets
        RefreshAllPointSets();
        
        // Notify listeners (e.g. PointSetManager) that the viewport changed, so mesh points can be recalculated
        OnViewportChanged?.Invoke();
        
        // Update the index labels
        var labelRenderer = GetComponent<IndexLabelsRenderer>();
        if (labelRenderer != null)
        {
            // Send both the current range and the new space mode
            labelRenderer.UpdateLabels(newMin, newMax);
            if (labelRenderer is IndexLabelsRenderer indexLabels)
            {
                indexLabels.SetUseImaginarySpace(newMode);
            }
        }        
    }

    // Add these editor tools for testing
    #if UNITY_EDITOR
    [UnityEditor.MenuItem("Critical Strip/Toggle Space Mode")]
    private static void ToggleSpaceModeMenuItem()
    {
        var renderer = FindObjectOfType<CriticalStripRenderer>();
        if (renderer != null)
        {
            renderer.ToggleSpaceMode();
        }
    }

    [UnityEditor.MenuItem("Critical Strip/Test Index To Imag Conversion")]
    private static void TestIndexToImagConversion()
    {
        Debug.Log("Index to Imaginary Conversion Test:");
        for (int i = 0; i <= 11; i++)
        {
            double imag = Zeta.IndexToImag(i);
            Debug.Log($"Index {i} → Imag {imag:F2}");
        }
    }

    [UnityEditor.MenuItem("Critical Strip/Test Imag To Index Conversion")]
    private static void TestImagToIndexConversion()
    {
        Debug.Log("Imaginary to Index Conversion Test:");
        double[] imagValues = { 14.13, 21.02, 30.42, 56.45, 75.70, 100.0, 200.0, 500.0, 830.0 };
        foreach (double imag in imagValues)
        {
            double index = Zeta.ImagToIndex(imag);
            Debug.Log($"Imag {imag:F2} → Index {index:F3}");
        }
    }
    #endif
}