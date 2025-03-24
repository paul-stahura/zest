using UnityEngine;
using Shapes;
using UnityEngine.UI;

public class BPSymmetryRenderer : ImmediateModeShapeDrawer
{
    [SerializeField] private SpiralCalculator _spiralCalculator;
    [SerializeField] private Color _symmetryColor;

    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;

            // set static parameter to draw in the local space of this object
            Draw.Matrix = transform.localToWorldMatrix;

            DrawSymmetryPath();
        }
    }


    private void DrawSymmetryPath()
    {
        const int POINTS = 100;    
        var path = new Vector2[POINTS];
        var path2 = new Vector2[POINTS];

        using (Draw.StyleScope)
        {
            Draw.Color = Color.red;
            Draw.Thickness = 1f;

            for(int i = 0; i < POINTS; i += 1)
            {
                var r = (float)i/POINTS;
                path[i] = RhombusPoints.GetBPSymmetry(r, 5.108561515808110);
                path2[i] = RhombusPoints.GetBPForward(r, 5.108561515808110);
            }

            Debug.Log($"Generated paths with {path.Length} points each");

            // Find intersection points
            var intersections = FindPathIntersections(path, path2);
            Debug.Log($"FindPathIntersections returned {intersections.Length} intersections");
            
            // Draw paths
            for (int i = 1; i < path.Length; i++)
            {
                if((path[i - 1] - path[i]).magnitude < 5)
                {
                    Draw.Line(path[i - 1], path[i]);
                }

                if((path2[i - 1] - path2[i]).magnitude < 5)
                {
                    Draw.Line(path2[i - 1], path2[i]);
                }
            }

            // Draw intersection points
            Draw.Color = Color.yellow;
            Draw.Thickness = 2f;  // Make discs more visible
            foreach (var point in intersections)
            {
                Debug.Log($"Drawing intersection disc at {point}");
                Draw.Disc(point, 0.2f);  // Make discs larger
            }
        }
    }

    private Vector2[] FindPathIntersections(Vector2[] path1, Vector2[] path2)
    {
        var intersections = new System.Collections.Generic.List<Vector2>();
        int checksPerformed = 0;
        int intersectionsFound = 0;
        
        // Check each line segment pair for intersections
        for (int i = 1; i < path1.Length; i++)
        {
            var line1Start = path1[i - 1];
            var line1End = path1[i];
            
            for (int j = 1; j < path2.Length; j++)
            {
                var line2Start = path2[j - 1];
                var line2End = path2[j];
                checksPerformed++;
                
                if (TryGetLineIntersection(line1Start, line1End, line2Start, line2End, out Vector2 intersection))
                {
                    intersectionsFound++;
                    intersections.Add(intersection);
                }
            }
        }
        
        Debug.Log($"Performed {checksPerformed} line segment intersection checks, found {intersectionsFound} intersections");
        return intersections.ToArray();
    }

    private bool TryGetLineIntersection(Vector2 line1Start, Vector2 line1End, Vector2 line2Start, Vector2 line2End, out Vector2 intersection)
    {
        intersection = Vector2.zero;

        var a1 = line1End.y - line1Start.y;
        var b1 = line1Start.x - line1End.x;
        var c1 = a1 * line1Start.x + b1 * line1Start.y;

        var a2 = line2End.y - line2Start.y;
        var b2 = line2Start.x - line2End.x;
        var c2 = a2 * line2Start.x + b2 * line2Start.y;

        var determinant = a1 * b2 - a2 * b1;

        if (Mathf.Abs(determinant) < 0.0001f)
        {
            return false;
        }

        var x = (b2 * c1 - b1 * c2) / determinant;
        var y = (a1 * c2 - a2 * c1) / determinant;
        intersection = new Vector2(x, y);

        bool isOnSegments = IsPointOnLineSegment(line1Start, line1End, intersection) &&
                           IsPointOnLineSegment(line2Start, line2End, intersection);

        if (isOnSegments)
        {
            Debug.Log($"Found intersection at {intersection} between line segments: " +
                     $"({line1Start}->{line1End}) and ({line2Start}->{line2End})");
        }

        return isOnSegments;
    }

    private bool IsPointOnLineSegment(Vector2 lineStart, Vector2 lineEnd, Vector2 point)
    {
        var d1 = Vector2.Distance(lineStart, point);
        var d2 = Vector2.Distance(lineEnd, point);
        var lineLength = Vector2.Distance(lineStart, lineEnd);
        var buffer = 0.0001f;

        return d1 + d2 >= lineLength - buffer && d1 + d2 <= lineLength + buffer;
    }
} 