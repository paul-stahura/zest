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
    
    private const string POINTS_DIRECTORY = "CriticalStripPoints";
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
        
        Debug.Log($"PointSetManager Awake - Renderer: {(renderer != null ? "Found" : "Not Found")}, App: {(app != null ? "Found" : "Not Found")}");
        
        if (app != null)
        {
            app.RealChanged += OnRealChanged;
            app.IndexChanged += OnIndexChanged;
        }
        
        // Set up points directory
        SetupPointsDirectory();
        
        // Initialize dropdown
        if (pointSetSelector != null)
        {
            pointSetSelector.onValueChanged.AddListener(OnPointSetSelectionChanged);
            RefreshPointSetList();
        }
        else
        {
            Debug.LogWarning("PointSetSelector not assigned in inspector");
        }
    }
    
    private void SetupPointsDirectory()
    {
        pointsDirectoryPath = Path.Combine(Application.dataPath, POINTS_DIRECTORY);
        Debug.Log($"Points directory path: {pointsDirectoryPath}");
        
        if (!Directory.Exists(pointsDirectoryPath))
        {
            Directory.CreateDirectory(pointsDirectoryPath);
            Debug.Log("Created points directory");
            
            // Create default user points file if it doesn't exist
            string userPointsPath = Path.Combine(pointsDirectoryPath, "user_points.csv");
            if (!File.Exists(userPointsPath))
            {
                File.WriteAllText(userPointsPath, $"user_points,#{ColorUtility.ToHtmlStringRGBA(defaultPointColor)}\n");
                Debug.Log("Created default user points file");
            }
        }
    }
    
    private void RefreshPointSetList()
    {
        if (pointSetSelector == null) return;
        
        // Get all .csv files in the points directory
        var files = Directory.GetFiles(pointsDirectoryPath, "*.csv")
                           .Select(path => Path.GetFileNameWithoutExtension(path))
                           .ToList();
        
        Debug.Log($"Found {files.Count} point set files");
        
        // Clear the mapping dictionary
        optionIndexToName.Clear();
        
        // Update dropdown options
        var options = new List<DropdownEx.OptionData>();
        for (uint i = 0; i < files.Count; i++)
        {
            options.Add(new DropdownEx.OptionData(files[(int)i]));  // Use constructor instead of property
            optionIndexToName[i] = files[(int)i];
        }
        
        pointSetSelector.ClearOptions();
        pointSetSelector.AddOptions(options);
        
        // Set default selection to user_points if it exists, but don't load it
        if (files.Contains("user_points"))
        {
            uint userPointsIndex = (uint)files.IndexOf("user_points");
            if (optionIndexToName.ContainsKey(userPointsIndex))
            {
                pointSetSelector.value = userPointsIndex;
            }
        }
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
                        Debug.Log($"Point set selection changed: {setName} is now {(isSelected ? "selected" : "deselected")} (bit {bitIndex})");
                        
                        if (isSelected && !loadedSets.Any(s => s.Name == setName))
                        {
                            LoadPointSet(setName);
                        }
                        else if (!isSelected)
                        {
                            var setToRemove = loadedSets.FirstOrDefault(s => s.Name == setName);
                            if (setToRemove != null)
                            {
                                Debug.Log($"Removing point set: {setName}");
                                UnloadPointSet(setToRemove);
                            }
                        }
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
                Debug.LogWarning($"No point set name found for index {selectedIndex}");
                return;
            }
            
            Debug.Log($"Point set selection changed to: {setName}");
            
            bool isLoaded = loadedSets.Any(s => s.Name == setName);
            bool isSelected = pointSetSelector.value == selectedIndex;
            
            if (isSelected && !isLoaded)
            {
                LoadPointSet(setName);
            }
            else if (!isSelected && isLoaded)
            {
                var setToRemove = loadedSets.FirstOrDefault(s => s.Name == setName);
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
        Debug.Log($"Loading point set from: {filePath}");
        
        if (File.Exists(filePath))
        {
            var pointSet = PointSet.FromFile(filePath);
            if (pointSet != null)
            {
                Debug.Log($"Loaded point set '{pointSet.Name}' with {pointSet.Points.Count} points");
                loadedSets.Add(pointSet);
                if (renderer != null)
                {
                    renderer.AddPointSet(pointSet);
                    Debug.Log("Added point set to renderer");
                }
                else
                {
                    Debug.LogWarning("Could not add point set to renderer: renderer is null");
                }
            }
            else
            {
                Debug.LogWarning("Failed to load point set from file");
            }
        }
        else
        {
            Debug.LogWarning($"Point set file not found at: {filePath}");
        }
    }
    
    private void UnloadPointSet(PointSet set)
    {
        Debug.Log($"Unloading point set: {set.Name}");
        if (renderer != null)
        {
            Debug.Log($"Calling RemovePointSet on renderer for {set.Name}");
            renderer.RemovePointSet(set);
        }
        else
        {
            Debug.LogWarning("Cannot unload point set: renderer is null");
        }
        loadedSets.Remove(set);
        Debug.Log($"Removed {set.Name} from loadedSets. Current count: {loadedSets.Count}");
    }
    
    public void SaveCurrentPoint()
    {
        if (app == null)
        {
            Debug.LogWarning("Cannot save point: App reference is null");
            return;
        }
        
        string filePath = Path.Combine(pointsDirectoryPath, "user_points.csv");
        string newPoint = $"{app.Real:G17},{app.Index:G17}\n";  // Use G17 format to preserve full double precision
        
        Debug.Log($"Saving point at ({app.Real:G17}, {app.Index:G17}) to {filePath}");
        
        File.AppendAllText(filePath, newPoint);
        
        // If user_points is currently selected, reload it to show the new point
        if (loadedSets.Any(s => s.Name == "user_points"))
        {
            ReloadPointSet("user_points");
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
    }
    
    private void OnRealChanged(double real)
    {
        // Update coordinate display if needed
    }
    
    private void OnIndexChanged(double index)
    {
        // Update coordinate display if needed
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
        Debug.Log($"Saving test point set to: {filePath}");
        
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
            Debug.Log($"Removing test point set file: {file}");
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