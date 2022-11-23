using System;
using UnityEngine;

public class Vector
{
    double[] vector;

    public Vector()
    {
        vector = new double[2];
    }

    public Vector(double x, double y)
    {
        vector = new double[2] { x, y };
    }

    public Vector(Vector2 v)
    {
        vector = new double[2] { v.x, v.y };
    }

    public double x
    {
        get { return this.vector[0]; }
        set { this.vector[0] = value; }
    }

    public double y
    {
        get { return this.vector[1]; }
        set { this.vector[1] = value; }
    }

    public override string ToString()
    {   
        var format = "0.00000";
        return $"{x.ToString(format)},{y.ToString(format)}";
    }

    public static implicit operator Vector2(Vector v) => v.ToVector2();
    public static implicit operator Vector3(Vector v) => new Vector3((float)v.x, (float)v.y, 0);
    public static Vector operator +(Vector a, Vector b) => new Vector(a.x + b.x, a.y + b.y);
    public static Vector operator -(Vector a, Vector b) => new Vector(a.x - b.x, a.y - b.y);
    public static Vector operator *(Vector a, Vector b) => new Vector(a.x * b.x, a.y * b.y);
    public static Vector operator *(Vector a, double m) => new Vector(a.x * m, a.y * m);
    // public static Vector operator *(Vector a, Matrix m)
    // {
    //     var mat = new Matrix();
    //     mat.Position = a;

    //     return (mat * m).Position;
    // }

    public static Vector operator /(Vector a, double d) => new Vector(a.x / d, a.y / d);

    public Vector2 ToVector2()
    {
        return new Vector2((float)x, (float)y);
    }

    public void Normalize()
    {
        var distance = Math.Sqrt(x * x + y * y);
        x = x / distance;
        y = y / distance;
    }

    public double DistanceTo(Vector b)
    {
        return Distance(this, b);
    }

    public double Length { get { return Math.Sqrt(x*x + y*y); } }

    public static double Distance(Vector a, Vector b)
    {
        double dist =  Math.Sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
        /*
        if(double.IsNaN(dist))
        {
            Debug.Log($"a:{a} b:{b}");
            dist = 0;
        }
        */
        return dist;
    }

    public Vector Abs()
    {
        return new Vector(Math.Abs(x), Math.Abs(y));
    }


   

}