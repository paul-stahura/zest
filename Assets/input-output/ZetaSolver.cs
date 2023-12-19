using System;
using System.Collections.Generic;
using Complex = System.Numerics.Complex;
using UnityEngine;
using Unity.Jobs;
using Unity.Collections;
using System.Linq;
using Color = UnityEngine.Color;
using Shapes;
using UnityEditor.UIElements;
using TMPro;
using UnityEngine.UI;
using System.IO;

public class ZetaSolver : MonoBehaviour
{
    #region Variables
    [Header("Teardrop Input Aproximation")]
    public Color highlightColor = Color.white;
    [Range(0, 1)] public float highlightTransparency = 1;
    private List<int> _closestPointIndexies;

    [Header("IndexPlane")]
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
    // // public float pointRadiusScalar = 300;
    // [Range(0, 4)] public float indexPointRadius = 2.0f;
    // private struct IndexPoint
    // {
    //     public IndexPoint(Vector2 pPos, Color pColor)
    //     {
    //         pos = pPos;
    //         color = pColor;
    //     }
    //     public Vector2 pos;
    //     public Color color;
    // }
    // private List<IndexPoint> _indexPoints;

    [Header("TeardropPlane")]
    public Camera TeardropCamera;
    public Transform teardropPlaneOrigin;
    // [Range(0, 1)] public float teardropPointTransparency = 1;
    // // public float dotRadiusScalar = 300;
    // [Range(0, 4)] public float teardropPointRadius = 2.0f;
    // private struct TeardropPoint
    // {
    //     public TeardropPoint(Vector2 pPos, IndexPoint pPair)
    //     {
    //         pos = pPos;
    //         pair = pPair;
    //     }
    //     public Vector2 pos;
    //     public IndexPoint pair;

    //     public Color GetColor()
    //     {
    //         return pair.color;
    //     }
    // }
    // private List<TeardropPoint> _teardropPoints;

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
            Vector2 teardropPos = Zeta.TearDrop(0, 1, s).ToVector2();

            TeardropPoints[index] = new Vector3(teardropPos.x, teardropPos.y, indexPoint.y);
        }
    }

    public void Start()
    {
        ZTrace.OnTeardopPointsUpdated += CalculateInputLine;
        TdropFamily.OnTeardopPointsUpdated += CalculateInputLine;

        _writeToFileButton.onClick.AddListener(() =>
        {
            var ptList = new List<Vector2>();
            for(int i = 0; i < _closestPointIndexies.Count; i++)
            {
                ptList.Add(_pointData.GetPoint(_pointData.GetPointPairIndex(_closestPointIndexies[i])));
            }
            writePointsToFile(ptList);
        });

        
        CreateIndexPlanePoints();
        CreateTeardropPoints();

        _pointData = new ZetaSolverPointData();
        pointRenderer.sourceData = _pointData;

        UpdatePointData();
    }

    public void OnValidate() {
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
            _closestPointIndexies = new List<int>();
        }
    }

    private void CalculateInputLine(List<Vector3> tDrop)
    {
        // reset highlighted Points
        if(_closestPointIndexies != null && _closestPointIndexies.Count > 0)
        {
            for(int i = 0; i < _closestPointIndexies.Count; i++)
            {
                int pairIndex = _pointData.GetPointPairIndex(_closestPointIndexies[i]);
                Color defaultColor = _pointColors[pairIndex];
                _pointData.SetPointColor(_closestPointIndexies[i], defaultColor);
                _pointData.SetPointColor(pairIndex, defaultColor);
            }
        }

        _closestPointIndexies = new List<int>();
        // find closest points
        for(int i = 0; i < tDrop.Count; i++)
        {
            _closestPointIndexies.Add(_pointData.GetClosestTearDropPointIndex(tDrop[i] + teardropPlaneOrigin.transform.position));
        }

        // Highlight closest points
        if(_closestPointIndexies.Count > 0)
        {
            Color color = highlightColor;
            color.a *= highlightTransparency;
            _pointData.HighlightPoints(_closestPointIndexies, color, false, false);
        }

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

            for(int i = 1; i < _closestPointIndexies.Count; i++)
            {
                var from = _pointData.GetPoint(_closestPointIndexies[i - 1]);
                var to = _pointData.GetPoint(_closestPointIndexies[i]);
                Draw.Line(from, to, color);
                
                from = _pointData.GetPoint(_pointData.GetPointPairIndex(_closestPointIndexies[i - 1]));
                to = _pointData.GetPoint(_pointData.GetPointPairIndex(_closestPointIndexies[i]));
                Draw.Line(from, to, color);
            }
        }
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
        }

        // Refresh the Unity editor to reflect changes
        UnityEditor.AssetDatabase.Refresh();

        // Log a message to indicate that the TextAsset is created
        Debug.Log($"Points saved to '{fileName}'");
    }
}
