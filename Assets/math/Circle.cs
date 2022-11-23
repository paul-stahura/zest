using System;
using UnityEngine;
using Shapes;

public class Circle
{
    public double x;

    public double y;

    public double r;

    public Circle(double x, double y, double r)
    {
        this.x = x;
        this.y = y;
        this.r = r;
    }

    public Circle(Vector2 center, float radius) {
        this.x = (double)center.x;
        this.y = (double)center.y;
        this.r = radius;
    }

    public double AcosSafe(double x)
    {
        if (x >= +1.0) return 0;
        if (x <= -1.0) return Math.PI;
        return Math.Acos(x);
    }

    //  Rotates a point about a fixed point at some angle 'a'
    public Vector rotatePoint(Vector fp, Vector pt, double a)
    {
        double x = pt.x - fp.x;
        double y = pt.y - fp.y;
        double xRot = x * Math.Cos(a) + y * Math.Sin(a);
        double yRot = y * Math.Cos(a) - x * Math.Sin(a);

        return new Vector(fp.x + xRot, fp.y + yRot);
    }

    //public Vector IntersectionPoints(Circle c2, boolean whichAnswer)

    //public double IntersectionPoints(Circle c2, boolean whichAnswer)

    // returns and x,y and an angle (not a radius).   just using the structure to reutrn 3 things
    public Circle IntersectionPoints(Circle c2, bool whichAnswer)
    {
        double r, R, d, dx, dy, cx, cy, Cx, Cy;
        double EPS = 0.00000001; // a small number for error


        Circle returnxya = new Circle(0.0, 0.0, 0.0);

        if (this.r < c2.r)
        {
            r = this.r;
            R = c2.r;
            cx = this.x;
            cy = this.y;
            Cx = c2.x;
            Cy = c2.y;
        }
        else
        {
            r = c2.r;
            R = this.r;
            Cx = this.x;
            Cy = this.y;
            cx = c2.x;
            cy = c2.y;
        }

        // Compute the vector <dx, dy>
        dx = cx - Cx;
        dy = cy - Cy;

        // Find the distance between two points.
        d = Math.Sqrt(dx * dx + dy * dy);

        // There are an infinite number of solutions
        // Seems appropriate to also return null
        if (d < EPS && Math.Abs(R - r) < EPS)
        {
            // P.println("intersection case 1");
            return returnxya; //returns a zero and zero angle.
        }
        else // No intersection (circles centered at the

        // same place with different size)
        if (d < EPS)
        {
            // P.println("intersection case 2");
            return returnxya; //returns a zero and zero angle.
        }

        double x = (dx / d) * R + Cx;
        double y = (dy / d) * R + Cy;
        Vector pt = new Vector(x, y);

        // Single intersection (kissing circles)
        //if (Math.Abs((R+r)-d) < EPS || Math.Abs(R-(r+d)) < EPS) return(P);
        if (Math.Abs((R + r) - d) < EPS || Math.Abs(R - (r + d)) < EPS)
            return returnxya;

        // No intersection. Either the small circle contained within

        // big circle or circles are simply disjoint.
        if ((d + r) < R || (R + r < d)) return returnxya; //returns a zero Vector.

        //if ( (d+r) < R || (R+r < d) ) return(returnpv);  //returns a zero Vector.

        Vector C = new Vector(Cx, Cy);
        double angle = AcosSafe((r * r - d * d - R * R) / (-2.0 * d * R));

        Vector returnpv;
        if (whichAnswer)
            returnpv = rotatePoint(C, pt, +angle);
        else
            returnpv = rotatePoint(C, pt, -angle);

        returnxya.x = returnpv.x;
        returnxya.y = returnpv.y;
        returnxya.r = angle;
        return returnxya; // the r is the angle but its the angle from the other center.
    }
}
