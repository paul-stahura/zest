using System;
using System.Numerics;
using Shapes;
using UnityEngine;
using Vector2 = UnityEngine.Vector2;
using UnityEngine.UI;
using Vector3 = UnityEngine.Vector3;
using System.Collections.Generic;
using System.Linq;

public class SumRemainderRenderer : ImmediateModeShapeDrawer
{
    [SerializeField] private Toggle _zakR1Toggle;
    [SerializeField] private Color _zakR1Color = Color.green;
    [SerializeField] private Toggle _zakR2Toggle;
    [SerializeField] private Color _zakR2Color = Color.green;
    [SerializeField] private Toggle _zpsR1Toggle;
    [SerializeField] private Color _zpsR1Color = Color.red;
    [SerializeField] private Toggle _zpsR2Toggle;
    [SerializeField] private Color _zpsR2Color = Color.red;

    private App _app;
    private static double _real;
    private static double _index;
    private static bool _remaindersUpdated = false;

    private Vector2 _zakR1;
    private Vector2 _zakR2;
    private Vector2 _zpsR1;
    private Vector2 _zpsR2;

    private SpiralCalculator _spiralCalculator;

    void Awake()
    {
        _app = GameObject.Find("App").GetComponent<App>();
        _app.IndexChanged += OnIndexChanged;
        _app.RealChanged += OnRealChanged;

        _real = _app.Real;
        _index = _app.Index;
    }

    void Update()
    {
        // if (Input.GetKeyDown(KeyCode.F))
        // {
        //     Vector currentStep = new Vector(_real, _index);
        //     currentStep.y += 0.0001;

        //     FindNextZakZeroConverge(ref currentStep, indexStep: 0.00001, realStep: 0.01, realMin: 0.0, magTolerance: 1e-5);
        //     _app.Real = currentStep.x;
        //     _app.Index = currentStep.y;
        // }
    }
    
    static Complex Rak1(double r, double i) => SumRemainders.CalcZakR1(r, i);
    static Complex Sum1(double r, double i) => SumRemainders.CalcForwardSumUpToBisector(r, i);
    static double Magnitude(double r, double i) => (Rak1(r, i) + Sum1(r, i)).Magnitude;

    private static Vector FindNextZakZeroConverge(ref Vector currentStep, double indexStep, double realStep, double realMin, double magTolerance)
    {
        // start at real 1.0 and reduce it until sum1 and rak1 converge
        // when they converge, if the magnitudes are similar and the dot product is negative
        // we have found a zero

        // take a step in index
        currentStep.y += indexStep;

        // set the real to max
        // 1.0 is always max since we cant have zeros with real > 1
        currentStep.x = 1.0;

        // recalculate rak1 and sum1 at the new index
        Complex rak1 = Rak1(currentStep.x, currentStep.y);
        Complex sum1 = Sum1(currentStep.x, currentStep.y);

        double last_cross = Vector3.Cross(rak1.ToVector2().normalized, sum1.ToVector2().normalized).z;
        bool isLastRakGreaterThanSum = rak1.Magnitude > sum1.Magnitude;

        bool passedZero = false;
        while (!passedZero)
        {
            // reduce the real by a small step
            currentStep.x -= realStep;

            if (currentStep.x < realMin)
            {
                // we have reached the minimum real without converging
                // reset the real and take a step in index
                currentStep.x = 1.0;
                currentStep.y += indexStep;

                rak1 = Rak1(currentStep.x, currentStep.y);
                sum1 = Sum1(currentStep.x, currentStep.y);
                last_cross = Vector3.Cross(rak1.ToVector2().normalized, sum1.ToVector2().normalized).z;
                isLastRakGreaterThanSum = rak1.Magnitude > sum1.Magnitude;
                continue;
            }

            // recalculate rak1 and sum1 at the new real
            rak1 = Rak1(currentStep.x, currentStep.y);
            sum1 = Sum1(currentStep.x, currentStep.y);

            // take the new dot product
            double dot = Vector3.Dot(rak1.ToVector2().normalized, sum1.ToVector2().normalized);
            double new_cross = Vector3.Cross(rak1.ToVector2().normalized, sum1.ToVector2().normalized).z;
            bool isRakGreaterThanSum = rak1.Magnitude > sum1.Magnitude;

            // if the cross changed sign, and the dot is negative, we have a good angle for a zero
            if (Math.Sign(new_cross) != Math.Sign(last_cross) && dot < 0)
            {
                // last we need to check if rak1 has just passed sum1 in magnitude
                if (isRakGreaterThanSum != isLastRakGreaterThanSum || magTolerance > Math.Abs(rak1.Magnitude - sum1.Magnitude))
                {
                    currentStep = RefineZero(currentStep.y - indexStep, currentStep.y + 0.001, currentStep.x, currentStep.x + 0.3);
                    passedZero = true;
                }
            }

            // update for next loop
            last_cross = new_cross;
            isLastRakGreaterThanSum = isRakGreaterThanSum;
        }

        // zero found
        return currentStep;
    }

    public static Vector RefineZero(double indexMin, double indexMax,
                                double realMin, double realMax,
                                int gridR = 20, int gridI = 20,
                                int averageCount = 5,
                                int passes = 3,
                                double shrinkFactor = 0.2)
    {
        double magTolerance = 1e-10;

        double rMin = realMin;
        double rMax = realMax;
        double iMin = indexMin;
        double iMax = indexMax;

        var finalTop = new List<(double mag, double r, double i)>();

        for (int pass = 0; pass < passes; pass++)
        {
            var candidates = new List<(double mag, double r, double i)>();

            for (int ri = 0; ri < gridR; ri++)
            {
                double r = rMin + (rMax - rMin) * ri / (gridR - 1);
                for (int ii = 0; ii < gridI; ii++)
                {
                    double idx = iMin + (iMax - iMin) * ii / (gridI - 1);
                    double mag = Magnitude(r, idx);
                    candidates.Add((mag, r, idx));
                }
            }

            // sort by magnitude
            candidates.Sort((a, b) => a.mag.CompareTo(b.mag));

            // store top few for next centering
            finalTop = candidates.Take(Math.Min(averageCount, candidates.Count)).ToList();

            // average top few to center new box
            double avgR = finalTop.Average(x => x.r);
            double avgI = finalTop.Average(x => x.i);

            // build new zoomed box centered at average
            double rHalfSpan = (rMax - rMin) * shrinkFactor * 0.5;
            double iHalfSpan = (iMax - iMin) * shrinkFactor * 0.5;

            rMin = avgR - rHalfSpan;
            rMax = avgR + rHalfSpan;
            iMin = avgI - iHalfSpan;
            iMax = avgI + iHalfSpan;

            // early exit
            if (finalTop[0].mag < magTolerance)
                break;
        }

        // return the center of the best region from the last refined grid
        double finalR = finalTop.Average(x => x.r);
        double finalI = finalTop.Average(x => x.i);

        return new Vector(finalR, finalI);
    }

    private void OnIndexChanged(double index)
    {
        _index = index;
        _remaindersUpdated = false;
    }

    private void OnRealChanged(double real)
    {
        _real = real;
        _remaindersUpdated = false;
    }

    void Start()
    {
        _spiralCalculator = GameObject.Find("Spiral Calculator").GetComponent<SpiralCalculator>();

        _zakR1Toggle = GameObject.Find("ZakR1Toggle").GetComponent<Toggle>();
        _zakR1Toggle.onValueChanged.AddListener((value) => UpdateRs());
        
        _zakR2Toggle = GameObject.Find("ZakR2Toggle").GetComponent<Toggle>();
        _zakR2Toggle.onValueChanged.AddListener((value) => UpdateRs());

        _zpsR1Toggle = GameObject.Find("ZpsR1Toggle").GetComponent<Toggle>();
        _zpsR1Toggle.onValueChanged.AddListener((value) => UpdateRs());

        _zpsR2Toggle = GameObject.Find("ZpsR2Toggle").GetComponent<Toggle>();
        _zpsR2Toggle.onValueChanged.AddListener((value) => UpdateRs());
    }

    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;

            // set static parameter to draw in the local space of this object
            Draw.Matrix = transform.localToWorldMatrix;

            if(!_remaindersUpdated)
            {
                UpdateRs();
            }
            DrawRemainders();
        }
    }

    private void UpdateRs()
    {
        Zeta.Spiral s = _spiralCalculator.GetEms();
        Vector sum = s.joints[s.middleIndex];
        if (_zakR1Toggle.isOn) _zakR1 = sum + SumRemainders.CalcZakR1(_real, _index).ToVector2();
        if (_zakR2Toggle.isOn) _zakR2 = sum + SumRemainders.CalcZakR2(_real, _index).ToVector2();
        if (_zpsR1Toggle.isOn) _zpsR1 = sum + SumRemainders.CalcZpsR1(_real, _index).ToVector2();
        if (_zpsR2Toggle.isOn) _zpsR2 = sum + SumRemainders.CalcZpsR2(_real, _index).ToVector2();

        _remaindersUpdated = true;
    }

    private void DrawRemainders()
    {
        // DrawTests();

        if (_zakR1Toggle.isOn) DrawZakR1();
        if (_zakR2Toggle.isOn) DrawZakR2();
        if (_zakR1Toggle.isOn && _zakR2Toggle.isOn)
        {
            using (Draw.StyleScope)
            {
                Draw.Thickness = 1f;
                Draw.UseDashes = true;
                Draw.Color = Color.yellow;
                Vector2 dir = (_zakR2 - _zakR1).normalized;
                Vector2 zeta = _spiralCalculator.GetEms().zeta.ToVector2();
                Vector2 projectedZeta = Vector2.Dot(zeta - _zakR1, dir) * dir;
                projectedZeta += projectedZeta.normalized;
                Draw.Line(_zakR1 + projectedZeta, _zakR2 - projectedZeta);
                Draw.UseDashes = false;
            }
        }

        if (_zpsR1Toggle.isOn) DrawZpsR1();
        if (_zpsR2Toggle.isOn) DrawZpsR2();
        if (_zpsR1Toggle.isOn && _zpsR2Toggle.isOn)
        {
            using (Draw.StyleScope)
            {
                Draw.Thickness = 1f;
                Draw.UseDashes = true;
                Draw.Color = Color.cyan;
                Vector2 dir = (_zpsR2 - _zpsR1).normalized;
                // project _zpsR1 to Zeta onto the line between _zpsR1 and _zpsR2
                Vector2 zeta = _spiralCalculator.GetEms().zeta.ToVector2();
                Vector2 projectedZeta = Vector2.Dot(zeta - _zpsR1, dir) * dir;
                projectedZeta += projectedZeta.normalized;
                Draw.Line(_zpsR1 + projectedZeta, _zpsR2 - projectedZeta);
                Draw.UseDashes = false;
            }
        }
    }

    private void DrawTests()
    {
        using (Draw.StyleScope)
        {
            Draw.Thickness = 1f;
            Draw.Color = Color.yellow;

            // Draw forward sum
            var sum = SumRemainders.CalcForwardSumUpToBisector(_real, _index).ToVector2();
            Draw.Line(Vector2.zero, sum);

            // draw a circle at the end of the sum
            Draw.UseDashes = true;
            Draw.Ring(Vector2.zero, sum.magnitude);
            Draw.UseDashes = false;

            // draw zakR1
            var zakR1 = SumRemainders.CalcZakR1(_real, _index).ToVector2();
            Draw.Color = Color.cyan;
            Draw.Line(Vector2.zero, zakR1);

            // draw a circle at the end of the sum
            Draw.UseDashes = true;
            Draw.Ring(Vector2.zero, zakR1.magnitude);
            Draw.UseDashes = false;


            Draw.Color = Color.red;
            Draw.Line(sum, zakR1);

            Draw.Color = Color.magenta;
            Draw.UseDashes = true;
            Draw.Line(new Vector2(0.5f, 50), new Vector2(0.5f, -50));
            Draw.Line(new Vector2(0, 50), new Vector2(0, -50));
            
            Draw.Line(Vector2.zero, _spiralCalculator.GetEms().zeta.ToVector2());
        }
    }

    private void DrawZakR1()
    {
        using (Draw.StyleScope)
        {
            Draw.Thickness = 3f;
            Draw.Color = _zakR1Color;
            Zeta.Spiral s = _spiralCalculator.GetEms();
            Draw.Line(s.joints[s.middleIndex], _zakR1);
        }
    }
    private void DrawZakR2()
    {
        using (Draw.StyleScope)
        {
            Draw.Thickness = 3f;
            Draw.Color = _zakR2Color;
            Zeta.Spiral s = _spiralCalculator.GetEms();
            Draw.Line(s.joints[s.middleIndex], _zakR2);
        }
    }

    private void DrawZpsR1()
    {
        using (Draw.StyleScope)
        {
            Draw.Thickness = 3f;
            Draw.Color = _zpsR1Color;
            Zeta.Spiral s = _spiralCalculator.GetEms();
            Draw.Line(s.joints[s.middleIndex], _zpsR1);
        }
    }
    private void DrawZpsR2()
    {
        using (Draw.StyleScope)
        {
            Draw.Thickness = 3f;
            Draw.Color = _zpsR2Color;
            Zeta.Spiral s = _spiralCalculator.GetEms();
            Draw.Line(s.joints[s.middleIndex], _zpsR2);
        }
    }
}
