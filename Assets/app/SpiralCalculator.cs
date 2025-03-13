using System;
using System.Collections.Generic;
using UnityEngine;


public class SpiralCalculator : MonoBehaviour
{
    private App _app;

    public static Action<double> IndexChanged;
    public static Action<double> RealChanged;

    public static Action<Zeta.Spiral> UpdateEms;
    private Zeta.Spiral _emsSpiral;
    public static Action<Zeta.Spiral> UpdateZrs;
    private Zeta.Spiral _zrsSpiral;
    public static Action<Zeta.Spiral> UpdateEta;
    private Zeta.Spiral _etaSpiral;

    public static Action<Vector[]> UpdateRsInverseSum;
    private Zeta.Spiral _rsInverseSumSpiral;
    public static Action<Vector> UpdateInversePoint;
    private Vector _inversePoint;
    public static Action<Vector2[]> UpdateInverseSumPath;
    private Vector2[] _inverseSumPath;

    public static Action<Vector> UpdateZps;
    private Vector _zpsPos;

    public static Action<List<Vector>, int> UpdateRealPath;
    private List<Vector> _realPath;
    private int _realPathIndexOne;

    public static Action<Vector> UpdateSymmetryPoint;
    private Vector _symmetryPoint;
    public static Action<Vector2[]> UpdateSymmetryPath;
    private Vector2[] _symmetryPath;

    public static Action<Vector> UpdateBpOneHalf;
    private Vector _bpOneHalf;

    public static Action<Vector> UpdateRAV;
    private Vector _rav;


    public static Action<Vector> UpdateYin;
    private Vector _yin;

    public static Action<Vector> UpdateYang;
    private Vector _yang;

    public static Action<Vector, Vector> UpdateInfLink;
    private (Vector, Vector) _infLink;

    private const int RealPathLength = 100;

    void Awake()
    {
        _app = GameObject.Find("App").GetComponent<App>();
        _app.IndexChanged += OnIndexChanged;
        _app.RealChanged += OnRealChanged;
    }

    public double GetIndex()
    {
        return _app.Index;
    }

    public double GetReal()
    {
        return _app.Real;
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
        if(_rsInverseSumSpiral == null) CalcRsInverseSum(_app.Index, _app.Real);
        return _rsInverseSumSpiral.joints;
    }

    public Vector GetZps()
    {
        if(_zpsPos == null) CalcZps(_app.Index);
        return _zpsPos;
    }

    public (List<Vector>, int) GetRealPath()
    {
        if(_realPath == null) CalcRealPath(_app.Index);
        return (_realPath, _realPathIndexOne);
    }

    public Vector GetSymmetryPoint()
    {
        if(_symmetryPoint == null) CalcSymmetryPoint(_app.Index, _app.Real);
        return _symmetryPoint;
    }

    public Vector2[] GetSymmetryPath()
    {
        if(_symmetryPath == null) CalcSymmetryPath(_app.Index);
        return _symmetryPath;
    }

    public Vector GetBpOneHalf()
    {
        if(_bpOneHalf == null) CalcBpOneHalf(_app.Index);
        return _bpOneHalf;
    }

    public Vector GetRAV()
    {
        if(_rav == null) CalcRAV(_app.Index);
        return _rav;
    }

    public Vector GetInversePoint()
    {
        if(_inversePoint == null) CalcInversePoint(_app.Index, _app.Real);
        return _inversePoint;
    }

    public Vector2[] GetInverseSumPath()
    {
        if(_inverseSumPath == null) CalcInverseSumPath(_app.Index);
        return _inverseSumPath;
    }

    public Vector GetYin()
    {
        if(_yin == null) CalcYin(_app.Index, _app.Real);
        return _yin;
    }

    public Vector GetYang()
    {
        if(_yang == null) CalcYang(_app.Index, _app.Real);
        return _yang;
    }

    public (Vector, Vector) GetInfLink()
    {
        if(_infLink == (null, null)) CalcInfLink(_app.Index);
        return _infLink;
    }

    private void OnIndexChanged(double index)
    {
        Calculate(_app.Index, _app.Real);
        IndexChanged?.Invoke(index);
    }

    private void OnRealChanged(double real)
    {
        Calculate(_app.Index, _app.Real);
        RealChanged?.Invoke(real);
    }

    private void Calculate(double index, double real)
    {
        if(UpdateEms != null) CalcEms(real, index);
        else _emsSpiral = null;

        if(UpdateZrs != null) CalcZrs(index);
        else _zrsSpiral = null;

        if(UpdateEta != null) CalcEta(real, index);
        else _etaSpiral = null;

        if(UpdateRsInverseSum != null) CalcRsInverseSum(index, real);
        else _rsInverseSumSpiral = null;

        if(UpdateInversePoint != null) CalcInversePoint(index, real);
        else _inversePoint = null;

        if(UpdateInverseSumPath != null) CalcInverseSumPath(index);
        else _inverseSumPath = null;

        if(UpdateZps != null) CalcZps(index);
        else _zpsPos = null;

        if(UpdateRealPath != null) CalcRealPath(index);
        else _realPath = null;

        if(UpdateSymmetryPoint != null) CalcSymmetryPoint(index, real);
        else _symmetryPoint = null;

        if(UpdateSymmetryPath != null) CalcSymmetryPath(index);
        else _symmetryPath = null;

        if(UpdateBpOneHalf != null) CalcBpOneHalf(index);
        else _bpOneHalf = null;

        if(UpdateRAV != null) CalcRAV(index);
        else _rav = null;

        if(UpdateYin != null) CalcYin(index, real);
        else _yin = null;

        if(UpdateYang != null) CalcYang(index, real);
        else _yang = null;

        if(UpdateInfLink != null) CalcInfLink(index);
        else _infLink = (null, null);
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
        UpdateEms?.Invoke(_emsSpiral);
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
        UpdateZrs?.Invoke(_zrsSpiral);
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
        UpdateEta?.Invoke(_etaSpiral);
    }

    private void CalcRsInverseSum(double index, double real)
    {
        if(_rsInverseSumSpiral == null)
        {
            _rsInverseSumSpiral = new Zeta.Spiral(real, index, SpiralFormulas.RSInverseSum, _app.usingPolyImag);
        }
        else
        {
            _rsInverseSumSpiral.Update(real, index, SpiralFormulas.RSInverseSum, _app.usingPolyImag);
        }
        UpdateRsInverseSum?.Invoke(_rsInverseSumSpiral.joints);
    }

    private Vector CalcInversePoint(double index, double real)
    {
        var s = Mathf.Approximately((float)real, 0.5f) ? GetZrs() : GetEms();
        Vector[] rev = (Vector[])GetRsInverseSum().Clone();

        var z = s.zeta.ToVector();
        var normal = z.Normalized();
        var perpendicular = new Vector(-normal.y, normal.x);
    
        // get intersection of bisector and inverse link
        Vector intersectionPT = GetIntersection(s.joints[s.middleIndex], s.joints[s.middleIndex + 1], 
                                                    z + rev[s.middleIndex].Reflect(normal).Reflect(perpendicular), z + rev[s.middleIndex + 1].Reflect(normal).Reflect(perpendicular));
        _inversePoint = intersectionPT;
        UpdateInversePoint?.Invoke(_inversePoint);

        return intersectionPT;
    }

    private void CalcInverseSumPath(double index)
    {
        _inverseSumPath = new Vector2[RealPathLength];
        var pathlength = _inverseSumPath.Length;
        for(int i = 0; i < pathlength; i++)
        {
            var r = (float)i/pathlength;
            
            var s = new Zeta.Spiral(r, index, SpiralFormulas.EulerMaclauren, false);
            Vector[] rev = new Zeta.Spiral(r, index, SpiralFormulas.RSInverseSum, false).joints;

            var z = s.zeta.ToVector();
            var normal = z.Normalized();
            var perpendicular = new Vector(-normal.y, normal.x);
        
            // get intersection of bisector and inverse link
            Vector intersectionPT = GetIntersection(s.joints[s.middleIndex], s.joints[s.middleIndex + 1], 
                                                        z + rev[s.middleIndex].Reflect(normal).Reflect(perpendicular), z + rev[s.middleIndex + 1].Reflect(normal).Reflect(perpendicular));
            
            _inverseSumPath[i] = intersectionPT;
        }
        UpdateInverseSumPath?.Invoke(_inverseSumPath);
    }

    private Vector GetIntersection(Vector p1, Vector p2, Vector q1, Vector q2)
    {
        double a1 = p2.y - p1.y;
        double b1 = p1.x - p2.x;
        double c1 = a1 * p1.x + b1 * p1.y;

        double a2 = q2.y - q1.y;
        double b2 = q1.x - q2.x;
        double c2 = a2 * q1.x + b2 * q1.y;

        double delta = a1 * b2 - a2 * b1;
        if (Mathf.Approximately((float)delta, 0))
        {
            throw new InvalidOperationException("Lines are parallel and do not intersect.");
        }

        double x = (b2 * c1 - b1 * c2) / delta;
        double y = (a1 * c2 - a2 * c1) / delta;
        return new Vector(x, y);
    }

    private void CalcZps(double index)
    {
        _zpsPos = BisectorPoint.GetZPS(index);
        UpdateZps?.Invoke(_zpsPos);
    }

    private void CalcRealPath(double index)
    {
        _realPath = new List<Vector>();
        _realPathIndexOne = 0;

        for(int i = 0; i <= 10; i++)
        {
            var ptCount = 100 / (i + 1);
            for(int j = 0; j < ptCount; j++)
            {
                var r = i + (float)j/ptCount;
                var spiral = new Zeta.Spiral(r, index, SpiralFormulas.EulerMaclauren, false);
                _realPath.Add(spiral.zeta.ToVector());
            }

            if(i == 0 && _realPathIndexOne == 0) _realPathIndexOne = _realPath.Count;
        }

        UpdateRealPath?.Invoke(_realPath, _realPathIndexOne);
    }

    private void CalcSymmetryPoint(double index, double real)
    {
        _symmetryPoint = BisectingLines.CrotchPoint(GetEms());
        UpdateSymmetryPoint?.Invoke(_symmetryPoint);
    }

    private void CalcSymmetryPath(double index)
    {
        _symmetryPath = new Vector2[RealPathLength];
        var pathlength = _symmetryPath.Length;
        for(int i = 0; i < pathlength; i++)
        {
            var r = (float)i/pathlength;
            var s = new Zeta.Spiral(r, index, SpiralFormulas.EulerMaclauren, false);

            _symmetryPath[i] = BisectingLines.CrotchPoint(s);
        }
        UpdateSymmetryPath?.Invoke(_symmetryPath);
    }

    private void CalcBpOneHalf(double index)
    {
        _bpOneHalf = BisectorPoint.BpOneHalf(index);
        UpdateBpOneHalf?.Invoke(_bpOneHalf);
    }

    private void CalcRAV(double index)
    {
        var bp = GetBpOneHalf();
        _rav = BisectorPoint.RightAngleVertex(bp, index);
        UpdateRAV?.Invoke(_rav);
    }

    private void CalcYin(double index, double real)
    {
        _yin = MiddleLinkTeardrop.Yin(index);
        UpdateYin?.Invoke(_yin);
    }

    private void CalcYang(double index, double real)
    {
        _yang = MiddleLinkTeardrop.Yang(index);
        UpdateYang?.Invoke(_yang);
    }

    private void CalcInfLink(double index)
    {
        var normIndex = index - (int)Math.Floor(index);
        _infLink = (Zeta.InfinityTdrop(1-normIndex, false) + new Vector(-0.5f, 0), Zeta.InfinityTdrop(normIndex, true) + new Vector(0.5f, 0));
        UpdateInfLink?.Invoke(_infLink.Item1, _infLink.Item2);
    }

    public Vector[] Chi(int numLinks, double real, double index)
    {
        Vector Mult(Vector a, Vector b) => new Vector(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
        double Xmod2(double real, double index) => Math.Pow(Math.PI, real - 0.5) * Math.Pow(Zeta.IndexToImag(index) / 2.0, (1.0-2.0*real) / 2.0) * (1.0 + (1.0/(12.0*Zeta.IndexToImag(index)) * (1.0 - 2.0*real) * (3.0 - 2.0*real)));
        double Theta(double imag)
        {
            return (imag / 2 * Math.Log(imag / (2 * Math.PI)) - imag / 2 - Math.PI / 8 +
                    1 / (48 * imag) +
                    7 / (5760 * Math.Pow(imag, 3)) +
                    31 / (80640 * Math.Pow(imag, 5)) +
                    127 / (430080 * Math.Pow(imag, 7)) +
                    511 / (1216512 * Math.Pow(imag, 9)));
        }
        double deltal(double g, double t)
        {
            return - Math.Pow(g,2)/(6*Math.Pow(t,2))
                    - 11*Math.Pow(g,4)/(360*Math.Pow(t,4))
                    - 17*Math.Pow(g,6)/(1260*Math.Pow(t,6))
                    - 31*Math.Pow(g,8)/(10080*Math.Pow(t,8));
        }
        double Xarg(double real, double index) => -2*Theta(Zeta.IndexToImag(index)) + deltal(real - 0.5, Zeta.IndexToImag(index));

        var imag = Zeta.IndexToImag(index);
        var xArg = Xarg(real, index);
        var xMod2 = Xmod2(real, index);

        Vector[] joints = new Vector[numLinks];
        joints[0] = new Vector(0,0);
        for(int n = 1; n < joints.Length; n++)
        {
            var denom = Math.Pow(n, 1.0-real);
            var logn = Math.Log(n);
            var joint = new Vector(Math.Cos(imag * logn) / denom, Math.Sin(imag * logn) / denom);
            var a = new Vector(xMod2 * Math.Cos(xArg), xMod2 * Math.Sin(xArg));
            joints[n] = joints[n - 1] + Mult(a, joint);
        }

        return joints;
    }
}
