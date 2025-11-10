using System;
using System.Numerics;
using Shapes;
using UnityEngine;
using Vector2 = UnityEngine.Vector2;
using UnityEngine.UI;
using Vector3 = UnityEngine.Vector3;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;

public class SumRemainderRenderer : ImmediateModeShapeDrawer
{
    private struct remainder
    {
        public Vector2 r1;
        public Vector2 r2;
        public Color color1;
        public Color color2;
        public MultiOptionToggle targetToggle;
        public MultiOptionToggle toggle1;
        public MultiOptionToggle toggle2;
        public MultiOptionToggle legsForwardToggle;
        public MultiOptionToggle legsInverseToggle;
        public MultiOptionToggle symToggle;
        public MultiOptionToggle pathSigmaToggle;
        public MultiOptionToggle pathIndexToggle;
        public List<Vector2> pathSigma;
        public List<Vector2> pathInverseSigma;
        public List<Vector2> pathIndex;
        public List<Vector2> pathInverseIndex;
        public int active;

        public remainder(Color c1, Color c2)
        {
            r1 = Vector2.zero;
            r2 = Vector2.zero;
            color1 = c1;
            color2 = c2;
            targetToggle = null;
            toggle1 = null;
            toggle2 = null;
            legsForwardToggle = null;
            legsInverseToggle = null;
            symToggle = null;
            pathSigmaToggle = null;
            pathIndexToggle = null;
            pathSigma = new List<Vector2>();
            pathInverseSigma = new List<Vector2>();
            pathIndex = new List<Vector2>();
            pathInverseIndex = new List<Vector2>();
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

    [Header("Path adds")]
    [SerializeField] private MultiOptionToggle _addInversePaths;

    [Header("Extras")]
    [SerializeField] private MultiOptionToggle _rpsToRakToggle;

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

        _r.targetToggle = GameObject.Find("R/2_Target_Toggle").GetComponent<MultiOptionToggle>();
        _r.targetToggle.OnOptionChanged += (option) => UpdateActive(ref _r.active, option);
        _r.toggle1 = GameObject.Find("R/2_R1_Toggle").GetComponent<MultiOptionToggle>();
        _r.toggle1.OnOptionChanged += (option) => UpdateActive(ref _r.active, option);
        _r.toggle2 = GameObject.Find("R/2_R2_Toggle").GetComponent<MultiOptionToggle>();
        _r.toggle2.OnOptionChanged += (option) => UpdateActive(ref _r.active, option);
        _r.legsForwardToggle = GameObject.Find("R/2_Legs_Toggle").GetComponent<MultiOptionToggle>();
        _r.legsForwardToggle.OnOptionChanged += (option) => UpdateActive(ref _r.active, option);
        _r.legsInverseToggle = GameObject.Find("R/2_Legs_Inverse_Toggle").GetComponent<MultiOptionToggle>();
        _r.legsInverseToggle.OnOptionChanged += (option) => UpdateActive(ref _r.active, option);
        _r.symToggle = GameObject.Find("R/2_Sym_Toggle").GetComponent<MultiOptionToggle>();
        _r.symToggle.OnOptionChanged += (option) => UpdateActive(ref _r.active, option);
        _r.pathSigmaToggle = GameObject.Find("R/2_Path_Sigma_Toggle").GetComponent<MultiOptionToggle>();
        _r.pathSigmaToggle.OnOptionChanged += (option) => { UpdateActive(ref _r.active, option); _remaindersUpdated = false; };
        _r.pathIndexToggle = GameObject.Find("R/2_Path_Toggle").GetComponent<MultiOptionToggle>();
        _r.pathIndexToggle.OnOptionChanged += (option) => { UpdateActive(ref _r.active, option); _remaindersUpdated = false; };

        _rps.targetToggle = GameObject.Find("Rps_Target_Toggle").GetComponent<MultiOptionToggle>();
        _rps.targetToggle.OnOptionChanged += (option) => UpdateActive(ref _rps.active, option);
        _rps.toggle1 = GameObject.Find("Rps_R1_Toggle").GetComponent<MultiOptionToggle>();
        _rps.toggle1.OnOptionChanged += (option) => UpdateActive(ref _rps.active, option);
        _rps.toggle2 = GameObject.Find("Rps_R2_Toggle").GetComponent<MultiOptionToggle>();
        _rps.toggle2.OnOptionChanged += (option) => UpdateActive(ref _rps.active, option);
        _rps.legsForwardToggle = GameObject.Find("Rps_Legs_Toggle").GetComponent<MultiOptionToggle>();
        _rps.legsForwardToggle.OnOptionChanged += (option) => UpdateActive(ref _rps.active, option);
        _rps.legsInverseToggle = GameObject.Find("Rps_Legs_Inverse_Toggle").GetComponent<MultiOptionToggle>();
        _rps.legsInverseToggle.OnOptionChanged += (option) => UpdateActive(ref _rps.active, option);
        _rps.symToggle = GameObject.Find("Rps_Sym_Toggle").GetComponent<MultiOptionToggle>();
        _rps.symToggle.OnOptionChanged += (option) => UpdateActive(ref _rps.active, option);
        _rps.pathSigmaToggle = GameObject.Find("Rps_Path_Sigma_Toggle").GetComponent<MultiOptionToggle>();
        _rps.pathSigmaToggle.OnOptionChanged += (option) => { UpdateActive(ref _rps.active, option); _remaindersUpdated = false; };
        _rps.pathIndexToggle = GameObject.Find("Rps_Path_Toggle").GetComponent<MultiOptionToggle>();
        _rps.pathIndexToggle.OnOptionChanged += (option) => { UpdateActive(ref _rps.active, option); _remaindersUpdated = false; };

        _rak.targetToggle = GameObject.Find("Rak_Target_Toggle").GetComponent<MultiOptionToggle>();
        _rak.targetToggle.OnOptionChanged += (option) => UpdateActive(ref _rak.active, option);
        _rak.toggle1 = GameObject.Find("Rak_R1_Toggle").GetComponent<MultiOptionToggle>();
        _rak.toggle1.OnOptionChanged += (option) => UpdateActive(ref _rak.active, option);
        _rak.toggle2 = GameObject.Find("Rak_R2_Toggle").GetComponent<MultiOptionToggle>();
        _rak.toggle2.OnOptionChanged += (option) => UpdateActive(ref _rak.active, option);
        _rak.legsForwardToggle = GameObject.Find("Rak_Legs_Toggle").GetComponent<MultiOptionToggle>();
        _rak.legsForwardToggle.OnOptionChanged += (option) => UpdateActive(ref _rak.active, option);
        _rak.legsInverseToggle = GameObject.Find("Rak_Legs_Inverse_Toggle").GetComponent<MultiOptionToggle>();
        _rak.legsInverseToggle.OnOptionChanged += (option) => UpdateActive(ref _rak.active, option);
        _rak.symToggle = GameObject.Find("Rak_Sym_Toggle").GetComponent<MultiOptionToggle>();
        _rak.symToggle.OnOptionChanged += (option) => UpdateActive(ref _rak.active, option);
        _rak.pathSigmaToggle = GameObject.Find("Rak_Path_Sigma_Toggle").GetComponent<MultiOptionToggle>();
        _rak.pathSigmaToggle.OnOptionChanged += (option) => { UpdateActive(ref _rak.active, option); _remaindersUpdated = false; };
        _rak.pathIndexToggle = GameObject.Find("Rak_Path_Toggle").GetComponent<MultiOptionToggle>();
        _rak.pathIndexToggle.OnOptionChanged += (option) => { UpdateActive(ref _rak.active, option); _remaindersUpdated = false; };

        _addInversePaths = GameObject.Find("Add_Inverse_Path_Toggle").GetComponent<MultiOptionToggle>();
        _addInversePaths.OnOptionChanged += (option) => { _remaindersUpdated = false; };

        _rpsToRakToggle = GameObject.Find("Rps_To_Rak_Toggle").GetComponent<MultiOptionToggle>();
        _rpsToRakToggle.OnOptionChanged += (option) =>
        {
            UpdateActive(ref _rak.active, option);
            UpdateActive(ref _rps.active, option);
            UpdateActive(ref _r.active, option);
            _remaindersUpdated = false;
        };
    }

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

        // build paths
        CalcSigmaPath(_rps.pathSigma, (r, i) => SumRemainders.CalcRps1(r, i), SumRemainders.CalcForwardSumUpToBisector, _rps.pathSigmaToggle.GetSelectedOption().Item1);
        CalcPath(_rps.pathIndex, (r, i) => SumRemainders.CalcRps1(r, i), SumRemainders.CalcForwardSumUpToBisector, _rps.pathIndexToggle.GetSelectedOption().Item1);

        int addOption = _addInversePaths.GetSelectedOption().Item1;
        int InverseOption = (addOption > 0) ? _rps.pathSigmaToggle.GetSelectedOption().Item1 : 0;
        CalcSigmaPath(_rps.pathInverseSigma, (r, i) => SumRemainders.CalcRps2(r, i), SumRemainders.CalcInverseSumUpToBisector, InverseOption);

        InverseOption = (addOption > 0) ? _rps.pathIndexToggle.GetSelectedOption().Item1 : 0;
        CalcPath(_rps.pathInverseIndex, (r, i) => SumRemainders.CalcRps2(r, i), SumRemainders.CalcInverseSumUpToBisector, InverseOption);
    }

    private void UpdateRak()
    {
        if (_rak.active == 0) return;

        _rak.r1 = SumRemainders.CalcRak1(_real, _index).ToVector2();
        _rak.r2 = SumRemainders.CalcRak2(_real, _index).ToVector2();

        // build paths
        CalcSigmaPath(_rak.pathSigma, (r, i) => SumRemainders.CalcRak1(r, i), SumRemainders.CalcForwardSumUpToBisector, _rak.pathSigmaToggle.GetSelectedOption().Item1);
        CalcPath(_rak.pathIndex, (r, i) => SumRemainders.CalcRak1(r, i), SumRemainders.CalcForwardSumUpToBisector, _rak.pathIndexToggle.GetSelectedOption().Item1);

        int addOption = _addInversePaths.GetSelectedOption().Item1;
        int InverseOption = (addOption > 0) ? _rak.pathSigmaToggle.GetSelectedOption().Item1 : 0;
        CalcSigmaPath(_rak.pathInverseSigma, (r, i) => SumRemainders.CalcRak2(r, i), SumRemainders.CalcInverseSumUpToBisector, InverseOption);

        InverseOption = (addOption > 0) ? _rak.pathIndexToggle.GetSelectedOption().Item1 : 0;
        CalcPath(_rak.pathInverseIndex, (r, i) => SumRemainders.CalcRak2(r, i), SumRemainders.CalcInverseSumUpToBisector, InverseOption);
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

        // build paths
        CalcSigmaPath(_r.pathSigma, (r, i) => ZakCalculator.Rak(r, i) / 2.0, SumRemainders.CalcForwardSumUpToBisector, _r.pathSigmaToggle.GetSelectedOption().Item1);
        CalcPath(_r.pathIndex, (r, i) => ZakCalculator.Rak(r, i) / 2.0, SumRemainders.CalcForwardSumUpToBisector, _r.pathIndexToggle.GetSelectedOption().Item1);

        int addOption = _addInversePaths.GetSelectedOption().Item1;
        int InverseOption = (addOption > 0) ? _r.pathSigmaToggle.GetSelectedOption().Item1 : 0;
        CalcSigmaPath(_r.pathInverseSigma, (r, i) => ZakCalculator.Rak(r, i) / 2.0, SumRemainders.CalcInverseSumUpToBisector, InverseOption);

        InverseOption = (addOption > 0) ? _r.pathIndexToggle.GetSelectedOption().Item1 : 0;
        CalcPath(_r.pathInverseIndex, (r, i) => ZakCalculator.Rak(r, i) / 2.0, SumRemainders.CalcInverseSumUpToBisector, InverseOption);
    }

    private void CalcSigmaPath(List<Vector2> path, Func<double, double, Complex> calcFunc, Func<double, double, Complex> sumFunc, int option)
    {
        if (option == 0) return;
        path.Clear();

        int minSigma = 0;
        switch (option)
        {
            case 1: minSigma = 0; break;
            case 2: minSigma = -5; break;
        }
        for (int i = minSigma; i <= 10; i++)
        {
            var scaler = Math.Max(i, 0);
            var ptCount = 100 / (scaler + 1);
            for (int j = 0; j <= ptCount; j++)
            {
                var r = i + (float)j/ptCount;
                Vector2 idx = calcFunc(r, _index).ToVector2() + sumFunc(r, _index).ToVector2();
                path.Add(idx);
            }
        }
    }

    private void CalcPath(List<Vector2> path, Func<double, double, Complex> calcFunc, Func<double, double, Complex> sumFunc, int option)
    {
        if (option == 0) return;
        path.Clear();

        float pathRange;
        switch (option)
        {
            // case 1: pathRange = 0.001f; break;
            case 1: pathRange = 0.01f; break;
            case 2: pathRange = 0.1f; break;
            case 3: pathRange = 0.5f; break;
            default: pathRange = 0f; break;
        }
        pathRange /= (float)(_index * 2.0);
        int steps = 50 * option * (int)_index; // more steps for larger paths
        for (int s = 0; s <= steps; s++)
        {
            double idx = _index - pathRange + 2 * pathRange * s / steps;
            Vector2 r = calcFunc(_real, idx).ToVector2() + sumFunc(_real, idx).ToVector2();
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

        if (_rpsToRakToggle.GetSelectedOption().Item1 > 0)
        {
            using (Draw.StyleScope)
            {
                Draw.Thickness = 2f;
                Draw.Color = Color.magenta;
                Draw.UseDashes = true;
                Vector2 rpsPoint = _sum1 + _rps.r1;
                Vector2 rakPoint = _sum1 + _rak.r1;
                Vector2 dir = (rakPoint - rpsPoint).normalized;
                Draw.Line(rpsPoint - dir * 2f, rakPoint + dir * 2f);

                if(_rpsToRakToggle.GetSelectedOption().Item1 == 2)
                {
                    Vector2 intersection = LineLineIntersection(rpsPoint - dir * 2f, rakPoint + dir * 2f, _sum1, _sum1 + _r.r1 + _r.r2);
                    Vector2 zeta = _sum1 + _rps.r1 + _sum2 + _rps.r2;
                    Vector2 leg2 = zeta - intersection;

                    Draw.Line(Vector2.zero, intersection, Color.green);
                    Draw.Line(intersection, zeta, Color.red);
                    Draw.Ring(intersection, intersection.magnitude, Color.green);
                    Draw.Ring(intersection, leg2.magnitude, Color.red);
                }
            }
        }
    }
    
    private Vector2 LineLineIntersection(Vector2 p1, Vector2 p2, Vector2 p3, Vector2 p4)
    {
        float A1 = p2.y - p1.y;
        float B1 = p1.x - p2.x;
        float C1 = A1 * p1.x + B1 * p1.y;

        float A2 = p4.y - p3.y;
        float B2 = p3.x - p4.x;
        float C2 = A2 * p3.x + B2 * p3.y;

        float denominator = A1 * B2 - A2 * B1;

        if (Mathf.Approximately(denominator, 0f))
        {
            return Vector2.zero;
        }

        float intersectX = (B2 * C1 - B1 * C2) / denominator;
        float intersectY = (A1 * C2 - A2 * C1) / denominator;

        return new Vector2(intersectX, intersectY);
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

            int option = r.targetToggle.GetSelectedOption().Item1;
            switch (option)
            {
                case 1:
                    ShapesUtils.DrawCross(l1, 0.05f);
                    break;
                case 2:
                    ShapesUtils.DrawCross(_sum2 + r.r2, 0.05f);
                    break;
                case 3:
                    ShapesUtils.DrawCross(l1, 0.05f);
                    ShapesUtils.DrawCross(_sum2 + r.r2, 0.05f);
                    break;
            }

            option = r.toggle1.GetSelectedOption().Item1;
            switch(option)
            {
                case 1:
                    Draw.Line(_sum1, l1, r.color1);
                    break;
                case 2:
                    Draw.Line(_sum2 + r.r2, _sum2 + r.r2 + r.r1, r.color1);
                    break;
            }

            option = r.toggle2.GetSelectedOption().Item1;
            switch (option)
            {
                case 1:
                    Draw.Line(l1, l1 + r.r2, r.color2);
                    if (r.toggle1.GetSelectedOption().Item1 == 1) Draw.Line(l1, l1, 5f, r.color1);
                    break;
                case 2:
                    Draw.Line(_sum2, _sum2 + r.r2, r.color2);
                    break;
                case 3:
                    Draw.Line(_sum1, _sum1 + r.r2, r.color2);
                    break;
            }

            option = r.legsForwardToggle.GetSelectedOption().Item1;
            if (option > 0)
            {
                Draw.Line(Vector2.zero, l1, color: Color.green);
                if (option > 1) Draw.Line(l1, l2, color: Color.red);
            }

            option = r.legsInverseToggle.GetSelectedOption().Item1;
            if (option > 0)
            {
                Draw.Line(Vector2.zero, _sum2 + r.r2, color: Color.red);
                if (option > 1) Draw.Line(_sum2 + r.r2, l2, color: Color.green);
            }

            option = r.symToggle.GetSelectedOption().Item1;
            switch (option)
            {
                case 1: // cut?
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

                case 2: // bisect
                    Draw.UseDashes = true;
                    var bisectDir = r.r1 + r.r2;
                    bisectDir = new Vector2(-bisectDir.y, bisectDir.x).normalized;
                    var dist = Mathf.Max(0.01f, Vector2.Distance(l1, _sum2 + r.r2));
                    Draw.Line(l1 - (bisectDir * dist), l1 + (bisectDir * dist));
                    Draw.UseDashes = false;
                    break;

                case 3: // Zeta/2
                    Draw.UseDashes = true;
                    var dir = ((_sum2 + r.r2) - (_sum1 + r.r1)).normalized;
                    Draw.Line(_sum1 + r.r1 - (dir * 2), _sum2 + r.r2 + (dir * 2));
                    Draw.UseDashes = false;
                    break;

                case 4: // Equal
                    Draw.Line(Vector2.zero, l2, color: Color.cyan);
                    Draw.UseDashes = true;
                    Draw.Ring(l1, l1.magnitude, Color.green);
                    Draw.Ring(l1, (l2 - l1).magnitude, Color.red);
                    Draw.UseDashes = false;
                    break;
            }

            int _pathAddOption = _addInversePaths.GetSelectedOption().Item1;

            option = r.pathSigmaToggle.GetSelectedOption().Item1;
            if (option > 0 && r.pathSigma.Count > 1)
            {
                Draw.Thickness = 1f;

                if (_pathAddOption != 1)
                {
                    Draw.Color = r.color1;
                    for (int p = 0; p < r.pathSigma.Count - 1; p++)
                    {
                        Draw.Line(r.pathSigma[p], r.pathSigma[p + 1]);
                    }
                }

                // draw Inverse
                if (_pathAddOption > 0)
                {
                    Draw.Color = r.color2;
                    for (int p = 0; p < r.pathInverseSigma.Count - 1; p++)
                    {
                        Draw.Line(r.pathInverseSigma[p], r.pathInverseSigma[p + 1]);
                    }
                }
            }

            option = r.pathIndexToggle.GetSelectedOption().Item1;
            if (option > 0 && r.pathIndex.Count > 1)
            {
                Draw.Thickness = 1f;

                if (_pathAddOption != 1)
                {
                    Draw.Color = r.color1;
                    for (int p = 0; p < r.pathIndex.Count - 1; p++)
                    {
                        Draw.Line(r.pathIndex[p], r.pathIndex[p + 1]);
                    }
                }

                // draw Inverse
                if (_pathAddOption > 0)
                {
                    Draw.Color = r.color2;
                    for (int p = 0; p < r.pathInverseIndex.Count - 1; p++)
                    {
                        Draw.Line(r.pathInverseIndex[p], r.pathInverseIndex[p + 1]);
                    }
                }
            }
        }
    }
}
