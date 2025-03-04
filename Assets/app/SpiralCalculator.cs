using System;
using System.Drawing.Text;
using System.Numerics;
using UnityEngine;


public class SpiralCalculator : MonoBehaviour
{
    private App _app;

    public static Action<Zeta.Spiral> UpdateEms;
    private Zeta.Spiral _emsSpiral;
    public static Action<Zeta.Spiral> UpdateZrs;
    private Zeta.Spiral _zrsSpiral;
    public static Action<Zeta.Spiral> UpdateEta;
    private Zeta.Spiral _etaSpiral;
    public static Action<Vector[]> UpdateRsInverseSum;
    private Zeta.Spiral _rsInverseSumSpiral;

    public static Action<Vector> UpdateZps;
    private Vector _zpsPos;

    void Awake()
    {
        _app = GameObject.Find("App").GetComponent<App>();
        _app.IndexChanged += OnIndexChanged;
        _app.RealChanged += OnRealChanged;
    }

    public Zeta.Spiral GetEms()
    {
        if(_emsSpiral == null) CalcEms(_app.Real, _app.Index);
        return _emsSpiral;
    }

    public Zeta.Spiral GetZrs()
    {
        if(_zrsSpiral == null) CalcZrs(_app.Index);
        return _zrsSpiral;
    }

    public Zeta.Spiral GetEta()
    {
        if(_etaSpiral == null) CalcEta(_app.Real, _app.Index);
        return _etaSpiral;
    }

    public Vector[] GetRsInverseSum()
    {
        if(_rsInverseSumSpiral == null) CalcRsInverseSum(_app.Real, _app.Index);
        return _rsInverseSumSpiral.joints;
    }

    public Vector GetZps()
    {
        if(_zpsPos == null) return null;
        return _zpsPos;
    }

    private void OnIndexChanged(double index)
    {
        Calculate(_app.Index, _app.Real);
    }

    private void OnRealChanged(double real)
    {
        Calculate(_app.Index, _app.Real);
    }

    private void Calculate(double index, double real)
    {
        if(UpdateEms != null)
        {
            CalcEms(real, index);
        }
        else
        {
            _emsSpiral = null;
        }

        if(UpdateZrs != null)
        {
            CalcZrs(index);
        }
        else
        {
            _zrsSpiral = null;
        }

        if(UpdateEta != null)
        {
            CalcEta(real, index);
        }
        else
        {
            _etaSpiral = null;
        }

        if(UpdateRsInverseSum != null)
        {
            CalcRsInverseSum(real, index);
        }
        else
        {
            _rsInverseSumSpiral = null;
        }

        if(UpdateZps != null)
        {
            CalcZps(index);
        }
        else
        {
            _zpsPos = null;
        }
    }

    private void CalcEms(double real, double index)
    {
        if(_emsSpiral == null)
        {
            _emsSpiral = new Zeta.Spiral(real, index, SpiralFormulas.EulerMaclauren, _app.usingPolyImag);
        }
        else
        {
            _emsSpiral.Update(real, index, SpiralFormulas.EulerMaclauren, _app.usingPolyImag);
        }
        UpdateEms.Invoke(_emsSpiral);
    }

    private void CalcZrs(double index)
    {
        if(_zrsSpiral == null)
        {
            _zrsSpiral = new Zeta.Spiral(0.5, index, SpiralFormulas.ReimannSiegel, _app.usingPolyImag);
        }
        else
        {
            _zrsSpiral.Update(0.5, index, SpiralFormulas.ReimannSiegel, _app.usingPolyImag);
        }
        UpdateZrs.Invoke(_zrsSpiral);
    }

    private void CalcEta(double real, double index)
    {
        if(_etaSpiral == null)
        {
            _etaSpiral = new Zeta.Spiral(real, index, SpiralFormulas.EtaFormula, _app.usingPolyImag);
        }
        else
        {
            _etaSpiral.Update(real, index, SpiralFormulas.EtaFormula, _app.usingPolyImag);
        }
        UpdateEta.Invoke(_etaSpiral);
    }

    private void CalcRsInverseSum(double real, double index)
    {
        if(_rsInverseSumSpiral == null)
        {
            _rsInverseSumSpiral = new Zeta.Spiral(real, index, SpiralFormulas.RSInverseSum, _app.usingPolyImag);
        }
        else
        {
            _rsInverseSumSpiral.Update(real, index, SpiralFormulas.RSInverseSum, _app.usingPolyImag);
        }
        UpdateRsInverseSum.Invoke(_rsInverseSumSpiral.joints);
    }

    private void CalcZps(double index)
    {
        _zpsPos = BisectorPoint.GetZPS(index);
        UpdateZps.Invoke(_zpsPos);
    }
}
