using System;
using Complex = System.Numerics.Complex;

using UnityEngine;
using UnityEngine.UI;
using TMPro;
using UnityEngine.SceneManagement;

using Shapes;
using System.Runtime.CompilerServices;
using Unity.VersionControl.Git;
using System.Xml.Schema;
using UnityEngine.EventSystems;

public enum SpiralFormulas
{
    ReimannSiegel = 0,
    EulerMaclauren = 1,
    EtaFormula = 2,
    ZetFormula = 3,
    RSInverseSum = 4,
    Zem5 = 5
}

public class App : ImmediateModeShapeDrawer
{

    [Header("Index Controls")]
    // Input box for the imaginary number
    public DoubleInput imagDisplay;
    // Input box for the middle index
    public DoubleInput IndexDisplay;
    public double _index;
    [SerializeField] private Toggle _usePolyImagToggle;
    public bool usingPolyImag = false;
    public Slider indexIntPart;
    public Slider indexRealPart;
    public FineTuneSlider fineTuneReal;

    //
    // Animation slider controls
    //
    [Header("Animation Controls")]
    [SerializeField] private Toggle animHoldToggle;
    [SerializeField] private MultiOptionToggle _animSpeedMOT; 
    public Slider animSpeed;

    [Header("Real Part Control")]
    public Slider realPartSlider;
    public FineTuneSlider realPartFineTune;
    public TMP_Dropdown spiralFormula;
    public MultiOptionToggle _realRangeToggle;

    // public double _imag = 206.491213762; //Zeta.IndexToImag(5.24);
    readonly double IMAG_WITH_2_LINKS = Zeta.IndexToImag(1, true);
    readonly double IMAG_WHEN_INDEX_AT_ZERO = 0.7463958;
    readonly double IMAG_WHEN_INDEX_AT_2ND_ZERO = 0.300802;
    readonly double IMAG_TDROP_ZERO = 0.3640107;
    readonly double IMAG_AT_ZERO = Zeta.IndexToImag(0, true);


    [SerializeField] private Toggle _extendSpiralToggle;
    public int _extendSpiral = 0;



    int frameCount = 0;
    float dt = 0.0f;
    public float fps = 0.0f;
    float updateRate = 1.0f;  // 4 updates per sec.

    public Zeta.Spiral spiral;

    // This is where code interested in 'subscribing' to changes to the imag variable is done
    public event Action<double> IndexChanged;
    public event Action<double> RealChanged;
    public event Action<Camera, Zeta.Spiral> DrawSprial;
    public event Action SceneChange;

    double targetIndex;

    public double Index
    {
        get => _index;
        set
        {
            if (value != _index && Zeta.IndexToImag(value, usingPolyImag) >= IMAG_TDROP_ZERO)
            {
                _index = value;

                UpdateIndexSliders(value);

                if (spiral == null)
                    spiral = new Zeta.Spiral(_real, _index, (SpiralFormulas)spiralFormula.value, usingPolyImag);
                else
                    spiral.extendSpiralCount = _extendSpiral;
                    spiral.Update(_real, _index, (SpiralFormulas)spiralFormula.value, usingPolyImag);

                IndexChanged?.Invoke(value); // announce to everyone that it has changed
            }
        }
    }

    public double GetImag()
    {
        return Zeta.IndexToImag(_index, usingPolyImag);
    }

    public double _real = 0.5;
    public double Real
    {
        get => _real;
        set
        {
            if (value != _real)
            {
                _real = value;
                realPartSlider.value = (float)_real;

                if (spiral == null)
                    spiral = new Zeta.Spiral(_real, Index, (SpiralFormulas)spiralFormula.value, usingPolyImag);
                else
                {
                    spiral.extendSpiralCount = _extendSpiral;
                    spiral.Update(_real, Index, (SpiralFormulas)spiralFormula.value, usingPolyImag);
                }

                RealChanged?.Invoke(_real);
            }
        }
    }

    /// <summary>
    /// Sets the real value to exactly 0.5 and ensures all UI elements are properly reset.
    /// This is crucial for the critical line in the Riemann hypothesis.
    /// </summary>
    public void SetToExactCriticalLine()
    {
        Debug.Log("[App] Setting to exact critical line value of 0.5");
        
        // Set the main slider to exactly 0.5
        realPartSlider.value = 0.5f;
        
        // Reset the fine tune control
        realPartFineTune.reset();
        
        // Set internal value to exactly 0.5
        _real = 0.5d;
        
        // Explicitly click the reset button to ensure UI is in correct state
        if (realPartFineTune.resetButton != null)
        {
            realPartFineTune.resetButton.onClick.Invoke();
        }
        
        // Update the spiral
        if (spiral != null)
        {
            spiral.Update(0.5d, Index, (SpiralFormulas)spiralFormula.value, usingPolyImag);
        }
        
        // Notify listeners
        RealChanged?.Invoke(0.5d);
        
        Debug.Log("[App] Critical line value set, all UI elements reset");
    }

    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;

            // set static parameter to draw in the local space of this object
            Draw.Matrix = transform.localToWorldMatrix;

            DrawSprial?.Invoke(cam, spiral);
        }
    }

    private void AnimateSpiral()
    {
        var deadzone = 0.0001;
        if (Math.Abs(animSpeed.value) > deadzone)
        {
            double index = Index;

            // Scale the speed inversely based on the index
            // so that the speed is slower when the index is larger
            // and faster when the index is smaller
            var speed = (animSpeed.value * animSpeed.value) * 0.001 / (index + 1); // adding 1 to avoid division by zero

            index += speed * (animSpeed.value < 0 ? -1 : 1);

            if(index <= 0)
                index = 0;

            Index = index;
        }
    }

    void OnApplicationQuit()
    {
        UpdateActiveSceneOnStart(SceneManager.GetActiveScene().name);
    }

    public void Start()
    {
        // checks if we are on the correct scene when we start the app
        // string sceneOnStart = PlayerPrefs.GetString("ActiveSceneOnStart", SceneManager.GetActiveScene().name);
        // if(sceneOnStart != SceneManager.GetActiveScene().name) {
        //     SceneManager.LoadScene(sceneOnStart);
        //     return;
        // }

        _usePolyImagToggle = GameObject.Find("ToggleNewImag")?.GetComponent<Toggle>();
        if (_usePolyImagToggle != null)
        {
            _usePolyImagToggle.onValueChanged.AddListener(value =>
            {
                usingPolyImag = value;
                if(spiral != null)
                {
                    spiral = new Zeta.Spiral(_real, Index, (SpiralFormulas)spiralFormula.value, usingPolyImag);
                }
            });
        }

        // Imag = imagDisplay.Value; // init with index instead of Imag
        Index = indexIntPart.value + indexRealPart.value;

        targetIndex = Index;

        // When you type a new imaginary value into the text box, the code 
        // inside AddListener(...) is called. This is simply a shorthand way
        // to make a one line mini-function that gets executed when that happens.
        // Here, we set Robot3.imag to the value you typed in.
        imagDisplay.onValueChanged.AddListener(value =>
        {
            IndexDisplay.onValueChanged.Invoke(Zeta.SearchImagToIndex(value));
        });

        // When you input a middle index value, this updates the imaginary number
        IndexDisplay.onValueChanged.AddListener(value =>
        {
            Index = value;
        });

        var mgr = indexIntPart.GetComponent<SliderChangeMgr>();
        mgr.onValueChanged.AddListener(value =>
        {
            Index = value + indexRealPart.value;
        });
        indexRealPart.maxValue = .99999f;

        mgr = indexRealPart.GetComponent<SliderChangeMgr>();
        mgr.onValueChanged.AddListener(value =>
        {
            Index = indexIntPart.value + value;
        });

        #region Real Part Slider
        realPartSlider.onValueChanged.AddListener(value =>
        {
            if (spiralFormula.value != (int)SpiralFormulas.EulerMaclauren && value != .5f)
                spiralFormula.value = (int)SpiralFormulas.EulerMaclauren;

            Real = value;
        });

        _realRangeToggle = GameObject.Find("SigmaRangeToggle")?.GetComponent<MultiOptionToggle>();
        _realRangeToggle.OnOptionChanged += (option) => ToggleExtendRealRange();

        spiralFormula.onValueChanged.AddListener(value =>
        {
            if (spiralFormula.value != (int)SpiralFormulas.EulerMaclauren)
            {
                realPartFineTune.reset();
                realPartSlider.value = .5f;
            }

            spiral.Update(spiral.real, spiral.index, (SpiralFormulas)spiralFormula.value, usingPolyImag);
        });

        _extendSpiralToggle = GameObject.Find("ToggleExtendSpiral")?.GetComponent<Toggle>();
        _extendSpiralToggle.onValueChanged.AddListener(value =>
        {
            _extendSpiral = value ? 10000 : 0;
            SpiralCalculator.ExtendSpiralChanged?.Invoke(_extendSpiral);
            spiral.extendSpiralCount = _extendSpiral;
            spiral.Update(spiral.real, spiral.index, (SpiralFormulas)spiralFormula.value, usingPolyImag);
        });
        #endregion

        spiralFormula.value = PlayerPrefs.GetInt("AppSpiralFormula");


        #region Animation Controls

        _animSpeedMOT = GameObject.Find("AnimSpeedMOT")?.GetComponent<MultiOptionToggle>();
        _animSpeedMOT.OnOptionChanged += ScaleAnimSpeed;

        animHoldToggle = GameObject.Find("AnimHold")?.GetComponent<Toggle>();
        animHoldToggle.onValueChanged.AddListener(value =>
        {
            animSpeed.value = 0;
        });

        EventTrigger animTrigger = animSpeed.gameObject.AddComponent<EventTrigger>();
        EventTrigger.Entry entry = new EventTrigger.Entry();
        entry.eventID = EventTriggerType.PointerUp;
        entry.callback.AddListener((data) => {
            if (!animHoldToggle.isOn)
                animSpeed.value = 0;
        });
        animTrigger.triggers.Add(entry);

        animHoldToggle.onValueChanged.Invoke(true);
        #endregion
    }

    private void ScaleAnimSpeed(int option)
    {
        switch (option)
        {
            case 0:
                animSpeed.minValue = -3f;
                animSpeed.maxValue = 3f;
                break;
            case 1:
                animSpeed.minValue = -0.1f;
                animSpeed.maxValue = 0.1f;
                break;
        }
    }

    float t = 0f;

    public Canvas canvas;
    void Update()
    {
        // animate index
        AnimateSpiral();

        if (Input.GetKeyUp("space"))
        {
            if (!DescriptionManager.InEditMode)
            {
                var active = canvas.gameObject.activeSelf;
                canvas.gameObject.SetActive(!active);
            }
        }

        frameCount++;
        dt += Time.deltaTime;
        if (dt > 1.0f / updateRate)
        {
            fps = frameCount / dt;
            frameCount = 0;
            dt -= 1.0f / updateRate;
        }

        if (t <= 1.1f) //(_imag != targetImag)
        {
            // When thre real part is exactly zero and we lerp toward the final
            // value, we see a jump as the middle link changes as we transition
            // to exactly t == 1.  To get rid of that skip, just skip t ahead
            // to 1 when we get close enough.
            if (indexRealPart.value == 0 && t > .15)
                t = 1.2f;
            else
                t += Time.deltaTime;

            Index = Mathf.Lerp((float)_index, (float)targetIndex, t);
        }

        // else if (trackBisect.isOn)
        // {
        //     if (null == leanDragCamera)
        //         leanDragCamera = Camera.main.GetComponent<Lean.Touch.LeanDragCamera>();

        //     var info = bisectIntersection();
        //     if (info.Intersects)
        //     {
        //         if (trackBisectFirstFrame)
        //         {
        //             trackOffset = new Vector3();
        //             trackBisectFirstFrame = false;
        //         }

        //         var pos = info.Intersection + trackOffset;
        //         var rot = rotationOfBisect(info);

        //         setCamera(pos, rot);

        //     }
        //     else
        //     {
        //         Debug.LogWarning("No intersection!");
        //     }
        // }
        // else
        // {
        //     trackBisectFirstFrame = true;
        // }
    }

    public void onClick()
    {
        string nextScene = "~Input-Output";
        // since we check active scene on load whenever we change scenes we need to update the playerPref before the scene changes.
        UpdateActiveSceneOnStart(nextScene);
        SceneManager.LoadScene(nextScene);
    }

    private void ToggleExtendRealRange()
    {
        ExtendRealRange(CriticalStripWindow.sigmaWindowRange);
    }

    private void ExtendRealRange(int range)
    {
        realPartSlider.minValue = (range - 1) * -1;
        realPartSlider.maxValue = range;
    }

    private void UpdateActiveSceneOnStart(string startScene)
    {
        PlayerPrefs.SetString("ActiveSceneOnStart", startScene);
        PlayerPrefs.SetInt("AppSpiralFormula", spiralFormula.value);

        PlayerPrefs.Save();
        SceneChange?.Invoke();

        SceneManager.LoadScene("~Input-Output");
    }

    private void UpdateIndexSliders(double index)
    {
        IndexDisplay.Value = index;
        imagDisplay.Value = Zeta.IndexToImag(Index, usingPolyImag);
        indexIntPart.maxValue = Mathf.FloorToInt((float)index) + 15;
        indexIntPart.value = Mathf.FloorToInt((float)index);
        double realPart = Math.Round(index - Mathf.FloorToInt((float)index), 6);
        if (realPart > indexRealPart.maxValue + 0.01f || realPart < indexRealPart.minValue - 0.01f)
            fineTuneReal.reset();
        indexRealPart.value = (float)realPart;
    }
}
