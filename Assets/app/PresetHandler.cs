using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

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
    private Toggle _midTargetToggle;
    private MultiOptionToggle _midTargetPath;
    private MultiOptionToggle _emsPathToggle;

    [Header("Spiral")]
    private MultiOptionToggle _spiralTransparencyToggle;
    private Toggle _spiralForwardToggle;
    private Toggle _spiralForwardReflectedToggle;
    private Toggle _spiralInverseToggle;
    private Toggle _spiralInverseReflectedToggle;
    private Toggle _spiralZakToggle;
    private TMP_Dropdown _linksToDrawDropdown;
    private Toggle _extendSpiralToggle;
    private MultiOptionToggle _colorLinksToggle;

    [Header("Remainders")]
    private MultiOptionToggle _rpsR1Toggle;
    private MultiOptionToggle _rpsR2Toggle;
    private MultiOptionToggle _rpsForwardLegsToggle;
    private MultiOptionToggle _rpsInverseLegsToggle;
    private MultiOptionToggle _rpsSymToggle;
    private MultiOptionToggle _rak1Toggle;
    private MultiOptionToggle _rak2Toggle;
    private MultiOptionToggle _rakForwardLegsToggle;
    private MultiOptionToggle _rakSymToggle;

    private MultiOptionToggle _r1Toggle;
    private MultiOptionToggle _r2Toggle;

    private MultiOptionToggle _remainderPathsToggle;
    private MultiOptionToggle _rPath;
    private MultiOptionToggle _rpsPath;
    private MultiOptionToggle _rakPath;

    [Header("Yin Yang")]
    private Toggle _YinYangToggle;

    [Header("Grid")]
    private Toggle _gridForwardToInverseReflectedToggle;
    private Toggle _gridInverseToForwardReflectedToggle;
    private Toggle _gridForwardToInverseToggle;
    private Toggle _gridForwardReflectedToInverseReflectedToggle;

    [Header("critical strip")]
    private DropdownEx _criticalStripDropdown;
    private CriticalStripRenderer _criticalStripRenderer;
    private CriticalStripWindow _criticalStripWindow;

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
    private Coroutine _animateCoroutine;

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
        _midTargetToggle = GameObject.Find("Mid Point Toggle").GetComponent<Toggle>();
        _midTargetPath = GameObject.Find("MidIndexPathToggle").GetComponent<MultiOptionToggle>();
        _emsPathToggle = GameObject.Find("EmsIndexPathToggle").GetComponent<MultiOptionToggle>();
        
        _spiralTransparencyToggle = GameObject.Find("SpiralTransparencyMOT").GetComponent<MultiOptionToggle>();
        _spiralForwardToggle = GameObject.Find("EmsForwardToggle").GetComponent<Toggle>();
        _spiralForwardReflectedToggle = GameObject.Find("forwardReflectedToggle").GetComponent<Toggle>();
        _spiralInverseToggle = GameObject.Find("InverseSpiralToggle").GetComponent<Toggle>();
        _spiralInverseReflectedToggle = GameObject.Find("InverseReflectedToggle").GetComponent<Toggle>();
        _spiralZakToggle = GameObject.Find("ZakLinksToggle").GetComponent<Toggle>();
        _linksToDrawDropdown = GameObject.Find("LinksToDrawDropdown").GetComponent<TMP_Dropdown>();
        _extendSpiralToggle = GameObject.Find("ToggleExtendSpiral").GetComponent<Toggle>();
        _colorLinksToggle = GameObject.Find("ColorBisectorOptionsToggle").GetComponent<MultiOptionToggle>();

        _rpsR1Toggle = GameObject.Find("Rps_R1_Toggle").GetComponent<MultiOptionToggle>();
        _rpsR2Toggle = GameObject.Find("Rps_R2_Toggle").GetComponent<MultiOptionToggle>();

        _rpsForwardLegsToggle = GameObject.Find("Rps_Legs_Toggle").GetComponent<MultiOptionToggle>();
        _rpsInverseLegsToggle = GameObject.Find("Rps_Legs_Inverse_Toggle").GetComponent<MultiOptionToggle>();
        _rpsSymToggle = GameObject.Find("Rps_Sym_Toggle").GetComponent<MultiOptionToggle>();

        _rak1Toggle = GameObject.Find("Rak_R1_Toggle").GetComponent<MultiOptionToggle>();
        _rak2Toggle = GameObject.Find("Rak_R2_Toggle").GetComponent<MultiOptionToggle>();
        _rakForwardLegsToggle = GameObject.Find("Rak_Legs_Toggle").GetComponent<MultiOptionToggle>();
        _rakSymToggle = GameObject.Find("Rak_Sym_Toggle").GetComponent<MultiOptionToggle>();

        _r1Toggle = GameObject.Find("R/2_R1_Toggle").GetComponent<MultiOptionToggle>();
        _r2Toggle = GameObject.Find("R/2_R2_Toggle").GetComponent<MultiOptionToggle>();

        _remainderPathsToggle = GameObject.Find("Add_Inverse_Path_Toggle").GetComponent<MultiOptionToggle>();
        _rPath = GameObject.Find("R/2_Path_Toggle").GetComponent<MultiOptionToggle>();
        _rpsPath = GameObject.Find("Rps_Path_Toggle").GetComponent<MultiOptionToggle>();
        _rakPath = GameObject.Find("Rak_Path_Toggle").GetComponent<MultiOptionToggle>();

        _YinYangToggle = GameObject.Find("YinYang Toggle").GetComponent<Toggle>();

        _gridForwardToInverseReflectedToggle = GameObject.Find("FtIR_Links").GetComponent<Toggle>();
        _gridInverseToForwardReflectedToggle = GameObject.Find("ItFR_Links").GetComponent<Toggle>();
        _gridForwardToInverseToggle = GameObject.Find("ForwardToInverseToggle").GetComponent<Toggle>();
        _gridForwardReflectedToInverseReflectedToggle = GameObject.Find("ForwardReflectedToInverseReflectedToggle").GetComponent<Toggle>();

        _criticalStripDropdown = GameObject.Find("DropdownEx").GetComponent<DropdownEx>();
        _criticalStripRenderer = GameObject.Find("Critical Strip Renderer").GetComponent<CriticalStripRenderer>();
        _criticalStripWindow = GameObject.Find("Critical Strip Window").GetComponent<CriticalStripWindow>();

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

        _criticalStripDropdown.value = 1;
    }

    public void ResetInput()
    {
        SetInput(1.5, 0.5f);
        _autoAnimateToggle.isOn = false;
        _animationSpeedSlider.value = 0.0f;
    }

    private void SetInput(double index, float real)
    {
        _app.Index = index;
        _app.Real = real;

        _criticalStripRenderer.CenterOnCurrentPosition();
    }

    public void ApplyPreset(SlideTitles slide, int optionIndex)
    {
        switch (slide)
        {
            case SlideTitles.Zeta:
                HandleZetaPreset(optionIndex);
                break;
            case SlideTitles.Symmetry:
                HandleSymmetryPreset(optionIndex);
                break;
            case SlideTitles.Index:
                HandleIndexPreset(optionIndex);
                break;
            case SlideTitles.Frame:
                HandleFramePreset(optionIndex);
                break;
            case SlideTitles.YinYang:
                HandleYinYangPreset(optionIndex);
                break;
            case SlideTitles.Remainder:
                HandleRemainderPreset(optionIndex);
                break;
            case SlideTitles.SigmaNotHalf:
                HandleSigmaNotHalfPreset(optionIndex);
                break;
            case SlideTitles.Legs:
                HandleLegsPreset(optionIndex);
                break;
            case SlideTitles.Equal:
                HandleEqualPreset(optionIndex);
                break;
            case SlideTitles.RakZero:
                HandleZakZeroPreset(optionIndex);
                break;

            // Candy Presets
            case SlideTitles.Galaxy:
                HandleGalaxyPreset(optionIndex);
                break;
            case SlideTitles.Taffy:
                HandleTaffyPreset(optionIndex);
                break;
            case SlideTitles.Saver:
                HandleSaverPreset(optionIndex);
                break;
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

                SetInput(1.375, 0.5f);
                
                _autoAnimateToggle.isOn = true;
                _animationSpeedSlider.value = 1.5f;

                _zakTargetToggle.isOn = true;
                _zakTargetPath.SetSelectedOption(3);
                _originTargetToggle.isOn = true;
                
                // show zeros
                _criticalStripDropdown.value = 1;
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

                SetInput(3.07, 0.5f);

                _zakTargetToggle.isOn = true;
                _zakTargetPath.SetSelectedOption(2);
                _originTargetToggle.isOn = true;

                _spiralForwardToggle.isOn = true;
                break;
            
            case 3:
                // extend
                _extendSpiralToggle.isOn = true;
                break;
            
            case 4:
                // big
                CollapseAllFolders();
                ClearAll();
                ResetInput();

                _cameraPositionTracking.SetZoomLevel(4.0f);
                _cameraTargetDropdown.value = 0;

                _folders[(int)FolderOrder.ZetaInput].ExstendInstant();
                _folders[(int)FolderOrder.CameraTracking].ExstendInstant();
                _folders[(int)FolderOrder.Spiral].ExstendInstant();

                SetInput(168.65368, 0.5f);

                _zakTargetToggle.isOn = true;
                _originTargetToggle.isOn = true;

                _spiralForwardToggle.isOn = true;
                break;
        }
    }

    private void HandleSymmetryPreset(int optionIndex)
    {
        switch (optionIndex)
        {
            // skip case 0

            case 1:
                CollapseAllFolders();
                ClearAll();
                ResetInput();

                _cameraPositionTracking.SetZoomLevel(4.0f);
                _cameraTargetDropdown.value = 0;
                _cameraPositionTracking.ResetCamOffset();

                _folders[(int)FolderOrder.ZetaInput].ExstendInstant();
                _folders[(int)FolderOrder.CameraTracking].ExstendInstant();
                _folders[(int)FolderOrder.Spiral].ExstendInstant();

                SetInput(39.655, 0.5f);

                _zakTargetToggle.isOn = true;
                _originTargetToggle.isOn = true;

                _spiralForwardToggle.isOn = true;
                break;
            
            case 2:
                // animate till 39.662
                HandleAnimateToIndex(39.6615);
                break;
            
            case 3:
                _rpsSymToggle.SetSelectedOption(3);
                _rpsForwardLegsToggle.SetSelectedOption(2);

                _midTargetToggle.isOn = true;
                break;
            
            case 4:
                _spiralInverseReflectedToggle.isOn = true;
                break;
            
            case 5:
                _gridForwardToInverseReflectedToggle.isOn = true;
                break;
        }
    }

    private void HandleAnimateToIndex(double targetIndex)
    {
        if (_animateCoroutine != null)
        {
            StopCoroutine(_animateCoroutine);
        }
        _animateCoroutine = StartCoroutine(AnimateCoroutine(targetIndex));
    }

    private IEnumerator AnimateCoroutine(double targetIndex)
    {
        _autoAnimateToggle.isOn = true;
        _animationSpeedSlider.value = 1.2f;

        while (_autoAnimateToggle.isOn && _app.Index < targetIndex)
        {
            yield return null; // Wait for the next frame
        }

        _app.Index = targetIndex; // Ensure the target index is exactly set
        _autoAnimateToggle.isOn = false;
    }
    
    #region Preset Handlers
    private void HandleIndexPreset(int optionIndex)
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

                SetInput(6.18, 0.5f);

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
                // draw up to bisector
                _linksToDrawDropdown.value = 3;
                break;
        }
    }

    private void HandleFramePreset(int optionIndex)
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
                _cameraTargetDropdown.value = 3;
                _cameraPositionTracking.ResetCamOffset();

                _folders[(int)FolderOrder.ZetaInput].ExstendInstant();
                _folders[(int)FolderOrder.CameraTracking].ExstendInstant();
                _folders[(int)FolderOrder.Spiral].ExstendInstant();

                SetInput(6.18, 0.5f);

                _zakTargetToggle.isOn = true;
                _originTargetToggle.isOn = true;

                _spiralForwardToggle.isOn = true;
                _spiralInverseReflectedToggle.isOn = true;

                // color links by bisector
                _colorLinksToggle.SetSelectedOption(1);

                // draw up to bisector
                _linksToDrawDropdown.value = 3;
                break;
            
            case 2:
                // just bisector
                _linksToDrawDropdown.value = 4;

                _zakTargetToggle.isOn = false;
                _originTargetToggle.isOn = false;
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
                SetInput(4.12, 0.5f);

                // set spiral
                _linksToDrawDropdown.value = 4;
                _spiralForwardToggle.isOn = true;
                _spiralInverseReflectedToggle.isOn = true;

                // set yin yang
                _YinYangToggle.isOn = true;
                break;
            
            case 2:
                // remainders
                _folders[(int)FolderOrder.Remainders].ExstendInstant();
                // dist from origin
                _rpsR1Toggle.SetSelectedOption(1);
                _rpsR2Toggle.SetSelectedOption(1);
                break;
            case 3:
                // R
                _r1Toggle.SetSelectedOption(1);
                _r2Toggle.SetSelectedOption(1);
                break;
            case 4:
                // links back
                _linksToDrawDropdown.value = 1;

                _zakTargetToggle.isOn = true;
                _originTargetToggle.isOn = true;

                SetInput(6.18, 0.5f);
                break;
        }
    }
    
    private void HandleRemainderPreset(int optionIndex)
    {
        switch (optionIndex)
        {
            // skip case 0

            case 1:
                CollapseAllFolders();
                ClearAll();
                ResetInput();

                _cameraPositionTracking.SetZoomLevel(4.0f);
                _cameraTargetDropdown.value = 0;
                _cameraPositionTracking.ResetCamOffset();

                _folders[(int)FolderOrder.ZetaInput].ExstendInstant();
                _folders[(int)FolderOrder.CameraTracking].ExstendInstant();
                _folders[(int)FolderOrder.Remainders].ExstendInstant();

                SetInput(6.18, 0.5f);

                _zakTargetToggle.isOn = true;
                _originTargetToggle.isOn = true;

                // links up to bisector
                _linksToDrawDropdown.value = 3;

                _spiralForwardToggle.isOn = true;
                _spiralInverseReflectedToggle.isOn = true;

                _colorLinksToggle.SetSelectedOption(1);
                break;
            
            case 2:
                // zoom in
                _cameraPositionTracking.SetZoomLevel(2.0f);
                _cameraTargetDropdown.value = 3;
                break;
            
            case 3:
                // Rps
                _rpsR1Toggle.SetSelectedOption(1);
                _rpsR2Toggle.SetSelectedOption(1);
                break;
            
            case 4:
                // R
                _r1Toggle.SetSelectedOption(1);
                _r2Toggle.SetSelectedOption(1);
                
                break;
            
            case 5:
                // Rak
                _rak1Toggle.SetSelectedOption(1);
                _rak2Toggle.SetSelectedOption(1);
                break;
        }
    }

    private void HandleSigmaNotHalfPreset(int optionIndex)
    {
        switch (optionIndex)
        {
            // skip case 0

            case 1:
                CollapseAllFolders();
                ClearAll();
                ResetInput();

                _cameraPositionTracking.SetZoomLevel(4.0f);
                _cameraTargetDropdown.value = 0;
                _cameraPositionTracking.ResetCamOffset();

                _folders[(int)FolderOrder.ZetaInput].ExstendInstant();
                _folders[(int)FolderOrder.CameraTracking].ExstendInstant();
                _folders[(int)FolderOrder.Remainders].ExstendInstant();

                SetInput(6.18, 0.72f);
                _linksToDrawDropdown.value = 3;

                _zakTargetToggle.isOn = true;
                _originTargetToggle.isOn = true;

                _spiralForwardToggle.isOn = true;
                _spiralInverseReflectedToggle.isOn = true;

                _rpsR1Toggle.SetSelectedOption(1);
                _rpsR2Toggle.SetSelectedOption(1);
                break;
            
            case 2:
                _rpsSymToggle.SetSelectedOption(3);
                _rpsForwardLegsToggle.SetSelectedOption(2);
                _midTargetToggle.isOn = true;
                break;
        }
    }

    private void HandleLegsPreset(int optionIndex)
    {
        switch (optionIndex)
        {
            // skip case 0

            case 1:
                CollapseAllFolders();
                ClearAll();
                ResetInput();

                _cameraPositionTracking.SetZoomLevel(4.0f);
                _cameraTargetDropdown.value = 0;
                _cameraPositionTracking.ResetCamOffset();

                _folders[(int)FolderOrder.ZetaInput].ExstendInstant();
                _folders[(int)FolderOrder.CameraTracking].ExstendInstant();
                _folders[(int)FolderOrder.Remainders].ExstendInstant();

                SetInput(6.18, 0.72f);

                _zakTargetToggle.isOn = true;
                _originTargetToggle.isOn = true;

                _rpsSymToggle.SetSelectedOption(3);
                _rpsForwardLegsToggle.SetSelectedOption(2);
                _midTargetToggle.isOn = true;
                break;
            
            case 2:
                _cameraTargetDropdown.value = 2;
                // zeta target = forward bisector
                GameObject.Find("SymmetryTargetDropdown").GetComponent<TMP_Dropdown>().value = 8;
                break;

            case 3:
                _midTargetToggle.isOn = true;
                _rpsSymToggle.SetSelectedOption(3);
                break;
        }
    }

    private void HandleEqualPreset(int optionIndex)
    {
        switch (optionIndex)
        {
            // skip case 0

            case 1:
                CollapseAllFolders();
                ClearAll();
                ResetInput();

                _cameraPositionTracking.SetZoomLevel(3.0f);
                _cameraTargetDropdown.value = 0;
                _cameraPositionTracking.ResetCamOffset();

                _folders[(int)FolderOrder.ZetaInput].ExstendInstant();
                _folders[(int)FolderOrder.CameraTracking].ExstendInstant();
                _folders[(int)FolderOrder.Remainders].ExstendInstant();

                SetInput(6.18, 0.72f);

                _zakTargetToggle.isOn = true;
                _originTargetToggle.isOn = true;

                _rpsForwardLegsToggle.SetSelectedOption(2);
                _rpsSymToggle.SetSelectedOption(4);
                _midTargetToggle.isOn = true;

                _cameraTargetDropdown.value = 2;
                // zeta target = forward bisector
                GameObject.Find("SymmetryTargetDropdown").GetComponent<TMP_Dropdown>().value = 8;
                
                // Zps equal legs + zeros
                _criticalStripDropdown.value = 129;
                break;

            case 2:
                // equal legs point
                SetInput(6.2105, 0.95f);

                break;

            case 3:
                // equal angle point
                SetInput(6.21747, 0.766075f);
                break;
        }
    }

    private void HandleZakZeroPreset(int optionIndex)
    {
        switch (optionIndex)
        {
            // skip case 0

            case 1:
                CollapseAllFolders();
                ClearAll();
                ResetInput();

                _cameraPositionTracking.SetZoomLevel(4.0f);
                _cameraTargetDropdown.value = 0;
                _cameraPositionTracking.ResetCamOffset();

                _folders[(int)FolderOrder.ZetaInput].ExstendInstant();
                _folders[(int)FolderOrder.CameraTracking].ExstendInstant();
                _folders[(int)FolderOrder.Remainders].ExstendInstant();

                SetInput(3.65, 0.5f);

                _zakTargetToggle.isOn = true;
                _originTargetToggle.isOn = true;

                _spiralForwardToggle.isOn = true;
                _linksToDrawDropdown.value = 1;

                _rak1Toggle.SetSelectedOption(1);

                _criticalStripWindow.realRangeToggle.SetSelectedOption(1);

                // zeros
                _criticalStripDropdown.value = 4;
                break;
            
            case 2:
                _criticalStripDropdown.value = 12;
                break;

            case 3:
                _rakForwardLegsToggle.SetSelectedOption(2);
                _rakSymToggle.SetSelectedOption(3);
                _midTargetToggle.isOn = true;

                // show angles
                _criticalStripDropdown.value = 108 - 12;

                // load points after to stay on top
                _criticalStripDropdown.value = 108;
                break;
        }
    }
    #endregion

    #region Candy Presets
    private void HandleGalaxyPreset(int optionIndex)
    {
        switch (optionIndex)
        {
            // skip case 0

            case 1:
                CollapseAllFolders();
                ClearAll();
                ResetInput();

                _cameraPositionTracking.SetZoomLevel(0.0065f);
                _cameraTargetDropdown.value = 1;
                _cameraPositionTracking.ResetCamOffset();

                _folders[(int)FolderOrder.ZetaInput].ExstendInstant();
                _folders[(int)FolderOrder.CameraTracking].ExstendInstant();

                _app.Index = 100;
                _app.Real = 0.5f;
                
                _spiralForwardToggle.isOn = true;
                _spiralTransparencyToggle.SetSelectedOption(0);

                _autoAnimateToggle.isOn = true;
                _animationSpeedSlider.value = 0.087f;
                break;
            
            case 2:
                _cameraPositionTracking.SetZoomLevel(0.00075f);
                break;

            case 3:
                _spiralInverseToggle.isOn = true;
                break;
            
            case 4:
                _spiralInverseToggle.isOn = false;
                _spiralInverseReflectedToggle.isOn = true;

                _cameraPositionTracking.SetZoomLevel(5f);
                _cameraTargetDropdown.value = 1;
                _cameraPositionTracking.ResetCamOffset();

                _spiralZakToggle.isOn = true;
                break;
        }
    }

    private void HandleTaffyPreset(int optionIndex)
    {
        switch (optionIndex)
        {
            // skip case 0

            case 1:
                CollapseAllFolders();
                ClearAll();
                ResetInput();

                // set Camera
                _cameraPositionTracking.SetZoomLevel(4f);
                _cameraTargetDropdown.value = 2;
                GameObject.Find("SymmetryTargetDropdown").GetComponent<TMP_Dropdown>().value = 5;

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

                // spiral
                _spiralTransparencyToggle.SetSelectedOption(0);
                _spiralForwardToggle.isOn = true;
                _spiralInverseReflectedToggle.isOn = true;
                _spiralInverseToggle.isOn = true;
                _spiralForwardReflectedToggle.isOn = true;

                // grid
                _gridForwardToInverseReflectedToggle.isOn = true;
                _gridInverseToForwardReflectedToggle.isOn = true;
                _gridForwardToInverseToggle.isOn = true;
                _gridForwardReflectedToInverseReflectedToggle.isOn = true;
                break;
            
            case 2:
                _app.Index = 76;
                _app.Real = 0.323692f;
                break;
            
            case 3:
                _cameraPositionTracking.SetZoomLevel(42f);
                _app.Index = 97.249f;
                _app.Real = 0.2199f;
                break;
            
            case 4:
                _zakTargetToggle.isOn = false;
                _originTargetToggle.isOn = false;

                _spiralForwardToggle.isOn = false;
                _spiralInverseReflectedToggle.isOn = false;
                _spiralInverseToggle.isOn = false;
                _spiralForwardReflectedToggle.isOn = false;
                break;
        }
    }
    
    private void HandleSaverPreset(int optionIndex)
    {
        switch (optionIndex)
        {
            // skip case 0

            case 1:
                CollapseAllFolders();
                ClearAll();
                ResetInput();

                _cameraPositionTracking.SetZoomLevel(4.0f);
                _cameraTargetDropdown.value = 0;
                _cameraPositionTracking.ResetCamOffset();

                _folders[(int)FolderOrder.ZetaInput].ExstendInstant();
                _folders[(int)FolderOrder.CameraTracking].ExstendInstant();
                _folders[(int)FolderOrder.Remainders].ExstendInstant();

                SetInput(5.03, 0.5f);

                _autoAnimateToggle.isOn = true;
                _animationSpeedSlider.value = 1.0f;

                _emsPathToggle.SetSelectedOption(2);
                _midTargetPath.SetSelectedOption(2);
                _remainderPathsToggle.SetSelectedOption(2);
                _rPath.SetSelectedOption(2);
                _rpsPath.SetSelectedOption(2);
                _rakPath.SetSelectedOption(2);
                break;
            
            case 2:
                _cameraPositionTracking.SetZoomLevel(4.0f);
                _cameraTargetDropdown.value = 0;
                _cameraPositionTracking.ResetCamOffset();

                _autoAnimateToggle.isOn = true;
                _animationSpeedSlider.value = 1.0f;

                SetInput(5.23, 0.25f);
                break;
        }
    }
    #endregion
}
