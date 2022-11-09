using System;
using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class App : MonoBehaviour
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


    double _imag = 206.491213762; //Zeta.IndexToImag(5.24);
    readonly double IMAG_WITH_2_LINKS = Zeta.IndexToImag(2);

    public ZetaSpiral zetaSpiral;

    // This is where code interested in 'subscribing' to changes to the imag variable is done
    public event Action<double> ImagChanged;

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

                ImagChanged?.Invoke(value); // announce to everyone that it has changed
            }
        }
    }

    public void Start()
    {

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

        var mgr = indexIntPart.GetComponent<SliderChangeMgr>();
        mgr.onValueChanged.AddListener(value =>
        {
            var imag = Zeta.IndexToImag((float)value + indexRealPart.value);
            t = 2;

            if (fineTuneReal.factor <= 0.001)
                Imag = imag;
            else
            {
                targetImag = imag;
                t = 0;
            }
        });
        indexRealPart.maxValue = .99999f;

        mgr = indexRealPart.GetComponent<SliderChangeMgr>();
        mgr.onValueChanged.AddListener(value =>
        {
            var imag = Zeta.IndexToImag(indexIntPart.value + value);
            t = 2;

            if (fineTuneReal.factor <= 0.001)
                Imag = imag;
            else
            {
                targetImag = imag;
                t = 0;
            }
        });


        #region Animation Slider
        animMax.onValueChanged.AddListener(value =>
        {
            animSlider.Max = value;
        });
        animSlider.Max = animMax.Value; // set the default value
        #endregion
    }

    float t = 0f;

    void Update()
    {
        // The animSlider is zero when it is in the center.
        if (animSlider.Value != 0)
        {
            Imag += .04f * animSlider.Value;
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
                t += .5f * Time.deltaTime;

            _imag = Mathf.Lerp((float)_imag, (float)targetImag, t);
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





}
