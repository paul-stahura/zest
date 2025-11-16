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
    private TMP_Dropdown _cameraTargetDropdown;
    private CameraPositionTracking _cameraPositionTracking;

    [Header("Preset Settings")]
    [Header("Zeta Input")]
    private Slider _animationSpeedSlider;
    private Toggle _autoAnimateToggle;

    [Header("Point Targets")]
    private Toggle _zakTargetToggle;
    private MultiOptionToggle _zakTargetPath;
    private Toggle _originTargetToggle;

    [Header("Spiral")]
    private Toggle _spiralForwardToggle;
    private Toggle _spiralInverseToggle;
    private Toggle _spiralInverseReflectedToggle;
    private TMP_Dropdown _linksToDrawDropdown;
    private Toggle _extendSpiralToggle;
    private MultiOptionToggle _colorLinksToggle;

    [Header("Remainders")]
    private MultiOptionToggle _rpsR1Toggle;
    private MultiOptionToggle _rpsR2Toggle;
    private MultiOptionToggle _rak1Toggle;
    private MultiOptionToggle _rak2Toggle;
    private MultiOptionToggle _r1Toggle;
    private MultiOptionToggle _r2Toggle;

    [Header("Yin Yang")]
    private Toggle _YinYangToggle;

    [Header("Grid")]
    private Toggle _gridForwardToInverseReflectedToggle;
    private Toggle _gridInverseToForwardReflectedToggle;
    private Toggle _gridForwardToInverseToggle;
    private Toggle _gridForwardReflectedToInverseReflectedToggle;

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

        _cameraTargetDropdown = GameObject.Find("Camera Tracking Options").GetComponent<TMP_Dropdown>();
        _cameraPositionTracking = GameObject.Find("Camera").GetComponent<CameraPositionTracking>();

        _animationSpeedSlider = GameObject.Find("AnimSpeed").GetComponent<Slider>();
        _autoAnimateToggle = GameObject.Find("AnimHold").GetComponent<Toggle>();

        _zakTargetToggle = GameObject.Find("Zak Zeta Toggle").GetComponent<Toggle>();
        _zakTargetPath = GameObject.Find("ZakIndexPathToggle").GetComponent<MultiOptionToggle>();
        _originTargetToggle = GameObject.Find("Draw Origin Toggle").GetComponent<Toggle>();

        _spiralForwardToggle = GameObject.Find("EmsForwardToggle").GetComponent<Toggle>();
        _spiralInverseToggle = GameObject.Find("InverseSpiralToggle").GetComponent<Toggle>();
        _spiralInverseReflectedToggle = GameObject.Find("InverseReflectedToggle").GetComponent<Toggle>();
        _linksToDrawDropdown = GameObject.Find("LinksToDrawDropdown").GetComponent<TMP_Dropdown>();
        _extendSpiralToggle = GameObject.Find("ToggleExtendSpiral").GetComponent<Toggle>();
        _colorLinksToggle = GameObject.Find("ColorBisectorOptionsToggle").GetComponent<MultiOptionToggle>();

        _rpsR1Toggle = GameObject.Find("Rps_R1_Toggle").GetComponent<MultiOptionToggle>();
        _rpsR2Toggle = GameObject.Find("Rps_R2_Toggle").GetComponent<MultiOptionToggle>();
        _rak1Toggle = GameObject.Find("Rak_R1_Toggle").GetComponent<MultiOptionToggle>();
        _rak2Toggle = GameObject.Find("Rak_R2_Toggle").GetComponent<MultiOptionToggle>();
        _r1Toggle = GameObject.Find("R/2_R1_Toggle").GetComponent<MultiOptionToggle>();
        _r2Toggle = GameObject.Find("R/2_R2_Toggle").GetComponent<MultiOptionToggle>();

        _YinYangToggle = GameObject.Find("YinYang Toggle").GetComponent<Toggle>();

        _gridForwardToInverseReflectedToggle = GameObject.Find("FtIR_Links").GetComponent<Toggle>();
        _gridInverseToForwardReflectedToggle = GameObject.Find("ItFR_Links").GetComponent<Toggle>();
        _gridForwardToInverseToggle = GameObject.Find("ForwardToInverseToggle").GetComponent<Toggle>();
        _gridForwardReflectedToInverseReflectedToggle = GameObject.Find("ForwardReflectedToInverseReflectedToggle").GetComponent<Toggle>();

        FindFolders();
        FindClearButtons();
    }

    private void FindFolders()
    {
        _folders = new List<Accordion>
        {
            GameObject.Find("Zeta Input (2.0)").GetComponent<Accordion>(),
            GameObject.Find("Point Targets").GetComponent<Accordion>(),
            GameObject.Find("Camera Tracking (2.0)").GetComponent<Accordion>(),
            GameObject.Find("Sprial (2.0)").GetComponent<Accordion>(),
            GameObject.Find("Symmetry (2.0)").GetComponent<Accordion>(),
            GameObject.Find("Remainders (2.0)").GetComponent<Accordion>(),
            GameObject.Find("GridLinksToLinksFolder").GetComponent<Accordion>(),
            GameObject.Find("Yin Yang (2.0)").GetComponent<Accordion>()
        };
    }

    private void FindClearButtons()
    {
        _clearButtons = new List<Button>
        {
            GameObject.Find("ClearAllSpiralButton").GetComponent<Button>(),
            GameObject.Find("GridClearAllButton").GetComponent<Button>(),
            GameObject.Find("RemaindersClearAllButton").GetComponent<Button>(),
            GameObject.Find("SymmetryClearAllButton").GetComponent<Button>(),
            GameObject.Find("YinYangClearAllButton").GetComponent<Button>(),
            GameObject.Find("ZetaTargetsClearAllButton").GetComponent<Button>()
        };
        
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

    public void ApplyPreset(SlideTitles slide, int optionIndex)
    {
        switch (slide)
        {
            case SlideTitles.Zeta:
                HandleZetaPreset(optionIndex);
                break;
            // case SlideTitles.Symmetry:
            //     HandleSymmetryPreset(optionIndex);
            //     break;
            case SlideTitles.Inverse:
                HandleInversePreset(optionIndex);
                break;
            case SlideTitles.Bisector:
                HandleBisectorPreset(optionIndex);
                break;
            case SlideTitles.YinYang:
                HandleYinYangPreset(optionIndex);
                break;
            // case SlideTitles.Remainder:
            //     HandleRemainderPreset(optionIndex);
            //     break;
            // case SlideTitles.Legs:
            //     HandleLegsPreset(optionIndex);
            //     break;
        }
    }

    private void HandleZetaPreset(int optionIndex)
    {
        switch (optionIndex)
        {
            // skip case 0

            case 1:
                // Zak Path
                CollapseAllFolders();
                ClearAll();
                ResetInput();

                _cameraPositionTracking.SetZoomLevel(3.0f);
                _cameraTargetDropdown.value = 0;
                _cameraPositionTracking.ResetCamOffset();

                _folders[(int)FolderOrder.ZetaInput].ExstendInstant();
                _folders[(int)FolderOrder.CameraTracking].ExstendInstant();
                _folders[(int)FolderOrder.PointTargets].ExstendInstant();

                _app.Index = 1.375;
                _app.Real = 0.5;
                
                _autoAnimateToggle.isOn = true;
                _animationSpeedSlider.value = 1.5f;

                _zakTargetToggle.isOn = true;
                _zakTargetPath.SetSelectedOption(2);
                _originTargetToggle.isOn = true;
                break;
            
            case 2:
                // spiral forward sum
                CollapseAllFolders();
                ClearAll();
                ResetInput();

                _cameraPositionTracking.SetZoomLevel(4.0f);
                _cameraTargetDropdown.value = 0;

                _folders[(int)FolderOrder.ZetaInput].ExstendInstant();
                _folders[(int)FolderOrder.CameraTracking].ExstendInstant();
                _folders[(int)FolderOrder.Spiral].ExstendInstant();

                _app.Index = 3.07;
                _app.Real = 0.5;

                _autoAnimateToggle.isOn = true;
                _animationSpeedSlider.value = 1.0f;

                _zakTargetToggle.isOn = true;
                _zakTargetPath.SetSelectedOption(2);
                _originTargetToggle.isOn = true;

                _spiralForwardToggle.isOn = true;
                break;
            
            case 3:
                // good view of links
                CollapseAllFolders();
                ClearAll();
                ResetInput();

                _cameraPositionTracking.SetZoomLevel(4.0f);
                _cameraTargetDropdown.value = 0;

                _folders[(int)FolderOrder.ZetaInput].ExstendInstant();
                _folders[(int)FolderOrder.CameraTracking].ExstendInstant();
                _folders[(int)FolderOrder.Spiral].ExstendInstant();

                _app.Index = 3.65;
                _app.Real = 0.5;

                _zakTargetToggle.isOn = true;
                _originTargetToggle.isOn = true;

                _spiralForwardToggle.isOn = true;
                break;
            
            case 4:
                // extend spiral
                _extendSpiralToggle.isOn = true;
                break;
        }
    }

    private void HandleInversePreset(int optionIndex)
    {
        switch (optionIndex)
        {
            // skip case 0

            case 1:
                // forward and inverse
                CollapseAllFolders();
                ClearAll();
                ResetInput();

                _cameraPositionTracking.SetZoomLevel(4.0f);
                _cameraTargetDropdown.value = 0;
                _cameraPositionTracking.ResetCamOffset();

                _folders[(int)FolderOrder.ZetaInput].ExstendInstant();
                _folders[(int)FolderOrder.CameraTracking].ExstendInstant();
                _folders[(int)FolderOrder.Spiral].ExstendInstant();

                _app.Index = 3.65;
                _app.Real = 0.5;

                _zakTargetToggle.isOn = true;
                _originTargetToggle.isOn = true;

                _spiralForwardToggle.isOn = true;
                _spiralInverseToggle.isOn = true;
                break;
            case 2:
                // inverse reflected
                _spiralInverseToggle.isOn = false;
                _spiralInverseReflectedToggle.isOn = true;
                break;
            case 3:
                // color links by bisector
                _colorLinksToggle.SetSelectedOption(1);
                break;
            case 4:
                // draw up to sum
                _linksToDrawDropdown.value = 3;
                break;
        }
    }
    
    private void HandleBisectorPreset(int optionIndex)
    {
        switch (optionIndex)
        {
            // skip case 0

            case 1:
                CollapseAllFolders();
                ClearAll();
                ResetInput();

                _cameraPositionTracking.SetZoomLevel(4.0f);
                _cameraTargetDropdown.value = 2;
                _cameraPositionTracking.ResetCamOffset();

                _folders[(int)FolderOrder.ZetaInput].ExstendInstant();
                _folders[(int)FolderOrder.CameraTracking].ExstendInstant();
                _folders[(int)FolderOrder.Spiral].ExstendInstant();

                _app.Index = 3.65;
                _app.Real = 0.5;

                _zakTargetToggle.isOn = true;
                _originTargetToggle.isOn = true;

                _spiralForwardToggle.isOn = true;
                _spiralInverseReflectedToggle.isOn = true;

                _colorLinksToggle.SetSelectedOption(1);
                _linksToDrawDropdown.value = 3;
                break;
            case 2:
                _autoAnimateToggle.isOn = true;
                _animationSpeedSlider.value = 2.0f;
                break;
            
            case 3:
                _autoAnimateToggle.isOn = true;
                _animationSpeedSlider.value = 4.0f;

                _linksToDrawDropdown.value = 4;
                break;
        }
    }

    private void HandleYinYangPreset(int optionIndex)
    {
        switch (optionIndex)
        {
            // skip case 0

            case 1:
                CollapseAllFolders();
                ClearAll();
                ResetInput();

                //set Camera
                _cameraPositionTracking.SetZoomLevel(1f);
                _cameraTargetDropdown.value = 3;

                // extend folders
                _folders[(int)FolderOrder.ZetaInput].ExstendInstant();
                _folders[(int)FolderOrder.CameraTracking].ExstendInstant();
                _folders[(int)FolderOrder.YinYang].ExstendInstant();

                // set input
                _app.Index = 4.0;
                _app.Real = 0.5f;
                _autoAnimateToggle.isOn = true;
                _animationSpeedSlider.value = 3f;

                // set spiral
                _linksToDrawDropdown.value = 4;
                _spiralForwardToggle.isOn = true;
                _spiralInverseReflectedToggle.isOn = true;
                break;
            
            case 2:
                // set yin yang
                _YinYangToggle.isOn = true;
                break;
            
            case 3:
                _app.Real = 0.5f;
                
                _folders[(int)FolderOrder.Remainders].ExstendInstant();
                // dist from origin
                _rpsR1Toggle.SetSelectedOption(1);
                _rpsR2Toggle.SetSelectedOption(1);
                break;
            case 4:
                // R
                _r1Toggle.SetSelectedOption(1);
                _r2Toggle.SetSelectedOption(1);
                break;
        }
    }
    // public void LoadPreset(int preset)
    // {
    //     CollapseAllFolders();
    //     ClearAll();
    //     ResetInput();

    //     switch ((Presets)preset)
    //     {
    //         case Presets.Default:
    //             HandleDefaultPreset();
    //             break;
    //         case Presets.YinYang:
    //             HandleYinYangPreset();
    //             break;
    //         case Presets.Grid:
    //             HandleGridPreset();
    //             break;
    //     }

    //     _cameraPositionTracking.ResetCamOffset();
    // }

    // private void HandleDefaultPreset()
    // {
    //     // set Camera
    //     _cameraPositionTracking.SetZoomLevel(4.0f);
    //     _cameraTargetDropdown.value = 0;

    //     // extend folders
    //     _folders[(int)FolderOrder.ZetaInput].ExstendInstant();
    //     _folders[(int)FolderOrder.CameraTracking].ExstendInstant();
    //     _folders[(int)FolderOrder.Spiral].ExstendInstant();
    //     _folders[(int)FolderOrder.Remainders].ExstendInstant();

    //     // set input
    //     _app.Index = 5.381344795227050;
    //     _app.Real = 0.5f;

    //     // set Options
    //     _zakTargetToggle.isOn = true;
    //     _originTargetToggle.isOn = true;
    //     _spiralForwardToggle.isOn = true;
    // }

    // private void HandleYinYangPreset()
    // {
    //     // set Camera
    //     _cameraPositionTracking.SetZoomLevel(1f);
    //     _cameraTargetDropdown.value = 3;

    //     // extend folders
    //     _folders[(int)FolderOrder.ZetaInput].ExstendInstant();
    //     _folders[(int)FolderOrder.CameraTracking].ExstendInstant();
    //     _folders[(int)FolderOrder.Spiral].ExstendInstant();
    //     _folders[(int)FolderOrder.YinYang].ExstendInstant();

    //     // set input
    //     _app.Index = 1.2;
    //     _app.Real = 0.5f;
    //     _autoAnimateToggle.isOn = true;
    //     _animationSpeedSlider.value = 1.5f;

    //     // set spiral
    //     _linksToDrawDropdown.value = 4;
    //     _spiralForwardToggle.isOn = true;
    //     _spiralInverseReflectedToggle.isOn = true;

    //     // set yin yang
    //     _YinYangToggle.isOn = true;
    // }

    // private void HandleGridPreset()
    // {
    //     // set Camera
    //     _cameraPositionTracking.SetZoomLevel(5f);
    //     _cameraTargetDropdown.value = 2;
    //     GameObject.Find("SymmetryTargetDropdown").GetComponent<TMP_Dropdown>().value = 5;

    //     // extend folders
    //     _folders[(int)FolderOrder.ZetaInput].ExstendInstant();
    //     _folders[(int)FolderOrder.CameraTracking].ExstendInstant();
    //     _folders[(int)FolderOrder.Grid].ExstendInstant();

    //     // set input
    //     _app.Index = 10;
    //     _app.Real = 0.5f;
    //     _autoAnimateToggle.isOn = true;
    //     _animationSpeedSlider.value = 0.8f;

    //     // set targets
    //     _zakTargetToggle.isOn = true;
    //     _originTargetToggle.isOn = true;

    //     // set Options
    //     _spiralForwardToggle.isOn = false;
    //     _gridForwardToInverseReflectedToggle.isOn = true;
    //     _gridInverseToForwardReflectedToggle.isOn = true;
    //     _gridForwardToInverseToggle.isOn = true;
    //     _gridForwardReflectedToInverseReflectedToggle.isOn = true;
    // }
}
