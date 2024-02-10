using System;
using System.IO;
using Shapes;
using UnityEngine;

public class ClockPoints : MonoBehaviour
{
    [SerializeField] private App app;
    [SerializeField] private int nPts = 200;
    [SerializeField] private int nFamily = 4;

    [SerializeField] private Color lineColor = Color.white;
    [SerializeField] [Range(0, 1)] private float lineTransparency = 0.5f;
    [SerializeField] private bool CreatePoints = false;
    [SerializeField] private TextAsset _outputFile;
    [SerializeField] private bool WritePoints = false;

    
    private Vector[][] _ptTable;

    public void Awake()
    {
        CreatePointTable();
        app.DrawSprial += DrawPoints;
    }

    public void Update()
    {
        if(CreatePoints)
        {
            CreatePointTable();
            CreatePoints = false;
        }

        if(WritePoints)
        {
            WritePointTable(_ptTable);
            WritePoints = false;
        }
    }

    private void DrawPoints(Camera cam, Zeta.Spiral s)
    {
        using (Draw.StyleScope)
        {
            lineColor.a = lineTransparency;
            Draw.Thickness = 1 + lineTransparency;

            for(int i = 0; i < _ptTable.Length; i++)
            {
                Vector start = _ptTable[i][0];
                for(int k = 1; k < _ptTable[i].Length; k++)
                {
                    Vector end = _ptTable[i][k];

                    Draw.Color = lineColor;
                    Draw.Line(start, end);
                    start = end;
                }
            }
        }
    }

    public void CreatePointTable()
    {
        _ptTable = new Vector[6][];
        for(int i = 0; i < 6; i++)
        {
            _ptTable[i] = new Vector[nPts];
        }

        for(int i = 0; i < nPts; i++)
        {
            double index = D(nFamily, nPts, i);

            Vector z = new Vector(0, 0);
            _ptTable[0][i] = z;
            _ptTable[1][i] = z;
            _ptTable[2][i] = z;
            _ptTable[3][i] = z;
            _ptTable[4][i] = z;
            _ptTable[5][i] = z;


            // arms
            _ptTable[0][i] = GetRedArm(index);
            // Debug.Log($"{index}, ArmR({_ptTable[0][i]})");
            _ptTable[1][i] = GetGreenArm(index);

            // tdrops
            _ptTable[2][i] = Zeta.InfinityTdrop(index - nFamily, true) + new Vector(1, 0);
            _ptTable[3][i] = Zeta.InfinityTdrop(index - nFamily, false);

            double imag = Zeta.IndexToImag(index);
            _ptTable[4][i] = Zeta.TearDrop(nFamily + 1, imag);
            _ptTable[5][i] = Zeta.TearDrop(nFamily + 1, imag, true);
        }
    }

    public void WritePointTable(Vector[][] table)
    {
        // write table
        string fileName = "ClockArmPoints";
        if(_outputFile != null)
        {
            fileName = _outputFile.name;
        }

        // Combine the path to the "Resources" folder with the file name
        string filePath = Path.Combine("Assets/Resources", fileName);

        // Create or overwrite the file
        using (StreamWriter writer = new StreamWriter(filePath))
        {
            // header
            writer.Write($"index, ArmR.x, ArmR.y, ArmG.x, ArmG.y, InfA.x, InfA.y, InfB.x, InfB.y, TdropA.x, TdropA.y, TdropB.x, TdropB.y");
            writer.WriteLine("");

            // points
            for(int i = 0; i < table[0].Length; i++)
            {
                writer.Write($"{D(nFamily, nPts, i)}");
                for(int j = 0; j < table.Length; j++)
                {
                    writer.Write($", {table[j][i]}");
                }
                writer.WriteLine("");
            }
        }

        // Refresh the Unity editor to reflect changes
        UnityEditor.AssetDatabase.Refresh();

        // Log a message to indicate that the TextAsset is created
        Debug.Log($"Points saved to '{fileName}'");
    }

    private Vector GetRedArm(double t)
    {
        double real = 0.5;
        Vector r = new Vector(Math.Cos(A(t, 1)), Math.Sin(A(t, 1)));
        r /= Math.Pow(Trunc(t)+2, real);
        r *= Math.Sqrt(Trunc(t) + 1);

        return r + new Vector(1, 0);
    }

    private Vector GetGreenArm(double t)
    {
        double real = 0.5;
        Vector r = new Vector(Math.Cos(Math.PI - A(t, 0)), Math.Sin(Math.PI - A(t, 0)));
        r /= Math.Pow(Trunc(t), real);
        r *= Math.Sqrt(Trunc(t) + 1);

        return r;
    }

    private double D(int nFamily, int nPts, int n)
    {
        return nFamily + n/(float)nPts + 0.0001;
    }

    /// <summary>
    /// 1.2 => 0.2
    /// removes leading int
    /// </summary>
    /// <param name="x"></param>
    /// <returns></returns>
    private double Trunc(double x)
    {
        return x - (x % 1);
    }

    /// <summary>
    /// offset 0 = prev;
    /// offset 1 = next;
    /// </summary>
    /// <param name="index"></param>
    /// <param name="offset"></param>
    /// <returns></returns>
    private double A(double index, int offset)
    {
        double value = -Zeta.IndexToImag(index) * (Math.Log(Math.Floor(index + offset)) - Math.Log(Math.Floor(index + offset + 1.0)));
        return value % (2*Math.PI);
    }
}
