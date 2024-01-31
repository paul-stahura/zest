using System;
using System.Collections.Generic;
using Complex = System.Numerics.Complex;
using UnityEngine;
using Unity.Jobs;
using Unity.Collections;
using System.Linq;
using Color = UnityEngine.Color;
using Shapes;
using UnityEngine.UI;
using System.IO;

public class ZetaSolver : MonoBehaviour
{
    #region UI
    [Header("UI")]
    public FloatInput inputXOffset;
    public FloatInput inputYOffset;
    public FloatInput inputNumBands;
    public FloatInput inputSizeX;
    public FloatInput inputSizeY;
    public FloatInput inputDensityX;
    public FloatInput inputDensityY;
    public Button resetInputButton;
    public Button recalculateInputButton;
    #endregion

    #region Variables
    [Header("Teardrop Input Aproximation")]
    public Color highlightColor = Color.white;
    [SerializeField] private bool _highlightIndexPlane = true;
    [SerializeField] private bool _highlightTdropPlane = true;
    [Range(0, 1)] public float highlightTransparency = 1;
    private List<List<int>> _closestPointIndexies;

    [Header("IndexPlane")]
    [SerializeField] private bool _recalculatePointsBtn = false;
    public Camera indexCamera;
    public Transform indexPlaneOrigin;
    public Vector2 indexPlaneOffset = new Vector2(0, 0);

    public int numOfBands = 3;
    public Vector2 bandSize = new Vector2(0.25f, 1);
    [Tooltip("Number of points between")] public Vector2 bandDensity = new Vector2(10, 40);
    public List<Color> bandColors = new List<Color>() 
    {
        Color.red,
        Color.green,
        Color.blue,
        Color.magenta,
    };
    [Range(0, 1)] public float bandTransparency = 1;

    [Header("TeardropPlane")]
    public Camera TeardropCamera;
    public Transform teardropPlaneOrigin;

    [Header("Point Cloud")]
    public ZetaSolverPointRenderer pointRenderer;
    private ZetaSolverPointData _pointData;
    private List<Vector2> _indexPoints;
    private List<Vector3> _teardropPoints;
    private List<Color32> _pointColors;

    [Header("IO")]
    [SerializeField] private TextAsset _outputFile;
    [SerializeField] private Button _writeToFileButton;

    #endregion

    // Job struct to perform the calculations
    private struct CalculateZetaPoints : IJobParallelFor
    {
        [ReadOnly]
        public NativeArray<Vector2> IndexPoints;

        [WriteOnly]
        public NativeArray<Vector3> TeardropPoints;

        public void Execute(int index)
        {
            var indexPoint = IndexPoints[index];

            Complex s = new Complex(indexPoint.x, Zeta.IndexToImag(indexPoint.y));
            Vector2 teardropPos = Zeta.EulerMaclauren(s).ToVector2();

            TeardropPoints[index] = new Vector3(teardropPos.x, teardropPos.y, indexPoint.y);
        }
    }

    public void Start()
    {
        ZTrace.OnPointsUpdated += HandleOnPointsUpdated;
        TdropFamily.OnTeardropPointsUpdated += CalculateTdropInputLines;

        initInput();

        _writeToFileButton.onClick.AddListener(() =>
        {
            var ptList = new List<Vector2>();
            List<List<Vector2>> pointsList = new List<List<Vector2>>();
            for(int i = 0; i < _closestPointIndexies.Count; i++)
            {
                pointsList.Add(new List<Vector2>());
                for (int j = 0; j < _closestPointIndexies[i].Count; j++)
                {
                    Vector2 pt = _pointData.GetPoint(_pointData.GetPointPairIndex(_closestPointIndexies[i][j]));
                    ptList.Add(pt);
                    // flip xy
                    pointsList[i].Add(new Vector2(pt.y, pt.x));
                }
            }
            writePointTable(pointsList);
            // writePointsToFile(ptList);
        });

        
        CreateIndexPlanePoints();
        CreateTeardropPoints();

        _pointData = new ZetaSolverPointData();
        pointRenderer.sourceData = _pointData;

        UpdatePointData();
    }

    public void initInput()
    {
        inputXOffset = GameObject.Find("InputXoffset")?.GetComponent<FloatInput>();
        inputXOffset?.onValueChanged.AddListener((float value) => 
        {
            indexPlaneOffset.x = value;
        });

        inputYOffset = GameObject.Find("InputYoffset")?.GetComponent<FloatInput>();
        inputYOffset?.onValueChanged.AddListener((float value) => 
        {
            indexPlaneOffset.y = value;
        });

        inputNumBands = GameObject.Find("InputNumBands")?.GetComponent<FloatInput>();
        inputNumBands?.onValueChanged.AddListener((float value) => 
        {
            numOfBands = (int)value;
        });
        
        inputSizeX = GameObject.Find("InputSizeX")?.GetComponent<FloatInput>();
        inputSizeX?.onValueChanged.AddListener((float value) =>
        {
            bandSize.x = value;
        });

        inputSizeY = GameObject.Find("InputSizeY")?.GetComponent<FloatInput>();
        inputSizeY?.onValueChanged.AddListener((float value) =>
        {
            bandSize.y = value;
        });
        
        inputDensityX = GameObject.Find("InputDensityX")?.GetComponent<FloatInput>();
        inputDensityX?.onValueChanged.AddListener((float value) =>
        {
            bandDensity.x = value;
        });

        inputDensityY = GameObject.Find("InputDensityY")?.GetComponent<FloatInput>();
        inputDensityY?.onValueChanged.AddListener((float value) =>
        {
            bandDensity.y = value;
        });

        resetInputButton = GameObject.Find("ResetInputButton")?.GetComponent<Button>();
        resetInputButton?.onClick.AddListener(() =>
        {
            ResetBands();
        });

        recalculateInputButton = GameObject.Find("RecalculateInputButton")?.GetComponent<Button>();
        recalculateInputButton?.onClick.AddListener(() =>
        {
            RecalculatePoints();
        });
    }

    public void ResetBands()
    {
        inputXOffset.Value = indexPlaneOffset.x = -0.05f;
        inputYOffset.Value = indexPlaneOffset.x = 0;
        inputNumBands.Value = numOfBands = 6;
        inputSizeX.Value = bandSize.x = 0.125f;
        inputSizeY.Value = bandSize.y = 1.002f;
        inputDensityX.Value = bandDensity.x = 50;
        inputDensityY.Value = bandDensity.y = 700;

        RecalculatePoints();
    }

    public void OnValidate() {
        if(_recalculatePointsBtn)
        {
            RecalculatePoints();
            _recalculatePointsBtn = false;
        }
    }

    public void RecalculatePoints()
    {
        CreateIndexPlanePoints();
        CreateTeardropPoints();

        UpdatePointData();
    }

    public void OnDrawShapes()
    {
        if(_closestPointIndexies != null)
        {
            DrawApproximateInputLine();
        }
    }

    private void CreateIndexPlanePoints()
    {
        _indexPoints = new List<Vector2>();
        _pointColors = new List<Color32>();
        
        for(int band = 0; band < numOfBands; band++)
        {
            Color drawColor = bandColors[band % 4];
            drawColor.a = bandTransparency;

            // to avoid negatives and deviding by zero
            if(bandDensity.x <= 0) bandDensity.x = 0.001f;
            if(bandDensity.y <= 0) bandDensity.y = 0.001f;

            double xIncrement = bandSize.x / bandDensity.x;
            double yIncrement = bandSize.y / bandDensity.y;
            for(double x = 0; x < bandSize.x; x += xIncrement)
            {
                for(double y = 0; y < bandSize.y + yIncrement; y += yIncrement)
                {
                    var offset = new Vector(indexPlaneOrigin.position.x + indexPlaneOffset.x, indexPlaneOrigin.position.y + indexPlaneOffset.y);
                    offset += new Vector(bandSize.x * band, 0);
                    var pt = new Vector(x, y) + offset;
                    _indexPoints.Add(pt);
                    _pointColors.Add(drawColor);
                }
            }
        }
    }

    // uses the job system to calculate zeta for every point
    private void CreateTeardropPoints()
    {
        _teardropPoints = new List<Vector3>(_indexPoints.Count);

        // Convert indexPoints list to native array for job processing
        NativeArray<Vector2> inputPointsArray = new NativeArray<Vector2>(_indexPoints.Count, Allocator.TempJob);
        for(int i = 0; i < _indexPoints.Count; i++)
        {
            inputPointsArray[i] = _indexPoints[i];
        }

        // Create a native array for the teardropPoints
        NativeArray<Vector3> teardropPointsArray = new NativeArray<Vector3>(_indexPoints.Count, Allocator.TempJob);

        // Create a job and set its data
        CalculateZetaPoints pointJob = new CalculateZetaPoints
        {
            IndexPoints = inputPointsArray,
            TeardropPoints = teardropPointsArray
        };

        // Schedule the job
        JobHandle jobHandle = pointJob.Schedule(inputPointsArray.Length, 64);

        // Wait for the job to complete
        jobHandle.Complete();

        // Convert the native array back to a managed array
        _teardropPoints = teardropPointsArray.ToList();
        for(int i = 0; i < _teardropPoints.Count - 1; i++)
        {
            _teardropPoints[i] += new Vector3(teardropPlaneOrigin.transform.position.x, 0, 0);
        }

        // Dispose of the native arrays
        inputPointsArray.Dispose();
        teardropPointsArray.Dispose();
    }

    private void UpdatePointData()
    {
        if(_pointData != null) 
        {
            _pointData.Initialize(_indexPoints, _teardropPoints, _pointColors);
            _closestPointIndexies = new List<List<int>>();
        }
    }

    private void HandleOnPointsUpdated(List<Vector3> pts)
    {
        CalculateInputLine(pts);
    }

    private void CalculateInputLine(List<Vector3> pts, bool addLine = false)
    {
        if(!addLine)
        {
            // // reset highlighted Points
            // if(_closestPointIndexies != null && _closestPointIndexies.Count > 0)
            // {
            //     for(int i = 0; i < _closestPointIndexies.Count; i++)
            //     {
            //         for (int j = 0; j < _closestPointIndexies[i].Count; j++)
            //         {
            //             int pairIndex = _pointData.GetPointPairIndex(_closestPointIndexies[i][j]);
            //             Color defaultColor = _pointColors[pairIndex];
            //             _pointData.SetPointColor(_closestPointIndexies[i][j], defaultColor);
            //             _pointData.SetPointColor(pairIndex, defaultColor);
            //         }
            //     }
            // }

            _closestPointIndexies.Clear();
        }

        int lineIndex = _closestPointIndexies.Count;
        _closestPointIndexies.Add(new());

        // find closest points
        for(int i = 0; i < pts.Count; i++)
        {
            _closestPointIndexies[lineIndex].Add(_pointData.GetClosestTearDropPointIndex(pts[i] + teardropPlaneOrigin.transform.position));
        }

        // // Highlight closest points
        // if(_closestPointIndexies.Count > 0)
        // {
        //     Color color = highlightColor;
        //     color.a *= highlightTransparency;
        //     _pointData.HighlightPoints(_closestPointIndexies[lineIndex], color, false, false);
        // }

        DrawApproximateInputLine();
    }

    private void DrawApproximateInputLine()
    {
        using (Draw.StyleScope)
        {
            Draw.Matrix = indexPlaneOrigin.localToWorldMatrix;

            Color color = highlightColor;
            color.a *= highlightTransparency;
            Draw.Thickness = 1f;

            for(int i = 0; i < _closestPointIndexies.Count; i++)
            {
                for (int j = 1; j < _closestPointIndexies[i].Count; j++)
                {
                    Vector3 from;
                    Vector3 to;

                    if(_highlightTdropPlane)
                    {
                        from = _pointData.GetPoint(_closestPointIndexies[i][j - 1]);
                        to = _pointData.GetPoint(_closestPointIndexies[i][j]);
                        Draw.Line(from, to, color);
                    }
                    
                    if(_highlightIndexPlane)
                    {
                        from = _pointData.GetPoint(_pointData.GetPointPairIndex(_closestPointIndexies[i][j - 1]));
                        to = _pointData.GetPoint(_pointData.GetPointPairIndex(_closestPointIndexies[i][j]));
                        Draw.Line(from, to, color);
                    }
                }
            }
        }
    }

    private void CalculateTdropInputLines(List<Vector3> tdropInfinity, List<List<Vector3>> tdropFamily)
    {
        CalculateInputLine(tdropInfinity);

        for (int i = 0; i < tdropFamily.Count; i++)
        {
            CalculateInputLine(tdropFamily[i], true);
        }
    }

    /// <summary>
    /// takes a list of lines and creates a table with a shared x axis
    /// </summary>
    /// <param name="pointsList"></param>
    private void writePointTable(List<List<Vector2>> pointsList)
    {
        // create a list of all the x points
        List<float> xList = new List<float>();
        foreach(List<Vector2> ptList in pointsList)
        {   
            foreach(Vector2 pt in ptList)
            {
                if(!xList.Contains(pt.x))
                {

                    // if(pt.x > )
                    xList.Add(pt.x);
                }
            }
        }

        // sort low to high
        xList.Sort();

        // create lists of y points
        List<List<float>> yLists = new List<List<float>>();
        for(int i = 0; i < pointsList.Count; i++)
        {
            yLists.Add(new List<float>());
            for(int j = 0; j < xList.Count; j++)
            {
                for(int k = 0; k < pointsList[i].Count; k++)
                {
                    Vector2 pt = pointsList[i][k];
                    // if same value, add to ylist
                    if(pt.x == xList[j])
                    {
                        yLists[i].Add(pt.y);
                        break;
                    }
                    else if(xList[j] < pt.x)
                    {
                        if(k == 0)
                        {
                            // use later points for this approximation
                            yLists[i].Add(getPointOnLine(pt, pointsList[i][k + 5], xList[j]).y);
                            break;
                        }
                        else
                        {
                            // use points before and after
                            yLists[i].Add(getPointOnLine(pointsList[i][k - 1], pt, xList[j]).y);
                            break;
                        }
                    }
                    // if more, and no more points, project
                    else if(k == pointsList[i].Count - 1)
                    {
                        // use prev points for this approximation
                        yLists[i].Add(getPointOnLine(pointsList[i][k - 5], pt, xList[j]).y);
                        break;
                    }
                }
            }
        }

        // write table
        string fileName = "ZetaSolverClosestPoints";
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
            writer.Write($"x");
            for(int i = 0; i < yLists.Count; i++)
            {
                writer.Write($", y{i}");
            }
            writer.WriteLine("");

            bool lastPointflag = false;

            // points
            // write every nth point
            int n = 1;
            for(int i = 0; i < xList.Count; i += n)
            {
                if(i == xList.Count - 1)
                {
                    lastPointflag = true;
                }

                writer.Write($"{xList[i]}");
                for(int j = 0; j < yLists.Count; j++)
                {
                    writer.Write($", {yLists[j][i]}");
                }
                writer.WriteLine("");
            }

            if(!lastPointflag)
            {
                writer.Write($"{xList[xList.Count - 1]}");
                for(int j = 0; j < yLists.Count; j++)
                {
                    writer.Write($", {yLists[j][xList.Count - 1]}");
                }
                writer.WriteLine("");
            }
        }

        // Refresh the Unity editor to reflect changes
        UnityEditor.AssetDatabase.Refresh();

        // Log a message to indicate that the TextAsset is created
        Debug.Log($"Points saved to '{fileName}'");
    }

    private Vector2 getPointOnLine(Vector2 a, Vector2 b, float xValue)
    {
        if(b.x - a.x == 0) return new Vector2(xValue, xValue);
        if(b.y - a.y == 0) return new Vector2(xValue, a.y);

        // y = mx + b
        float slope = (b.y - a.y) / (b.x - a.x);
        float intersept = a.y - slope * a.x;

        return new Vector2(xValue, slope * xValue + intersept);
    }

    private void writePointsToFile(List<Vector2> ptList)
    {

        string fileName = "ZetaSolverClosestPoints";
        if(_outputFile != null)
        {
            fileName = _outputFile.name;
        }

        // Combine the path to the "Resources" folder with the file name
        string filePath = Path.Combine("Assets/Resources", fileName);

        // Create or overwrite the file
        using (StreamWriter writer = new StreamWriter(filePath))
        {
            foreach (Vector2 pt in ptList)
            {
                // Write each Vector2 point to a new line in the file
                writer.WriteLine($"{pt.x},{pt.y}");
            }

            // int ptsPer = ptList.Count / _closestPointIndexies.Count;
            // for(int i = 0; i < ptList.Count; i++)
            // {
            //     if(i % ptsPer == 0)
            //     {
            //         writer.WriteLine($"Tdrop #{i}");
            //     }
            //     writer.WriteLine($"{ptList[i].x},{ptList[i].y}");
            // }
        }

        // Refresh the Unity editor to reflect changes
        UnityEditor.AssetDatabase.Refresh();

        // Log a message to indicate that the TextAsset is created
        Debug.Log($"Points saved to '{fileName}'");
    }
}
