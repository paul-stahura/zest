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
    private struct remainder
    {
        public Vector2 r1;
        public Vector2 r2;
        public Color color1;
        public Color color2;
        public Toggle toggle1;
        public MultiOptionToggle toggle2;
        public MultiOptionToggle legsToggle;
        public MultiOptionToggle pathToggle;
        public List<Vector2> path;
        public int active;

        public remainder(Color c1, Color c2)
        {
            r1 = Vector2.zero;
            r2 = Vector2.zero;
            color1 = c1;
            color2 = c2;
            toggle1 = null;
            toggle2 = null;
            legsToggle = null;
            pathToggle = null;
            path = new List<Vector2>();
            active = 0;
        }
    }

    [Header("R/2")]
    private remainder _r;
    [SerializeField] private Color _r1Color = Color.yellow;
    [SerializeField] private Color _r2Color = Color.yellow;

    [Header("Rps")]
    private remainder _rps;
    [SerializeField] private Color _rps1Color = Color.cyan;
    [SerializeField] private Color _rps2Color = Color.cyan;

    [Header("Rak")]
    private remainder _rak;
    [SerializeField] private Color _rak1Color = Color.green;
    [SerializeField] private Color _rak2Color = Color.red;

    private Vector2 _sum1;
    private Vector2 _sum2;

    private App _app;
    private static double _real;
    private static double _index;
    private static bool _remaindersUpdated = false;

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
    
    static Complex Rak1(double r, double i) => SumRemainders.CalcRak1(r, i);
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
        _r = new remainder(_r1Color, _r2Color);
        _rps = new remainder(_rps1Color, _rps2Color);
        _rak = new remainder(_rak1Color, _rak2Color);

        _r.toggle1 = GameObject.Find("R/2_R1_Toggle").GetComponent<Toggle>();
        _r.toggle1.onValueChanged.AddListener((v) => UpdateActive(ref _r.active, v));
        _r.toggle2 = GameObject.Find("R/2_R2_Toggle").GetComponent<MultiOptionToggle>();
        _r.toggle2.OnOptionChanged += (option) => UpdateActive(ref _r.active, option);
        _r.legsToggle = GameObject.Find("R/2_Legs_Toggle").GetComponent<MultiOptionToggle>();
        _r.legsToggle.OnOptionChanged += (option) => UpdateActive(ref _r.active, option);
        _r.pathToggle = GameObject.Find("R/2_Path_Toggle").GetComponent<MultiOptionToggle>();
        _r.pathToggle.OnOptionChanged += (option) => { UpdateActive(ref _r.active, option); _remaindersUpdated = false; };

        _rps.toggle1 = GameObject.Find("Rps_R1_Toggle").GetComponent<Toggle>();
        _rps.toggle1.onValueChanged.AddListener((v) => UpdateActive(ref _rps.active, v));
        _rps.toggle2 = GameObject.Find("Rps_R2_Toggle").GetComponent<MultiOptionToggle>();
        _rps.toggle2.OnOptionChanged += (option) => UpdateActive(ref _rps.active, option);
        _rps.legsToggle = GameObject.Find("Rps_Legs_Toggle").GetComponent<MultiOptionToggle>();
        _rps.legsToggle.OnOptionChanged += (option) => UpdateActive(ref _rps.active, option);
        _rps.pathToggle = GameObject.Find("Rps_Path_Toggle").GetComponent<MultiOptionToggle>();
        _rps.pathToggle.OnOptionChanged += (option) => { UpdateActive(ref _rps.active, option); _remaindersUpdated = false; };

        _rak.toggle1 = GameObject.Find("Rak_R1_Toggle").GetComponent<Toggle>();
        _rak.toggle1.onValueChanged.AddListener((v) => UpdateActive(ref _rak.active, v));
        _rak.toggle2 = GameObject.Find("Rak_R2_Toggle").GetComponent<MultiOptionToggle>();
        _rak.toggle2.OnOptionChanged += (option) => UpdateActive(ref _rak.active, option);
        _rak.legsToggle = GameObject.Find("Rak_Legs_Toggle").GetComponent<MultiOptionToggle>();
        _rak.legsToggle.OnOptionChanged += (option) => UpdateActive(ref _rak.active, option);
        _rak.pathToggle = GameObject.Find("Rak_Path_Toggle").GetComponent<MultiOptionToggle>();
        _rak.pathToggle.OnOptionChanged += (option) => { UpdateActive(ref _rak.active, option); _remaindersUpdated = false; };
    }

    private static void UpdateActive(ref int active, bool isOn) => UpdateActive(ref active, isOn ? 1 : 0);
    private static void UpdateActive(ref int active, int option)
    {
        if (option == 1)
        {
            active += 1;
            _remaindersUpdated = false;
        }
        else if (option == 0) active -= 1;
    }

    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;

            // set static parameter to draw in the local space of this object
            Draw.Matrix = transform.localToWorldMatrix;

            if (!_remaindersUpdated)
            {
                UpdateRemainders();
            }

            DrawRemainders();
        }
    }

    private void UpdateRemainders()
    {
        if (_r.active == 0 && _rps.active == 0 && _rak.active == 0)
        {
            _remaindersUpdated = true;
            return;
        }

        _sum1 = SumRemainders.CalcForwardSumUpToBisector(_real, _index).ToVector2();
        _sum2 = SumRemainders.CalcInverseSumUpToBisector(_real, _index).ToVector2();

        UpdateRps();
        UpdateRak();

        // last since we use Rak for R
        UpdateR();

        _remaindersUpdated = true;
    }

    private void UpdateRps()
    {
        if (_rps.active == 0) return;

        _rps.r1 = SumRemainders.CalcRps1(_real, _index).ToVector2();
        _rps.r2 = SumRemainders.CalcRps2(_real, _index).ToVector2();

        // build path
        CalcPath(_rps.path, (r, i) => SumRemainders.CalcRps1(r, i), _rps.pathToggle.GetSelectedOption().Item1);
    }

    private void UpdateRak()
    {
        if (_rak.active == 0) return;

        _rak.r1 = SumRemainders.CalcRak1(_real, _index).ToVector2();
        _rak.r2 = SumRemainders.CalcRak2(_real, _index).ToVector2();

        // build path
        CalcPath(_rak.path, (r, i) => SumRemainders.CalcRak1(r, i), _rak.pathToggle.GetSelectedOption().Item1);
    }

    private void UpdateR()
    {
        if (_r.active == 0) return;

        if (_rak.active != 0)
        {
            _r.r1 = _rak.r1 + _rak.r2;
            _r.r1 /= 2.0f;
            _r.r2 = _r.r1;
        }
        else
        {
            _r.r1 = ZakCalculator.Rak(_real, _index).ToVector2() / 2.0f;
            _r.r2 = _r.r1;
        }

        // build path
        CalcPath(_r.path, (r, i) => ZakCalculator.Rak(r, i) / 2.0, _r.pathToggle.GetSelectedOption().Item1);
    }

    private void CalcPath(List<Vector2> path, Func<double, double, Complex> calcFunc, int option)
    {
        if (option == 0) return;
        path.Clear();

        float pathRange;
        switch (option)
        {
            case 1: pathRange = 0.001f; break;
            case 2: pathRange = 0.01f; break;
            case 3: pathRange = 0.1f; break;
            case 4: pathRange = 0.5f; break;
            default: pathRange = 0f; break;
        }
        pathRange /= (float)(_index * 2.0);
        int steps = 50 * option * (int)_index; // more steps for larger paths
        for (int s = 0; s <= steps; s++)
        {
            double idx = _index - pathRange + 2 * pathRange * s / steps;
            Vector2 r = calcFunc(_real, idx).ToVector2() + SumRemainders.CalcForwardSumUpToBisector(_real, idx).ToVector2();
            path.Add(r);
        }
    }

    private void DrawRemainders()
    {
        DrawR(_r);
        DrawR(_rps);
        DrawR(_rak);

        // using (Draw.StyleScope)
        // {
        //     Draw.Thickness = 1f;
        //     Draw.Color = Color.yellow;
        //     Complex test = ZakCalculator.AK_NegativeApproxG(_app.Real, _app.Index);
        //     print($"AK zero at ({test.Magnitude}) = ({test.Real}, {test.Imaginary}i)");
        //     Draw.Line(Vector2.zero, test.ToVector2(), Color.yellow);
        // }
    }

    private void DrawR(remainder r)
    {
        if (r.active == 0) return;

        var l1 = _sum1 + r.r1;
        var l2 = _sum1 + _sum2 + r.r1 + r.r2;

        using (Draw.StyleScope)
        {
            Draw.Thickness = 2f;
            Draw.Color = r.color1;

            if (r.toggle1.isOn) Draw.Line(_sum1, l1, r.color1);

            int option = r.toggle2.GetSelectedOption().Item1;
            switch (option)
            {
                case 1:
                    Draw.Line(l1, l1 + r.r2, r.color2);
                    if (r.toggle1.isOn) Draw.Line(l1, l1, 5f, r.color1);
                    break;
                case 2:
                    Draw.Line(_sum1, _sum1 + r.r2, r.color2);
                    break;
                case 3:
                    Draw.Line(_sum1, _sum1 + r.r2, r.color2);
                    Draw.UseDashes = true;
                    var rDir = r.r2 - r.r1;
                    if (Mathf.Approximately(rDir.magnitude, 0f))
                    {
                        // take perpendicular instead
                        rDir = new Vector2(-r.r1.y, r.r1.x);
                    }
                    rDir = rDir.normalized;
                    Draw.Line(_sum1 + r.r1 - (rDir * 2), _sum1 + r.r2 + (rDir * 2));
                    Draw.UseDashes = false;
                    break;
                case 4:
                    Draw.Line(_sum2, _sum2 + r.r2, r.color2);
                    break;
                case 5:
                    Draw.Line(_sum2, _sum2 + r.r2, r.color2);
                    Draw.UseDashes = true;
                    var dir = ((_sum2 + r.r2) - (_sum1 + r.r1)).normalized;
                    Draw.Line(_sum1 + r.r1 - (dir * 2), _sum2 + r.r2 + (dir * 2));
                    Draw.UseDashes = false;
                    break;
            }

            option = r.legsToggle.GetSelectedOption().Item1;
            if (option > 0)
            {
                Draw.Line(Vector2.zero, l1, color: Color.green);
                if (option > 1) Draw.Line(l1, l2, color: Color.red);
                if (option > 2)
                {
                    Draw.Line(Vector2.zero, l2, color: Color.cyan);
                    Draw.UseDashes = true;
                    Draw.Ring(l1, l1.magnitude, Color.green);
                    Draw.Ring(l1, (l2 - l1).magnitude, Color.red);
                    Draw.UseDashes = false;
                }
            }

            option = r.pathToggle.GetSelectedOption().Item1;
            if (option > 0 && r.path.Count > 1)
            {
                Draw.Thickness = 1f;
                Draw.Color = r.color1;
                for (int p = 0; p < r.path.Count - 1; p++)
                {
                    Draw.Line(r.path[p], r.path[p + 1]);
                }
            }
        }
    }

    // private void DrawRemainders()
    // {
    //     DrawZakLegs(_zakLegsToggle.GetSelectedOption().Item1);

    //     if (_zakR1Toggle.isOn) DrawZakR1();
    //     if (_zakR2Toggle.isOn) DrawZakR2();
    //     if (_zakR1Toggle.isOn && _zakR2Toggle.isOn)
    //     {
    //         using (Draw.StyleScope)
    //         {
    //             Draw.Thickness = 1f;
    //             Draw.UseDashes = true;
    //             Draw.Color = Color.yellow;
    //             Vector2 dir = (_zakR2 - _zakR1).normalized;
    //             Vector2 zeta = _spiralCalculator.GetEms().zeta.ToVector2();
    //             Vector2 projectedZeta = Vector2.Dot(zeta - _zakR1, dir) * dir;
    //             projectedZeta += projectedZeta.normalized;
    //             Draw.Line(_zakR1 + projectedZeta, _zakR2 - projectedZeta);
    //             Draw.UseDashes = false;
    //         }
    //     }

    //     if (_zpsR1Toggle.isOn) DrawZpsR1();
    //     if (_zpsR2Toggle.isOn) DrawZpsR2();
    //     if (_zpsR1Toggle.isOn && _zpsR2Toggle.isOn)
    //     {
    //         using (Draw.StyleScope)
    //         {
    //             Draw.Thickness = 1f;
    //             Draw.UseDashes = true;
    //             Draw.Color = Color.cyan;
    //             Vector2 dir = (_zpsR2 - _zpsR1).normalized;
    //             // project _zpsR1 to Zeta onto the line between _zpsR1 and _zpsR2
    //             Vector2 zeta = _spiralCalculator.GetEms().zeta.ToVector2();
    //             Vector2 projectedZeta = Vector2.Dot(zeta - _zpsR1, dir) * dir;
    //             projectedZeta += projectedZeta.normalized;
    //             Draw.Line(_zpsR1 + projectedZeta, _zpsR2 - projectedZeta);
    //             Draw.UseDashes = false;
    //         }
    //     }
    // }
}
