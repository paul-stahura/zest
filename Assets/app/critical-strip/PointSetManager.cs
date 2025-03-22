using UnityEngine;
using System.Collections.Generic;
using System.IO;
using System;
using System.Linq;

public class PointSetManager : MonoBehaviour
{
    [Header("Settings")]
    [SerializeField] private string userPointsFileName = "user_points.csv";
    [SerializeField] private Color defaultPointColor = Color.green;
    
    private List<PointSet> loadedSets = new List<PointSet>();
    private CriticalStripRenderer renderer;
    private App app;
    
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
        
        // Ensure user points file exists
        EnsureUserPointsFile();
        
        // Load user points if they exist
        LoadUserPoints();
    }
    
    private void OnDestroy()
    {
        if (app != null)
        {
            app.RealChanged -= OnRealChanged;
            app.IndexChanged -= OnIndexChanged;
        }
    }
    
    private void EnsureUserPointsFile()
    {
        string filePath = Path.Combine(Application.persistentDataPath, userPointsFileName);
        Debug.Log($"Ensuring user points file exists at: {filePath}");
        
        if (!File.Exists(filePath))
        {
            File.WriteAllText(filePath, $"user_points,#{ColorUtility.ToHtmlStringRGBA(defaultPointColor)}\n");
            Debug.Log("Created new user points file");
        }
    }
    
    public void LoadUserPoints()
    {
        string filePath = Path.Combine(Application.persistentDataPath, userPointsFileName);
        Debug.Log($"Loading user points from: {filePath}");
        
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
            Debug.LogWarning($"User points file not found at: {filePath}");
        }
    }
    
    public void SaveCurrentPoint()
    {
        if (app == null)
        {
            Debug.LogWarning("Cannot save point: App reference is null");
            return;
        }
        
        string filePath = Path.Combine(Application.persistentDataPath, userPointsFileName);
        string newPoint = $"{app.Real:G17},{app.Index:G17}\n";  // Use G17 format to preserve full double precision
        
        Debug.Log($"Saving point at ({app.Real:G17}, {app.Index:G17}) to {filePath}");
        
        File.AppendAllText(filePath, newPoint);
        
        // Reload points to update visualization
        ReloadUserPoints();
    }
    
    private void ReloadUserPoints()
    {
        // Remove existing user points set
        var userPoints = loadedSets.Find(set => set.Name == "user_points");
        if (userPoints != null)
        {
            renderer?.RemovePointSet(userPoints);
            loadedSets.Remove(userPoints);
        }
        
        // Load updated user points
        LoadUserPoints();
    }
    
    private void OnRealChanged(double real)
    {
        // Update coordinate display if needed
        // This will be implemented when we add the coordinate display
    }
    
    private void OnIndexChanged(double index)
    {
        // Update coordinate display if needed
        // This will be implemented when we add the coordinate display
    }
    
    public void TogglePointSet(string setName, bool active)
    {
        var pointSet = loadedSets.Find(set => set.Name == setName);
        if (pointSet != null)
        {
            pointSet.IsActive = active;
            // Update visualization if needed
        }
    }

    #if UNITY_EDITOR
    // Methods for editor testing
    public void AddTestPointSet(PointSet pointSet)
    {
        // Remove existing test point set with the same name
        var existingSet = loadedSets.Find(set => set.Name == pointSet.Name);
        if (existingSet != null)
        {
            renderer?.RemovePointSet(existingSet);
            loadedSets.Remove(existingSet);
        }
        
        // Add new test point set
        loadedSets.Add(pointSet);
        renderer?.AddPointSet(pointSet);
    }
    
    public void ClearTestPointSets()
    {
        // Find all test point sets
        var testSets = loadedSets.Where(set => 
            set.Name.StartsWith("test_points")).ToList();
            
        // Remove each test set
        foreach (var set in testSets)
        {
            renderer?.RemovePointSet(set);
            loadedSets.Remove(set);
        }
    }
    #endif
} 