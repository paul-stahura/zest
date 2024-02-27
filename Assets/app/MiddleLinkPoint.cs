using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using Shapes;
using UnityEngine;
using UnityEngine.UI;

public class MiddleLinkPoint : MonoBehaviour
{
    [SerializeField] private App _app;
    [SerializeField] private MiddleLinkTeardrop _tDrop;
    [SerializeField] private Color _armColor = Color.cyan;
    [SerializeField] private Slider _middlePointTransparency;
    [SerializeField] private Toggle _midPointToggle;
    [SerializeField] private Toggle _scaledMidPointToggle;
    [SerializeField] private Toggle _xWingPointToggle;

    [SerializeField] private Text _midDiffText0;
    [SerializeField] private Text _midDiffText1;

    [SerializeField] private double _midDiff0;
    [SerializeField] private double _midDiff1;

    public void Awake()
    {
        _app = GameObject.Find("App")?.GetComponent<App>();
        _tDrop = GetComponent<MiddleLinkTeardrop>();
        _middlePointTransparency = GameObject.Find("MidPointTransparencySlider")?.GetComponent<Slider>();
        _midPointToggle = GameObject.Find("MidPointToggle")?.GetComponent<Toggle>();
        _scaledMidPointToggle = GameObject.Find("ScaledMidPointToggle")?.GetComponent<Toggle>();
        _xWingPointToggle = GameObject.Find("XwingToggle")?.GetComponent<Toggle>();
        
        _midDiffText0 = GameObject.Find("MidDiff0")?.GetComponent<Text>();
        _midDiffText1 = GameObject.Find("MidDiff1")?.GetComponent<Text>();

        _app.DrawSprial += DrawArms;
    }

    private void DrawArms(Camera cam, Zeta.Spiral s)
    {
        using(Draw.StyleScope)
        {
            // color
            var color = _armColor;
            color.a = _middlePointTransparency.value;
            Draw.Color = color;
            Draw.Thickness = 1 + _middlePointTransparency.value;

            // important pts
            var zeta = s.zeta.ToVector();
            var norm = zeta.Normalized();
            var joint0 = s.joints[s.middleIndex];
            var jointInverse0 = zeta + s.joints[s.middleIndex].Reflect(norm);
            var joint1 = s.joints[s.middleIndex + 1];
            var jointInverse1 = zeta + s.joints[s.middleIndex + 1].Reflect(norm);
            
            _midDiff0 = 0;
            _midDiff1 = 0;

            // midPoint
            if(_midPointToggle.isOn)
            {
                var pt = joint0 + (joint1 - joint0) / 2;
                var inversePt = jointInverse0 + (jointInverse1 - jointInverse0) / 2;

                _midDiff0 = Math.Abs(pt.Length - inversePt.Length);

                Draw.Line(pt, Vector3.zero);
                Draw.Line(inversePt, zeta);
            }
            // scaled MidPoint
            else if(_scaledMidPointToggle.isOn)
            {
                var scalar = (s.joints[2] - s.joints[1]).Length;
                var mid = (joint1 - joint0) / 2;
                var midInverse = (jointInverse1 - jointInverse0) / 2;
                var pt = joint0 + mid + mid * scalar;
                var inversePt = jointInverse0 + midInverse + midInverse * scalar;

                _midDiff0 = Math.Abs(pt.Length - inversePt.Length);

                Draw.Line(pt, Vector3.zero);
                Draw.Line(inversePt, zeta);
            }

            // Xwing
            if(_xWingPointToggle.isOn)
            {
                _midDiff0 = Math.Abs(joint0.Length - jointInverse0.Length);
                _midDiff1 = Math.Abs(joint1.Length - jointInverse1.Length);

                Draw.Line(joint0, Vector3.zero);
                Draw.Line(jointInverse0, Vector3.zero);
                Draw.Line(joint1, Vector3.zero);
                Draw.Line(jointInverse1, Vector3.zero);
            }

            _midDiffText0.text = _midDiff0.ToString();
            _midDiffText1.text = _midDiff1.ToString();
        }
    }

    private Vector FindIntersection(Vector line1Start, Vector line1End, Vector line2Start, Vector line2End)
    {
        // Calculate the slopes of the lines
        float slope1 = (float)((line1End.y - line1Start.y) / (line1End.x - line1Start.x));
        float slope2 = (float)((line2End.y - line2Start.y) / (line2End.x - line2Start.x));

        // Check if the lines are parallel
        if (Mathf.Approximately(slope1, slope2))
        {
            Debug.LogError("Lines are parallel, no intersection point.");
            return new Vector(float.NaN, float.NaN);
        }

        // Calculate the intersection point
        float x = (float) (slope1 * line1Start.x - slope2 * line2Start.x + line2Start.y - line1Start.y) / (slope1 - slope2);
        float y = slope1 * (float)(x - line1Start.x) + (float)line1Start.y;

        return new Vector(x, y);
    }
}
