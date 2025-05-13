using UnityEngine;
using UnityEngine.UI;
using System.Collections.Generic;
using System.IO;
using System.Linq;

/// <summary>
/// Renders transparent bands over the critical strip based on changes in X direction
/// of data loaded from a specified CSV file. The bands are rendered in the regions
/// where the X value does NOT change direction (i.e., the gaps between direction changes).
/// </summary>
[RequireComponent(typeof(CanvasRenderer))]
public class BandsOverlayRenderer : MaskableGraphic
{
    [Header("Band Settings")]
    [SerializeField] private string dataFileName = "Theta2 0.5.csv";
    [SerializeField] [Range(0, 1)] private float bandOpacity = 0.15f;
    [SerializeField] private Color bandColor = new Color(0.3f, 0.3f, 0.3f);
    
    [Header("References")]
    public CriticalStripRenderer criticalStripRenderer;
    [SerializeField] private Toggle visibilityToggle;
    
    // Internal data
    private List<float> bandStartIndices = new List<float>(); // Y values where X direction changes start
    private List<float> bandEndIndices = new List<float>();   // Y values where X direction changes end
    private bool isDataProcessed = false;
    private bool isVisible = true;
    
    // Cached reference to the transform component
    private CriticalStripTransform stripTransform;
    
    /// <summary>
    /// Unity Awake. Sets up references and toggle listener.
    /// </summary>
    protected override void Awake()
    {
        base.Awake();
        
        // Find critical strip renderer if not assigned
        if (criticalStripRenderer == null)
        {
            criticalStripRenderer = GetComponentInParent<CriticalStripRenderer>();
            if (criticalStripRenderer == null)
            {
                Debug.LogError("BandsOverlayRenderer requires a CriticalStripRenderer component in the parent hierarchy.");
            }
        }
        
        // Set up toggle listener if assigned
        if (visibilityToggle != null)
        {
            visibilityToggle.onValueChanged.AddListener(SetVisible);
            // Initialize visibility based on toggle state
            SetVisible(visibilityToggle.isOn);
        }
    }
    
    /// <summary>
    /// Unity OnEnable. Subscribes to viewport change events and processes data.
    /// </summary>
    protected override void OnEnable()
    {
        base.OnEnable();
        
        // Subscribe to viewport change events
        if (criticalStripRenderer != null)
        {
            criticalStripRenderer.OnViewportChanged += OnViewportChanged;
        }
        
        // Process data and generate bands
        ProcessDataFile();
    }
    
    /// <summary>
    /// Unity OnDisable. Unsubscribes from events and clears references.
    /// </summary>
    protected override void OnDisable()
    {
        base.OnDisable();
        
        // Unsubscribe from events
        if (criticalStripRenderer != null)
        {
            criticalStripRenderer.OnViewportChanged -= OnViewportChanged;
        }
        
        // Clear references that might cause issues during cleanup
        stripTransform = null;
        isDataProcessed = false;
    }
    
    /// <summary>
    /// Called when the viewport (zoom/pan) changes. Triggers a redraw.
    /// </summary>
    private void OnViewportChanged()
    {
        // Redraw the bands when viewport changes
        if (isDataProcessed)
        {
            SetVerticesDirty();
        }
    }
    
    /// <summary>
    /// Processes the data file to identify Y indices where X direction changes.
    /// Populates bandStartIndices and bandEndIndices.
    /// </summary>
    private void ProcessDataFile()
    {
        // Clear existing bands
        bandStartIndices.Clear();
        bandEndIndices.Clear();
        
        string filePath = Path.Combine(Application.dataPath, "Resources/CriticalStripPoints", dataFileName);
        
        if (!File.Exists(filePath))
        {
            Debug.LogError($"BandsOverlayRenderer: Data file not found at {filePath}");
            return;
        }
        
        try
        {
            // Read all lines from the file
            string[] allLines = File.ReadAllLines(filePath);
            
            // Skip header and comment lines
            int dataStartLine = 0;
            while (dataStartLine < allLines.Length && 
                  (allLines[dataStartLine].StartsWith("#") || allLines[dataStartLine].Contains(",")))
            {
                // If it's the header line with metadata, skip it
                if (allLines[dataStartLine].Contains(",") && !allLines[dataStartLine].StartsWith("#"))
                {
                    dataStartLine++;
                    break;
                }
                
                dataStartLine++;
            }
            
            // Process data points to find direction changes
            float previousX = 0;
            float previousY = 0;
            bool isIncreasing = false;
            bool firstPoint = true;
            bool bandActive = false;
            
            for (int i = dataStartLine; i < allLines.Length; i++)
            {
                string line = allLines[i];
                if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#"))
                    continue;
                
                string[] parts = line.Split(',');
                if (parts.Length != 2) 
                    continue;
                
                if (!float.TryParse(parts[0], out float currentX) || 
                    !float.TryParse(parts[1], out float currentY))
                    continue;
                
                if (firstPoint)
                {
                    // Initialize with first point
                    previousX = currentX;
                    previousY = currentY;
                    firstPoint = false;
                    continue;
                }
                
                // Determine if X is increasing or decreasing
                bool currentIncreasing = currentX > previousX;
                
                // Detect direction change and mark band start/end
                if (!bandActive && i > dataStartLine + 1) // Skip first comparison
                {
                    if (currentIncreasing != isIncreasing)
                    {
                        // Direction changed, start a band
                        bandStartIndices.Add(previousY);
                        bandActive = true;
                    }
                }
                else if (bandActive)
                {
                    if (currentIncreasing != isIncreasing)
                    {
                        // Direction changed again, end the band
                        bandEndIndices.Add(previousY);
                        bandActive = false;
                    }
                }
                
                // Update for next iteration
                isIncreasing = currentIncreasing;
                previousX = currentX;
                previousY = currentY;
            }
            
            // If we ended with an active band, close it with the last point
            if (bandActive && bandStartIndices.Count > bandEndIndices.Count)
            {
                bandEndIndices.Add(previousY);
            }
            
            // Debug.Log($"BandsOverlayRenderer: Processed {bandStartIndices.Count} bands from {dataFileName}");
            isDataProcessed = true;
            
            // Force redraw
            SetVerticesDirty();
        }
        catch (System.Exception e)
        {
            Debug.LogError($"BandsOverlayRenderer: Error processing data file: {e.Message}");
        }
    }
    
    /// <summary>
    /// Builds the mesh for the bands. Renders bands in the regions where X does NOT change direction
    /// (i.e., the gaps between direction changes). This is the inverse of the original band logic.
    /// </summary>
    /// <param name="vh">VertexHelper for mesh construction</param>
    protected override void OnPopulateMesh(VertexHelper vh)
    {
        vh.Clear();
        
        // Add additional checks for scene cleanup and visibility
        if (!this.isActiveAndEnabled || !Application.isPlaying || !isVisible)
        {
            return;
        }
        
        if (!isDataProcessed || bandStartIndices.Count == 0 || 
            criticalStripRenderer == null || !criticalStripRenderer.isActiveAndEnabled)
        {
            return;
        }
        
        // Get the transform if we don't have it yet
        if (stripTransform == null)
        {
            if (criticalStripRenderer != null && criticalStripRenderer.isActiveAndEnabled)
            {
                stripTransform = criticalStripRenderer.GetTransform();
            }
            
            if (stripTransform == null)
            {
                // During cleanup, just silently return instead of logging an error
                if (!Application.isPlaying)
                {
                    return;
                }
                Debug.LogError("BandsOverlayRenderer: Could not get CriticalStripTransform");
                return;
            }
        }
        
        // Get the viewport rect for full width
        Rect rect = rectTransform.rect;
        
        // Create the band color with opacity (adjusted for visibility)
        Color32 bandColor32 = new Color32(
            (byte)(bandColor.r * 255),
            (byte)(bandColor.g * 255),
            (byte)(bandColor.b * 255),
            (byte)(bandOpacity * (isVisible ? 255 : 0))
        );
        
        int vertexIndex = 0;
        
        float visibleMin = stripTransform.MinValue;
        float visibleMax = stripTransform.MaxValue;

        // --- INVERSE BAND LOGIC ---
        // Drawing bands between regions where X changes direction.
        // This means:
        //   - From the bottom of the visible range up to the first band start
        //   - Between each band end and the next band start
        //   - From the last band end to the top of the visible range
        //
        // This loop builds and draws those intervals as filled rectangles.
        float prev = visibleMin;
        for (int i = 0; i <= bandStartIndices.Count; i++)
        {
            float gapStart, gapEnd;
            if (i == 0)
            {
                // Before the first band (bottom of view to first band start)
                gapStart = visibleMin;
                gapEnd = (bandStartIndices.Count > 0) ? bandStartIndices[0] : visibleMax;
            }
            else if (i == bandStartIndices.Count)
            {
                // After the last band (last band end to top of view)
                gapStart = bandEndIndices[bandEndIndices.Count - 1];
                gapEnd = visibleMax;
            }
            else
            {
                // Between bands (end of previous band to start of next)
                gapStart = bandEndIndices[i - 1];
                gapEnd = bandStartIndices[i];
            }

            // Clamp to visible range
            gapStart = Mathf.Max(gapStart, visibleMin);
            gapEnd = Mathf.Min(gapEnd, visibleMax);
            if (gapEnd <= gapStart) continue;

            // Convert indices to viewport Y coordinates
            // If we're in imaginary space, we need to transform the band indices
            Vector2 startPosStrip, endPosStrip;
            
            if (stripTransform.UseImaginarySpace)
            {
                // Band indices are in index space, convert to imaginary space
                startPosStrip = new Vector2(0, (float)Zeta.IndexToImag(gapStart));
                endPosStrip = new Vector2(0, (float)Zeta.IndexToImag(gapEnd));
            }
            else
            {
                // In index space, use directly
                startPosStrip = new Vector2(0, gapStart);
                endPosStrip = new Vector2(0, gapEnd);
            }

            Vector2 startPosViewport = stripTransform.StripToViewport(startPosStrip);
            Vector2 endPosViewport = stripTransform.StripToViewport(endPosStrip);

            float left = rect.x;
            float right = rect.x + rect.width;
            float top = startPosViewport.y;
            float bottom = endPosViewport.y;
            if (top > bottom) { float temp = top; top = bottom; bottom = temp; }

            // Add quad for this band region
            vh.AddVert(new Vector3(left, top), bandColor32, new Vector2(0, 0));
            vh.AddVert(new Vector3(right, top), bandColor32, new Vector2(1, 0));
            vh.AddVert(new Vector3(right, bottom), bandColor32, new Vector2(1, 1));
            vh.AddVert(new Vector3(left, bottom), bandColor32, new Vector2(0, 1));
            vh.AddTriangle(vertexIndex, vertexIndex + 1, vertexIndex + 2);
            vh.AddTriangle(vertexIndex, vertexIndex + 2, vertexIndex + 3);
            vertexIndex += 4;
        }
    }
    
    /// <summary>
    /// Force reload of data file and redrawing of bands
    /// </summary>
    public void RefreshBands()
    {
        ProcessDataFile();
    }
    
    /// <summary>
    /// Set the data file to use and reload
    /// </summary>
    public void SetDataFile(string fileName)
    {
        dataFileName = fileName;
        ProcessDataFile();
    }
    
    /// <summary>
    /// Set the visibility of the bands (used by UI toggle)
    /// </summary>
    public void SetVisible(bool visible)
    {
        if (isVisible != visible)
        {
            isVisible = visible;
            SetVerticesDirty(); // Force redraw with new visibility
        }
    }
    
    /// <summary>
    /// Unity OnDestroy. Cleans up listeners and references.
    /// </summary>
    protected override void OnDestroy()
    {
        // Clean up toggle listener
        if (visibilityToggle != null)
        {
            visibilityToggle.onValueChanged.RemoveListener(SetVisible);
        }
        
        // Ensure we cleanup properly
        stripTransform = null;
        isDataProcessed = false;
        bandStartIndices.Clear();
        bandEndIndices.Clear();
    }
} 