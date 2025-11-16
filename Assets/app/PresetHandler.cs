using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.XR;

public class PresetHandler : MonoBehaviour
{
    private enum Presets
    {
        Default = 0,
        YinYang = 1,
        Grid = 2
    }

    private App _app;
    [SerializeField] private TMP_Dropdown _cameraTargetDropdown;
    [SerializeField] private TMP_Dropdown _symmetryTargetDropdown;
    [SerializeField] private CameraPositionTracking _cameraPositionTracking;

    [Header("Preset Settings")]
    [Header("Zeta Input")]
    [SerializeField] private Slider _animationSpeedSlider;
    [SerializeField] private Toggle _autoAnimateToggle;

    [Header("Point Targets")]
    [SerializeField] private Toggle _zakTargetToggle;
    [SerializeField] private Toggle _originTargetToggle;

    [Header("Spiral")]
    [SerializeField] private Toggle _spiralForwardToggle;
    [SerializeField] private Toggle _spiralInverseReflectedToggle;
    [SerializeField] private TMP_Dropdown _linksToDrawDropdown;

    [Header("Yin Yang")]
    [SerializeField] private Toggle _YinYangToggle;

    [Header("Grid")]
    [SerializeField] private Toggle _gridForwardToInverseReflectedToggle;
    [SerializeField] private Toggle _gridInverseToForwardReflectedToggle;
    [SerializeField] private Toggle _gridForwardToInverseToggle;
    [SerializeField] private Toggle _gridForwardReflectedToInverseReflectedToggle;

    private enum FolderOrder
    {
        ZetaInput = 0,
        PointTargets = 1,
        CameraTracking = 2,
        Spiral = 3,
        Symmetry = 4,
        Remainders = 5,
        Grid = 6,
        YinYang = 7
    }

    [SerializeField] private List<Accordion> _folders;
    [SerializeField] private List<Button> _clearButtons;

    void Awake()
    {
        _app = FindObjectOfType<App>();
    }

    public void CollapseAllFolders()
    {
        foreach (var folder in _folders)
        {
            folder.CollapseInstant();
        }
    }

    public void ClearAll()
    {
        foreach (var button in _clearButtons)
        {
            button.onClick.Invoke();
        }
    }

    public void ResetInput()
    {
        _app.Index = 1.5;
        _app.Real = 0.5f;
        _autoAnimateToggle.isOn = false;
        _animationSpeedSlider.value = 0.0f;
    }

    public void LoadPreset(int preset)
    {
        CollapseAllFolders();
        ClearAll();
        ResetInput();

        switch ((Presets)preset)
        {
            case Presets.Default:
                HandleDefaultPreset();
                break;
            case Presets.YinYang:
                HandleYinYangPreset();
                break;
            case Presets.Grid:
                HandleGridPreset();
                break;
        }

        _cameraPositionTracking.ResetCamOffset();
    }

    private void HandleDefaultPreset()
    {
        // set Camera
        _cameraPositionTracking.SetZoomLevel(4.0f);
        _cameraTargetDropdown.value = 0;

        // extend folders
        _folders[(int)FolderOrder.ZetaInput].ExstendInstant();
        _folders[(int)FolderOrder.CameraTracking].ExstendInstant();
        _folders[(int)FolderOrder.Spiral].ExstendInstant();
        _folders[(int)FolderOrder.Remainders].ExstendInstant();

        // set input
        _app.Index = 5.381344795227050;
        _app.Real = 0.5f;

        // set Options
        _zakTargetToggle.isOn = true;
        _originTargetToggle.isOn = true;
        _spiralForwardToggle.isOn = true;
    }

    private void HandleYinYangPreset()
    {
        // set Camera
        _cameraPositionTracking.SetZoomLevel(1f);
        _cameraTargetDropdown.value = 3;

        // extend folders
        _folders[(int)FolderOrder.ZetaInput].ExstendInstant();
        _folders[(int)FolderOrder.CameraTracking].ExstendInstant();
        _folders[(int)FolderOrder.Spiral].ExstendInstant();
        _folders[(int)FolderOrder.YinYang].ExstendInstant();

        // set input
        _app.Index = 1.2;
        _app.Real = 0.5f;
        _autoAnimateToggle.isOn = true;
        _animationSpeedSlider.value = 1.5f;

        // set spiral
        _linksToDrawDropdown.value = 4;
        _spiralForwardToggle.isOn = true;
        _spiralInverseReflectedToggle.isOn = true;

        // set yin yang
        _YinYangToggle.isOn = true;
    }

    private void HandleGridPreset()
    {
        // set Camera
        _cameraPositionTracking.SetZoomLevel(5f);
        _cameraTargetDropdown.value = 2;
        _symmetryTargetDropdown.value = 5;

        // extend folders
        _folders[(int)FolderOrder.ZetaInput].ExstendInstant();
        _folders[(int)FolderOrder.CameraTracking].ExstendInstant();
        _folders[(int)FolderOrder.Grid].ExstendInstant();

        // set input
        _app.Index = 10;
        _app.Real = 0.5f;
        _autoAnimateToggle.isOn = true;
        _animationSpeedSlider.value = 0.8f;

        // set targets
        _zakTargetToggle.isOn = true;
        _originTargetToggle.isOn = true;

        // set Options
        _spiralForwardToggle.isOn = false;
        _gridForwardToInverseReflectedToggle.isOn = true;
        _gridInverseToForwardReflectedToggle.isOn = true;
        _gridForwardToInverseToggle.isOn = true;
        _gridForwardReflectedToInverseReflectedToggle.isOn = true;
    }
}
