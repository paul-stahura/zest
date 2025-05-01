using UnityEngine;
using UnityEditor;
using UnityEngine.UI;

/// <summary>
/// Editor utility for adding the BandsOverlayRenderer to a CriticalStripRenderer
/// </summary>
public class BandsOverlayDemo : EditorWindow
{
    [MenuItem("Critical Strip/Add Bands Overlay")]
    public static void AddBandsOverlay()
    {
        // Find all CriticalStripRenderer instances in the scene
        var renderers = Object.FindObjectsOfType<CriticalStripRenderer>();
        
        if (renderers.Length == 0)
        {
            EditorUtility.DisplayDialog("Add Bands Overlay", "No CriticalStripRenderer found in the scene.", "OK");
            return;
        }
        
        // Get prefab reference
        var prefab = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/app/critical-strip/Bands Overlay Renderer.prefab");
        
        if (prefab == null)
        {
            EditorUtility.DisplayDialog("Add Bands Overlay", "Bands Overlay Renderer prefab not found.", "OK");
            return;
        }
        
        foreach (var renderer in renderers)
        {
            // Check if the renderer already has a BandsOverlayRenderer
            var existingOverlay = renderer.GetComponentInChildren<BandsOverlayRenderer>();
            
            if (existingOverlay != null)
            {
                Debug.Log($"CriticalStripRenderer on {renderer.gameObject.name} already has a BandsOverlayRenderer");
                continue;
            }
            
            // Instantiate the prefab as a child of the renderer
            var instance = PrefabUtility.InstantiatePrefab(prefab) as GameObject;
            var rectTransform = instance.GetComponent<RectTransform>();
            
            // Set parent and transform
            rectTransform.SetParent(renderer.transform, false);
            rectTransform.anchorMin = Vector2.zero;
            rectTransform.anchorMax = Vector2.one;
            rectTransform.offsetMin = Vector2.zero;
            rectTransform.offsetMax = Vector2.zero;
            
            // Configure the overlay
            var overlay = instance.GetComponent<BandsOverlayRenderer>();
            if (overlay != null)
            {
                overlay.criticalStripRenderer = renderer;
            }
            
            // Set to draw behind everything else
            rectTransform.SetAsFirstSibling();
            
            Debug.Log($"Added BandsOverlayRenderer to {renderer.gameObject.name}");
        }
        
        EditorUtility.DisplayDialog("Add Bands Overlay", 
            $"Added Bands Overlay to {renderers.Length} CriticalStripRenderer{(renderers.Length != 1 ? "s" : "")}.", "OK");
    }
} 