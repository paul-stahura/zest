using System.ComponentModel;
using UnityEngine;
using UnityEditor;
using SRDebugger;


public partial class SROptions
{
    // The NumberRange attribute will ensure that the value never leaves the range 0-10
    [Category("Optimizations")]
    public bool ShowOptimizations
    {
        get
        {
            var uio = GameObject.FindObjectOfType<UIOptions>();
            return uio.Optimizations.gameObject.activeSelf;
        }

        set
        {
            var uio = GameObject.FindObjectOfType<UIOptions>();
            uio.Optimizations.SetActive(value);
        }
    }


    [Category("Euler's Product")]
    public bool ShowEulersProduct
    {
        get
        {
            var uio = GameObject.FindObjectOfType<UIOptions>();
            return uio.EulersProduct.gameObject.activeSelf;
        }

        set
        {
            var uio = GameObject.FindObjectOfType<UIOptions>();
            uio.EulersProduct.SetActive(value);
        }
    }
}