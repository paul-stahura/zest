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
    // public float pointRadiusScalar = 300;
    [Range(0, 4)] public float indexPointRadius = 2.0f;
    private struct IndexPoint
    {
        public IndexPoint(Vector2 pPos, Color pColor)
        {
            pos = pPos;
            color = pColor;
        }
        public Vector2 pos;
        public Color color;
    }
    private List<IndexPoint> _indexPoints;

    [Header("TeardropPlane")]
    public Camera TeardropCamera;
    public Transform teardropPlaneOrigin;
    [Range(0, 1)] public float teardropPointTransparency = 1;
    // public float dotRadiusScalar = 300;
    [Range(0, 4)] public float teardropPointRadius = 2.0f;
    private struct TeardropPoint
    {
        public TeardropPoint(Vector2 pPos, IndexPoint pPair)
        {
            pos = pPos;
            pair = pPair;
        }
        public Vector2 pos;
        public IndexPoint pair;

        public Color GetColor()
        {
            return pair.color;
        }
    }
    private List<TeardropPoint> _teardropPoints;
    #endregion

    // Job struct to perform the calculations
    private struct CalculateZetaPoints : IJobParallelFor
    {
        [ReadOnly]
        public NativeArray<IndexPoint> IndexPoints;

        [WriteOnly]
        public NativeArray<TeardropPoint> TeardropPoints;

        public void Execute(int index)
        {
            IndexPoint indexPoint = IndexPoints[index];

            Complex s = new Complex(indexPoint.pos.x, Zeta.IndexToImag(indexPoint.pos.y));
            Vector2 teardropPos = Zeta.TearDrop(0, 1, s).ToVector2();

            TeardropPoints[index] = new TeardropPoint(teardropPos, indexPoint);
        }
    }

    public void Start()
    {
        CreateIndexPlanePoints();
        CreateTeardropPoints();
    }

    public void OnValidate() {
        CreateIndexPlanePoints();
        CreateTeardropPoints();
    }

    public void OnDrawShapes(Camera cam)
    {
        if(bandTransparency > 0.1f)
        {
            DrawIndexPlanePoints();
        }

        if(teardropPointTransparency > 0.1f)
        {
            DrawTeardropPlanePoints();
        }
    }

    private void CreateIndexPlanePoints()
    {
        _indexPoints = new List<IndexPoint>();
        
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
                    _indexPoints.Add(new IndexPoint(pt, drawColor));
                }
            }
        }
    }

    private void CreateTeardropPoints()
    {
        // _teardropPoints = new List<TeardropPoint>();

        // foreach(IndexPoint point in _indexPoints)
        // {
        //     Complex s = new Complex(point.pos.x, Zeta.IndexToImag(point.pos.y));
        //     // var offset = new Vector(teardropPlaneOrigin.position.x, teardropPlaneOrigin.position.y);
        //     var pt = Zeta.TearDrop(0, 1, s).ToVector();
        //     _teardropPoints.Add(new TeardropPoint(pt, point));
        // }


        // Job Attempt
        _teardropPoints = new List<TeardropPoint>(_indexPoints.Count);

        // Convert indexPoints list to native array for job processing
        NativeArray<IndexPoint> inputPointsArray = new NativeArray<IndexPoint>(_indexPoints.Count, Allocator.TempJob);
        for(int i = 0; i < _indexPoints.Count; i++)
        {
            inputPointsArray[i] = _indexPoints[i];
        }

        // Create a native array for the teardropPoints
        NativeArray<TeardropPoint> teardropPointsArray = new NativeArray<TeardropPoint>(_indexPoints.Count, Allocator.TempJob);

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

        // Dispose of the native arrays
        inputPointsArray.Dispose();
        teardropPointsArray.Dispose();
    }

    private void DrawIndexPlanePoints()
    {
        using (Draw.StyleScope)
        {
            Draw.Matrix = indexPlaneOrigin.localToWorldMatrix;
            foreach(IndexPoint pt in _indexPoints)
            {
                Draw.Disc(pt.pos, indexPointRadius / 1000, pt.color);
            }
        }
    }

    private void DrawTeardropPlanePoints()
    {
        using (Draw.StyleScope)
        {
            Draw.Matrix = teardropPlaneOrigin.localToWorldMatrix;
            foreach(TeardropPoint pt in _teardropPoints)
            {
                Color drawColor = pt.GetColor();
                drawColor.a = teardropPointTransparency;
                Draw.Disc(pt.pos, teardropPointRadius / 1000, drawColor);
            }
        }
    }
}
