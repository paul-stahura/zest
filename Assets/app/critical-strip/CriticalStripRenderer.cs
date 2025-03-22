using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using System.Collections.Generic;

[RequireComponent(typeof(RectTransform))]
public class CriticalStripRenderer : MonoBehaviour, IPointerClickHandler, IPointerEnterHandler, IPointerExitHandler, IPointerMoveHandler
{
    [Header("Point Properties")]
    [SerializeField] private float pointSize = 4f;
    [SerializeField] private float hoverScale = 2f;
    [SerializeField] private GameObject pointPrefab;
    
    [Header("References")]
    [SerializeField] private CoordinateDisplay coordinateDisplay;
    
    private CriticalStripTransform transform;
    private Dictionary<PointSet, List<RectTransform>> pointObjects;
    private RectTransform hoveredPoint;
    private App app;
    private Queue<PointSet> pendingPointSets = new Queue<PointSet>();
    private bool isInitialized = false;
    
    private void Awake()
    {
        pointObjects = new Dictionary<PointSet, List<RectTransform>>();
        app = FindObjectOfType<App>();
    }

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

    private void InitializeTransform()
    {
        if (!isInitialized)
        {
            var rectTransform = GetComponent<RectTransform>();
            if (rectTransform != null)
            {
                Debug.Log($"[CriticalStripRenderer] Initializing transform with viewport rect: {rectTransform.rect}");
                transform = new CriticalStripTransform(rectTransform);
                isInitialized = true;
                Debug.Log("[CriticalStripRenderer] Transform initialized successfully");
            }
            else
            {
                Debug.LogError("CriticalStripRenderer: Failed to get RectTransform component");
            }
        }
    }
    
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
    
    private void CreatePointObject(Vector2 stripPos, Color color, List<RectTransform> points)
    {
        if (!isInitialized || pointPrefab == null) return;

        Debug.Log($"[CriticalStripRenderer] Creating point at strip coordinates: {stripPos}");
        var viewportPos = transform.StripToViewport(stripPos);
        Debug.Log($"[CriticalStripRenderer] Point viewport position: {viewportPos}, " + 
                  $"viewport rect: {GetComponent<RectTransform>().rect}");

        var obj = Instantiate(pointPrefab, viewportPos, Quaternion.identity, transform.ViewportRect);
        var rectTransform = obj.GetComponent<RectTransform>();
        var image = obj.GetComponent<Image>();
        
        if (rectTransform != null && image != null)
        {
            rectTransform.sizeDelta = new Vector2(pointSize, pointSize);
            rectTransform.anchoredPosition = viewportPos;
            image.color = color;
            points.Add(rectTransform);
            
            Debug.Log($"[CriticalStripRenderer] Point created with anchoredPosition: {rectTransform.anchoredPosition}, " +
                      $"size: {rectTransform.sizeDelta}, color: {color}");
        }
        else
        {
            Debug.LogError("[CriticalStripRenderer] Failed to get RectTransform or Image component on point prefab");
        }
    }
    
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
    
    public void OnPointerClick(PointerEventData eventData)
    {
        if (app == null || !isInitialized) return;
        
        var stripPos = transform.ScreenToStrip(eventData.position);
        app.Real = stripPos.x;
        app.Index = stripPos.y;
    }
    
    public void OnPointerEnter(PointerEventData eventData)
    {
        // Handle pointer enter if needed
    }
    
    public void OnPointerExit(PointerEventData eventData)
    {
        if (hoveredPoint != null)
        {
            hoveredPoint.localScale = Vector3.one;
            hoveredPoint = null;
        }
        
        if (coordinateDisplay != null)
        {
            coordinateDisplay.UpdateDisplay();
        }
    }
    
    public void OnPointerMove(PointerEventData eventData)
    {
        if (!isInitialized) return;

        // Reset previous hover
        if (hoveredPoint != null)
        {
            hoveredPoint.localScale = Vector3.one;
            hoveredPoint = null;
        }
        
        // Find closest point
        var stripPos = transform.ScreenToStrip(eventData.position);
        float closestDist = float.MaxValue;
        
        foreach (var kvp in pointObjects)
        {
            if (!kvp.Key.IsActive) continue;
            
            foreach (var point in kvp.Value)
            {
                var pointPos = transform.ViewportToStrip(point.anchoredPosition);
                var dist = Vector2.Distance(stripPos, pointPos);
                
                if (dist < closestDist && dist < 0.05f) // Adjust threshold as needed
                {
                    closestDist = dist;
                    hoveredPoint = point;
                    stripPos = pointPos; // Use exact point coordinates
                }
            }
        }
        
        // Scale hovered point and update coordinates
        if (hoveredPoint != null)
        {
            hoveredPoint.localScale = Vector3.one * hoverScale;
        }
        
        if (coordinateDisplay != null)
        {
            coordinateDisplay.UpdateHoverCoordinates(stripPos.x, stripPos.y);
        }
    }
} 