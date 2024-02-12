using System;
using System.IO;
using Shapes;
using UnityEngine;
using UnityEngine.UI;

public class ClockPoints : MonoBehaviour
{
    [Header("Input")]
    [SerializeField] private App app;
    [SerializeField] private FloatInput nPtsInput;
    [SerializeField] private FloatInput nFamilyInput;
    [SerializeField] private Slider clockTransparencySlider;
    [SerializeField] private Button createPointsButton;
    [SerializeField] private Button writePointsButton;

    [Header("Settings")]
    [SerializeField] private int nPts = 200;
    [SerializeField] private int nFamily = 4;
    [SerializeField] private Color LineColorA = Color.red;
    [SerializeField] private Color LineColorB = Color.green;
    [SerializeField] private Color LineColorInf = Color.cyan;
    [SerializeField] [Range(0, 1)] private float lineTransparency = 0.5f;
    [SerializeField] private bool createPoints = false;
    [SerializeField] private TextAsset _outputFile;
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
            WritePointTable(_ptTable);
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

        nFamilyInput = GameObject.Find("ClockFamily")?.GetComponent<FloatInput>();
        nFamilyInput.Value = nFamily;
        nFamilyInput?.onValueChanged.AddListener((float value) =>
        {
            nFamily = (int)value;
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
            WritePointTable(_ptTable);
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
