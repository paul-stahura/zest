using System;
using System.Numerics;
using UnityEngine;


public class SpiralCalculator : MonoBehaviour
{
    private App _app;

    void Awake()
    {
        _app = GameObject.Find("App").GetComponent<App>();
    }

    public Complex GetZrsPos()
    {
        return _app.spiral.zeta;
    }

    public Complex GetZpsPos()
    {
        throw new NotImplementedException();
    }

    public Complex GetEmsPos()
    {
        throw new NotImplementedException();
    }
}
