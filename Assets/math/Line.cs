using System;

public struct LineIntersectInfo
{
    public bool Intersects;
    public bool Parallel;

    public Vector Intersection;
}


public class Line
{
    public Vector pt1;
    public Vector pt2;

    public Line(Vector a, Vector b)  // these 2 points define the line
    {
        this.pt1 = a;
        this.pt2 = b;
    }

    public override string ToString()
    {
        return $"{pt1}->{pt2}";
    }

    public double Length { get { return (pt2 - pt1).Length; }}

    public LineIntersectInfo Intersects(Line line)  //find interestion of 2 lines 
    {
        // computeIntersection(a, b, c, d) {
        // var h1 = this.computeH(a, b, c, d);
        var h1 = computeH(this.pt1, this.pt2, line.pt1, line.pt2);
        // var h2 = this.computeH(c, d, a, b);
        var h2 = computeH(line.pt1, line.pt2, this.pt1, this.pt2);
        var isParallel = double.IsNaN(h1) || double.IsNaN(h2);


        var f = new Vector(line.pt2.x - line.pt1.x, line.pt2.y - line.pt1.y);

        Vector intersection = null;
        if (!isParallel)
            intersection = new Vector(line.pt1.x + f.x * h1, line.pt1.y + f.y * h1);

        // create a new LineIntersectInfo and initialize with the values
        // inside the curly braces and return it all at once.
        return new LineIntersectInfo()
        {
            Intersects = h1 >= 0 && h1 <= 1 && h2 >= 0 && h2 <= 1,
            Parallel = isParallel,
            Intersection = intersection
        };
    }

    public Vector PointBetween()
    {
        Vector r = new Vector(0.0,0.0);
        r = (this.pt1 + this.pt2)/2;
        return r;
    }

    public double AngleBetween(Line line)   //find angle between 2 lines 
    {
        // this == self in python
        double angle1 = Math.Atan2(this.pt1.y - this.pt2.y, this.pt1.x - this.pt2.x);
        double angle2 = Math.Atan2(line.pt1.y - line.pt2.y, line.pt1.x - line.pt2.x);

        // return Math.Abs(angle1) - Math.Abs(angle2);
        return angle1-angle2;
    }

    public double PerpendicularDistanceToThisPoint(Vector thePt)
    {
        //https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
        var denom = Math.Sqrt(Math.Pow(this.pt2.x-this.pt1.x, 2) + Math.Pow(this.pt2.y-this.pt1.y, 2));
        double perpd = Math.Abs((this.pt2.x-this.pt1.x)*(this.pt1.y-thePt.y) - (this.pt1.x-thePt.x)*(this.pt2.y-this.pt1.y))/denom;
        
        return perpd;
    }
   

    public double AngleBetween2(Line line)   //find angle between 2 lines 
    {
        // this == self in python
        double angle1 = Math.Atan2(this.pt1.y - this.pt2.y, this.pt1.x - this.pt2.x);
        double angle2 = Math.Atan2(line.pt1.y - line.pt2.y, line.pt1.x - line.pt2.x);

        return Math.Abs(angle1) - Math.Abs(angle2);
        //return angle1-angle2;
    }

    double computeH(Vector a, Vector b, Vector c, Vector d)
    {
        // E = B-A = ( Bx-Ax, By-Ay )
        var e = new Vector(b.x - a.x, b.y - a.y);

        // F = D-C = ( Dx-Cx, Dy-Cy ) 
        var f = new Vector(d.x - c.x, d.y - c.y);
        // P = ( -Ey, Ex )
        var p = new Vector(-e.y, e.x);

        // h = ( (A-C) * P ) / ( F * P )
        var intersection = f.x * p.x + f.y * p.y;

        if (intersection == 0)
        {
            // Paralel lines
            return double.NaN;
        }

        return ((a.x - c.x) * p.x + (a.y - c.y) * p.y) / intersection;
    }

    //given 3 points: 2 make up a line, and a third other one, this finds a 4th point on the line perp to the 3rd point
    public Vector FindPointOnLinePerpToThisPoint(Vector v)  
    {
        //https://stackoverflow.com/questions/1811549/perpendicular-on-a-line-from-a-given-point 
        //k = ((y2-y1) * (x3-x1) - (x2-x1) * (y3-y1)) / ((y2-y1)^2 + (x2-x1)^2)
        //x4 = x3 - k * (y2-y1)
        //y4 = y3 + k * (x2-x1)
        var x1 = this.pt1.x;
        var y1 = this.pt1.y;
        var x2 = this.pt2.x;
        var y2 = this.pt2.y;
        var x3 = v.x;
        var y3 = v.y;

        double k = ((y2-y1) * (x3-x1) - (x2-x1) * (y3-y1)) / ((y2-y1)*(y2-y1) + (x2-x1)*(x2-x1));

        var theP = new Vector(x3 - k * (y2-y1), y3 + k * (x2-x1));
        return(theP);
    }


    public double FindShortestDistanceToThisPoint(Vector p)  
    {
        var A = p.x - this.pt1.x;
        var B = p.y - this.pt1.y;
        var C = this.pt2.x - this.pt1.x;
        var D = this.pt2.y - this.pt1.y;

        var dot = A * C + B * D;
        var len_sq = C * C + D * D;
        var param = -1.0;
        if (len_sq != 0) //in case of 0 length line
            param = dot / len_sq;

        var xx = this.pt1.x;
        var yy = this.pt1.y;

        if (param < 0) {
            xx = this.pt1.x;
            yy = this.pt1.y;
        }
        else if (param > 1) {
            xx = this.pt2.x;
            yy = this.pt2.y;
        }
        else {
            xx = this.pt1.x + param * C;
            yy = this.pt1.y + param * D;
        }

        var dx = p.x - xx;
        var dy = p.y - yy;

        var d = (p.x - this.pt1.x) * (this.pt2.y  - this.pt1.y) - (p.y - this.pt1.y ) * (this.pt2.x  - this.pt1.x);
        
        return d * Math.Sqrt(dx * dx + dy * dy);

    }

}
