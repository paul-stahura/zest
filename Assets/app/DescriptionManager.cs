/// <summary>
/// DescriptionManager handles loading, displaying, editing, validating, and saving descriptions associated with DescriptionUI components in the scene.
/// descriptions are save locally in the persistent data path, and can be overwritten by resources files.
/// </summary>
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using TexDrawLib;
using System;

public class DescriptionManager : MonoBehaviour
{
    public static Action<RectTransform> OnHoverDescription;

    [Header("Defaults")]
    [SerializeField] public const string defaultKey = "Title";
    [SerializeField] private const string defaultDescription = "Tell Me More";

    [Header("Style Settings")]
    private static string _keyStyle = @"\bf";
    private static string _descriptionStyle = @"\rm";

    [Header("Display References")]
    [SerializeField] private RectTransform _displayPanel;
    [SerializeField] private Button _editButton;
    private static TEXDraw keyText;
    private static TEXDraw descriptionText;

    [Header("Edit References")]
    [SerializeField] private Button _saveButton;
    private static TMP_InputField keyInput;
    private static TMP_InputField descriptionInput;
    private static bool _isEditMode = false;

    [Header("Load References")]
    [SerializeField] private RectTransform _loadPanel;
    [SerializeField] private Button _loadLocalButton;
    [SerializeField] private Button _overwriteLocalButton;
    private static bool _hasLoadedEntries = false;

    [Header("Validate References")]
    [SerializeField] private RectTransform _validatePanel;
    [SerializeField] private Button _overrideValidateButton;
    [SerializeField] private Button _cancelValidateButton;
    [SerializeField] private Button _revertValidateButton;
    [SerializeField] private TMP_Text _validateMessage;

    [Header("File Settings")]
    [SerializeField] public const string _keyIdsFile = "DescriptionIds";
    [SerializeField] public const string _descriptionsFile = "Descriptions";
    [SerializeField] private bool _purgeUnusedKeys = false;

    private static DescriptionUI _currentUI;
    private static Dictionary<int, string> keyDictionary = new();
    private static Dictionary<string, string> _descriptions = new();
    private static string _descriptionsFilePath;
    private static string _keyIdsFilePath;

    private void Awake()
    {
        _purgeUnusedKeys = false; // disable purge for safety

        // find references in the display panel
        if (_displayPanel != null)
        {
            var texts = _displayPanel.GetComponentsInChildren<TEXDraw>(true);
            foreach (var text in texts)
            {
                if (text.name == "KeyText")
                    keyText = text;
                else if (text.name == "DescriptionText")
                    descriptionText = text;
            }

            var inputs = _displayPanel.GetComponentsInChildren<TMP_InputField>(true);
            foreach (var input in inputs)
            {
                if (input.name == "KeyInput")
                    keyInput = input;
                else if (input.name == "DescriptionInput")
                    descriptionInput = input;
            }

            // hide edit fields initially
            keyInput.gameObject.SetActive(false);
            descriptionInput.gameObject.SetActive(false);

            // display texts initially
            keyText.gameObject.SetActive(true);
            descriptionText.gameObject.SetActive(true);

            // display panel initially
            _displayPanel.gameObject.SetActive(false);
            _validatePanel.gameObject.SetActive(false);
        }

        // button listeners
        if (_editButton != null)
            _editButton.onClick.AddListener(() => ToggleEditMode(true));

        if (_saveButton != null)
            _saveButton.onClick.AddListener(ValidateEdit);

        if (_overrideValidateButton != null)
            _overrideValidateButton.onClick.AddListener(() =>
            {
                SaveDescriptionUI();
            });

        if (_cancelValidateButton != null)
            _cancelValidateButton.onClick.AddListener(CancelValidation);

        if (_revertValidateButton != null)
            _revertValidateButton.onClick.AddListener(RevertValidation);

        if (_loadLocalButton != null)
            _loadLocalButton.onClick.AddListener(UseLocalEntries);
        if (_overwriteLocalButton != null)
            _overwriteLocalButton.onClick.AddListener(OverwriteLocalEntries);
    }

    public void UseLocalEntries()
    {
        LoadSavedEntries(false);
        LoadDescriptions();
        InitializeDescriptions();
    }

    public void OverwriteLocalEntries()
    {
        LoadSavedEntries(true);
        LoadDescriptions();
        InitializeDescriptions();
    }
    
    private void LoadSavedEntries(bool overwrite = false)
    {
        _keyIdsFilePath = Path.Combine(Application.persistentDataPath, _keyIdsFile + ".txt");
        _descriptionsFilePath = Path.Combine(Application.persistentDataPath, _descriptionsFile + ".txt");

        // check if files exist in persistent path
        if (!File.Exists(_keyIdsFilePath) || !File.Exists(_descriptionsFilePath))
        {
            overwrite = true; // force overwrite if files are missing
        }

        TextAsset keyResourceFile = Resources.Load<TextAsset>($"UI_Descriptions/{_keyIdsFile}");
        TextAsset entryResourceFile = Resources.Load<TextAsset>($"UI_Descriptions/{_descriptionsFile}");
        if (entryResourceFile == null || keyResourceFile == null)
        {
            throw new FileNotFoundException($"Missing Manual Entry Resources files: UI_Descriptions/{_keyIdsFile}.txt || {_descriptionsFile}.txt");
        }

        if (overwrite)
        {
            // Overwrite local version with Resources version
            File.WriteAllText(_descriptionsFilePath, entryResourceFile.text);
            File.WriteAllText(_keyIdsFilePath, entryResourceFile.text);
            Debug.Log($"Manual entries successfully copied from Resources to persistent path: {Application.persistentDataPath}");
        }
    }

    private void Update()
    {
        if (Input.GetKeyDown(KeyCode.M))
        {
            if (!_hasLoadedEntries)
            {
                // toggle load panel
                if (_loadPanel != null)
                    _loadPanel.gameObject.SetActive(!_loadPanel.gameObject.activeSelf);
            }
            else if (!_isEditMode)
            {
                if (Input.GetKey(KeyCode.LeftShift) && _displayPanel.gameObject.activeSelf)
                {
                    ToggleEditMode(true);
                }
                else
                {
                    _displayPanel.gameObject.SetActive(!_displayPanel.gameObject.activeSelf);
                }
            }
        }

        if(_purgeUnusedKeys)
        {
            PurgeUnusedKeys();
            _purgeUnusedKeys = false;
        }
    }

    private void InitializeDescriptions()
    {
        // find all DescriptionUI gameobjects in the scene
        var allUIs = FindObjectsOfType<DescriptionUI>(true);

        // read from the IdKeys file
        // format "1 # KeyName"
        keyDictionary.Clear();

        string[] lines = File.ReadAllLines(_keyIdsFilePath);

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
        foreach (var ui in allUIs)
        {
            if (keyDictionary.TryGetValue(ui.descriptionID, out string key))
            {
                ui.AssighnKey(key);
            }
            else
            {
                ui.AssighnKey(defaultKey);
            }
        }

        if (!_hasLoadedEntries)
        {
            _hasLoadedEntries = true;
            if (_loadPanel != null)
                _loadPanel.gameObject.SetActive(false);
            
            _displayPanel.gameObject.SetActive(true);
        }
    }

    #region Save Utils
    private void PurgeUnusedKeys()
    {
        // find keys that are not used
        var keysToRemove = new List<string>();
        foreach (var key in _descriptions.Keys)
        {
            if (!keyDictionary.ContainsValue(key))
                keysToRemove.Add(key);
        }
        // remove unused keys
        foreach (var key in keysToRemove)
        {
            _descriptions.Remove(key);
            Debug.Log($"Removed unused description key: {key}");
        }

        // save the cleaned descriptions
        Save();
    }

    public void LoadDescriptions()
    {
        _descriptions.Clear();
        _descriptions = ParseFile(File.ReadAllText(_descriptionsFilePath));
        Debug.Log($"Loaded {_descriptions.Count} descriptions from {_descriptionsFilePath}");
    }

    private static void Save()
    {
        StringBuilder sb = new StringBuilder();

        foreach (var pair in _descriptions)
        {
            sb.AppendLine($"# {pair.Key}");
            sb.AppendLine(pair.Value);
            sb.AppendLine(); // spacing between entries
        }

        File.WriteAllText(_descriptionsFilePath, sb.ToString());
        Debug.Log($"Descriptions saved to {_descriptionsFilePath}");
    }

    private void SaveKeyID(int id, string key)
    {
        keyDictionary[id] = key;

        StringBuilder sb = new StringBuilder();
        foreach (var pair in keyDictionary)
        {
            sb.AppendLine($"{pair.Key} # {pair.Value}");
        }

        File.WriteAllText(_keyIdsFilePath, sb.ToString());
        Debug.Log($"Description IDs saved to {_keyIdsFilePath}");
    }
    
    private static Dictionary<string, string> ParseFile(string text)
    {
        var result = new Dictionary<string, string>();
        var matches = Regex.Split(text, @"^#\s*(.+)$", RegexOptions.Multiline);

        for (int i = 1; i < matches.Length - 1; i += 2)
        {
            string title = matches[i].Trim();
            string content = matches[i + 1].Trim();
            result[title] = content;
        }
        return result;
    }
    #endregion

    #region UI Updates
    public static void LoadDescriptionUI(DescriptionUI ui)
    {
        if (!_hasLoadedEntries || _isEditMode)
        {
            // prevent loading new UI while in edit mode or if entries haven't been loaded yet
            return;
        }

        _currentUI = ui;
        DisplayDescription(ui.key);

        OnHoverDescription?.Invoke(ui.GetComponent<RectTransform>());
    }

    public static void ClearDescriptionUI()
    {
        if (!_hasLoadedEntries || _isEditMode)
        {
            // prevent clearing UI while in edit mode or if entries haven't been loaded yet
            return;
        }

        _currentUI = null;
        DisplayDescription("");
    }

    private static void DisplayDescription(string key)
    {
        if (string.IsNullOrEmpty(key))
        {
            keyText.text = "";
            descriptionText.text = "";
            return;
        }

        _descriptions.TryGetValue(key, out string description);

        keyText.text = ApplyStyle(key, _keyStyle);
        descriptionText.text = ApplyStyle(description ?? "Tell Me More", _descriptionStyle);
    }
    
    private static string ApplyStyle(string text, string style)
    {
        return style + "{" + text + "}";
    }

    public void ValidateEdit()
    {
        // get values from input fields
        string newKey = keyInput.text.Trim();
        string newDescription = descriptionInput.text.Trim();

        // check if the new key contains #, and remove all instances
        newKey = newKey.Replace("#", "").Trim();
        keyInput.text = newKey; // update input field

        // check if the key has changed
        if (newKey != _currentUI.key)
        {
            // if the new key already exists, show validation message
            if (_descriptions.ContainsKey(newKey))
            {
                // check if the decription is empty
                if (string.IsNullOrEmpty(newDescription) || newDescription == defaultDescription)
                {
                    DisplayValidationMessage($"Key '{newKey}' already exists. Load description?", true);
                    return;
                }

                // check if the description is different
                if (_descriptions[newKey] != newDescription)
                {
                    DisplayValidationMessage($"Key '{newKey}' already exists with a different description. Overwrite?", true);
                    return;
                }
            }
        }

        // check for empty key
        if (string.IsNullOrEmpty(newKey))
        {
            DisplayValidationMessage("Key cannot be empty. Revert?", true);
            return;
        }

        // if we reach here, all validations passed
        SaveDescriptionUI();
        ToggleEditMode(false);
    }

    private void DisplayValidationMessage(string message, bool canOverride = false)
    {
        _validateMessage.text = message;
        _validatePanel.gameObject.SetActive(true);
        _overrideValidateButton.gameObject.SetActive(canOverride);
    }

    private void CancelValidation()
    {
        _validatePanel.gameObject.SetActive(false);
    }

    private void RevertValidation()
    {
        // revert input fields to current UI values
        keyInput.text = _currentUI.key;
        _descriptions.TryGetValue(_currentUI.key, out string desc);
        descriptionInput.text = desc ?? defaultDescription;

        CancelValidation();
    }

    private void SaveDescriptionUI()
    {
        if (_currentUI == null)
        {
            Debug.LogWarning("No DescriptionUI selected for saving.");
            return;
        }

        string newKey = keyInput.text.Trim();
        string newDescription = descriptionInput.text.Trim();

        // check if the key has changed
        if (newKey != _currentUI.key)
        {
            // if the new key already exists
            if (_descriptions.ContainsKey(newKey))
            {
                // check if the decription is empty
                if (string.IsNullOrEmpty(newDescription) || newDescription == defaultDescription)
                {
                    // load existing description
                    newDescription = _descriptions.ContainsKey(_currentUI.key) ? _descriptions[_currentUI.key] : defaultDescription;
                }
                // else overwrite existing description
            }
        }

        // check for empty key
        if (string.IsNullOrEmpty(newKey))
        {
            // revert to previous key
            newKey = _currentUI.key;
            newDescription = _descriptions.ContainsKey(_currentUI.key) ? _descriptions[_currentUI.key] : defaultDescription;
        }

        // save to dictionary
        _descriptions[newKey] = newDescription;
        _currentUI.AssighnKey(newKey);

        SaveKeyID(_currentUI.descriptionID, newKey);
        Save();

        ToggleEditMode(false);
    }

    private void ToggleEditMode(bool editMode)
    {
        if (_currentUI == null)
            return;

        // populate input fields
        if (editMode)
        {
            // load current values
            keyInput.text = _currentUI.key;
            _descriptions.TryGetValue(_currentUI.key, out string desc);
            descriptionInput.text = desc ?? defaultDescription;
        }
        else
        {
            // load updated values
            DisplayDescription(_currentUI.key);
        }

        keyText.gameObject.SetActive(!editMode);
        descriptionText.gameObject.SetActive(!editMode);

        keyInput.gameObject.SetActive(editMode);
        descriptionInput.gameObject.SetActive(editMode);

        if (_validatePanel.gameObject.activeSelf)
            _validatePanel.gameObject.SetActive(false);

        _isEditMode = editMode;
    }
    #endregion
}
