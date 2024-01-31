// Pcx - Point cloud importer & renderer for Unity
// https://github.com/keijiro/Pcx

using UnityEngine;
using System.Collections.Generic;
using System;
using System.Linq;

/// A container class optimized for compute buffer.
public sealed class ZetaSolverPointData
{
    #region Public properties

    /// Byte size of the point element.
    public const int elementSize = sizeof(float) * 4;

    /// Number of points.
    public int pointCount
    {
        get { return _pointData.Length; }
    }

    /// Get access to the compute buffer that contains the point cloud.
    public ComputeBuffer computeBuffer
    {
        get
        {
            if (_pointBuffer == null)
            {
                _pointBuffer = new ComputeBuffer(pointCount, elementSize);
                _pointBuffer.SetData(_pointData);
            }
            return _pointBuffer;
        }
    }

    #endregion

    #region ScriptableObject implementation

    ComputeBuffer _pointBuffer;

    public void Dispose()
    {
        if (_pointBuffer != null)
        {
            _pointBuffer.Release();
            _pointBuffer = null;
        }
    }

    #endregion

    #region Serialized data members

    [System.Serializable]
    struct Point
    {
        public Vector3 position;
        public uint color;
    }

    [SerializeField] Point[] _pointData = new Point[2240000 * 2];
    private int teardropPointIndex;

    #endregion

    public Vector3 GetPoint(int index)
    {
        return _pointData[index].position;
    }

    public int GetPointPairIndex(int index)
    {
        index += teardropPointIndex;
        if(index >= teardropPointIndex * 2)
        {
            index -= teardropPointIndex * 2;
        }
        return index;
    }

    public void SetPointColor(int index, Color color)
    {
        _pointData[index].color = EncodeColor(color);
    }

    public int GetClosestTearDropPointIndex(Vector3 pt)
    {
        int closestPtIndex = -1;
        float closestPtDist = float.MaxValue;
        for(int i = teardropPointIndex; i < teardropPointIndex * 2; i++)
        {
            // float dist = Vector3.Distance(pt, _pointData[i].position);
            Vector3 other = _pointData[i].position;
            float dist = float.MaxValue;
            // only check points that are close within the z
            if(Math.Abs(other.z - pt.z) < 0.1)
            {
                // for distance only check XY pos
                dist = Vector2.Distance(pt, other);
            }

            // Debug.Log("PT: " + pt + ". Other: " + _pointData[i].position);
            if(dist < closestPtDist)
            {
                closestPtIndex = i;
                closestPtDist = dist;
                // Debug.Log("Closer: " + closestPtIndex + ".  DIST: " + closestPtDist);
            }
        }
        // Debug.Log("Close Index: " + closestPtIndex);
        return closestPtIndex;
    }

    #region Editor functions

#if UNITY_EDITOR

    static uint EncodeColor(Color c)
    {
        float kMaxBrightness = (1 - c.a) * 32;
        // const float kMaxBrightness = 16;

        var y = Mathf.Max(Mathf.Max(c.r, c.g), c.b);
        y = Mathf.Clamp(Mathf.Ceil(y * 255 / kMaxBrightness), 1, 255);

        var rgb = new Vector3(c.r, c.g, c.b);
        rgb *= 255 * 255 / (y * kMaxBrightness);

        return ((uint)rgb.x) |
               ((uint)rgb.y << 8) |
               ((uint)rgb.z << 16) |
               ((uint)y << 24);
    }

    // storing the input and output points in the same array, pairs can be found by adding the index and the pointCount / 2
    public void Initialize(List<Vector2> inputPositions, List<Vector3> outputPositions, List<Color32> colors)
    {
        if(inputPositions.Count != outputPositions.Count)
        {
            throw new System.Exception("index and teardrop lists are not of same size");
        }

        // _pointData = new Point[positions.Count];
        Reset();

        teardropPointIndex = inputPositions.Count;

        for (var i = 0; i < _pointData.Length; i++)
        {
            if (i > inputPositions.Count - 1)
            {
                break;
            }
            
            var pointColor = EncodeColor(colors[i]);

            _pointData[i] = new Point
            {
                position = inputPositions[i],
                color = pointColor
            };

            _pointData[teardropPointIndex + i] = new Point
            {
                position = outputPositions[i],
                color = pointColor
            };
        }

        var buffer = computeBuffer;
        buffer.SetData(_pointData);
    }

    public void HighlightPoints(List<int> pointIndices, Color highlightColor, bool blackoutIndexPlane, bool blackoutTeardropPlane)
    {
        for(int i = teardropPointIndex; i < teardropPointIndex * 2; i++)
        {
            if(pointIndices.Contains(i))
            {
                SetPointColor(i, highlightColor);
                SetPointColor(GetPointPairIndex(i), highlightColor);
            }
            else
            {
                if(blackoutIndexPlane) SetPointColor(i, Color.black);
                if(blackoutTeardropPlane) SetPointColor(GetPointPairIndex(i), Color.black);
            }
        }

        // for(int i = 0; i < pointIndices.Count; i++)
        // {
        //     SetPointColor(pointIndices[i], highlightColor);
        //     SetPointColor(GetPointPairIndex(pointIndices[i]), highlightColor);
        // }

        var buffer = computeBuffer;
        buffer.SetData(_pointData);
    }

    public void UpdateBuffer()
    {
        var buffer = computeBuffer;
        buffer.SetData(_pointData);
    }

    public void Reset()
    {
        for (var i = 0; i < _pointData.Length; i++)
        {
            _pointData[i].position = new Vector3(-1, -1, 0);
            _pointData[i].color = EncodeColor(Color.black);
        }

        var buffer = computeBuffer;
        buffer.SetData(_pointData);
    }

#endif

    #endregion
}
