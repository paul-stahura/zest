using System;
using System.Collections;
using System.Collections.Generic;
using Shapes;
using Complex = System.Numerics.Complex;
using UnityEngine;

public class ZetaSolver : MonoBehaviour
{
    #region Variables
    [Header("IndexPlane")]
    public Camera indexCamera;
    public Transform indexPlaneOrigin;
    public Vector2 indexPlaneOffset = new Vector2(0, 0);

    public int numOfBands = 3;
    public Vector2 bandSize = new Vector2(0.25f, 1);
    [Tooltip("Number of dots between")] public Vector2 bandDensity = new Vector2(10, 40);
    public List<Color> bandColors = new List<Color>() 
    {
        Color.red,
        Color.green,
        Color.blue,
        Color.magenta,
    };
    [Range(0, 1)] public float bandTransparency = 1;
    // public float dotRadiusScalar = 300;
    [Range(0, 4)] public float indexDotRadius = 2.0f;
    private struct IndexDot
    {
        public IndexDot(Vector pPos, Color pColor)
        {
            pos = pPos;
            color = pColor;
        }
        public Vector pos;
        public Color color;
    }
    private List<IndexDot> _indexDots;

    [Header("TeardropPlane")]
    public Camera TeardropCamera;
    public Transform teardropPlaneOrigin;
    [Range(0, 1)] public float teardropDotTransparency = 1;
    // public float dotRadiusScalar = 300;
    [Range(0, 4)] public float teardropDotRadius = 2.0f;
    private struct TeardropDot
    {
        public TeardropDot(Vector pPos, IndexDot pPair)
        {
            pos = pPos;
            pair = pPair;
        }
        public Vector pos;
        public IndexDot pair;

        public Color GetColor()
        {
            return pair.color;
        }
    }
    private List<TeardropDot> _teardropDots;
    #endregion

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
        DrawIndexPlanePoints();
        DrawTeardropPlanePoints();
    }

    private void CreateIndexPlanePoints()
    {
        _indexDots = new List<IndexDot>();
        
        for(int band = 0; band < numOfBands; band++)
        {
            Color drawColor = bandColors[band];
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
                    _indexDots.Add(new IndexDot(pt, drawColor));
                }
            }
        }
    }

    private void CreateTeardropPoints()
    {
        _teardropDots = new List<TeardropDot>();

        foreach(IndexDot dot in _indexDots)
        {
            Complex s = new Complex(dot.pos.x, Zeta.IndexToImag(dot.pos.y));
            // var offset = new Vector(teardropPlaneOrigin.position.x, teardropPlaneOrigin.position.y);
            var pt = Zeta.TearDrop(0, 1, s).ToVector();
            _teardropDots.Add(new TeardropDot(pt, dot));
        }
    }

    private void DrawIndexPlanePoints()
    {
        using (Draw.StyleScope)
        {
            Draw.Matrix = indexPlaneOrigin.localToWorldMatrix;
            foreach(IndexDot dot in _indexDots)
            {
                Draw.Disc(dot.pos, indexDotRadius / 1000, dot.color);
            }
        }
    }

    private void DrawTeardropPlanePoints()
    {
        using (Draw.StyleScope)
        {
            Draw.Matrix = teardropPlaneOrigin.localToWorldMatrix;
            foreach(TeardropDot dot in _teardropDots)
            {
                Draw.Disc(dot.pos, teardropDotRadius / 1000, dot.GetColor());
            }
        }
    }
}
