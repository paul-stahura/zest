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

    public double Imag {
        get => _imag;
        set
        {
            // If the imaginary value being set would result in an index 
            // less than 2, ignore it
            if (value != _imag && value >= IMAG_WITH_2_LINKS) // value is a 'magic' variable that contains the NEW value coming to be set
            {
                updateImag(value, true);
                ImagChanged?.Invoke(value); // announce to everyone that it has changed
            }
        }
    } 

    public void Start() {
        
        Imag = imagDisplay.Value;
        targetImag = (float)Imag;
        
        // When you type a new imaginary value into the text box, the code 
        // inside AddListener(...) is called. This is simply a shorthand way
        // to make a one line mini-function that gets executed when that happens.
        // Here, we set Robot3.imag to the value you typed in.
        imagDisplay.onValueChanged.AddListener(value => 
        {
            targetImag = value;

            // When setting Robot3.imag, if the value is invalid, it will not
            // be changed.  Reset the display to the actual value of imag.
            imagDisplay.Value = value;
        });   


        // When you input a middle index value, this updates the imaginary number
        middleIndexDisplay.onValueChanged.AddListener(value =>
        {
            targetImag = Zeta.IndexToImag(value);

            // It's possible the value that was set here is invalid so recalculate
            // and display the actual value
            middleIndexDisplay.Value = (float)Zeta.ImagToIndex(_imag);
        });

        indexIntPart.onValueChanged.AddListener(value => {
            updateImag(Zeta.IndexToImag(value + indexRealPart.value));
        });

        indexRealPart.onValueChanged.AddListener(value => {
            updateImag(Zeta.IndexToImag(indexIntPart.value + value));
            // targetImag = (float)Zeta.IndexToImag(indexIntPart.value + value);
        });

#region Animation Slider
        animMax.onValueChanged.AddListener(value =>
        {
            animSlider.Max = value;
        });
        animSlider.Max = animMax.Value; // set the default value
#endregion


    } 

    void updateImag(double value, bool updateSliders=false) {
        // _imag = value;
        targetImag = (float)value;
        t = 0;
        imagDisplay.Value = (float)value;    

        var index = (float)Zeta.ImagToIndex(value);            
        middleIndexDisplay.Value = index;

        if (updateSliders) {
            indexIntPart.value = Mathf.FloorToInt(index);
            indexRealPart.value = index - Mathf.FloorToInt(index);
        }
    }

    float t = 0f;

    void Update() {
        // The animSlider is zero when it is in the center.
        if (animSlider.Value != 0)
        {
            updateImag(_imag + .04f * animSlider.Value);
        } else if (_imag != targetImag) {
            t += Mathf.Min(1f, 0.5f * Time.deltaTime);
            _imag = Mathf.Lerp((float)_imag, (float)targetImag, t);
        }
        else {
            t = 0;
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
