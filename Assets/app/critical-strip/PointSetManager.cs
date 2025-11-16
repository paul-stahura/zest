using UnityEngine;
using System.Collections.Generic;
using System.IO;
using System;
using System.Linq;
using UnityEngine.UI;
using UnityEngine.Events;

public class PointSetManager : MonoBehaviour
{
    [Header("Settings")]
    [SerializeField] private Color defaultPointColor = Color.green;
    [SerializeField] private DropdownEx pointSetSelector;  // Reference to the custom dropdown
    [Tooltip("How close to 0.5 before points are skipped")]
    [SerializeField] [Range(0.001f, 0.1f)] private float criticalLineSkipTolerance = 0.01f;
    [SerializeField] private CriticalStripStats stats;  // Reference to the Stats component
    private Button _clearPointsButton;
    
    [Header("Points Mesh Setup")]
    [SerializeField] private PointsMeshRenderer pointsMeshPrefab;
    [SerializeField] private Transform pointsContainer;
    private Dictionary<PointSet, List<PointsMeshRenderer>> pointsMeshInstances = new Dictionary<PointSet, List<PointsMeshRenderer>>();
    private Dictionary<PointSet, GameObject> pointSetParents = new Dictionary<PointSet, GameObject>();
    
    private const string POINTS_DIRECTORY = "Resources/CriticalStripPoints";
    private const string FAVORITES_FILE = "favorite-points.csv";
    private const string FAVORITES_NAME = "Favorites";
    private string pointsDirectoryPath;
    private List<PointSet> loadedSets = new List<PointSet>();
    private CriticalStripRenderer criticalStripRenderer; // Renamed from 'renderer' to avoid naming conflict with Component.renderer
    private App app;
    private Dictionary<uint, string> optionIndexToName = new Dictionary<uint, string>();
    private uint previousSelectionValue = 0;  // Add this line to track previous selection
    
    public IReadOnlyList<PointSet> LoadedSets => loadedSets;
    
    // Get all active loaded point sets
    public List<PointSet> GetAllActiveSets()
    {
        return loadedSets.Where(s => s.IsActive).ToList();
    }
    
    private void Awake()
    {
        criticalStripRenderer = GetComponentInChildren<CriticalStripRenderer>();
        app = FindObjectOfType<App>();
        
        // Debug.Log($"PointSetManager Awake - Renderer: {(criticalStripRenderer != null ? "Found" : "Not Found")}, App: {(app != null ? "Found" : "Not Found")}");
        
        if (app != null)
        {
            app.RealChanged += OnRealChanged;
            app.IndexChanged += OnIndexChanged;
        }

        if (stats == null)
        {
            stats = FindObjectOfType<CriticalStripStats>();
            if (stats == null)
            {
                Debug.LogWarning("Stats component not found in scene");
            }
        }
        
        // Set up points directory
        SetupPointsDirectory();
        
        // Initialize dropdown without triggering selection
        if (pointSetSelector != null)
        {
            // First clear any existing options
            pointSetSelector.ClearOptions();
            // Then refresh the list
            RefreshPointSetList();
            // Finally add the listener
            pointSetSelector.onValueChanged.AddListener(OnPointSetSelectionChanged);
        }
        else
        {
            Debug.LogWarning("PointSetSelector not assigned in inspector");
        }

        _clearPointsButton = GameObject.Find("ClearPointsButton")?.GetComponent<Button>();
        _clearPointsButton?.onClick.AddListener(() =>
        {
            pointSetSelector.ClearOptions();
            RefreshPointSetList();
        });
    }
    
    private void SetupPointsDirectory()
    {
        pointsDirectoryPath = Path.Combine(Application.dataPath, POINTS_DIRECTORY);
        
        if (!Directory.Exists(pointsDirectoryPath))
        {
            Directory.CreateDirectory(pointsDirectoryPath);
        }
    }
    
    // Struct to hold parsed metadata
    public struct PointSetMetadata
    {
        public string Name;
        public Color Color;
        public bool SkipCriticalLine;
        public int SamplingInterval;
        public float PointSize;
    }

    // Shared static method to parse metadata from a file
    public static PointSetMetadata ParsePointSetMetadata(string[] lines, Color defaultColor)
    {
        var metadata = new PointSetMetadata
        {
            Name = null,
            Color = defaultColor,
            SkipCriticalLine = false,
            SamplingInterval = 1,
            PointSize = 4f
        };

        // Parse enhanced header
        var settings = new Dictionary<string, string>();
        foreach (var line in lines)
        {
            if (!line.StartsWith("#@")) continue;
            var settingLine = line.Substring(2).Trim();
            var colonIndex = settingLine.IndexOf(':');
            if (colonIndex <= 0) continue;
            var key = settingLine.Substring(0, colonIndex).Trim();
            var value = settingLine.Substring(colonIndex + 1).Trim();
            settings[key] = value;
        }
        if (settings.ContainsKey("name"))
            metadata.Name = settings["name"];
        if (settings.ContainsKey("color") && settings["color"].StartsWith("#"))
            ColorUtility.TryParseHtmlString(settings["color"], out metadata.Color);
        if (settings.ContainsKey("skipCriticalLine"))
            bool.TryParse(settings["skipCriticalLine"], out metadata.SkipCriticalLine);
        if (settings.ContainsKey("samplingInterval"))
        {
            if (!int.TryParse(settings["samplingInterval"], out metadata.SamplingInterval) || metadata.SamplingInterval < 1)
                metadata.SamplingInterval = 1;
        }
        if (settings.ContainsKey("pointSize"))
        {
            if (!float.TryParse(settings["pointSize"], out metadata.PointSize) || metadata.PointSize <= 0)
                metadata.PointSize = 4f;
        }

        // Parse the first non-comment line for name and color if not already set
        foreach (var line in lines)
        {
            if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#")) continue;
            var parts = line.Split(',');
            if (string.IsNullOrEmpty(metadata.Name) && parts.Length > 0)
                metadata.Name = parts[0];
            if (parts.Length > 1 && parts[1].StartsWith("#"))
                ColorUtility.TryParseHtmlString(parts[1], out metadata.Color);
            break;
        }
        return metadata;
    }
    
    private void RefreshPointSetList()
    {
        if (pointSetSelector == null) return;
        var files = Directory.GetFiles(pointsDirectoryPath, "*.csv");
        optionIndexToName.Clear();
        var options = new List<DropdownEx.OptionData>();
        uint index = 0;
        foreach (var filePath in files)
        {
            string[] allLines = File.ReadAllLines(filePath);
            var metadata = ParsePointSetMetadata(allLines, defaultPointColor);
            string displayName = metadata.Name ?? Path.GetFileNameWithoutExtension(filePath);
            Color pointColor = metadata.Color;
            options.Add(new DropdownEx.OptionData(displayName, pointColor));
            // Debug.Log($"Dropdown option: {displayName}, color: {pointColor} (RGBA: {pointColor.r}, {pointColor.g}, {pointColor.b}, {pointColor.a})");
            optionIndexToName[index] = Path.GetFileNameWithoutExtension(filePath);
            index++;
        }
        pointSetSelector.ClearOptions();
        pointSetSelector.AddOptions(options);
        pointSetSelector.value = 0;
    }
    
    private void OnPointSetSelectionChanged(uint selectedIndex)
    {
        
        // For multi-select, selectedIndex is actually a bit field where each bit represents a selected item
        if (pointSetSelector.AllowMultiSelect)
        {
            // Calculate which bits changed
            uint changedBits = selectedIndex ^ previousSelectionValue;
            
            // Process each changed bit
            uint bitMask = 1;
            int bitIndex = 0;
            
            while (changedBits != 0)
            {
                if ((changedBits & 1) != 0)  // If this bit changed
                {
                    if (optionIndexToName.TryGetValue((uint)bitIndex, out string setName))
                    {
                        bool isSelected = (selectedIndex & bitMask) != 0;
                        
                        if (isSelected && !loadedSets.Any(s => s.Name.Equals(setName, StringComparison.OrdinalIgnoreCase)))
                        {
                            LoadPointSet(setName);
                        }
                        else if (!isSelected)
                        {
                            var setToRemove = loadedSets.FirstOrDefault(s => s.Name.Equals(setName, StringComparison.OrdinalIgnoreCase));
                            if (setToRemove != null)
                            {
                                UnloadPointSet(setToRemove);
                            }
                            else
                            {
                                Debug.LogWarning($"[PointSetManager] Set {setName} not found in loadedSets. Current sets: {string.Join(", ", loadedSets.Select(s => s.Name))}");
                            }
                        }
                    }
                    else
                    {
                        Debug.LogWarning($"[PointSetManager] No point set name found for bit index {bitIndex}");
                    }
                }
                changedBits >>= 1;
                bitMask <<= 1;
                bitIndex++;
            }
            
            previousSelectionValue = selectedIndex;
        }
        else
        {
            // Original single-select behavior
            if (!optionIndexToName.TryGetValue(selectedIndex, out string setName))
            {
                Debug.LogWarning($"[PointSetManager] No point set name found for index {selectedIndex}");
                return;
            }
            
            
            bool isLoaded = loadedSets.Any(s => s.Name.Equals(setName, StringComparison.OrdinalIgnoreCase));
            bool isSelected = pointSetSelector.value == selectedIndex;
            
            if (isSelected && !isLoaded)
            {
                LoadPointSet(setName);
            }
            else if (!isSelected && isLoaded)
            {
                var setToRemove = loadedSets.FirstOrDefault(s => s.Name.Equals(setName, StringComparison.OrdinalIgnoreCase));
                if (setToRemove != null)
                {
                    UnloadPointSet(setToRemove);
                }
            }
        }
    }
    
    private void LoadPointSet(string setName)
    {
        string filePath = Path.Combine(pointsDirectoryPath, $"{setName}.csv");
        
        if (File.Exists(filePath))
        {
            var allLines = File.ReadAllLines(filePath);
            if (allLines.Length < 1)
            {
                Debug.LogWarning($"[PointSetManager] Empty file: {filePath}");
                return;
            }
            var metadata = ParsePointSetMetadata(allLines, defaultPointColor);
            
            // Check if this is an old-style file that needs conversion
            bool needsConversion = ShouldConvertToEnhancedFormat(allLines);
            if (needsConversion)
            {
                // Convert and update the file on disk
                var updatedLines = ConvertToEnhancedFormat(allLines, metadata);
                File.WriteAllLines(filePath, updatedLines);
                Debug.Log($"[PointSetManager] Converted {filePath} to enhanced header format");
                allLines = updatedLines; // Use the updated lines for loading
            }
            
            string pointSetName = metadata.Name ?? setName;
            Color pointColor = metadata.Color;
            bool skipCriticalLine = metadata.SkipCriticalLine;
            int samplingInterval = metadata.SamplingInterval;
            float pointSize = metadata.PointSize;
            var pointSet = new PointSet(pointSetName, pointColor, skipCriticalLine, pointSize);
            int totalPoints = 0;
            int loadedPoints = 0;
            int skippedCriticalPoints = 0;
            int processedPointCount = 0;
            Vector2? lastAddedPoint = null;

            // Process each point
            foreach (var line in allLines)
            {
                // Skip comment and empty lines
                if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#")) 
                {
                    continue;
                }

                totalPoints++;
                string[] parts = line.Split(',');
                if (parts.Length != 2) continue;

                if (double.TryParse(parts[0], out double real) && 
                    double.TryParse(parts[1], out double index))
                {
                    // Skip points near critical line if configured
                    if (skipCriticalLine)
                    {
                        double distanceFromHalf = Math.Abs(real - 0.5);
                        if (distanceFromHalf <= criticalLineSkipTolerance)
                        {
                            skippedCriticalPoints++;
                            continue;
                        }
                    }

                    Vector2 currentPoint = new Vector2((float)real, (float)index);
                    bool shouldAdd = true;

                    // Apply sampling if configured
                    if (samplingInterval > 1)
                    {
                        shouldAdd = processedPointCount % samplingInterval == 0;
                        processedPointCount++;
                    }

                    if (shouldAdd)
                    {
                        pointSet.AddPoint(real, index);
                        lastAddedPoint = currentPoint;
                        loadedPoints++;
                    }
                }
            }

            Debug.Log($"[PointSetManager] Loaded {loadedPoints} points out of {totalPoints} total points. " +
                     $"Skipped {skippedCriticalPoints} points near critical line. " +
                     $"Total reduction: {((1f - (float)loadedPoints/totalPoints) * 100):F1}% for set '{setName}'");

            // Store the total points in the point set
            pointSet.TotalPointsInFile = totalPoints;

            // Ensure the name matches exactly what we're looking for
            if (pointSet.Name != setName)
            {
                var originalSet = pointSet;
                pointSet = new PointSet(setName, originalSet.Color, originalSet.SkipCriticalLine, originalSet.PointSize);
                pointSet.TotalPointsInFile = originalSet.TotalPointsInFile;
                foreach (var point in originalSet.Points)
                {
                    pointSet.AddPoint(point.x, point.y);
                }
            }

            loadedSets.Add(pointSet);
            
            if (pointsMeshPrefab != null && pointsContainer != null)
            {
                // Create a parent group GameObject for this point set
                GameObject groupObj = new GameObject(pointSet.Name + "_group", typeof(RectTransform));
                groupObj.transform.SetParent(pointsContainer, false);
                RectTransform groupRect = groupObj.GetComponent<RectTransform>();
                groupRect.anchorMin = Vector2.zero;
                groupRect.anchorMax = Vector2.one;
                groupRect.offsetMin = Vector2.zero;
                groupRect.offsetMax = Vector2.zero;
                pointSetParents[pointSet] = groupObj;
                
                // Add an Image component to the group to handle raycasts
                Image groupImage = groupObj.AddComponent<Image>();
                groupImage.color = new Color(0, 0, 0, 0.01f); // Almost transparent, but not completely (for debugging)
                groupImage.raycastTarget = true; // Make sure it receives pointer events
                
                // Add the interaction handler so pointer events on the group are handled for the whole set
                PointSetInteractionHandler handler = groupObj.AddComponent<PointSetInteractionHandler>();
                handler.pointSet = pointSet;
                handler.criticalStripRenderer = criticalStripRenderer;
                handler.app = app;
                handler.pointSetManager = this;
                handler.pointSize = pointSet.PointSize; // Set point size for interaction

                // Create a dedicated hover point object that will be animated for hover effects
                GameObject hoverPointObj = new GameObject("HoverPoint", typeof(RectTransform), typeof(Image));
                hoverPointObj.transform.SetParent(groupObj.transform, false);
                RectTransform hoverPointRect = hoverPointObj.GetComponent<RectTransform>();
                hoverPointRect.sizeDelta = new Vector2(handler.pointSize, handler.pointSize); // Match handler's point size
                Image hoverPointImage = hoverPointObj.GetComponent<Image>();
                hoverPointImage.color = pointSet.Color;
                hoverPointImage.raycastTarget = false;
                hoverPointObj.SetActive(false); // Start hidden
                handler.hoverPoint = hoverPointRect;

                List<Vector2> convertedPoints = new List<Vector2>();

                if (criticalStripRenderer != null && criticalStripRenderer.GetTransform() != null)
                {
                    var transform = criticalStripRenderer.GetTransform();
                    bool useImaginary = transform.UseImaginarySpace;
                    
                    foreach (var pt in pointSet.OriginalPoints)
                    {
                        float y = useImaginary 
                            ? (float)Zeta.IndexToImag(pt.Index)
                            : (float)pt.Index;
                        Vector2 stripPos = new Vector2((float)pt.Real, y);
                        Vector2 viewportPos = transform.StripToViewport(stripPos);
                        convertedPoints.Add(viewportPos);
                    }
                }
                else
                {
                    Debug.LogWarning("CriticalStripRenderer or transform not available - points may not display correctly");
                    foreach (var pt in pointSet.OriginalPoints)
                    {
                        convertedPoints.Add(new Vector2((float)pt.Real, (float)pt.Index));
                    }
                }

                // Split the convertedPoints into chunks if they exceed the threshold
                const int maxPointsPerMesh = 5000;
                for (int i = 0; i < convertedPoints.Count; i += maxPointsPerMesh)
                {
                    int count = Math.Min(maxPointsPerMesh, convertedPoints.Count - i);
                    List<Vector2> chunk = convertedPoints.GetRange(i, count);
                    PointsMeshRenderer meshInstance = Instantiate(pointsMeshPrefab, groupObj.transform);
                    meshInstance.Points = chunk;
                    meshInstance.color = pointSet.Color;
                    meshInstance.PointSize = pointSet.PointSize; // Set point size for mesh
                    meshInstance.Refresh();
                    // Assign a new material instance to disable UI batching and prevent vertex merging
                    meshInstance.material = new Material(meshInstance.material);
                    // Disable raycast target on meshInstance so it does not block pointer events
                    meshInstance.raycastTarget = false;
                    // Try to set mesh index format if available through reflection
                    try {
                        System.Reflection.MethodInfo method = meshInstance.GetType().GetMethod("GetMesh", 
                            System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
                        if (method != null) {
                            Mesh mesh = method.Invoke(meshInstance, null) as Mesh;
                            if (mesh != null) {
                                mesh.indexFormat = UnityEngine.Rendering.IndexFormat.UInt32;
                            }
                        }
                    } catch (System.Exception ex) {
                        Debug.LogWarning($"Could not set mesh index format: {ex.Message}");
                    }
                    if (!pointsMeshInstances.ContainsKey(pointSet))
                    {
                        pointsMeshInstances[pointSet] = new List<PointsMeshRenderer>();
                    }
                    pointsMeshInstances[pointSet].Add(meshInstance);
                }
            }
            else
            {
                Debug.LogWarning("PointsMeshRenderer prefab or container not assigned in PointSetManager");
            }

            UpdateStats();
        }
        else
        {
            Debug.LogWarning($"[PointSetManager] Point set file not found at: {filePath}");
        }
    }
    
    private void UnloadPointSet(PointSet set)
    {
        // Clean up the meshes dictionary
        if (pointsMeshInstances.ContainsKey(set))
        {
            // Individual mesh instances will be destroyed when the parent is destroyed
            pointsMeshInstances.Remove(set);
        }
        
        // Clean up the parent GameObject if it exists
        if (pointSetParents.ContainsKey(set))
        {
            GameObject parent = pointSetParents[set];
            if (parent != null)
            {
                Destroy(parent);
            }
            pointSetParents.Remove(set);
        }
        else 
        {
            Debug.LogWarning("No parent GameObject found for point set: " + set.Name);
        }
        
        loadedSets.Remove(set);

        UpdateStats();
    }
    
    private void UpdateStats()
    {
        if (stats != null)
        {
            int totalPoints = loadedSets.Sum(set => set.TotalPointsInFile);
            stats.UpdateTotalPoints(totalPoints);
        }
    }
    
    public void SaveCurrentPoint()
    {
        if (app == null)
        {
            Debug.LogWarning("Cannot save point: App reference is null");
            return;
        }
        
        string filePath = Path.Combine(pointsDirectoryPath, FAVORITES_FILE);
        bool isNewFile = !File.Exists(filePath);
        
        // If this is the first save, create the file with header and documentation
        if (isNewFile)
        {
            var fileContents = new List<string>
            {
                "# Point Set File Format:",
                "# Header: name,color,skipCriticalLine,samplingInterval",
                "# - name: Name of the point set",
                "# - color: HTML color code (e.g. #FF0000 for red)",
                "# - skipCriticalLine: Set to false to include points near 0.5",
                "# - samplingInterval: Integer value to sample every Nth point (1 = use all points)",
                $"{FAVORITES_NAME},#{ColorUtility.ToHtmlStringRGBA(defaultPointColor)},false,1\n"
            };
            File.WriteAllLines(filePath, fileContents);
            // Refresh the dropdown to include the new file
            RefreshPointSetList();
        }
        
        string newPoint = $"{app.Real:G17},{app.Index:G17}\n";  // Use G17 format to preserve full double precision
        File.AppendAllText(filePath, newPoint);
        
        // Always ensure Favorites is loaded and displayed after saving
        if (!loadedSets.Any(s => s.Name == FAVORITES_NAME))
        {
            // Find the index of Favorites in the dropdown
            uint favoritesIndex = 0;
            bool found = false;
            foreach (var kvp in optionIndexToName)
            {
                if (kvp.Value == Path.GetFileNameWithoutExtension(FAVORITES_FILE))
                {
                    favoritesIndex = kvp.Key;
                    found = true;
                    break;
                }
            }

            if (!found && isNewFile)
            {
                // If we just created the file and didn't find it in the options,
                // refresh the list and try again
                RefreshPointSetList();
                foreach (var kvp in optionIndexToName)
                {
                    if (kvp.Value == Path.GetFileNameWithoutExtension(FAVORITES_FILE))
                    {
                        favoritesIndex = kvp.Key;
                        found = true;
                        break;
                    }
                }
            }

            if (found)
            {
                if (pointSetSelector.AllowMultiSelect)
                {
                    // For multi-select, set the bit for favorites
                    pointSetSelector.value |= (1u << (int)favoritesIndex);
                }
                else
                {
                    // For single-select, just set the value directly
                    pointSetSelector.value = favoritesIndex;
                }
                
                // Explicitly load the point set since it's not loaded
                LoadPointSet(Path.GetFileNameWithoutExtension(FAVORITES_FILE));
            }
            else
            {
                Debug.LogWarning($"Could not find {FAVORITES_NAME} in dropdown options after save");
            }
        }
        else
        {
            // If already loaded, just reload to show the new point
            ReloadPointSet(FAVORITES_NAME);
        }
    }
    
    private void ReloadPointSet(string setName)
    {
        var existingSet = loadedSets.Find(s => s.Name == setName);
        if (existingSet != null)
        {
            UnloadPointSet(existingSet);
        }
        LoadPointSet(setName);
    }
    
    private void OnDestroy()
    {
        if (app != null)
        {
            app.RealChanged -= OnRealChanged;
            app.IndexChanged -= OnIndexChanged;
        }
        
        if (pointSetSelector != null)
        {
            pointSetSelector.onValueChanged.RemoveListener(OnPointSetSelectionChanged);
        }
        
        // Unsubscribe from viewport changes
        if (criticalStripRenderer != null)
        {
            CriticalStripRenderer.OnViewportChanged -= UpdatePointPositions;
        }
    }
    
    private void OnRealChanged(double real)
    {
        // Update coordinate display if needed
    }
    
    private void OnIndexChanged(double index)
    {
        // Update coordinate display if needed
    }
    
    private void Start()
    {
        // Subscribe to viewport changes
        if (criticalStripRenderer != null)
        {
            CriticalStripRenderer.OnViewportChanged += UpdatePointPositions;
        }
    }
    
    private void UpdatePointPositions()
    {
        // Skip if we don't have the required components
        if (criticalStripRenderer == null || criticalStripRenderer.GetTransform() == null) return;
        
        const int maxPointsPerMesh = 5000;
        
        // Update position of all point mesh instances
        foreach (var kvp in pointsMeshInstances)
        {
            var pointSet = kvp.Key;
            var meshRenderers = kvp.Value;
            
            // Recalculate updated points using the original points
            List<Vector2> updatedPoints = new List<Vector2>();
            var transform = criticalStripRenderer.GetTransform();
            bool useImaginary = transform.UseImaginarySpace;
            
            foreach (var pt in pointSet.OriginalPoints)
            {
                float y = useImaginary 
                    ? (float)Zeta.IndexToImag(pt.Index)
                    : (float)pt.Index;
                Vector2 stripPos = new Vector2((float)pt.Real, y);
                Vector2 viewportPos = transform.StripToViewport(stripPos);
                updatedPoints.Add(viewportPos);
            }
            
            // Update each mesh renderer with its corresponding chunk
            for (int i = 0; i < meshRenderers.Count; i++)
            {
                int startIndex = i * maxPointsPerMesh;
                if (startIndex >= updatedPoints.Count) break;
                int count = Math.Min(maxPointsPerMesh, updatedPoints.Count - startIndex);
                List<Vector2> chunk = updatedPoints.GetRange(startIndex, count);
                meshRenderers[i].Points = chunk;
                meshRenderers[i].Refresh();
            }
        }
    }
    
    #if UNITY_EDITOR
    [UnityEditor.MenuItem("Critical Strip/Refresh Point Sets")]
    private static void RefreshPointSetsMenuItem()
    {
        var manager = FindObjectOfType<PointSetManager>();
        if (manager != null)
        {
            manager.RefreshPointSetList();
        }
    }

    // Methods for editor testing
    public void AddTestPointSet(PointSet pointSet)
    {
        // Save the test point set to a file in our points directory
        string filePath = Path.Combine(pointsDirectoryPath, $"{pointSet.Name}.csv");
        
        // Create the header line
        var lines = new List<string>();
        // Add enhanced header for pointSize if not default
        if (pointSet.PointSize != 4f)
        {
            lines.Add($"#@pointSize: {pointSet.PointSize}");
        }
        lines.Add($"{pointSet.Name},#{ColorUtility.ToHtmlStringRGBA(pointSet.Color)}");
        
        // Add all points
        foreach (var point in pointSet.Points)
        {
            lines.Add($"{point.x:G17},{point.y:G17}");
        }
        
        // Write to file
        File.WriteAllLines(filePath, lines);
        
        // Refresh the dropdown to include the new file
        RefreshPointSetList();
        
        // Find and select the new test set in the dropdown
        if (pointSetSelector != null)
        {
            var files = Directory.GetFiles(pointsDirectoryPath, "*.csv")
                               .Select(path => Path.GetFileNameWithoutExtension(path))
                               .ToList();
            
            int index = files.IndexOf(pointSet.Name);
            if (index >= 0)
            {
                pointSetSelector.value = (uint)index;
            }
        }
    }
    
    public void ClearTestPointSets()
    {
        // Find all test point sets in the directory
        var testFiles = Directory.GetFiles(pointsDirectoryPath, "*.csv")
                               .Where(path => Path.GetFileNameWithoutExtension(path).StartsWith("test_"))
                               .ToList();
        
        // Remove each test file
        foreach (var file in testFiles)
        {
            File.Delete(file);
            
            // Also remove from loaded sets if loaded
            var setName = Path.GetFileNameWithoutExtension(file);
            var loadedSet = loadedSets.FirstOrDefault(s => s.Name == setName);
            if (loadedSet != null)
            {
                UnloadPointSet(loadedSet);
            }
        }
        
        // Refresh the dropdown to reflect the changes
        RefreshPointSetList();
    }
    #endif

    // Determines if a file should be converted to enhanced format
    private bool ShouldConvertToEnhancedFormat(string[] lines)
    {
        // Consider a file needing conversion if it has no #@ lines
        bool hasEnhancedHeaders = false;
        foreach (var line in lines)
        {
            if (line.StartsWith("#@"))
            {
                hasEnhancedHeaders = true;
                break;
            }
        }
        
        if (!hasEnhancedHeaders)
        {
            // Additional check: first non-comment line should be a valid header
            foreach (var line in lines)
            {
                if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#"))
                    continue;
                    
                // If we found a non-comment line, it should be a header with at least a name
                string[] parts = line.Split(',');
                return parts.Length >= 1 && !string.IsNullOrWhiteSpace(parts[0]);
            }
        }
        
        return false;
    }
    
    // Converts a file with old headers to enhanced format
    private string[] ConvertToEnhancedFormat(string[] oldLines, PointSetMetadata metadata)
    {
        var newLines = new List<string>();
        
        // Add file format documentation
        newLines.Add("# Point Set File Format:");
        newLines.Add("# Enhanced format with metadata headers starting with #@");
        
        // Add enhanced metadata headers
        newLines.Add($"#@name: {metadata.Name}");
        newLines.Add($"#@color: #{ColorUtility.ToHtmlStringRGBA(metadata.Color)}");
        newLines.Add($"#@skipCriticalLine: {metadata.SkipCriticalLine}");
        newLines.Add($"#@samplingInterval: {metadata.SamplingInterval}");
        newLines.Add($"#@pointSize: {metadata.PointSize}");
        
        // Now add a single header line (backward compatibility)
        newLines.Add($"{metadata.Name},#{ColorUtility.ToHtmlStringRGBA(metadata.Color)},{metadata.SkipCriticalLine}");
        
        // Copy all point data lines (non-comment, non-header)
        bool headerFound = false;
        foreach (var line in oldLines)
        {
            // Skip comment lines and empty lines
            if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#"))
                continue;
                
            if (!headerFound)
            {
                // This is the header line, skip it as we added our own above
                headerFound = true;
                continue;
            }
            
            // This is a data line, add it
            newLines.Add(line);
        }
        
        return newLines.ToArray();
    }
} 