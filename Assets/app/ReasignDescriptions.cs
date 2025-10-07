#if UNITY_EDITOR
using UnityEditor;
#endif
using System.Collections.Generic;
using System.IO;
using System.Text;
using UnityEngine;

[ExecuteAlways]
public class ReasignDescriptions : MonoBehaviour
{
    public bool reasign = false;
    [SerializeField] private Dictionary<int, string> keyDictionary = new Dictionary<int, string>();

    void OnValidate()
    {
        if (reasign)
        {
            reasign = false;
            ReorderDescriptions();
        }
    }


#if UNITY_EDITOR
    private void OnEnable()
    {
        // Register for play mode state changes
        EditorApplication.playModeStateChanged += OnPlayModeStateChanged;
    }

    private void OnDisable()
    {
        // Unregister to avoid duplicate calls or memory leaks
        EditorApplication.playModeStateChanged -= OnPlayModeStateChanged;
    }

    private void OnPlayModeStateChanged(PlayModeStateChange state)
    {
        if (state == PlayModeStateChange.ExitingPlayMode)
        {
            OnExitPlay();
        }
    }

    private void OnExitPlay()
    {
        var resourcesDir = Path.Combine(Application.dataPath, "Resources", "Data");
        if (!Directory.Exists(resourcesDir))
            Directory.CreateDirectory(resourcesDir);

        // Copy key file
        var sourcePath = Path.Combine(Application.persistentDataPath, DescriptionManager._keyIdsFile + ".txt");
        var destinationPath = Path.Combine(resourcesDir, DescriptionManager._keyIdsFile + ".txt");

        TryCopyFile(sourcePath, destinationPath, "key");

        // Copy descriptions file
        sourcePath = Path.Combine(Application.persistentDataPath, DescriptionManager._descriptionsFile + ".txt");
        destinationPath = Path.Combine(resourcesDir, DescriptionManager._descriptionsFile + ".txt");

        TryCopyFile(sourcePath, destinationPath, "descriptions");
    }

    private void TryCopyFile(string sourcePath, string destinationPath, string label)
    {
        try
        {
            if (File.Exists(sourcePath))
            {
                File.Copy(sourcePath, destinationPath, true);
                Debug.Log($"Copied updated {label} file back to Resources: {destinationPath}");
                AssetDatabase.Refresh();
            }
            else
            {
                Debug.LogWarning($"Source {label} file not found: {sourcePath}");
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"Failed to copy {label} file: {ex.Message}");
        }
    }
#endif

    private void ReorderDescriptions()
    {
        var path = Path.Combine(Application.persistentDataPath, DescriptionManager._keyIdsFile + ".txt");
        // Try to load from Resources (always required)
        TextAsset resourceFile = Resources.Load<TextAsset>($"Data/{DescriptionManager._keyIdsFile}");
        if (resourceFile == null)
        {
            Debug.LogError($"Description IDs file missing in Resources: Data/{DescriptionManager._keyIdsFile}.txt");
            throw new FileNotFoundException($"Missing Resources file: Data/{DescriptionManager._keyIdsFile}.txt");
        }
        // Overwrite the persistent version every time
        File.WriteAllText(path, resourceFile.text);
        Debug.Log($"Description IDs file successfully copied from Resources to persistent path: {path}");

        // find all DescriptionUI gameobjects in the scene
        var allUIs = FindObjectsOfType<DescriptionUI>();

        // read from the IdKeys file
        // format "1 # KeyName"
        keyDictionary.Clear();

        string[] lines = File.ReadAllLines(path);

        foreach (string line in lines)
        {
            string trimmed = line.Trim();

            if (string.IsNullOrEmpty(trimmed))
                continue;

            // Split by '#'
            string[] parts = trimmed.Split(new char[] { '#' }, 2);

            if (parts.Length != 2)
            {
                Debug.LogWarning($"Invalid line format: {line}");
                continue;
            }

            if (int.TryParse(parts[0].Trim(), out int id))
            {
                string key = parts[1].Trim();
                keyDictionary[id] = key;
            }
            else
            {
                Debug.LogWarning($"Invalid ID in line: {line}");
            }
        }

        // assign keys to DescriptionUI components based on their DescriptionID
        var newKeyDictionary = new Dictionary<int, string>();

        for (int i = 0; i < allUIs.Length; i++)
        {
            var ui = allUIs[i];
            if (keyDictionary.TryGetValue(ui.descriptionID, out string key))
            {
                ui.AssighnKey(key);
                newKeyDictionary[i] = key;
            }

            ui.descriptionID = i;
            UnityEditor.EditorUtility.SetDirty(ui);
        }

        // save updated IdKeys file
        StringBuilder sb = new StringBuilder();
        foreach (var pair in newKeyDictionary)
        {
            sb.AppendLine($"{pair.Key} # {pair.Value}");
        }

        File.WriteAllText(path, sb.ToString());
        Debug.Log($"Description IDs saved to {path}");

        OnExitPlay();
    }
}
