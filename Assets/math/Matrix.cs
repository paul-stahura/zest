using System;
using MathNet.Numerics.LinearAlgebra;
using Shapes;

public class Matrix
{
    Matrix<double> matrix;

    public Matrix()
    {
        matrix = Matrix<double>.Build.DenseIdentity(3, 3);
    }

    public Matrix(Matrix<double> m)
    {
        this.matrix = m;
    }

    public Matrix(double theta, double len)
    {
        matrix = Matrix<double>.Build.DenseIdentity(3, 3);

        matrix.SetColumn(0, new double[] { Math.Cos(theta), Math.Sin(theta), 0 });
        matrix.SetColumn(1, new double[] { -Math.Sin(theta), Math.Cos(theta), 0 });
        matrix.SetColumn(2, new double[] { len, 0, 1 });
    }

    public void SetThetaLen(double theta, double len)
    {
        matrix = Matrix<double>.Build.DenseIdentity(3, 3);

        matrix.SetColumn(0, new double[] { Math.Cos(theta), Math.Sin(theta), 0 });
        matrix.SetColumn(1, new double[] { -Math.Sin(theta), Math.Cos(theta), 0 });
        matrix.SetColumn(2, new double[] { len, 0, 1 });
    }

    public static Matrix operator *(Matrix a, Matrix b) => new Matrix(a.matrix * b.matrix);

    // The first index always refers to the row and the second index to the column
    // https://numerics.mathdotnet.com/Matrix.html
    public double this[int row, int col]
    {
        get { return matrix[row, col]; }
        set { matrix[row, col] = value; }
    }

    public Vector Position
    {
        get { return new Vector(matrix[0, 2], matrix[1, 2]); }
        set { matrix.SetColumn(2, new double[] { value.x, value.y, 1 }); }
    }

    public void LineTo(Matrix to)
    {
        var a = this.Position.ToVector2();
        var b = to.Position.ToVector2();

        Draw.Line(a, b);
    }

    public void LongerLineTo(float stretch, Matrix to)
    {
        var a = this.Position.ToVector2();
        var b = to.Position.ToVector2();

        //If 𝐴=(𝑎x,𝑎y) and 𝐵=(𝑏x,𝑏y), then 𝑃(𝑐)=(𝑎x+𝑐(𝑏x−𝑎x), 𝑎y+𝑐(𝑏y−𝑎y)).
        var c = a + stretch*(b-a);
        var d = b + stretch*(a-b);

        Draw.Line(c, d);
    }

    public void Circle(double dia)
    {
        var center = this.Position.ToVector2();
        Draw.Disc(center, (float)dia);
    }

    public override string ToString()
    {
        return matrix.ToString();
    }
}
