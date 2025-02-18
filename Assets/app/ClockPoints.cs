using System;
using System.IO;
using System.Linq;
using Shapes;
using UnityEngine;
using UnityEngine.UI;

public class ClockPoints : MonoBehaviour
{
    [Header("Input")]
    [SerializeField] private App app;
    [SerializeField] private FloatInput nPtsInput;
    [SerializeField] private FloatInput nFamilyInputStart;
    [SerializeField] private FloatInput nFamilyInputEnd;
    [SerializeField] private Slider clockTransparencySlider;
    [SerializeField] private Button createPointsButton;
    [SerializeField] private Button writePointsButton;

    [Header("Settings")]
    [SerializeField] private int nPts = 200;
    [SerializeField] private int nFamilyStart = 0;
    [SerializeField] private int nFamilyEnd = 4;
    [SerializeField] private Color LineColorA = Color.red;
    [SerializeField] private Color LineColorB = Color.green;
    [SerializeField] private Color LineColorInf = Color.cyan;
    [SerializeField] [Range(0, 1)] private float lineTransparency = 0.5f;
    [SerializeField] private bool createPoints = false;
    [SerializeField] private bool writePoints = false;

    
    private Vector[][] _ptTable;

    public void Awake()
    {
        InitInput();
    }

    public void Update()
    {
        if(createPoints)
        {
            CreatePointTable();
            createPoints = false;
        }

        if(writePoints)
        {
            WritePointTables(_ptTable);
            writePoints = false;
        }
    }

    private void InitInput()
    {
        app = GameObject.Find("App")?.GetComponent<App>();
        app.DrawSprial += DrawPoints;

        nPtsInput = GameObject.Find("NumClockPts")?.GetComponent<FloatInput>();
        nPtsInput.Value = nPts;
        nPtsInput?.onValueChanged.AddListener((float value) =>
        {
            nPts = (int)value;
        });

        nFamilyInputStart = GameObject.Find("ClockFamilyStart")?.GetComponent<FloatInput>();
        nFamilyInputStart.Value = nFamilyStart;
        nFamilyInputStart?.onValueChanged.AddListener((float value) =>
        {
            nFamilyStart = (int)value;
        });

        nFamilyInputEnd = GameObject.Find("ClockFamilyEnd")?.GetComponent<FloatInput>();
        nFamilyInputEnd.Value = nFamilyEnd;
        nFamilyInputEnd?.onValueChanged.AddListener((float value) =>
        {
            nFamilyEnd = (int)value;
        });

        clockTransparencySlider = GameObject.Find("ClockTransparencySlider")?.GetComponent<Slider>();
        clockTransparencySlider.value = lineTransparency;
        clockTransparencySlider?.onValueChanged.AddListener((float value) =>
        {
            lineTransparency = value;
        });

        createPointsButton = GameObject.Find("CreateClockPts")?.GetComponent<Button>();
        createPointsButton?.onClick.AddListener(() =>
        {
            CreatePointTable();
        });

        writePointsButton = GameObject.Find("WriteClockPts")?.GetComponent<Button>();
        writePointsButton?.onClick.AddListener(() =>
        {
            CreatePointTable();
            WritePointTables(_ptTable);
        });

    }

    private void DrawPoints(Camera cam, Zeta.Spiral s)
    {
        if(_ptTable == null) return;

        using (Draw.StyleScope)
        {
            LineColorA.a = lineTransparency;
            LineColorB.a = lineTransparency;
            LineColorInf.a = lineTransparency;
            Draw.Thickness = 1 + lineTransparency;

            for(int i = 0; i < _ptTable.Length; i++)
            {
                Vector start = _ptTable[i][0];
                for(int k = 1; k < _ptTable[i].Length; k++)
                {
                    if(k % nPts == 0) 
                    {
                        start = _ptTable[i][k];
                        continue;
                    }

                    Vector end = _ptTable[i][k];

                    Draw.Color = i % 2 == 0 ? LineColorA : LineColorB;
                    if(i == 2 || i == 3) Draw.Color = LineColorInf;
                    Draw.Line(start, end);
                    start = end;
                }

                // complete infinity loop
                if(i == 2 || i == 3) 
                {
                    Draw.Line(start, _ptTable[i][0]);
                }
            }
        }
    }

    public void CreatePointTable()
    {
        if(nFamilyEnd < nFamilyInputStart) return;

        _ptTable = new Vector[6][];
        for(int i = 0; i < 6; i++)
        {
            _ptTable[i] = new Vector[nPts * (nFamilyEnd + 1 - nFamilyStart)];
        }

        for(int n = 0; n <= nFamilyEnd - nFamilyStart; n++)
        {
            var nFamily = n + nFamilyStart;

            for(int i = 0; i < nPts; i++)
            {
                double index = D(nFamily, nPts, i);

                int tableIndex = i + n*nPts;

                // arms
                _ptTable[0][tableIndex] = GetRedArm(index);
                // Debug.Log($"{index}, ArmR({_ptTable[0][i]})");
                _ptTable[1][tableIndex] = GetGreenArm(index);

                // tdrops
                _ptTable[2][tableIndex] = Zeta.InfinityTdrop(index - nFamily, true) + new Vector(1, 0);
                _ptTable[3][tableIndex] = Zeta.InfinityTdrop(index - nFamily, false);

                double imag = Zeta.IndexToImag(index, app.usingPolyImag);
                _ptTable[4][tableIndex] = Zeta.TearDrop(nFamily + 1, 0.5, imag);
                _ptTable[5][tableIndex] = Zeta.TearDrop(nFamily + 1, 0.5, imag, true);
            }
        }
        
    }

    public void WritePointTables(Vector[][] table)
    {
        WriteFullPointTable(table);
        WriteFamilyPointTables(table);
        WriteIndividualPointTables(table);

        // Refresh the Unity editor to reflect changes
        UnityEditor.AssetDatabase.Refresh();

        Application.OpenURL(Application.dataPath + "/StreamingAssets");
    }

    private void WriteFullPointTable(Vector[][] table)
    {
        // write table
        string fileName = "FullClockArmPoints.csv";

        // Combine the path to the "Resources" folder with the file name
        string filePath = Path.Combine(Application.dataPath + "/StreamingAssets", fileName);

        // Create or overwrite the file
        using (StreamWriter writer = new StreamWriter(filePath, false))
        {
            // header
            writer.WriteLine($"index, Ar.x, Ar.y, Ag.x, Ag.y, InfR.x, InfR.y, InfG.x, InfG.y, Tr.x, Tr.y, Tg.x, Tg.y");

            // points
            for(int i = 0; i < table[0].Length; i++)
            {
                int fam = nFamilyStart + (i / nPts);
                writer.Write($"{D(fam, nPts, i % nPts)}");
                for(int j = 0; j < table.Length; j++)
                {
                    writer.Write($", {table[j][i]}");
                }
                writer.WriteLine("");
            }
        }
    }

    private void WriteFamilyPointTables(Vector[][] table)
    {
        int famCount = nFamilyEnd - nFamilyStart + 1;
        for(int f = 0; f < famCount; f++)
        {
            // write table
            string fileName = $"ClockArmPointsFam{nFamilyStart + f}.csv";

            // Combine the path to the "Resources" folder with the file name
            string filePath = Path.Combine(Application.dataPath + "/StreamingAssets", fileName);

            // Create or overwrite the file
            using (StreamWriter writer = new StreamWriter(filePath, false))
            {
                // header
                writer.WriteLine($"index, Ar.x, Ar.y, Ag.x, Ag.y, InfR.x, InfR.y, InfG.x, InfG.y, Tr.x, Tr.y, Tg.x, Tg.y");

                // points
                for(int i = 0; i < nPts; i++)
                {
                    int index = i + f*nPts;
                    int fam = nFamilyStart + f;
                    writer.Write($"{D(fam, nPts, i)}");
                    for(int j = 0; j < table.Length; j++)
                    {
                        writer.Write($", {table[j][index]}");
                    }
                    writer.WriteLine("");
                }
            }
        }
    }

    private void WriteIndividualPointTables(Vector[][] table)
    {
        string[] fileNames = new string[] {"ArPoints.csv", "AgPoints.csv", "InfRPoints.csv", "InfGPoints.csv", "TrPoints.csv", "TgPoints.csv"};
        string[] fileHeaders = new string[] {"Ar", "Ag", "InfR", "InfG", "Tr", "Tg"};
        int famCount = nFamilyEnd - nFamilyStart + 1;

        for(int f = 0; f < fileNames.Length; f++)
        {
            string fileName = fileNames[f];
            string filePath = Path.Combine(Application.dataPath + "/StreamingAssets", fileName);

            using (StreamWriter writer = new StreamWriter(filePath, false))
            {
                // header
                writer.Write("index");
                for(int i = 0; i < famCount; i++)
                {
                    writer.Write($", F{nFamilyStart + i} {fileHeaders[f]}.x, F{nFamilyStart + i} {fileHeaders[f]}.y");
                }
                writer.WriteLine("");


                // points
                for(int i = 0; i < nPts; i++)
                {
                    writer.Write($"{D(0, nPts, i)}");
                    for(int j = 0; j < famCount; j++)
                    {
                        writer.Write($", {table[f][i + j*nPts]}");
                    }
                    writer.WriteLine("");
                }
            }
        }
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
        double value = -Zeta.IndexToImag(index, app.usingPolyImag) * (Math.Log(Math.Floor(index + offset)) - Math.Log(Math.Floor(index + offset + 1.0)));
        return value % (2*Math.PI);
    }
}
