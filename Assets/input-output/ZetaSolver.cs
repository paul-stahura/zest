using System;
using System.Collections;
using System.Collections.Generic;
using Shapes;
using Complex = System.Numerics.Complex;
using UnityEngine;
using Unity.Jobs;
using Unity.Collections;
using System.Linq;
using System.Diagnostics;
using Unity.Editor.Tasks;
using UnityEngine.UI;
using Color = UnityEngine.Color;
using System.Drawing;

public class ZetaSolver : MonoBehaviour
{
    #region Variables
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
        CreateIndexPlanePoints();
        CreateTeardropPoints();

        _pointData = new ZetaSolverPointData();
        pointRenderer.sourceData = _pointData;

        UpdatePointData();
    }

    public void OnValidate() {
        CreateIndexPlanePoints();
        CreateTeardropPoints();

        // DrawIndexPlanePoints();
        // DrawTeardropPlanePoints();
        UpdatePointData();
    }

    private void CreateIndexPlanePoints()
    {
        _indexPoints = new List<Vector2>();
        _pointColors = new List<Color32>();
        
        for(int band = 0; band < numOfBands; band++)
        {
            Color drawColor = bandColors[band % 4];
            drawColor.a = bandTransparency;

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
        }
    }
}
