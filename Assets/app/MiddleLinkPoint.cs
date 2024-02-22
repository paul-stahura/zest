using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using Shapes;
using UnityEngine;

public class MiddleLinkPoint : MonoBehaviour
{
    [SerializeField] private App _app;
    [SerializeField] private MiddleLinkTeardrop _tDrop;
    [SerializeField] private Color _dotColor = Color.cyan;
    [SerializeField] private Color _armColors = Color.cyan;
    [SerializeField][Range(0, 1)] private float _middlePointTransparency = 0.5f;

    [SerializeField] private double _bisectorDiff;
    [SerializeField] private double _middleJoint0Diff;
    [SerializeField] private double _middleJoint1Diff;
    private Vector _midPoint;

    public void Awake()
    {
        _app = GameObject.Find("App")?.GetComponent<App>();
        _tDrop = GetComponent<MiddleLinkTeardrop>();
        _app.DrawSprial += DrawArms;
    }

    private void DrawArms(Camera cam, Zeta.Spiral s)
    {
        _midPoint = GetMidPoint(s);

        var zeta = s.zeta.ToVector();
        var norm = zeta.Normalized();
        var joint0 = s.joints[s.middleIndex + 1];
        var jointInverse0 = zeta + s.joints[s.middleIndex + 1].Reflect(norm);
        var joint1 = s.joints[s.middleIndex];
        var jointInverse1 = zeta + s.joints[s.middleIndex].Reflect(norm);

        _middleJoint0Diff = Math.Abs(joint0.Length - jointInverse0.Length);
        _middleJoint1Diff = Math.Abs(joint1.Length - jointInverse1.Length);
        if(Math.Abs(_middleJoint0Diff) < 0.001f && Math.Abs(_middleJoint1Diff) < 0.001f) Debug.Log("ZERO? " + s.input);

        using(Draw.StyleScope)
        {
            var color = _dotColor;
            color.a = _middlePointTransparency;
            Draw.Color = color;
            Draw.Thickness = 1 + _middlePointTransparency;

            
            // Draw.Line(_midPoint, Vector3.zero);
            // Draw.Line(_midPoint, s.zeta.ToVector());

            Draw.Line(joint0, Vector3.zero);
            Draw.Line(jointInverse0, Vector3.zero);
            Draw.Line(joint1, Vector3.zero);
            Draw.Line(jointInverse1, Vector3.zero);
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

    private Vector GetMidPoint(Zeta.Spiral s)
    {
        Vector midpoint = s.joints[s.middleIndex + 1] - s.joints[s.middleIndex];

        // true midpoint
        midpoint /= 2;

        // scaled midpoint based on link size
        // midpoint.Normalized();
        // midpoint /= Vector.Distance(s.joints[1], s.joints[2]);

        return s.joints[s.middleIndex] + midpoint;
    }
}
