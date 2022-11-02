using System;
using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class App : MonoBehaviour
{
    // Input box for the imaginary number
    public FloatInput imagDisplay;
    // Input box for the middle index
    public FloatInput middleIndexDisplay;

    //
    // Animation slider controls
    //
    [Header("Animation Controls")]
    public FloatInput animMax;
    public ImagSlider animSlider;

    //
    // Camera Tracking
    //
    [Header("Camera Tracking")]
    public Toggle trackingOff;
    public Toggle trackLink;
    public Toggle trackBisect;


    double _imag = 206.491213762; //Zeta.IndexToImag(5.24);
    readonly double IMAG_WITH_2_LINKS = Zeta.IndexToImag(2);

    public ZetaSpiral zetaSpiral;
    // This is where code interested in 'subscribing' to changes to the imag variable is done
    public event Action<double> ImagChanged;

    public double Imag {
        get => _imag;
        set
        {
            // If the imaginary value being set would result in an index 
            // less than 2, ignore it
            if (value != _imag && value >= IMAG_WITH_2_LINKS) // value is a 'magic' variable that contains the NEW value coming to be set
            {
                _imag = value;
                imagDisplay.Value = (float)value;                
                middleIndexDisplay.Value = (float)Zeta.ImagToIndex(value);

                ImagChanged?.Invoke(value); // announce to everyone that it has changed
            }
        }
    } 

    public void Start() {
        
        Imag = imagDisplay.Value;
        
        // When you type a new imaginary value into the text box, the code 
        // inside AddListener(...) is called. This is simply a shorthand way
        // to make a one line mini-function that gets executed when that happens.
        // Here, we set Robot3.imag to the value you typed in.
        imagDisplay.onValueChanged.AddListener(value => 
        {
            Imag = value;

            // When setting Robot3.imag, if the value is invalid, it will not
            // be changed.  Reset the display to the actual value of imag.
            imagDisplay.Value = (float)_imag;
        });   


        // When you input a middle index value, this updates the imaginary number
        middleIndexDisplay.onValueChanged.AddListener(value =>
        {
            Imag = Zeta.IndexToImag(value);

            // It's possible the value that was set here is invalid so recalculate
            // and display the actual value
            middleIndexDisplay.Value = (float)Zeta.ImagToIndex(_imag);
        });

#region Animation Slider
        animMax.onValueChanged.AddListener(value =>
        {
            animSlider.Max = value;
        });
        animSlider.Max = animMax.Value; // set the default value
#endregion

#region Camera Tracking
        trackLink.onValueChanged.AddListener(val =>
        {
            if (!val)
            {
                var rot = Quaternion.AngleAxis(0, Vector3.forward);
                Camera.main.transform.rotation = rot;
            }
        });
        trackLink.onValueChanged.Invoke(trackLink.isOn);

        trackingOff.onValueChanged.AddListener(val => 
        {
            if (!val)
            {
                Camera.main.transform.position = new Vector3(0, 0, -10);
                Camera.main.transform.rotation = Quaternion.identity;
            }
        });
        trackingOff.onValueChanged.Invoke(trackingOff.isOn);
#endregion

    } 

    void Update() {
        // The animSlider is zero when it is in the center.
        if (animSlider.Value != 0)
        {
            Imag += .04f * animSlider.Value;
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
