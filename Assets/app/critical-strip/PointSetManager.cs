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
    
    [Header("Point Loading Optimization")]
    [Tooltip("When enabled, reduces the number of loaded points by intelligently skipping points that are too close together")]
    [SerializeField] private bool enableDownsampling = true;
    [Tooltip("Minimum world-space distance between points. Points closer than this will be skipped")]
    [SerializeField] [Range(0.001f, 0.1f)] private float minPointDistance = 0.01f;
    [Tooltip("Controls how aggressively points are removed. Higher values remove more points")]
    [SerializeField] [Range(0.1f, 4.0f)] private float downsampleAggressiveness = 1f;
    
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

            // Skip any comment lines to find the header
            int headerIndex = 0;
            while (headerIndex < allLines.Length && allLines[headerIndex].StartsWith("#"))
            {
                headerIndex++;
            }

            if (headerIndex >= allLines.Length)
            {
                Debug.LogWarning($"[PointSetManager] No header found in file (only comments): {filePath}");
                return;
            }

            // Parse header
            string[] headerParts = allLines[headerIndex].Split(',');
            if (headerParts.Length < 2)
            {
                // Provide helpful message about expected header format
                Debug.LogWarning($"[PointSetManager] Invalid header format in file: {filePath}\n" +
                    "Expected header format:\n" +
                    "# Header format: name,color,skipCriticalLine,useOptimization\n" +
                    "# - name: required, the name of the point set\n" +
                    "# - color: optional, HTML color code starting with #\n" +
                    "# - skipCriticalLine: optional, true/false whether to skip points near critical line\n" +
                    "# - useOptimization: optional, true/false whether to apply point optimization");
                return;
            }

            string pointSetName = headerParts[0];
            Color pointColor = defaultPointColor;
            bool skipCriticalLine = false;
            bool useOptimization = true;  // New flag for controlling optimization

            // Parse color if provided
            if (headerParts[1].StartsWith("#"))
            {
                ColorUtility.TryParseHtmlString(headerParts[1], out pointColor);
            }

            // Parse skipCriticalLine if provided
            if (headerParts.Length > 2)
            {
                bool.TryParse(headerParts[2], out skipCriticalLine);
            }

            // Parse useOptimization if provided
            if (headerParts.Length > 3)
            {
                bool.TryParse(headerParts[3], out useOptimization);
            }

            var pointSet = new PointSet(pointSetName, pointColor, skipCriticalLine);
            int totalPoints = allLines.Length - (headerIndex + 1); // Subtract header and comment lines
            int loadedPoints = 0;
            int skippedCriticalPoints = 0;
            Vector2? lastAddedPoint = null;

            // Process each point
            for (int i = headerIndex + 1; i < allLines.Length; i++)
            {
                // Skip comment lines
                if (allLines[i].StartsWith("#")) 
                {
                    totalPoints--; // Adjust total points count for comments
                    continue;
                }

                string[] parts = allLines[i].Split(',');
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

                    // Only apply downsampling if useOptimization is true
                    if (useOptimization && enableDownsampling && lastAddedPoint.HasValue)
                    {
                        float distSq = (currentPoint - lastAddedPoint.Value).sqrMagnitude;
                        float threshold = minPointDistance * (1f + downsampleAggressiveness);
                        float thresholdSq = threshold * threshold;
                        shouldAdd = distSq >= thresholdSq;
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
                pointSet = new PointSet(setName, originalSet.Color, originalSet.SkipCriticalLine);
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
                    meshInstance.Refresh();
                    // Assign a new material instance to disable UI batching and prevent vertex merging
                    meshInstance.material = new Material(meshInstance.material);
                    // Try to set mesh index format if available through reflection
                    // Unity UI doesn't expose this property publicly, so we'll work around it
                    try {
                        // If PointsMeshRenderer has a method to access its mesh, use that
                        System.Reflection.MethodInfo method = meshInstance.GetType().GetMethod("GetMesh", 
                            System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
                        if (method != null) {
                            Mesh mesh = method.Invoke(meshInstance, null) as Mesh;
                            if (mesh != null) {
                                mesh.indexFormat = UnityEngine.Rendering.IndexFormat.UInt32;
                            }
                        }
                    } catch (System.Exception ex) {
                        // Silent fail - this is just an optimization attempt
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
        if (pointsMeshInstances.ContainsKey(set))
        {
            foreach (var meshInstance in pointsMeshInstances[set])
            {
                Destroy(meshInstance.gameObject);
            }
            pointsMeshInstances.Remove(set);
        }
        else
        {
            Debug.LogWarning("No PointsMeshRenderer instances found for point set: " + set.Name);
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
                "# Header: name,color,skipCriticalLine,useOptimization",
                "# - name: Name of the point set",
                "# - color: HTML color code (e.g. #FF0000 for red)",
                "# - skipCriticalLine: Set to false to include points near 0.5",
                "# - useOptimization: Set to false to load all points without optimization",
                $"{FAVORITES_NAME},#{ColorUtility.ToHtmlStringRGBA(defaultPointColor)},false,false\n"
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
        var lines = new List<string>
        {
            $"{pointSet.Name},#{ColorUtility.ToHtmlStringRGBA(pointSet.Color)}"
        };
        
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
} 