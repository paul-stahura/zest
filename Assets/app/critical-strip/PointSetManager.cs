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
    private CriticalStripRenderer renderer;
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
        renderer = GetComponentInChildren<CriticalStripRenderer>();
        app = FindObjectOfType<App>();
        
        // Debug.Log($"PointSetManager Awake - Renderer: {(renderer != null ? "Found" : "Not Found")}, App: {(app != null ? "Found" : "Not Found")}");
        
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
    }
    
    private void SetupPointsDirectory()
    {
        pointsDirectoryPath = Path.Combine(Application.dataPath, POINTS_DIRECTORY);
        
        if (!Directory.Exists(pointsDirectoryPath))
        {
            Directory.CreateDirectory(pointsDirectoryPath);
        }
    }
    
    private void RefreshPointSetList()
    {
        if (pointSetSelector == null) return;
        
        // Get all .csv files in the points directory
        var files = Directory.GetFiles(pointsDirectoryPath, "*.csv");
        
        // Clear the mapping dictionary
        optionIndexToName.Clear();
        
        // Update dropdown options
        var options = new List<DropdownEx.OptionData>();
        uint index = 0;
        
        foreach (var filePath in files)
        {
            string displayName = Path.GetFileNameWithoutExtension(filePath); // Default to filename
            
            // Try to read the name from the first non-comment line of the file
            try
            {
                using (var reader = new StreamReader(filePath))
                {
                    string line;
                    // Skip comment lines
                    while ((line = reader.ReadLine()) != null && line.StartsWith("#"))
                    {
                        continue;
                    }
                    
                    if (!string.IsNullOrEmpty(line))
                    {
                        // The name is everything before the first comma
                        int commaIndex = line.IndexOf(',');
                        if (commaIndex > 0)
                        {
                            displayName = line.Substring(0, commaIndex);
                        }
                    }
                }
            }
            catch (Exception e)
            {
                Debug.LogWarning($"Failed to read name from file {filePath}: {e.Message}");
                // Keep using filename as fallback
            }
            
            options.Add(new DropdownEx.OptionData(displayName));
            optionIndexToName[index] = Path.GetFileNameWithoutExtension(filePath); // Keep using filename for internal mapping
            index++;
        }
        
        // Clear options and add new ones without triggering selection
        pointSetSelector.ClearOptions();
        pointSetSelector.AddOptions(options);
        pointSetSelector.value = 0;  // Set to "None" option
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

            // Parse settings from enhanced header comments
            var settings = ParseEnhancedHeader(allLines);
            
            // Set defaults
            string pointSetName = setName; // Default to filename
            Color pointColor = defaultPointColor;
            bool skipCriticalLine = false;
            int samplingInterval = 1;
            float pointSize = 4f; // Default point size

            // Extract settings with fallbacks
            if (settings.ContainsKey("name"))
            {
                pointSetName = settings["name"];
            }

            if (settings.ContainsKey("color") && settings["color"].StartsWith("#"))
            {
                ColorUtility.TryParseHtmlString(settings["color"], out pointColor);
            }

            if (settings.ContainsKey("skipCriticalLine"))
            {
                bool.TryParse(settings["skipCriticalLine"], out skipCriticalLine);
            }

            if (settings.ContainsKey("samplingInterval"))
            {
                if (!int.TryParse(settings["samplingInterval"], out samplingInterval) || samplingInterval < 1)
                {
                    samplingInterval = 1;
                    Debug.LogWarning($"[PointSetManager] Invalid samplingInterval in file {filePath}. Using default of 1 (all points).");
                }
            }

            // Parse pointSize if present
            if (settings.ContainsKey("pointSize"))
            {
                if (!float.TryParse(settings["pointSize"], out pointSize) || pointSize <= 0)
                {
                    pointSize = 4f;
                    Debug.LogWarning($"[PointSetManager] Invalid pointSize in file {filePath}. Using default of 4.");
                }
            }

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
                GameObject groupObj = new GameObject(pointSet.Name + "_Group", typeof(RectTransform));
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
                handler.criticalStripRenderer = renderer;
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

                if (renderer != null && renderer.GetTransform() != null)
                {
                    foreach (var pt in pointSet.OriginalPoints)
                    {
                        Vector2 stripPos = new Vector2((float)pt.Real, (float)pt.Index);
                        Vector2 viewportPos = renderer.GetTransform().StripToViewport(stripPos);
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
        if (renderer != null)
        {
            renderer.OnViewportChanged -= UpdatePointPositions;
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
        if (renderer != null)
        {
            renderer.OnViewportChanged += UpdatePointPositions;
        }
    }
    
    private void UpdatePointPositions()
    {
        // Skip if we don't have the required components
        if (renderer == null || renderer.GetTransform() == null) return;
        
        const int maxPointsPerMesh = 5000;
        
        // Update position of all point mesh instances
        foreach (var kvp in pointsMeshInstances)
        {
            var pointSet = kvp.Key;
            var meshRenderers = kvp.Value;
            
            // Recalculate updated points using the original points
            List<Vector2> updatedPoints = new List<Vector2>();
            foreach (var pt in pointSet.OriginalPoints)
            {
                Vector2 stripPos = new Vector2((float)pt.Real, (float)pt.Index);
                Vector2 viewportPos = renderer.GetTransform().StripToViewport(stripPos);
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
    
    private Dictionary<string, string> ParseEnhancedHeader(string[] lines)
    {
        var settings = new Dictionary<string, string>();
        
        foreach (var line in lines)
        {
            if (!line.StartsWith("#@")) continue;
            
            // Remove #@ prefix
            var settingLine = line.Substring(2).Trim();
            
            // Split on first : only
            var colonIndex = settingLine.IndexOf(':');
            if (colonIndex <= 0) continue;
            
            var key = settingLine.Substring(0, colonIndex).Trim();
            var value = settingLine.Substring(colonIndex + 1).Trim();
            
            settings[key] = value;
        }
        
        return settings;
    }
} 