using System;
using System.Collections.Generic;
using System.Numerics;
using UnityEngine;
using Vector2 = UnityEngine.Vector2;


public class SpiralCalculator : MonoBehaviour
{
    private App _app;

    public static Action<double> IndexChanged;
    public static Action<double> RealChanged;

    public static Action<int> ExtendSpiralChanged;

    public static Action<Zeta.Spiral> UpdateEms;
    private Zeta.Spiral _emsSpiral;
    public static Action <Vector> UpdateZem;
    private Vector _zemPos;
    public static Action<Zeta.Spiral> UpdateZrs;
    private Zeta.Spiral _zrsSpiral;
    
    public static Action<Zeta.Spiral> UpdateEta;
    private Zeta.Spiral _etaSpiral;

    #region Forward
    public static Action<Vector> UpdateForwardBisector;
    private Vector _forwardBisector;
    public static Action<Vector2[]> UpdateForwardBisectorPath;
    private Vector2[] _forwardBisectorPath;
    #endregion
    #region Inverse
    public static Action<Vector[]> UpdateRsInverseSum;
    private Zeta.Spiral _rsInverseSumSpiral;
    public static Action<Vector2[]> UpdateInverseSumPath;
    private Vector2[] _inverseSumPath;
    public static Action<Vector> UpdateInverseBisector;
    private Vector _inverseBisector;
    public static Action<Vector2[]> UpdateInverseBisectorPath;
    private Vector2[] _inverseBisectorPath;
    public static Action<Vector> UpdateInverseReflectedBisector;
    private Vector _inverseReflectedBisector;
    public static Action<Vector2[]> UpdateInverseReflectedBisectorPath;
    private Vector2[] _inverseRelfectedBisectorPath;

    public static Action<Vector[]> UpdateChi;
    private Vector[] _chiSpiral;
    #endregion

    public static Action<Vector> UpdateZps;
    private Vector _zpsPos;
    public static Action <Vector> UpdateZetaPS;
    private Vector _zetaPS;

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


    public static Action<(Vector yin, Vector yang)> UpdateYinYangSpecial;
    private (Vector yin, Vector yang) _yinYangSpecial;

    public static Action<(Vector yin, Vector yang)> UpdateYinYang;
    private (Vector yin, Vector yang) _yinYang;

    public static Action<Vector, Vector> UpdateInfLink;
    private (Vector, Vector) _infLink;

    private const int RealPathLength = 100;

    void Awake()
    {
        _app = GameObject.Find("App").GetComponent<App>();
        _app.IndexChanged += OnIndexChanged;
        _app.RealChanged += OnRealChanged;
        ExtendSpiralChanged += OnExtendSpiralChanged;
    }

    public double GetIndex()
    {
        return _app.Index;
    }

    public double GetReal()
    {
        return _app.Real;
    }

    public Zeta.Spiral GetSpiral()
    {
        return Mathf.Approximately((float)GetReal(), 0.5f) ? GetZrs() : GetEms();
    }

    public Zeta.Spiral GetEms()
    {
        if(_emsSpiral == null) CalcEms(_app.Real, _app.Index);
        return _emsSpiral;
    }

    public Vector GetZem()
    {
        if(_zemPos == null) CalcZem(_app.Real, _app.Index);
        return _zemPos;
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

    public Vector[] GetChi()
    {
        if(_chiSpiral == null) CalcChi(_app.Index, _app.Real);
        return _chiSpiral;
    }

    public Vector GetZps()
    {
        if(_zpsPos == null) CalcZps(_app.Index);
        return _zpsPos;
    }

    public Vector GetZetaPS()
    {
        if(_zetaPS == null) CalcZetaPS();
        return _zetaPS;
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

    public Vector GetForwardBisector()
    {
        if(_forwardBisector == null) CalcForwardBisector();
        return _forwardBisector;
    }

    public Vector2[] GetForwardBisectorPath()
    {
        if(_forwardBisectorPath == null) CalcForwardBisectorPath();
        return _forwardBisectorPath;
    }

    public Vector GetInverseBisector()
    {
        if(_inverseBisector == null) CalcInverseBisector();
        return _inverseBisector;
    }

    public Vector2[] GetInverseBisectorPath()
    {
        if(_inverseBisectorPath == null) CalcInverseBisectorPath();
        return _inverseBisectorPath;
    }

    public Vector GetInverseReflectedBisector()
    {
        if(_inverseReflectedBisector == null) CalcInverseReflectedBisector();
        return _inverseReflectedBisector;
    }

    public Vector2[] GetInverseReflectedBisectorPath()
    {
        if(_inverseRelfectedBisectorPath == null) CalcInverseReflectedBisectorPath();
        return _inverseRelfectedBisectorPath;
    }

    public (Vector yin, Vector yang) GetYinYangSpecial()
    {
        if(_yinYangSpecial.yin == null) CalcYinYangSpecial(_app.Index);
        return _yinYangSpecial;
    }

    public (Vector yin, Vector yang) GetYinYang()
    {
        if(_yinYang.yin == null) CalcYinYang(_app.Index, _app.Real, GetYinYangSpecial());
        return _yinYang;
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

    private void OnExtendSpiralChanged(int extendSpiral)
    {
        if(_emsSpiral != null)
        {
            _emsSpiral.extendSpiralCount = extendSpiral;
            _emsSpiral.Update(_app.Real, _app.Index, SpiralFormulas.EulerMaclauren, _app.usingPolyImag);
        }

        if(_zrsSpiral != null)
        {
            _zrsSpiral.extendSpiralCount = extendSpiral;
            _zrsSpiral.Update(0.5, _app.Index, SpiralFormulas.ReimannSiegel, _app.usingPolyImag);
        }

        if(_etaSpiral != null)
        {
            _etaSpiral.extendSpiralCount = extendSpiral;
            _etaSpiral.Update(_app.Real, _app.Index, SpiralFormulas.EtaFormula, _app.usingPolyImag);
        }

        if(_rsInverseSumSpiral != null)
        {
            _rsInverseSumSpiral.extendSpiralCount = extendSpiral;
            _rsInverseSumSpiral.Update(_app.Real, _app.Index, SpiralFormulas.RSInverseSum, _app.usingPolyImag);
        }

        if(_chiSpiral != null)
        {
            CalcChi(_app.Index, _app.Real);
        }
    }

    private void Calculate(double index, double real)
    {
        if(UpdateEms != null) CalcEms(real, index);
        else _emsSpiral = null;

        if(UpdateZem != null) CalcZem(real, index);
        else _zemPos = null;

        if(UpdateZrs != null) CalcZrs(index);
        else _zrsSpiral = null;

        if(UpdateEta != null) CalcEta(real, index);
        else _etaSpiral = null;

        if(UpdateForwardBisector != null) CalcForwardBisector();
        else _forwardBisector = null;

        if(UpdateForwardBisectorPath != null) CalcForwardBisectorPath();
        else _forwardBisectorPath = null;

        if(UpdateRsInverseSum != null) CalcRsInverseSum(index, real);
        else _rsInverseSumSpiral = null;

        if(UpdateInverseBisector != null) CalcInverseBisector();
        else _inverseBisector = null;

        if(UpdateInverseSumPath != null) CalcInverseBisectorPath();
        else _inverseSumPath = null;

        if(UpdateInverseReflectedBisector != null) CalcInverseReflectedBisector();
        else _inverseReflectedBisector = null;

        if(UpdateInverseReflectedBisectorPath != null) CalcInverseReflectedBisectorPath();
        else _inverseRelfectedBisectorPath = null;

        if(UpdateChi != null) CalcChi(index, real);
        else _chiSpiral = null;

        if(UpdateZps != null) CalcZps(index);
        else _zpsPos = null;

        if(UpdateZetaPS != null) CalcZetaPS();
        else _zetaPS = null;

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

        if(UpdateYinYangSpecial != null) CalcYinYangSpecial(index);
        else _yinYangSpecial = (null, null);

        if(UpdateYinYang != null) CalcYinYang(index, real, GetYinYangSpecial());
        else _yinYang = (null, null);

        if(UpdateInfLink != null) CalcInfLink(index);
        else _infLink = (null, null);
    }

    private void CalcEms(double real, double index)
    {
        if(_emsSpiral == null)
        {
            _emsSpiral = new Zeta.Spiral(real, index, SpiralFormulas.EulerMaclauren, _app.usingPolyImag);
            if(_app._extendSpiral > 0)
            {
                _emsSpiral.extendSpiralCount = _app._extendSpiral;
                _emsSpiral.Update(real, index, SpiralFormulas.EulerMaclauren, _app.usingPolyImag); // only have to do this if the spiral starts on in the app.
            }
        }
        else
        {
            _emsSpiral.extendSpiralCount = _app._extendSpiral;
            _emsSpiral.Update(real, index, SpiralFormulas.EulerMaclauren, _app.usingPolyImag);
        }
        UpdateEms?.Invoke(_emsSpiral);
    }

    private void CalcZem(double real, double index)
    {
        var c = new Complex(real, Zeta.IndexToImag(index));
        _zemPos = Zeta.Zem5(c).ToVector();
        UpdateZem?.Invoke(_zemPos);
    }

    private void CalcZrs(double index)
    {
        if(_zrsSpiral == null)
        {
            _zrsSpiral = new Zeta.Spiral(0.5, index, SpiralFormulas.ReimannSiegel, _app.usingPolyImag);
            _zrsSpiral.extendSpiralCount = _app._extendSpiral;
        }
        else
        {
            _zrsSpiral.extendSpiralCount = _app._extendSpiral;
            _zrsSpiral.Update(0.5, index, SpiralFormulas.ReimannSiegel, _app.usingPolyImag);
        }
        UpdateZrs?.Invoke(_zrsSpiral);
    }

    private void CalcEta(double real, double index)
    {
        if(_etaSpiral == null)
        {
            _etaSpiral = new Zeta.Spiral(real, index, SpiralFormulas.EtaFormula, _app.usingPolyImag);
            _etaSpiral.extendSpiralCount = _app._extendSpiral;
        }
        else
        {
            _etaSpiral.extendSpiralCount = _app._extendSpiral;
            _etaSpiral.Update(real, index, SpiralFormulas.EtaFormula, _app.usingPolyImag);
        }
        UpdateEta?.Invoke(_etaSpiral);
    }

    private void CalcForwardBisector()
    {
        // var s = Mathf.Approximately((float)GetReal(), 0.5f) ? GetZrs() : GetEms();
        // var links = s.joints;
        // var midLink = links[s.middleIndex + 1] - links[s.middleIndex];
        // _forwardBisector = links[s.middleIndex] + midLink * (float)BisectorPoint.Djoint(GetIndex());
        // UpdateForwardBisector?.Invoke(_forwardBisector);

        var real = GetReal();
        var index = GetIndex();
        var imag = Zeta.IndexToImag(index);
        _forwardBisector = ZpsGeneral.ForwardBisector(real, index, imag, ChiBrian(new Complex(real, imag)));
        UpdateForwardBisector?.Invoke(_forwardBisector);
    }

    public static float GetForwardBisectorAngle(double r, double index)
    {
        var s = new Zeta.Spiral(r, index, SpiralFormulas.EulerMaclauren, false);
        var links = s.joints;
        var midLink = links[s.middleIndex + 1] - links[s.middleIndex];
        var forwardBisector = links[s.middleIndex] + midLink * (float)BisectorPoint.Djoint(index);
        
        // get the signed angle between the forward bisector and the zeta
        Vector2 zetaVector = s.zeta.ToVector().Normalized();
        Vector2 bisectorVector = forwardBisector.Normalized();
        // find the angle between intersectionPT and zeta
        var angle = Vector2.SignedAngle(zetaVector, bisectorVector);
        return angle;
    }

    private void CalcForwardBisectorPath()
    {
        _forwardBisectorPath = new Vector2[RealPathLength];
        var pathlength = _forwardBisectorPath.Length;
        for(int i = 0; i < pathlength - 1; i++)
        {
            var r = (float)i/pathlength;
            _forwardBisectorPath[i] = RhombusPoints.GetBPForward(r, GetIndex());
        }
        _forwardBisectorPath[RealPathLength - 1] = RhombusPoints.GetBPForward(1.0, GetIndex());
        UpdateForwardBisectorPath?.Invoke(_forwardBisectorPath);
    }

    private void CalcRsInverseSum(double index, double real)
    {
        if(_rsInverseSumSpiral == null)
        {
            _rsInverseSumSpiral = new Zeta.Spiral(real, index, SpiralFormulas.RSInverseSum, _app.usingPolyImag);
            _rsInverseSumSpiral.extendSpiralCount = _app._extendSpiral;
        }
        else
        {
            _rsInverseSumSpiral.extendSpiralCount = _app._extendSpiral;
            _rsInverseSumSpiral.Update(real, index, SpiralFormulas.RSInverseSum, _app.usingPolyImag);
        }
        UpdateRsInverseSum?.Invoke(_rsInverseSumSpiral.joints);
    }

    private void CalcChi(double index, double real)
    {
        var s = Mathf.Approximately((float)real, 0.5f) ? GetZrs() : GetEms();
        // _chiSpiral = Chi(s.numLinks + _app._extendSpiral, real, index);
        _chiSpiral = ChiJoints(s.numLinks + _app._extendSpiral, new Complex(real, Zeta.IndexToImag(index)));
        UpdateChi?.Invoke(_chiSpiral);
    }

    private void CalcInverseBisector()
    {
        // var spiral = Mathf.Approximately((float)GetReal(), 0.5f) ? GetZrs() : GetEms();
        // var links = GetRsInverseSum();
        // var midLink = links[spiral.middleIndex + 1] - links[spiral.middleIndex];
        // _inverseBisector = links[spiral.middleIndex] + midLink * (float)BisectorPoint.Djoint(GetIndex());
        // UpdateInverseBisector?.Invoke(_inverseBisector);
        
        var index = GetIndex();
        var real = GetReal();
        _inverseBisector = ZpsGeneral.InverseBisector(real, index, Zeta.IndexToImag(index), ChiBrian);
        UpdateInverseBisector?.Invoke(_inverseBisector);
    }

    private Vector CalcInverseReflectedBisector()
    {
        var s = Mathf.Approximately((float)GetReal(), 0.5f) ? GetZrs() : GetEms();
        Vector[] rev = (Vector[])GetRsInverseSum().Clone();

        var z = s.zeta.ToVector();
        // var z = GetForwardBisector() + GetInverseBisector();
        var normal = z.Normalized();
        var perpendicular = new Vector(-normal.y, normal.x);
    
        // get intersection of bisector and inverse link
        Vector intersectionPT = GetIntersection(s.joints[s.middleIndex], s.joints[s.middleIndex + 1], 
                                                    z + rev[s.middleIndex].Reflect(normal).Reflect(perpendicular), z + rev[s.middleIndex + 1].Reflect(normal).Reflect(perpendicular));
        _inverseReflectedBisector = intersectionPT;
        UpdateInverseReflectedBisector?.Invoke(_inverseReflectedBisector);

        return _inverseReflectedBisector;
    }

    private void CalcInverseBisectorPath()
    {
        var index = GetIndex();
        _inverseBisectorPath = new Vector2[RealPathLength];
        var pathlength = _inverseBisectorPath.Length;
        for(int i = 0; i < pathlength - 1; i++)
        {
            var r = (float)i/pathlength;
            _inverseBisectorPath[i] = RhombusPoints.GetBPInverse(r, index);
        }
        _inverseBisectorPath[RealPathLength - 1] = RhombusPoints.GetBPInverse(1.0, index);
        UpdateInverseSumPath?.Invoke(_inverseBisectorPath);
    }

    public static Vector InverseReflectedIntersection(double r, double index)
    {
        var s = new Zeta.Spiral(r, index, SpiralFormulas.EulerMaclauren, false);
        Vector[] rev = new Zeta.Spiral(r, index, SpiralFormulas.RSInverseSum, false).joints;

        var z = s.zeta.ToVector();
        var normal = z.Normalized();
        var perpendicular = new Vector(-normal.y, normal.x);
    
        // get intersection of bisector and inverse link
        Vector intersectionPT = GetIntersection(s.joints[s.middleIndex], s.joints[s.middleIndex + 1], 
                                                    z + rev[s.middleIndex].Reflect(normal).Reflect(perpendicular), z + rev[s.middleIndex + 1].Reflect(normal).Reflect(perpendicular));

        return intersectionPT;
    }

    public static float GetInverseReflectedAngle(double r, double index)
    {
        var s = new Zeta.Spiral(r, index, SpiralFormulas.EulerMaclauren, false);
        Vector[] rev = new Zeta.Spiral(r, index, SpiralFormulas.RSInverseSum, false).joints;

        var z = s.zeta.ToVector();
        var normal = z.Normalized();
        var perpendicular = new Vector(-normal.y, normal.x);
    
        // get intersection of bisector and inverse link
        Vector intersectionPT = GetIntersection(s.joints[s.middleIndex], s.joints[s.middleIndex + 1], 
                                                    z + rev[s.middleIndex].Reflect(normal).Reflect(perpendicular), z + rev[s.middleIndex + 1].Reflect(normal).Reflect(perpendicular));
        
        Vector2 zetaVector = s.zeta.ToVector().Normalized();
        Vector2 bisectorVector = intersectionPT.Normalized();
        // find the angle between intersectionPT and zeta
        var angle = Vector2.SignedAngle(zetaVector, bisectorVector);

        return (float)angle;
    }

    private void CalcInverseReflectedBisectorPath()
    {
        _inverseRelfectedBisectorPath = new Vector2[RealPathLength];
        var pathlength = _inverseRelfectedBisectorPath.Length;
        for(int i = 0; i < pathlength; i++)
        {
            var r = (float)i/pathlength;
            
            var s = new Zeta.Spiral(r, GetIndex(), SpiralFormulas.EulerMaclauren, false);
            Vector[] rev = new Zeta.Spiral(r, GetIndex(), SpiralFormulas.RSInverseSum, false).joints;

            var z = s.zeta.ToVector();
            var normal = z.Normalized();
            var perpendicular = new Vector(-normal.y, normal.x);
        
            // get intersection of bisector and inverse link
            Vector intersectionPT = GetIntersection(s.joints[s.middleIndex], s.joints[s.middleIndex + 1], 
                                                        z + rev[s.middleIndex].Reflect(normal).Reflect(perpendicular), z + rev[s.middleIndex + 1].Reflect(normal).Reflect(perpendicular));
            
            _inverseRelfectedBisectorPath[i] = intersectionPT;
            // _inverseRelfectedSumPath[i] = RealPaths.GetBPForward(r, GetIndex());
        }
        UpdateInverseReflectedBisectorPath?.Invoke(_inverseRelfectedBisectorPath);
    }

    private static Vector GetIntersection(Vector p1, Vector p2, Vector q1, Vector q2)
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

    private void CalcZetaPS()
    {
        var v = GetForwardBisector() + GetInverseBisector();
        _zetaPS = new Vector(v.x, v.y);
        UpdateZetaPS?.Invoke(_zetaPS);
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
        for(int i = 0; i < pathlength - 1; i++)
        {
            var r = (float)i/pathlength;
            // var s = new Zeta.Spiral(r, index, SpiralFormulas.EulerMaclauren, false);

            // _symmetryPath[i] = BisectingLines.CrotchPoint(s);
            _symmetryPath[i] = RhombusPoints.GetBPSymmetry(r, index);
        }
        _symmetryPath[RealPathLength - 1] = RhombusPoints.GetBPSymmetry(1.0, index);
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

    private void CalcYinYangSpecial(double index)
    {
        _yinYangSpecial = (ZpsGeneral.YinSpecial(index), ZpsGeneral.YangSpecial(index));
        UpdateYinYangSpecial?.Invoke(_yinYangSpecial);
    }

    private void CalcYinYang(double index, double real, (Vector yin, Vector yang) yySpecial)
    {
        Complex chi = ChiBrian(new Complex(real, Zeta.IndexToImag(index)));
        _yinYang = ZpsGeneral.YinYang(real, index, chi, yySpecial.yin, yySpecial.yang);

        UpdateYinYang?.Invoke(_yinYang);
    }

    private void CalcInfLink(double index)
    {
        var normIndex = index - (int)Math.Floor(index);
        _infLink = (Zeta.InfinityTdrop(1-normIndex, false) + new Vector(-0.5f, 0), Zeta.InfinityTdrop(normIndex, true) + new Vector(0.5f, 0));
        UpdateInfLink?.Invoke(_infLink.Item1, _infLink.Item2);
    }

    // chat gpt approximation
    // private Vector[] Chi(int numLinks, double real, double index)
    // {
    //     Vector Mult(Vector a, Vector b) => new Vector(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
    //     double Xmod2(double real, double index) => Math.Pow(Math.PI, real - 0.5) * Math.Pow(Zeta.IndexToImag(index) / 2.0, (1.0-2.0*real) / 2.0) * (1.0 + (1.0/(12.0*Zeta.IndexToImag(index)) * (1.0 - 2.0*real) * (3.0 - 2.0*real)));
    //     double Theta(double imag)
    //     {
    //         return (imag / 2 * Math.Log(imag / (2 * Math.PI)) - imag / 2 - Math.PI / 8 +
    //                 1 / (48 * imag) +
    //                 7 / (5760 * Math.Pow(imag, 3)) +
    //                 31 / (80640 * Math.Pow(imag, 5)) +
    //                 127 / (430080 * Math.Pow(imag, 7)) +
    //                 511 / (1216512 * Math.Pow(imag, 9)));
    //     }
    //     double deltal(double g, double t)
    //     {
    //         return - Math.Pow(g,2)/(6*Math.Pow(t,2))
    //                 - 11*Math.Pow(g,4)/(360*Math.Pow(t,4))
    //                 - 17*Math.Pow(g,6)/(1260*Math.Pow(t,6))
    //                 - 31*Math.Pow(g,8)/(10080*Math.Pow(t,8));
    //     }
    //     double Xarg(double real, double index) => -2*Theta(Zeta.IndexToImag(index)) + deltal(real - 0.5, Zeta.IndexToImag(index));

    //     var imag = Zeta.IndexToImag(index);
    //     var xArg = Xarg(real, index);
    //     var xMod2 = Xmod2(real, index);

    //     Vector[] joints = new Vector[numLinks];
    //     joints[0] = new Vector(0,0);
    //     for(int n = 1; n < joints.Length; n++)
    //     {
    //         var denom = Math.Pow(n, 1.0-real);
    //         var logn = Math.Log(n);
    //         var joint = new Vector(Math.Cos(imag * logn) / denom, Math.Sin(imag * logn) / denom);
    //         var a = new Vector(xMod2 * Math.Cos(xArg), xMod2 * Math.Sin(xArg));
    //         joints[n] = joints[n - 1] + Mult(a, joint);
    //     }

    //     return joints;
    // }

    // Evaluate the chi(s) function for a given complex number s
    public static Complex ChiBrian(Complex s)
    {
        double pi = Math.PI;
        Complex i = Complex.ImaginaryOne;

        // Basic components
        double absS = s.Magnitude;
        double arg = Math.Atan2(s.Real, s.Imaginary);
        
        // (|s| / 2π)^(s - 1/2)
        Complex baseTerm = absS / (2 * pi);
        Complex exponent = s - 0.5;
        Complex term1 = Complex.Pow(baseTerm, exponent);

        // e^(-s)
        Complex term2 = Complex.Exp(-s);

        // e^{imag(s) * arctan(real/imag)}
        Complex term3 = Complex.Exp(s.Imaginary * arg);

        // e^{-i * real * arctan(real/imag)}
        Complex term4 = Complex.Exp(-i * s.Real * arg);

        // 1 + e^{-π * imag} * e^{π i * real}
        Complex term5 = 1 + Complex.Exp(-pi * s.Imaginary) * Complex.Exp(i * pi * s.Real);

        // e^{i/2 * arctan(real/imag)}
        Complex term6 = Complex.Exp((i / 2.0) * arg);

        // e^{-π i / 4}
        Complex term7 = Complex.Exp(-i * pi / 4.0);

        // (1 + 1/(12s) + 1/(288s^2))
        Complex term8 = 1 + (1.0 / (12 * s)) + (1.0 / (288 * s * s));

        // Final expression
        Complex denominator = term1 * term2 * term3 * term4 * term5 * term6 * term7 * term8;
        Complex chi = 1.0 / denominator;

        return chi;
    }

    private Vector[] ChiJoints(int numLinks, Complex s)
    {
        // Apply the approximation to each joint
        Vector[] joints = new Vector[numLinks + 1];
        Complex sum2 = Complex.Zero;
        joints[0] = sum2.ToVector();
        for (int n = 1; n <= numLinks; n++)
        {
            Complex next = Complex.Pow(n, s - 1) * ChiBrian(s);
            sum2 += next;
            joints[n] = sum2.ToVector();
        }

        return joints;
    }

    private Vector[] ChiTitchmarsh(int numLinks, Complex s)
    {
        // Stirling log-gamma terms
        Complex logGammaHalfS = StirlingApproximation(s / 2.0);
        Complex logGammaHalfOneMinusS = StirlingApproximation((1.0 - s) / 2.0);

        // log(π^{s - 1/2}) = (s - 0.5) * log(π)
        Complex logPiTerm = (s - 0.5) * Complex.Log(Math.PI);

        // Final log chi
        Complex logChi = logPiTerm + logGammaHalfOneMinusS - logGammaHalfS;
        Complex chiStirling = Complex.Exp(logChi);


        // Apply the approximation to each joint
        Vector[] joints = new Vector[numLinks + 1];
        Complex sum2 = Complex.Zero;
        joints[0] = sum2.ToVector();
        for (int n = 1; n <= numLinks; n++)
        {
            Complex next = Complex.Pow(n, s - 1) * chiStirling;
            sum2 += next;
            joints[n] = sum2.ToVector();
        }

        return joints;
    }

    public static Complex StirlingApproximation(Complex z)
    {
        // // Stirling's approximation: ln(Γ(z)) ≈ (z - 0.5) * ln(z) - z + 0.5 * ln(2π)

        Complex logTwoPi = Complex.Log(2.0 * Math.PI);
        Complex logZ = Complex.Log(z);
        Complex result = (z - 0.5) * logZ - z + 0.5 * logTwoPi;

        // Correction terms (Bernoulli numbers / Stirling series)
        Complex z2 = z * z;
        Complex z3 = z2 * z;
        Complex z5 = z3 * z2;
        Complex z7 = z5 * z2;

        result += 1.0 / (12.0 * z);
        result -= 1.0 / (360.0 * z3);
        result += 1.0 / (1260.0 * z5);
        result -= 1.0 / (1680.0 * z7);

        return result;
    }
}
