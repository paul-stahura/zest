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

public enum SpiralFormulas
{
    ReimannSiegel = 0,
    EulerMaclauren = 1,
    EtaFormula = 2,
    ZetFormula = 3
}

public class App : ImmediateModeShapeDrawer
{

    [Header("Index Controls")]
    // Input box for the imaginary number
    public FloatInput imagDisplay;
    // Input box for the middle index
    public FloatInput middleIndexDisplay;
    public double _index;
    public Toggle useNewImagToggle;
    public Slider indexIntPart;
    public Slider indexRealPart;
    public FineTuneSlider fineTuneReal;

    //
    // Animation slider controls
    //
    [Header("Animation Controls")]
    public FloatInput animMax;
    public ImagSlider animSlider;

    [Header("Real Part Control")]
    public Slider realPartSlider;
    public FineTuneSlider realPartFineTune;
    public TMP_Dropdown spiralFormula;

    // public double _imag = 206.491213762; //Zeta.IndexToImag(5.24);
    readonly double IMAG_WITH_2_LINKS = Zeta.IndexToImag(1, true);
    readonly double IMAG_WHEN_INDEX_AT_ZERO = 0.7463958;
    readonly double IMAG_WHEN_INDEX_AT_2ND_ZERO = 0.300802;
    readonly double IMAG_TDROP_ZERO = 0.3640107;
    readonly double IMAG_AT_ZERO = Zeta.IndexToImag(0, true);

    public ZetaSpiral zetaSpiral;
    public ZetaSpiral secondSpiral;


    public Slider extendSpiralCount;



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
            if (value != _index && Zeta.IndexToImag(value, useNewImagToggle.isOn) >= IMAG_TDROP_ZERO)
            {
                _index = value;

                UpdateIndexSliders((float)value);

                if (spiral == null)
                    spiral = new Zeta.Spiral(_real, _index, (SpiralFormulas)spiralFormula.value, useNewImagToggle.isOn);
                else
                    spiral.Update(_real, _index, (SpiralFormulas)spiralFormula.value, useNewImagToggle.isOn);

                IndexChanged?.Invoke(value); // announce to everyone that it has changed
            }
        }
    }

    public double GetImag()
    {
        return Zeta.IndexToImag(_index, useNewImagToggle.isOn);
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
                    spiral = new Zeta.Spiral(_real, Index, (SpiralFormulas)spiralFormula.value, useNewImagToggle.isOn);
                else
                {
                    spiral.extendSpiralCount = (int)extendSpiralCount.value;
                    spiral.Update(_real, Index, (SpiralFormulas)spiralFormula.value, useNewImagToggle.isOn);
                }

                RealChanged?.Invoke(value);
            }
        }
    }

    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;

            // set static parameter to draw in the local space of this object
            Draw.Matrix = transform.localToWorldMatrix;
            
            // The animSlider is zero when it is in the center.
            if (animSlider.Value != 0)
            {
                // Imag += .04f * animSlider.Value;
                var index = indexIntPart.value + indexRealPart.value;
                index += .001f * animSlider.Value;

                if(index <= 0)
                    index = 0;

                UpdateIndexSliders(index);
                Index = index;
            }

            DrawSprial?.Invoke(cam, spiral);
        }
    }

    void OnApplicationQuit()
    {
        UpdateActiveSceneOnStart(SceneManager.GetActiveScene().name);
    }

    public void Start()
    {
        // checks if we are on the correct scene when we start the app
        string sceneOnStart = PlayerPrefs.GetString("ActiveSceneOnStart", SceneManager.GetActiveScene().name);
        if(sceneOnStart != SceneManager.GetActiveScene().name) {
            SceneManager.LoadScene(sceneOnStart);
            return;
        }

        useNewImagToggle = GameObject.Find("ToggleNewImag").GetComponent<Toggle>();
        useNewImagToggle.onValueChanged.AddListener(value =>
        {
            if(spiral != null)
            {
                spiral = new Zeta.Spiral(_real, Index, (SpiralFormulas)spiralFormula.value, useNewImagToggle.isOn);
            }
        });

        // Imag = imagDisplay.Value; // init with index instead of Imag
        Index = indexIntPart.value + indexRealPart.value;

        targetIndex = Index;

        // When you type a new imaginary value into the text box, the code 
        // inside AddListener(...) is called. This is simply a shorthand way
        // to make a one line mini-function that gets executed when that happens.
        // Here, we set Robot3.imag to the value you typed in.
        imagDisplay.onValueChanged.AddListener(value =>
        {
            middleIndexDisplay.onValueChanged.Invoke((float)Zeta.ImagToIndex(value));
        });

        // When you input a middle index value, this updates the imaginary number
        middleIndexDisplay.onValueChanged.AddListener(value =>
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


        #region Animation Slider
        animMax.onValueChanged.AddListener(value =>
        {
            animSlider.Max = value;
        });
        animSlider.Max = animMax.Value; // set the default value
        #endregion

        #region Real Part Slider
        realPartSlider.onValueChanged.AddListener(value =>
        {
            if (spiralFormula.value != (int)SpiralFormulas.EulerMaclauren && value != .5f)
                spiralFormula.value = (int)SpiralFormulas.EulerMaclauren;

            Real = value;
        });

        spiralFormula.onValueChanged.AddListener(value =>
        {
            if (spiralFormula.value != (int)SpiralFormulas.EulerMaclauren)
            {
                realPartFineTune.reset();
                realPartSlider.value = .5f;
            }

            spiral.Update(spiral.real, spiral.index, (SpiralFormulas)spiralFormula.value, useNewImagToggle.isOn);
        });

        extendSpiralCount.onValueChanged.AddListener(value =>
        {
            spiral.extendSpiralCount = (int)extendSpiralCount.value;
            spiral.Update(spiral.real, spiral.index, (SpiralFormulas)spiralFormula.value, useNewImagToggle.isOn);
        });
        #endregion

        spiralFormula.value = PlayerPrefs.GetInt("AppSpiralFormula");
    }

    float t = 0f;

    public Canvas canvas;
    void Update()
    {
        if (Input.GetKeyUp("space"))
        {
            var active = canvas.gameObject.activeSelf;
            canvas.gameObject.SetActive(!active);
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

    private void UpdateActiveSceneOnStart(string startScene) {
        PlayerPrefs.SetString("ActiveSceneOnStart", startScene);
        PlayerPrefs.SetInt("AppSpiralFormula", spiralFormula.value);

        PlayerPrefs.Save();
        SceneChange.Invoke();
        
        SceneManager.LoadScene("~Input-Output");
    }

    private void UpdateIndexSliders(float index)
    {
        middleIndexDisplay.Value = index;
        imagDisplay.Value = (float)Zeta.IndexToImag(Index, useNewImagToggle.isOn);
        indexIntPart.value = Mathf.FloorToInt(index);
        var realPart = (float)Math.Round(index - Mathf.FloorToInt(index), 6);
        if (realPart > indexRealPart.maxValue || realPart < indexRealPart.minValue)
            fineTuneReal.reset();
        indexRealPart.value = realPart;
    }
}
