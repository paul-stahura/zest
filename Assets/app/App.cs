using System;
using Complex = System.Numerics.Complex;

using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;

using Shapes;
using System.Runtime.CompilerServices;

public class App : ImmediateModeShapeDrawer
{

    [Header("Index Controls")]
    // Input box for the imaginary number
    public FloatInput imagDisplay;
    // Input box for the middle index
    public FloatInput middleIndexDisplay;
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
    public Toggle useReimannSiegel;


    public double _imag = 206.491213762; //Zeta.IndexToImag(5.24);
    readonly double IMAG_WITH_2_LINKS = Zeta.IndexToImag(1);

    public ZetaSpiral zetaSpiral;

    public Slider extendSpiralCount;



    int frameCount = 0;
    float dt = 0.0f;
    public float fps = 0.0f;
    float updateRate = 1.0f;  // 4 updates per sec.

    public Zeta.Spiral spiral;

    // This is where code interested in 'subscribing' to changes to the imag variable is done
    public event Action<double> ImagChanged;
    public event Action<double> RealChanged;
    public event Action<Camera, Zeta.Spiral> DrawSprial;
    public event Action SceneChange;

    double targetImag;

    public double Imag
    {
        get => _imag;
        set
        {
            // If the imaginary value being set would result in an index 
            // less than 2, ignore it
            //
            // Sets the all internal imaginary state with no animation
            if (value != _imag && value >= IMAG_WITH_2_LINKS) // value is a 'magic' variable that contains the NEW value coming to be set
            {
                _imag = value;

                imagDisplay.Value = (float)value;

                var index = (float)Zeta.ImagToIndex(value);
                middleIndexDisplay.Value = index;

                indexIntPart.value = Mathf.FloorToInt(index);
                var realPart = (float)Math.Round(index - Mathf.FloorToInt(index), 6);
                if (realPart > indexRealPart.maxValue || realPart < indexRealPart.minValue)
                    fineTuneReal.reset();
                indexRealPart.value = realPart;

                if (spiral == null)
                    spiral = new Zeta.Spiral(new Complex(_real, _imag), useReimannSiegel.isOn);
                else
                    spiral.Update(new Complex(_real, _imag), useReimannSiegel.isOn);

                ImagChanged?.Invoke(value); // announce to everyone that it has changed
            }
        }
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
                    spiral = new Zeta.Spiral(new Complex(_real, _imag), useReimannSiegel.isOn);
                else
                {
                    spiral.extendSpiralCount = (int)extendSpiralCount.value;
                    spiral.Update(new Complex(_real, _imag), useReimannSiegel.isOn);
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
                Imag += .04f * animSlider.Value;

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

        Imag = imagDisplay.Value;
        targetImag = (float)Imag;

        // When you type a new imaginary value into the text box, the code 
        // inside AddListener(...) is called. This is simply a shorthand way
        // to make a one line mini-function that gets executed when that happens.
        // Here, we set Robot3.imag to the value you typed in.
        imagDisplay.onValueChanged.AddListener(value =>
        {
            Imag = value;
        });


        // When you input a middle index value, this updates the imaginary number
        middleIndexDisplay.onValueChanged.AddListener(value =>
        {
            Imag = Zeta.IndexToImag(value);
        });
        // middleIndexDisplay.Value = (float)Zeta.ImagToIndex(Imag);

        var mgr = indexIntPart.GetComponent<SliderChangeMgr>();
        mgr.onValueChanged.AddListener(value =>
        {
            var imag = Zeta.IndexToImag((float)value + indexRealPart.value);
            // t = 2;

            // if (fineTuneReal.factor <= 0.1)
            Imag = imag;
            // else
            // {
            //     targetImag = imag;
            //     t = 0;
            // }
        });
        indexRealPart.maxValue = .99999f;

        mgr = indexRealPart.GetComponent<SliderChangeMgr>();
        mgr.onValueChanged.AddListener(value =>
        {
            var idx = (int)Zeta.ImagToIndex(_imag);
            var imag = Zeta.IndexToImag(idx + value);
            // t = 2;

            // if (fineTuneReal.factor <= 0.1)
            Imag = imag;
            // else
            // {
            //     targetImag = imag;
            //     t = 0;
            // }
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
            if (useReimannSiegel.isOn && value != .5f)
                useReimannSiegel.isOn = false;

            Real = value;
        });

        useReimannSiegel.onValueChanged.AddListener(value =>
        {
            if (value == true)
            {
                realPartFineTune.reset();
                realPartSlider.value = .5f;
            }
        });

        extendSpiralCount.onValueChanged.AddListener(value =>
        {
            spiral.extendSpiralCount = (int)extendSpiralCount.value;
            spiral.Update(new Complex(_real, _imag), useReimannSiegel.isOn);
        });
        #endregion
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

            Imag = Mathf.Lerp((float)_imag, (float)targetImag, t);
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

        PlayerPrefs.Save();
        SceneChange.Invoke();
        
        SceneManager.LoadScene("~Input-Output");
    }
}
