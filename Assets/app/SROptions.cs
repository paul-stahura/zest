using System.ComponentModel;
using UnityEngine;
using UnityEditor;
using SRDebugger;


public partial class SROptions
{
    // The NumberRange attribute will ensure that the value never leaves the range 0-10
    [Category("Optimizations")]
    [DisplayName("Show Optimizations Panel")]
    public bool ShowOptimizations
    {
        get
        {
            var uio = GameObject.FindObjectOfType<UIOptions>();
            return uio.Optimizations.activeSelf;
        }

        set
        {
            var uio = GameObject.FindObjectOfType<UIOptions>();
            uio.Optimizations.SetActive(value);
        }
    }


    [Category("Euler's Product")]
    [DisplayName("Show Euler's Product Panel")]
    public bool ShowEulersProduct
    {
        get
        {
            var uio = GameObject.FindObjectOfType<UIOptions>();
            return uio.EulersProduct.activeSelf;
        }

        set
        {
            var uio = GameObject.FindObjectOfType<UIOptions>();
            uio.EulersProduct.SetActive(value);
        }
    }

    [Category("Spiral Centers")]
    [DisplayName("Show Spiral Centers Panel")]
    public bool ShowSpiralCentersGroup {
        get {
            var uio = GameObject.FindObjectOfType<UIOptions>();
            return uio.SpiralCenters.activeSelf;
        }
        set {
            var uio = GameObject.FindObjectOfType<UIOptions>();
            uio.SpiralCenters.SetActive(value);
        }
    }
}